import { MODULE_ID, EXTRA_CLASSES_FLAG } from "./constants.mjs";
import { moduleEnabled, maxClasses } from "./settings.mjs";
import {
  getPrimaryClass,
  getSecondaryClass,
  getExtraClasses,
  getExtraClassIds,
  extraClassLabel,
  notifyDualClass
} from "./util.mjs";
import { armSecondClass } from "./coexist.mjs";
import { syncSecondaryClassFeatures } from "./features.mjs";

/**
 * The second class slot on the character sheet.
 *
 * PF2e lays the Ancestry, Heritage, Background, Class and Deity cells out in a `.abcd` grid, which
 * leaves one empty cell. The second class goes there, built from a copy of the Class cell so it
 * inherits the sheet's own styling.
 *
 * The cell is only added for characters that already have a class, since a second class before a
 * first is not a state worth supporting.
 */

const CELL_CLASS = "pf2edc-second-class";

export function registerSheet() {
  Hooks.on("renderActorSheetPF2e", onRenderSheet);
  Hooks.on("renderCharacterSheetPF2e", onRenderSheet);
}

function onRenderSheet(sheet, element) {
  const actor = sheet?.actor;
  if (!moduleEnabled() || actor?.type !== "character") return;

  const root = element instanceof HTMLElement ? element : element?.[0];
  if (!root || root.querySelector(`.${CELL_CLASS}`)) return;

  const classCell = [...root.querySelectorAll(".detail.class")].at(0);
  if (!classCell) return;

  // Inserted directly after the Class cell so the sheet reads Class, Second Class, Third Class, with
  // Deity following them. The classes are one group and belong together; putting the extras at the
  // end of the grid left Deity sitting between a character's first class and its second.
  //
  // Always shown while the module is on, whether or not the character has a class yet. A GM
  // building a new character otherwise gets no sign the variant is running until after they pick
  // the first class, which reads as the module being broken.
  //
  // One cell per class the character is entitled to beyond the first, so the empty slot for the
  // next one is visible rather than appearing only once the previous is filled.
  const extras = getExtraClasses(actor);
  const slots = Math.max(maxClasses(actor) - 1, extras.length);
  let previous = classCell;
  for (let index = 0; index < slots; index += 1) {
    const cell = buildCell(actor, classCell, sheet.isEditable, extras[index] ?? null, index);
    previous.after(cell);
    previous = cell;
  }
}

/**
 * A copy of the Class cell describing one extra class, or an empty one offering to add it.
 *
 * @param {ActorPF2e} actor
 * @param {HTMLElement} classCell The sheet's own Class cell, cloned for styling.
 * @param {boolean} editable
 * @param {ItemPF2e|null} secondary The class this cell describes, or null for an empty slot.
 * @param {number} index 0 for the second class, 1 for the third, and so on.
 */
function buildCell(actor, classCell, editable, secondary, index) {
  const cell = classCell.cloneNode(true);
  cell.classList.add(CELL_CLASS);
  cell.dataset.pf2edcSlot = String(index);
  cell.classList.toggle("selected", !!secondary);

  const label = cell.querySelector(".details-label");
  if (label) label.textContent = extraClassLabel(index);

  const value = cell.querySelector(".value");
  if (value) {
    value.textContent = secondary?.name ?? "";
  }

  // Every control the clone inherited is removed, not just the item-control. The clone also carries
  // PF2e's own `data-action="open-abc-picker"` anchor with `data-item-type="class"`, which opens the
  // picker that replaces the character's *first* class - so on an empty cell it rendered a second
  // magnifying glass beside ours, and clicking it would have replaced the wrong class. Removed
  // outright rather than retargeted, so none of PF2e's delegated listeners stay attached to a
  // control that now means something else.
  for (const control of cell.querySelectorAll(".detail-item-control, [data-action]")) control.remove();

  if (!editable) return cell;

  const heading = cell.querySelector("h3");
  heading?.append(secondary ? buildMenuControl(actor, secondary) : buildAddControl(actor));
  return cell;
}

/** The magnifier that opens the class picker, matching PF2e's own empty-slot affordance. */
function buildAddControl(actor) {
  const anchor = document.createElement("a");
  anchor.innerHTML = "<i class=\"fa-solid fa-fw fa-search\"></i>";
  anchor.dataset.tooltip = game.i18n.localize("PF2EDC.Sheet.AddSecondClass");
  anchor.addEventListener("click", (event) => {
    event.preventDefault();
    promptForSecondClass(actor);
  });
  return anchor;
}

/** The ellipsis that opens the actions for an existing second class. */
function buildMenuControl(actor, secondary) {
  const span = document.createElement("span");
  span.className = "detail-item-control";
  span.innerHTML = "<i class=\"fa-solid fa-fw fa-ellipsis-v\"></i>";
  span.dataset.tooltip = game.i18n.localize("PF2EDC.Sheet.SecondClassActions");
  span.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openActions(actor, secondary);
  });
  return span;
}

