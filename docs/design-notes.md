# Design notes

Why the module works the way it does. The README covers what it does. Line references are to
Pathfinder 2e 8.5.0's bundled `pf2e.mjs`, which is where all of this was read. They move on every
release: re-find each one by the code around it rather than trusting the number.

## Two class items, not one merged one

The obvious way to run this rule is to merge two class items into one before the character ever
sees it. That was rejected for reasons that are checkable rather than aesthetic.

A merged item has one slug, so the character gets one `class:<slug>` roll option. Feats and rule
elements predicate on those, so the second class's own content stops working unless every case is
special-cased. Two real class items produce `class:fighter` and `class:wizard` for free, because
`ClassPF2e#prepareActorData` sets one per class item.

A merged item also has one `classFeatLevels` array, so there is no way to give each class its own
feat ladder - which is the feature this module exists for.

And a merged item is a snapshot. Every decision in it is frozen at merge time and goes stale when
either class is updated, where two real items are re-read on every data-prep cycle.

## Most of the merge is already correct

`ClassPF2e#prepareActorData` (51701) resolves with `Math.max` for perception, all three saving
throws, every attack and defense category, `proficiencies.spellcasting.rank`, and each trained
skill. Two class items therefore produce "use the highest proficiency granted for a given statistic"
with no help at all.

Six fields in that method are plain assignment, so the last class to prepare wins: `actor.class`,
`details.class`, `attributes.classhp`, `build.attributes.keyOptions`, `build.attributes.boosts.class`
and `details.keyability.value`. Those are the only ones the module recomputes.

It recomputes rather than restoring a snapshot taken before the wrapped call. Prepare order follows
`actor.items` order, so the secondary can prepare before or after the primary; recomputing from both
class items after each one prepares gives the same answer either way and converges when run twice.

**Nothing can downgrade a proficiency.** Class items resolve with a maximum, and across all 875
items in `pf2e.classfeatures` there are 35 rule elements that write a proficiency rank and every one
uses `mode: "upgrade"` - no `override`, `downgrade`, `subtract` or `multiply`. The class items' own
rules add four more, also all `upgrade`. So the comparison-and-removal step a merged-item approach
needs has no equivalent here: there is nothing stale to remove.

## Getting two class items onto one actor

`ItemPF2e.createDocuments` (45262) collects every existing ancestry, background, class,
heritage and deity whose type appears in the incoming batch and deletes them:

```js
let a = ["ancestry","background","class","heritage","deity"]
  .filter((e) => n.some((t) => t.type === e))
  .flatMap((e) => r.itemTypes[e]);
...
o.length > 0 && await r.deleteEmbeddedDocuments("Item", o, { render: !1 });
```

Read at 44904-44940: there is no flag to opt out and nothing in the context object it consults.

Two wrappers pair up to get past it. One on `createDocuments` records which class ids to keep for
the duration of the call; one on `deleteEmbeddedDocuments` filters those ids out of the delete the
purge issues. It is surgical, but it depends on the purge being a `deleteEmbeddedDocuments` call
made from inside `createDocuments`, which is an implementation detail. `verifyPurgeBypass` re-reads
the actor afterwards and reports loudly if a class went missing anyway, because a silent failure
here deletes a character's class.

**It is armed, not always on.** Preserving the old class on every class drop would break replacing a
class, which is what dropping one normally means. Only an add started from the Second Class slot
arms the bypass.

## Key attribute boosts

`build.attributes.boosts.class` is initialised to `null` (33578) and written as a single string, but
the code that turns boosts into modifiers (33773-33778) branches on `typeof === "string"` else
`Array.isArray` and applies every entry, for every category including `class`. So an array there is
a supported shape and both boosts flow through the system's own arithmetic, including the partial
boost rule `mod += mod >= 4 ? 0.5 : 1`.

Ordering comes free. `prepareBuildData` (33760-33772) applies boosts as
`["ancestry", "background", "class", 1, 5, 10, 15, 20]`, so class boosts land before the level 1
free boosts and the free boosts see the raised modifier.

