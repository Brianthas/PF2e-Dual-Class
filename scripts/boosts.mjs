import { isDualClassActor, getPrimaryClass, getSecondaryClass } from "./util.mjs";

/**
 * A CLASS row per class in the Attribute Boosts window.
 *
 * Both classes' key attribute boosts apply: a key attribute boost is neither Hit Points nor a
 * starting skill, so "add everything from each class" covers it. `merge.mjs` puts both into
 * `build.attributes.boosts.class` as an array, which PF2e's own boost loop applies entry by entry.
 *
 * The window does not follow. PF2e renders exactly one CLASS row, drawing a key button for every
 * attribute in `build.keyOptions` and marking one pressed where `build.boosts.class === attr` - a
 * scalar comparison, so an array leaves every button unpressed. Worse, the click handler
 * `handleClassKeyAttribute` (pf2e.mjs:23465) writes
 * `actor.class?.update({"system.keyAbility.selected": attr})`, which is always the primary class
 * item. Left alone the window shows the union of both classes' options in one row where nothing is
 * selected and every button writes to the same class.
 *
 * So the row is split in two: the existing row is narrowed to the primary's own options, and a
 * clone of it is inserted underneath for the secondary, wired to the secondary class item. The
 * window then reads Ancestry, Background, primary class, secondary class, Free - which is also the
 * order PF2e applies the boosts in (pf2e.mjs:33760-33772), so it stays an honest picture of the
 * arithmetic.
 *
 * ## Cloning rather than building markup
 *
 * Every element in that window carries a Svelte scoping class - `svelte-8m1dup` on the rows,
 * `svelte-1rh7kd0` on the buttons. Those are build hashes and they change whenever the system is
 * rebuilt, so hand-written markup would silently lose its styling on a PF2e update. Cloning the
 * row PF2e just rendered inherits whatever the current hashes are.
 *
 * ## Why a MutationObserver
 *
 * This is a Svelte app: it updates its own DOM in place when its state changes, without firing a
 * Foundry render hook. Clicking a key button would therefore wipe the injected row. The observer
 * re-applies whenever the row goes missing, which is also what repairs the row after the actor
 * updates.
 */

const ROW_MARKER = "data-pf2edc-row";
const observers = new WeakMap();

export function registerBoostRows() {
  // The actor is taken from this render pass and used for it alone. Only one Attribute Boosts
  // window exists at a time - opening a second closes the first - and every open fires this hook
  // again with the character it was opened for, so a per-render actor is always the current one.
  // Re-reading `app.options.actor` later instead looked safer and was worse: during the moment one
  // window is closing and the next opening, that read can still name the previous character, and
  // acting on it stripped the rows off a dual-class window entirely.
  Hooks.on("renderAttributeBuilder", (app, element) => {
    const actor = app.options?.actor;
    if (actor?.type !== "character") return;
    watch(app, element, actor);
    refresh(app, element, actor);
  });
}

/**
 * Apply the rows with the observer switched off.
 *
 * Everything this does is a DOM mutation inside the element the observer is watching, so applying
 * while connected would retrigger it on our own edits.
 */
function refresh(app, element, actor) {
  const observer = observers.get(app);
  observer?.disconnect();
  try {
    if (isDualClassActor(actor)) applyRows(element, actor);
    else clearRows(element);
  } finally {
    if (element.isConnected) observer?.observe(element, { childList: true, subtree: true });
  }
}

/** Take our rows back out, for when the window is reopened by a single-class character. */
function clearRows(element) {
  for (const row of element.querySelectorAll(`[${ROW_MARKER}="secondary"]`)) row.remove();
  for (const row of element.querySelectorAll(`[${ROW_MARKER}="primary"]`)) {
    row.removeAttribute(ROW_MARKER);
    for (const button of row.querySelectorAll("button.attribute-button.key")) button.hidden = false;
  }
}

/**
 * Re-apply when Svelte rebuilds the rows.
 *
 * Two things can go: our injected row can be dropped, or the primary row can be replaced with a
 * fresh copy that still carries every attribute button. Checking only for the first leaves a
 * primary row offering the other class's key attributes, so both are tested.
 */
function watch(app, element, actor) {
  observers.get(app)?.disconnect();

  const observer = new MutationObserver(() => {
    const hasSecondary = !!element.querySelector(`[${ROW_MARKER}="secondary"]`);
    const hasPrimary = !!element.querySelector(`[${ROW_MARKER}="primary"]`);
    if (hasSecondary && hasPrimary) return;
    refresh(app, element, actor);
  });
  observers.set(app, observer);
  observer.observe(element, { childList: true, subtree: true });
}