/**
 * Pick a class to add as the second one.
 *
 * This is a plain dialog over the class compendia rather than PF2e's own `ABCPicker`. That
 * application keys its instance on `abc-picker-${itemType}-${actor.uuid}` (pf2e.mjs:22710), so a
 * second one for the same actor collides with the first, and its selection handling lives inside a
 * Svelte component with no seam to intercept what it does on confirm - which, being the class
 * picker, is to replace the class.
 */
async function promptForSecondClass(actor) {
  const primary = actor.itemTypes.class[0];
  const options = await collectClassOptions(actor);
  if (options.length === 0) {
    ui.notifications.warn(game.i18n.localize("PF2EDC.Sheet.NoClassesFound"));
    return;
  }

  // Escaped through the DOM rather than a helper from the API surface: class names come from
  // whatever compendia the world has installed, including homebrew, so they are not trusted markup.
  const escape = (text) => {
    const node = document.createElement("div");
    node.textContent = text;
    return node.innerHTML;
  };

  const select = options
    .map((o) => `<option value="${escape(o.uuid)}">${escape(o.name)}</option>`)
    .join("");

  const content = `<p>${game.i18n.format("PF2EDC.Sheet.PickPrompt", { primary: primary.name })}</p>`
    + `<select name="uuid" style="width:100%">${select}</select>`
    + `<p class="notification info" style="margin-top:0.5em">`
    + `${game.i18n.localize("PF2EDC.Sheet.PickHint")}</p>`;

  const uuid = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("PF2EDC.Sheet.AddSecondClass") },
    content,
    ok: {
      label: game.i18n.localize("PF2EDC.Sheet.Add"),
      callback: (event, button) => button.form.elements.uuid.value
    },
    rejectClose: false
  });
  if (!uuid) return;

  const source = await fromUuid(uuid);
  if (!source) return;

  // Arming is what tells the create wrapper to keep the existing class instead of letting PF2e's
  // purge replace it. It is deliberately one-shot: every other class drop keeps stock behaviour.
  armSecondClass(actor);
  await actor.createEmbeddedDocuments("Item", [source.toObject()]);
}

/** Every class item the world can see, minus the ones already on the actor. */
async function collectClassOptions(actor) {
  const held = new Set(actor.itemTypes.class.map((c) => c.sourceId ?? c.name));
  const found = [];

  for (const pack of game.packs.filter((p) => p.documentName === "Item")) {
    for (const entry of pack.index.filter((e) => e.type === "class")) {
      const uuid = `Compendium.${pack.metadata.id}.Item.${entry._id}`;
      if (held.has(uuid) || held.has(entry.name)) continue;
      found.push({ uuid, name: entry.name });
    }
  }
  for (const item of game.items.filter((i) => i.type === "class")) {
    if (held.has(item.uuid) || held.has(item.name)) continue;
    found.push({ uuid: item.uuid, name: item.name });
  }

  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/** Actions on an existing second class. */
async function openActions(actor, secondary) {
  const primary = getPrimaryClass(actor);
  const buttons = [
    {
      action: "open",
      label: game.i18n.localize("PF2EDC.Sheet.OpenClass"),
      callback: () => secondary.sheet.render(true)
    },
    {
      action: "swap",
      label: game.i18n.format("PF2EDC.Sheet.MakePrimary", { class: secondary.name }),
      // Swap in place: this class leaves the extras list and the old primary takes its position, so
      // the order of any other extra class is untouched.
      callback: () => actor.setFlag(
        MODULE_ID,
        EXTRA_CLASSES_FLAG,
        getExtraClassIds(actor).map((id) => (id === secondary.id ? primary.id : id))
      )
    },
    {
      action: "sync",
      label: game.i18n.localize("PF2EDC.Sheet.SyncFeatures"),
      callback: () => syncSecondaryClassFeatures(actor, { notify: true })
    },
    {
      action: "remove",
      label: game.i18n.localize("PF2EDC.Sheet.RemoveSecondClass"),
      callback: () => removeSecondClass(actor, secondary)
    }
  ];

  await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.format("PF2EDC.Sheet.SecondClassTitle", { class: secondary.name }) },
    content: `<p>${game.i18n.format("PF2EDC.Sheet.PrimaryIs", { class: primary?.name ?? "-" })}</p>`,
    buttons,
    rejectClose: false
  });
}

/**
 * Delete the second class item and the features it granted.
 *
 * Features are matched on `system.location`, which `createGrantedItems` stamps with the granting
 * class item's id (pf2e.mjs:45099), so this removes what that class brought and leaves the other
 * class's features alone even where both classes grant a feature of the same name.
 */
export async function removeSecondClass(actor, secondary = getSecondaryClass(actor)) {
  if (!secondary) return;
  return removeSecondClassItem(actor, secondary);
}

async function removeSecondClassItem(actor, secondary) {
  const granted = actor.itemTypes.feat
    .filter((f) => f.system.location === secondary.id)
    .map((f) => f.id);

  // The flag is not touched here. `onDeleteClassItem` runs on the `deleteItem` hook and removes
  // exactly this class from the list, keeping any other extra class the character has - clearing
  // the flag outright would strip a third class along with the one being removed.
  await actor.deleteEmbeddedDocuments("Item", [...granted, secondary.id]);
  notifyDualClass("info", game.i18n.format("PF2EDC.Sheet.Removed", { class: secondary.name }));
}
