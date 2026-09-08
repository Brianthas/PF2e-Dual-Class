import { MODULE_ID, THIRD_CLASS_FLAG } from "./constants.mjs";

/**
 * The GM's screen for allowing individual characters a third class.
 *
 * ## Why a flag on the actor rather than a list in the setting
 *
 * A world setting holding actor ids is the obvious storage and the wrong one. Ids dangle when an
 * actor is deleted, they do not travel when a character is exported to another world, and nothing
 * on the character itself records why it is allowed three classes. A flag has none of those
 * problems, and `maxClasses(actor)` can read it without loading a world setting first.
 *
 * The setting menu is only the editor. It writes flags; it stores nothing of its own.
 *
 * ## Scrolling
 *
 * The list is one row per character and a world can hold a lot of them, so the list element carries
 * a bounded height and `overflow-y: auto` rather than growing the window past the screen. Set here
 * rather than in the stylesheet because the element is built in this file and the constraint is
 * part of it working at all.
 *
 * ## Why the class is built in a function
 *
 * `class X extends foundry.applications.api.ApplicationV2` evaluates that global the moment this
 * file is *imported*, which requires Foundry to have defined it before the module's entry point
 * loads. That is a load-order assumption with no upside, and it also makes the file unimportable
 * outside a browser, which took the unit tests down with it. Building the class on first call moves
 * the reference to `init`, by which point the global certainly exists.
 */
let cached = null;

/**
 * The permissions application class, defined on first call.
 *
 * @returns {typeof foundry.applications.api.ApplicationV2}
 */
export function thirdClassPermissionsApp() {
  if (cached) return cached;

  cached = class ThirdClassPermissions extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "pf2edc-third-class-permissions",
    tag: "form",
    window: { title: "PF2EDC.Settings.ThirdClassPermissions.Title", contentClasses: ["standard-form"] },
    position: { width: 420, height: "auto" },
    form: { handler: ThirdClassPermissions.#onSubmit, closeOnSubmit: true }
  };

  /** Player characters, by name, since that is how a GM looks for one. */
  static #characters() {
    return game.actors
      .filter((a) => a.type === "character")
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async _renderHTML() {
    const escape = (text) => {
      const node = document.createElement("div");
      node.textContent = text;
      return node.innerHTML;
    };

    const rows = ThirdClassPermissions.#characters()
      .map((actor) => {
        const on = actor.getFlag(MODULE_ID, THIRD_CLASS_FLAG) === true;
        const classes = actor.itemTypes.class.map((c) => c.name).join(", ") || "-";
        return `<label class="flexrow" style="align-items:center;gap:0.5rem;padding:0.15rem 0">
          <input type="checkbox" name="${escape(actor.id)}"${on ? " checked" : ""}>
          <span style="flex:1">${escape(actor.name)}</span>
          <span class="hint" style="flex:0 0 auto;font-size:var(--font-size-12)">${escape(classes)}</span>
        </label>`;
      })
      .join("");

    const empty = `<p class="hint">${game.i18n.localize("PF2EDC.Settings.ThirdClassPermissions.None")}</p>`;

    return `<p class="hint">${game.i18n.localize("PF2EDC.Settings.ThirdClassPermissions.TableHint")}</p>
      <div style="max-height:22rem;overflow-y:auto;min-height:0;border:1px solid var(--color-border-light-tertiary);padding:0.35rem">
        ${rows || empty}
      </div>
      <footer class="form-footer">
        <button type="submit"><i class="fa-solid fa-save"></i> ${game.i18n.localize("PF2EDC.Settings.ThirdClassPermissions.Save")}</button>
      </footer>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  /**
   * Write one flag per changed character, and only per changed character: an update per row would
   * touch every actor in the world every time this is saved.
   */
  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    for (const actor of ThirdClassPermissions.#characters()) {
      const wanted = data[actor.id] === true;
      const current = actor.getFlag(MODULE_ID, THIRD_CLASS_FLAG) === true;
      if (wanted === current) continue;
      if (wanted) await actor.setFlag(MODULE_ID, THIRD_CLASS_FLAG, true);
      else await actor.unsetFlag(MODULE_ID, THIRD_CLASS_FLAG);
    }
  }
  };

  return cached;
}
