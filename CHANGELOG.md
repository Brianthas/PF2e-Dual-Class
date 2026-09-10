# Changelog

## 0.4.4

Released as 0.4.2, 0.4.3 and 0.4.4 on the same afternoon, collected here as one entry. It is a
single change: the skill panel now counts what actually granted a rank, and the intermediate
versions are steps toward that rather than separate features.

- **A source is worth the ranks it adds, not one point flat.** Skilled Human confers expert from 5th
  level in one rule, the scaling dedications confer master at 7th and legendary at 15th, and Skill
  Mastery's two rules confer expert and master. Each counted as a single point while the ranks it
  conferred counted in full, so a character was charged skill increases for ranks a feat had already
  given them. Surveyed the compendia to size it: of the 479 rules writing a skill rank, 401 confer
  one and 78 confer two, three or four, thirteen of those through a level expression the panel now
  evaluates.
- Where a skill has several sources, the first pays for every rank it confers and each later one
  pays for the step it adds. These rules use `upgrade`, meaning "at least this rank", so two of them
  on one skill are never added together; and the later ones carry a prerequisite of the rank below,
  which the character reached with an increase the budget already counts.
- **Skills granted through a placeholder are counted.** Most rules name the skill inside the path;
  a dedication's names the whole path through a placeholder that resolves to one. Only the first
  shape was recognised, so a dedication that trained a skill raised what was spent without raising
  the budget and called a legitimate character over budget.
- A second source training a skill the character already has counts as a second point, which is what
  the rules say: "Each time after the first that you'd become trained in a given skill, you instead
  allocate the trained proficiency to any other skill of your choice." It is shown as **redirected**,
  since the point is spent on a different skill.
- **A skill increase spent on a Lore counts.** Lores were outside the count, so raising one left the
  increase in the budget and reported a spent point as unspent. Ranks above trained are now points.
  Becoming trained in a Lore stays free, deliberately: adding a background creates no Lore item, so
  the Lore it promises is made by hand, and a background's Lore, one a GM hands out and one bought
  with an increase are the same item with the same flags. The rank is the only thing separating
  them. Two cases that leaves are in the README - an increase spent training a new Lore, and
  Additional Lore, which confers ranks at 3rd, 7th and 15th with no rule elements to read.
- Rank caps cover Lores, since a cap depends on level alone.
- **GM grants have a documented route.** A grant made as an item is counted, whatever type of item
  it is, and the rank written is the rank credited. A rank set by hand on the sheet cannot be told
  from one the player bought, so it is charged to the character: it eats unspent increases quietly
  and only reads as over budget once they run out. The README says which to use.
- The panel reads more plainly, and the breakdown lists each granted skill with its own points so
  the figures add up to the total in front of them.
- Tests cover the arithmetic. Each case is written so the model it replaced gives a different
  answer, and two of them caught expectations that were wrong before the code was.

## 0.4.1

- The skill panel has its own setting, **Show the Skill Proficiencies Panel**, on by default, and no
  longer needs Dual Class switched on. Counting proficiency points has nothing to do with having two
  classes: a single-class character forgets an unspent skill increase just as easily, and the rank
  caps apply to everyone. Someone who wants only this can install the module and leave Dual Class
  off.
- Turning the setting on or off updates any open character sheet straight away rather than waiting
  for the sheet to be closed and reopened.
- The panel's wording follows the number of classes, so a single-class character reads "Rogue trains
  Stealth" rather than "Rogue train Stealth".

## 0.4.0

- The skill panel now counts proficiency points and stays on the sheet at every level, instead of
  counting trained skills and disappearing after 1st. A rank is worth its own number - trained 1,
  expert 2, master 3, legendary 4 - and every source is worth one point, whether it trains a new
  skill or raises one already trained. That makes the count an identity at any level, where counting
  skills stopped being one as soon as skill increases existed.
- **Unspent skill increases are shown.** Nothing else on the sheet records that you owe yourself
  one, so they are easy to forget at level up. Skill increases are had once per level, so the levels
  are unioned across classes: a Fighter/Rogue gets the Rogue's schedule, one every level from 2nd,
  rather than the Fighter's odd levels from 3rd.
- **Ranks above what the character's level allows are listed.** Expert comes from the first level
  the character gains a skill increase, master at 7th, legendary at 15th. Only the expert gate moves
  by class, and it is read from the class's own data rather than assumed: Rogue and Investigator are
  the only two whose increases start at 2nd, and their own entries defer to 7th and 15th unchanged.
- Being over budget is reported as a rank nothing accounts for rather than as an error, since a feat
  or feature that grants a rank outright is the likelier cause. A character with something that
  trains every skill still shows the all-trained message instead of a meaningless number.

## 0.3.2

- A key attribute boost from an extra class no longer pushes a modifier past +4 at character
  creation. Character creation caps a modifier at +4, and PF2e has never had to enforce it because
  without this module one character cannot collect enough creation boosts on one attribute to get
  there. Classes keyed on the same attribute could, and the boost past the cap was applied at the
  half value PF2e uses for level-up boosts, banking a half step. That is worth more than it looks:
  the banked half meant a later boost reached +5 in one step instead of two. A class boost that
  would land on an attribute already at +4 is now dropped instead.