There is an alternative: a `ChoiceSet` plus an `ActiveEffectLike` on the class item, writing
`system.abilities.<attr>.mod` with brackets. That shape is live rather than dead syntax -
`Migration854BracketedAbilityScoresToModifiers` (7229-7243) migrates ability rules *into* it, and
the system installs one for `thaumaturges-investiture` at 7184. It is the fallback if the array
route ever stops working, and it is what a single merged class item would have to use, since one
item cannot carry two selections. The array is preferred because it restates none of the system's
arithmetic.

`details.keyability.value` is derived from `boosts.class` on the same line that assigns it, so once
that is an array the derivation is wrong and the module sets it explicitly from the primary. It has
to stay a single value: it feeds `{actor|keyAttribute}`, apex and the primary class DC.

### The window needs two rows, and they must be injected

The window draws one class row (near 23200), showing a key button for every attribute in
`build.keyOptions` and filling the one where `build.boosts.class === attr`. That comparison is
scalar, so an array leaves everything unfilled. Worse, `handleClassKeyAttribute` (23465) writes
`actor.class?.update(...)`, always the primary. One row cannot serve two classes whatever the data
looks like.

The row is cloned rather than built, because every element carries a Svelte scoping class
(`svelte-8m1dup`, `svelte-1rh7kd0`) that is a build hash and changes when the system is rebuilt.

Three things this got wrong first time, all one mistake - reading back a region it had itself
mutated. The clone carries the same "Class" heading, so the finder matched its own output and
stacked a row per re-render; excluding every marked row then found nothing and stopped rebuilding;
and removing buttons from the row being cloned left the clone empty, because the system only renders
buttons for the union of both classes' options. The finder now skips only clones, stale clones are
cleared before each pass, and buttons are hidden rather than removed.

The actor is read once per render pass and used for that pass alone. Re-reading `app.options.actor`
later looked safer and was worse: while one window closes and the next opens that read can still
name the previous character, and acting on it stripped a dual-class window's rows entirely.

Green comes from a `selected` class on the button, not from `aria-pressed`.

## Feat ladders

`CharacterPF2e#prepareFeats` (34262) builds the feat groups, loops
`game.pf2e.settings.campaign.feats.sections` calling `createGroup` on each, then assigns feats to
slots. That loop is unconditional - it does not check the `campaignFeats` setting, confirmed in a
world where that setting is off and custom sections still appear. Pushing a section definition onto
that array immediately before the call produces a fully native feat group with no template patching.

The push is undone in a `finally`. That array is one world-global object, so anything left in it
reaches every character in the world - a section left there showed up on an unrelated level 20 actor
with a full ladder. Scoping the push to the single call is what makes the sections per-actor.

Adding the group after the call instead would not work: `assignToSlots` is not idempotent, since
`assignFeat` pushes onto `feats[]` for unslotted groups and `postProcess` sorts and filters.

A section whose every slot is above the character's level is skipped rather than pushed. `FeatGroup`
drops the out-of-range slots itself (33510) but still creates the group, which renders as a header
with nothing under it - a level 1 Monk/Wizard hits this, since Wizard class feats start at 2.

Another module's general-purpose second class-feat ladder is stood down for actors this module
serves, matched on its `supported` list being exactly `["class"]` rather than on its id. The id is
not the part that matters, and matching it would mean naming another package in this one.

## Class features

`CharacterPF2e._preUpdate` grants features on a level change from `let s = this.class` (34812) -
singular. The level-down branch (34821) deletes by level with no class awareness, so removal already
covers both classes and only granting needed building.

`syncSecondaryClassFeatures` reconciles instead of wrapping that async internal: it asks the
secondary class what it should have granted by now, drops anything already present by `sourceId`,
and creates the rest. The `sourceId` filter makes repeat runs free, so one function serves a level
change, the moment a class is flagged secondary, and a button.

## Removing a class

