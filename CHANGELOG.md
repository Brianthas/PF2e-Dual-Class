# Changelog

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
