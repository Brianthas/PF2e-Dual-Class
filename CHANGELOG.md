# Changelog

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