Deleting an item on a creature expands the list to that item's linked items
(`CreaturePF2e#deleteEmbeddedDocuments`, 33091-33096). For a class, `ABCItemPF2e#getLinkedItems`
(45084) computes those as every feat whose `system.location` is *any* class item id on the actor:

```js
let e = this.actor.itemTypes[this.type].map((e) => e.id);
return this.actor.itemTypes.feat.filter((t) => e.includes(t.system.location ?? ""));
```

and `ClassPF2e` widens it again to every `classfeature` nothing else granted. Both are exactly right
with one class. With two, deleting either class deletes **both** classes' features - measured by
stamping a marker feat at each class item's id and removing one class: the other's marker went with
it, unrecoverably, and by any route, including dragging a class out of the items list.

So on a dual-class actor a class reports only the feats it granted itself, which
`createGrantedItems` marks by stamping its own id into `system.location` (45099). Features granted
in turn by those carry `flags.pf2e.grantedBy` and are already removed with their granter, so they
need no listing. Matching on the id rather than the name is also what keeps the other class's
features when both classes grant a feature of the same name.

The secondary flag is cleared when either class is deleted, not only the one it names: a lone class
still flagged as the second one would render in the Second Class slot with the Class slot empty.

Feats the player chose into that class's ladder are deliberately left alone. Their `location` is a
slot id (`dc-class-wizard-4`), not the class item's id, so they are not caught by that match - and
they should not be: they are choices someone made, not something the module granted. With the ladder
gone, `assignToSlots` finds no group for their location and falls back to the bonus group, so they
appear under Bonus Feats rather than vanishing. Re-adding the same class restores the ladder with
the same slot ids, and they attach again.

## Not reusing the system's class picker

`ABCPicker` keys its instance on `abc-picker-${itemType}-${actor.uuid}` (22808), so a second one for
the same actor and type collides with the first. Its selection handling lives inside a Svelte
component with no seam to intercept, and what it does on confirm is replace the class. The Second
Class slot uses a plain dialog over the class compendia instead.

## Spellcasting and focus, which need nothing

Spellcasting proficiency is one of the ranks `ClassPF2e#prepareActorData` resolves with a maximum,
so a Fighter/Wizard keeps the Wizard's trained rank rather than falling to the Fighter's zero. That
is the single most damaging thing a merged class item gets wrong, because a merged item that never
copied `system.spellcasting` leaves the character untrained in spell attack rolls and spell DC with
nothing on the sheet to say so.

Each class's spellcasting entry arrives with its class features: the class feature that grants
spellcasting carries a `GrantItem` rule, so granting the second class's features produces its entry.
Two entries coexist without help - the system already supports several, which is how multiclass
archetypes work - and each keeps its own tradition, prepared or spontaneous category, and attribute.

The focus pool needs nothing either. A focus spell adds one to `resources.focus.max` (52533), and
the total is clamped against `resources.focus.cap` (32916), which the character sets to 3 (33633).
So two classes' focus spells cannot push the pool past three, which is what the published rule asks
for. This was checked rather than assumed, because it was the one merge rule with no obvious owner.

## What the module deliberately does not do

**Skill increases are not automated.** `skillIncreaseLevels` appears twice in the whole system
(117949 in the schema, 121787 in the class item's own sheet) and the character actor never reads it,
so the system does not automate them for single-class characters either.

**Trained skill counts are not enforced**, only reported. `trainedSkills.additional` is stored on
the class item and read by nothing on the actor.

**Feat slots are not gated by class.** `FeatGroup#isFeatValid` tests `supported`, the feat category,
and never reads `filter.traits`. Blocking would mean wrapping `FeatGroup#insertFeat`, and `FeatGroup`
is not exposed on `CONFIG` - it is reachable only through an actor's live `feats` collection.

**A third class item is ignored, not rejected.** The module reads one primary and one flagged
secondary, so a third contributes its proficiencies (the system resolves those with a maximum) and
gets its own class DC, but it is absent from the Hit Points comparison and gets no feat ladder. Two
is the shape that is tested.
