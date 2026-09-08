import { MODULE_ID, SECONDARY_CLASS_FLAG } from "./constants.mjs";
import { moduleEnabled } from "./settings.mjs";
import { registerLibWrapper, notifyDualClass } from "./util.mjs";

/**
 * Letting an actor hold two class items at once.
 *
 * PF2e deletes every existing ancestry, background, class, heritage and deity whenever an incoming
 * item shares that type. The code is in `ItemPF2e.createDocuments` (pf2e.mjs:44932-44939 on 8.4.1):
 *
 *   let a = ["ancestry","background","class","heritage","deity"]
 *     .filter((e) => n.some((t) => t.type === e))   // types present in the incoming batch
 *     .flatMap((e) => r.itemTypes[e]);              // ALL the actor's existing items of those types
 *   ...
 *   o.length > 0 && await r.deleteEmbeddedDocuments("Item", o, { render: false });
 *
 * There is no option to switch it off - nothing in the method reads the context object for one.
 * Adding a second class today deletes the first silently, along with the class features it granted,
 * with no error and no notification.
 *
 * The purge is bypassed by pairing two wrappers: one on `createDocuments` that records which class
 * ids to keep for the duration of the call, and one on `deleteEmbeddedDocuments` that removes those
 * ids from the deletion list while that record is live.
 *
 * ## Why it is armed rather than always on
 *
 * Preserving the old class on every class drop would break replacing a class, which is what a drop
 * normally means. So the bypass only applies after the sheet's "add a second class" control has
 * armed it for that actor. Anyone who never touches that control sees PF2e's stock behaviour.
 *
 * ## What is fragile here
 *
 * This depends on the purge being a `deleteEmbeddedDocuments` call made from inside
 * `createDocuments`. That is an implementation detail of the system, not a documented API, and a
 * PF2e release can change it. `verifyPurgeBypass` is the guard: after an armed create, the actor is
 * re-read and the module says so loudly if a class went missing anyway.
 */

/** Armed state, set by the sheet control and consumed by the next class create on that actor. */
let armed = null;

/** Live during an armed `createDocuments` call: the class ids the purge must not delete. */
let preserve = null;

/** How long an arm stays valid. Long enough to pick a class from a browser, short enough to lapse. */
const ARM_TIMEOUT_MS = 120000;

/**
 * Arm the next class-item create on this actor to keep the existing class instead of replacing it.
 * @param {ActorPF2e} actor
 */
export function armSecondClass(actor) {
  armed = { actorId: actor.id, at: Date.now() };
}

/** Whether an arm is currently valid for this actor. */
function isArmed(actor) {
  if (!armed || armed.actorId !== actor?.id) return false;
  if (Date.now() - armed.at > ARM_TIMEOUT_MS) {
    armed = null;
    return false;
  }
  return true;
}

export function clearArm() {
  armed = null;
}

/**
 * Confirm the bypass actually worked, and say so if it did not.
 *
 * Rule: assert on what the actor holds afterwards, not on the fact that the wrapper ran. The
 * wrapper running proves the patch registered; only re-reading the actor proves PF2e did not delete
 * the class by some other route.
 *
 * @param {ActorPF2e} actor
 * @param {string[]} expectedIds Class ids that should still be present.
 */
function verifyPurgeBypass(actor, expectedIds) {
  const missing = expectedIds.filter((id) => !actor.items.get(id));
  if (missing.length === 0) return;

  const version = game.system.version;
  console.error(
    `${MODULE_ID} | the class-purge bypass failed on pf2e ${version}: `
    + `${missing.length} class item(s) were deleted anyway (${missing.join(", ")}).`
  );
  notifyDualClass(
    "error",
    `Dual Class (PF2e): adding the second class deleted the first anyway. This module has not been `
    + `verified against pf2e ${version}. Undo with Ctrl+Z if the sheet is wrong, and report this.`
  );
}

export function registerCoexistence() {
  let ok = registerLibWrapper(
    "CONFIG.Item.documentClass.createDocuments",
    async function (wrapped, data = [], operation = {}) {
      const actor = operation.parent;
      const addsClass = Array.isArray(data) && data.some((d) => d?.type === "class");

      if (!moduleEnabled() || !addsClass || actor?.type !== "character" || !isArmed(actor)) {
        return wrapped(data, operation);
      }

      const existing = actor.itemTypes.class.map((c) => c.id);
      if (existing.length === 0) return wrapped(data, operation);

      preserve = { actorId: actor.id, ids: new Set(existing) };
      armed = null;
      try {
        const created = await wrapped(data, operation);
        verifyPurgeBypass(actor, existing);
        await flagNewClassAsSecondary(actor, created);
        return created;
      } finally {
        preserve = null;
      }
    },
    "MIXED"
  );

  ok = registerLibWrapper(
    "CONFIG.Actor.documentClass.prototype.deleteEmbeddedDocuments",
    function (wrapped, embeddedName, ids = [], operation = {}) {
      if (!preserve || preserve.actorId !== this.id || embeddedName !== "Item") {
        return wrapped(embeddedName, ids, operation);
      }

      const kept = ids.filter((id) => !preserve.ids.has(id));
      if (kept.length === ids.length) return wrapped(embeddedName, ids, operation);

      // Everything in this delete was a class we are preserving, so there is nothing left to do.
      // Calling through with an empty list would be harmless but pointless.
      if (kept.length === 0) return Promise.resolve([]);
      return wrapped(embeddedName, kept, operation);
    },
    "MIXED"
  ) && ok;

  return ok;
}

/**
 * Mark the newly added class as the secondary one.
 *
 * The class that was already there keeps being the actor's real class as far as PF2e is concerned,
 * so making the new arrival secondary is both the smaller change and the one that matches what
 * "add a second class" means. The sheet can swap which is which afterwards.
 *
 * @param {ActorPF2e} actor
 * @param {ItemPF2e[]} created
 */
async function flagNewClassAsSecondary(actor, created) {
  const newClass = (created ?? []).find((i) => i?.type === "class");
  if (!newClass) return;
  await actor.setFlag(MODULE_ID, SECONDARY_CLASS_FLAG, newClass.id);
}

/**
 * Keep the flag honest when a class item goes away.
 *
 * A dangling flag would leave `getSecondaryClass` returning null while the actor still looked
 * dual-classed to anything reading the raw flag, so clear it at the source instead.
 */
export function onDeleteClassItem(item) {
  const actor = item?.parent;
  if (item?.type !== "class" || actor?.type !== "character") return;
  if (actor.getFlag(MODULE_ID, SECONDARY_CLASS_FLAG) !== item.id) return;
  actor.unsetFlag(MODULE_ID, SECONDARY_CLASS_FLAG);
}