- Boosts at 5th level and beyond are unaffected. The half step is the correct rule there, and this
  only changes what happens during creation.

## 0.3.1

- Fixed adding a class deleting the previous class's features. The system purges the existing class
  before creating the new one, and that purge takes the class's granted feats with it. The class
  itself was being kept and its features were not, so a Fighter who gained a second class kept the
  Fighter item and lost Reactive Strike and Shield Block. Those feats are now kept too.
- Fixed a second, wrong control on each extra class cell. The cell is a copy of the Class cell and
  inherited the system's own class picker, which showed as a duplicate magnifying glass and would
  have replaced the character's **first** class when clicked.

## 0.3.0

- A character can take a **third class**, treated exactly like the second: the best of the three
  proficiencies, the highest Hit Points, the larger additional skill count rather than the sum, a
  class DC each at its own key attribute, a key attribute boost each, and a class feat ladder each.
  Skill, general and ancestry feats stay on one ladder across all three, since the variant rule has
  those only once per level. Not a published rule; the Dual-Class rules applied to one more class.
- Two ways to allow it, off by default. **Allow a Third Class** is a world setting covering every
  character. **Third Class Permissions** is a GM-only screen for allowing it to particular
  characters in a world that is otherwise dual class. Either grants it.
- Levelling past 1st now requires every class the character is entitled to, so a character allowed
  three needs three, while another character in the same world still needs two.
- Feat ladders are named after their class: **Fighter Feats**, **Rogue Feats**, **Sorcerer Feats**,
  including the system's own group, which previously read "Class Feats" while the others carried
  names. A single-class character is unchanged.
- The class cells sit together on the sheet, reading Class, Second Class, Third Class, then Deity.
  They appear whenever the module is on rather than only once a first class is picked.
- Fixed the class feature sync asking for choices already made. Levelling up re-ran every extra
  class's feature grant, which re-opens that class's choice prompts, so a Rogue was asked for its
  racket again at every level and the answer was thrown away as a duplicate. Nothing is generated
  now for a class that has nothing new to give.
- Fixed a class added to an already-levelled character not catching up its features. The check
  watched the flag name used before this version.

## 0.2.1

- The module description now mentions Ancestry Paragon, which has its own world setting and was not
  discoverable from the module list.

## 0.2.0

- Renamed. The module id is now `pf2e-dual-class-items` and the title is **Dual Class Items (PF2e)**.
  The plain `pf2e-dual-class` id was already taken on Foundry's package listing by a different,
  actively maintained module, and the two titles were close enough to be confusing.
- **This breaks an existing install.** Foundry treats the new id as a different module, so a world
  running the old one needs the new module enabled, its two settings turned back on, and any
  character's second class re-picked from the Second Class slot. Feats already placed in the
  per-class ladders are unaffected: those slots are named independently of the module id.

## 0.1.1

- Fixed the Enable Dual Class setting hint, which said characters were unaffected until a second
  class was added. They are not: with the setting on, a player cannot level a character past 1st
  until it has both classes. The hint says that now.
- Reworded the README and several on-screen messages.

## 0.1.0

First release. Runs the Dual-Class Characters variant rule on two real class items.

- A character can hold two class items. The system deletes an existing class whenever one is added,
  with no option to switch that off, so the class being deleted is kept instead. Only applies to an
  add started from the Second Class slot; every other class drop still replaces the class.
- Proficiencies, saving throws, perception and spellcasting take the better of the two classes, and
  Hit Points the higher per level. The system's own class handling already resolves these with a
  maximum; what needed correcting is the six fields it assigns outright, where the last class
  prepared won.
- Both classes get a class DC at their own key attribute, with one marked primary.
- Both key attribute boosts apply, and the Attribute Boosts window gets a row per class. The
  system's single row offers the union of both classes' options and writes every choice to the
  first class.
- A feat ladder per class, at that class's own levels, plus extra skill, general or ancestry feat
  slots where the second class grants them at levels the first does not.
- Both classes' features are granted on level up and removed on level down, and a Sync Class
  Features action catches up a class added after level 1.
- A trained skill counter on the Proficiencies tab, counting the larger of the two classes'
  additional skill counts rather than the sum.
- A warning when a class feat is placed in the other class's ladder. Feat slots are not gated by
  class, so this reports rather than blocks.
- Ancestry Paragon, as its own world setting independent of dual class. The extra slots go into
  PF2e's own Ancestry Feats group rather than a second ladder, so the feats sit where a player looks
  for them, and the heading says the ladder is a paragon one.
- A player cannot level a character past 1st with only one class; a GM is warned and allowed
  through. The second class's 1st-level features and proficiencies belong to the character from the
  start, and levelling without it leaves no sign on the sheet.
- Deleting one class no longer takes the other class's features with it. The system treats every
  feat located to any class item as linked to the class being removed, which is right with one class
  and destroys the other class's features with two. Applies to deleting a class by any route, not
  only the module's own Remove Second Class.
- A feat section another module adds is placed with the group that takes the same kind of feat
  rather than at the bottom of the tab, so a second source of skill or ancestry feats reads as a
  continuation of that ladder.