/**
 * The row PF2e rendered for the class.
 *
 * Only the injected clones are excluded, never the primary row. Clones carry the same "Class"
 * heading as the original, so matching on the heading alone picked one up on the second pass, cloned
 * it, and left the previous one in place - a new row on every re-render. Excluding *every* marked
 * row instead overcorrected: the primary keeps its own marker between passes, so the search found
 * nothing and the secondary row stopped being rebuilt at all.
 */
function findClassRow(element) {
  const label = game.i18n.localize("TYPES.Item.class");
  return [...element.querySelectorAll(".row")].find(
    (row) => row.getAttribute(ROW_MARKER) !== "secondary"
      && row.querySelector(".title")?.textContent.trim() === label
  ) ?? null;
}

/** The six attribute columns of a row, in the order PF2e renders them. */
function columnsOf(row) {
  return [...(row.querySelector(".attributes")?.children ?? [])];
}

function applyRows(element, actor) {
  // Drop anything left from a previous pass before adding a new one. Svelte can replace the row we
  // cloned from without touching the clone, so "a clone already exists" does not mean the DOM is
  // still correct - rebuilding from the current primary row is the only reliable state.
  for (const stale of element.querySelectorAll(`[${ROW_MARKER}="secondary"]`)) stale.remove();

  const row = findClassRow(element);
  if (!row) return;

  const primary = getPrimaryClass(actor);
  const secondary = getSecondaryClass(actor);
  if (!primary || !secondary) return;

  const attributes = Object.keys(CONFIG.PF2E.abilities);

  // The clone has to be taken before the original is narrowed, so it still carries every button.
  const secondaryRow = row.cloneNode(true);

  narrowRow(row, primary, attributes, actor, false);
  narrowRow(secondaryRow, secondary, attributes, actor, true);

  row.after(secondaryRow);
}

/**
 * Reduce a row to one class: drop the buttons for attributes that class does not offer, press the
 * one it has selected, and point its clicks at that class item.
 *
 * @param {HTMLElement} row
 * @param {ItemPF2e} classItem
 * @param {string[]} attributes Attribute keys in column order.
 * @param {ActorPF2e} actor
 * @param {boolean} isClone Whether this row is the inserted one.
 */
function narrowRow(row, classItem, attributes, actor, isClone) {
  row.setAttribute(ROW_MARKER, isClone ? "secondary" : "primary");
  row.setAttribute("aria-label", `Class key attribute for ${classItem.name}`);

  // The clone inherits the "Class" heading. Retitling it keeps the two rows told apart at a glance,
  // matching the sheet's own Class / Second Class cells, and means the row lookup no longer has a
  // second element answering to the heading it searches for.
  const title = row.querySelector(".title");
  if (title && isClone) title.textContent = game.i18n.localize("PF2EDC.Sheet.SecondClass");

  const description = row.querySelector(".description");
  if (description) description.textContent = classItem.name;

  const img = row.querySelector("img");
  if (img) {
    img.src = classItem.img;
    img.alt = classItem.name;
  }

  const offered = new Set(classItem.system.keyAbility.value);
  const selected = classItem.system.keyAbility.selected;
  const manual = actor.system.build.attributes.manual;

  columnsOf(row).forEach((column, index) => {
    const attribute = attributes[index];
    const button = column.querySelector("button.attribute-button.key");
    if (!button) return;

    // Hidden, never removed. The secondary row is a clone of this one, and PF2e only renders a
    // button for attributes in `build.keyOptions` - the union of both classes' options. Removing the
    // buttons this class does not offer therefore stripped the clone of the *other* class's button
    // too, and the secondary row came back empty after the first re-render.
    if (!offered.has(attribute) || manual) {
      button.hidden = true;
      return;
    }
    button.hidden = false;

    // `aria-pressed` is for assistive tech; the green fill comes from the `selected` class PF2e's
    // own button component adds. Setting only the attribute left every key looking unchosen.
    const isSelected = selected === attribute;
    button.setAttribute("aria-pressed", String(isSelected));
    button.classList.toggle("selected", isSelected);

    // PF2e's own listener is still on the original row's buttons and writes to `actor.class`, which
    // is right for the primary and wrong for everything else. Replacing the node drops that
    // listener, so both rows end up driven only from here and each writes to its own class item.
    const replacement = button.cloneNode(true);
    replacement.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      // Deselecting only makes sense where the class offers a choice. `ClassPF2e#prepareBaseData`
      // does `selected ??= value.length === 1 ? value[0] : null`, so clearing the one option a
      // Wizard has is undone on the next prepare - the button appears to do nothing at all.
      if (offered.size === 1 && selected === attribute) return;

      const next = selected === attribute ? null : attribute;
      await classItem.update({ "system.keyAbility.selected": next });
    });
    button.replaceWith(replacement);
  });
}
