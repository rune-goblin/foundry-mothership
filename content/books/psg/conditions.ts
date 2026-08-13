// The PSG has no conditions dataset. What it has is a Panic table whose results say "Gain a new
// Condition:" — eight of them — plus Bleeding, which the wound tables inflict. Those nine are the
// pack; the ~40 the system used to ship had no book behind them and went with §25.
//
// `text` is the condition as the book states it, second person. `macros` names the triggered
// macros the description links to, by contentId, so the build writes the @UUID once the ids exist.
//
// `modifiers` is seeded on the three the book vouches for and left empty on the rest — the owner's
// decision, recorded in docs/plans/psg-core.md. Each names the one roll it reaches, because that is
// how the book states them: Nightmares is [-] on Rest Saves, not on everything.
import type { TriggeredMacroId } from './macros.ts';
import type { ScopedModifier } from '../common.ts';

export interface Condition {
  id: string;
  name: string;
  /** Filename under `images/icons/ui/conditions/`. */
  icon: string;
  text: string;
  macros: readonly TriggeredMacroId[];
  modifiers: readonly ScopedModifier[];
  /** The panic roll that grants it, or the rule that does. */
  from: string;
}

export const CONDITIONS = [
  {
    id: 'bleeding',
    name: 'Bleeding',
    icon: 'bleeding.png',
    text:
      'Some weapons or Wounds cause you to <strong>Bleed</strong>. This means you take <strong>1 Damage every round until the bleeding is stopped.</strong> This is cumulative. If a character is bleeding 1 Damage per round and gains <strong>Bleeding +1,</strong> they now take 2 Damage per round. Bleeding damage ignores armor and damage reduction.',
    macros: ['take-bleeding-damage'],
    modifiers: [],
    from: 'the wound tables',
  },
  {
    id: 'coward',
    name: 'Coward',
    icon: 'coward.png',
    text: 'You must make a Fear Save to engage in violence, otherwise you flee.',
    macros: ['fear-save'],
    modifiers: [],
    from: 'Panic 5',
  },
  {
    id: 'deflated',
    name: 'Deflated',
    icon: 'deflated.png',
    text: 'Whenever a Close crewmember fails a Save, gain 1 Stress.',
    macros: ['plus-1-stress'],
    modifiers: [],
    from: 'Panic 9',
  },
  {
    id: 'doomed',
    name: 'Doomed',
    icon: 'doomed.png',
    text: 'You feel cursed and unlucky. All Critical Successes are instead Critical Failures.',
    macros: [],
    modifiers: [],
    from: 'Panic 10',
  },
  {
    id: 'frightened',
    name: 'Frightened',
    icon: 'frightened.png',
    text: 'When encountering what frightened you make a Fear Save [-] or gain 1d5 Stress.',
    macros: ['fear-save-minus', 'plus-1d5-stress'],
    // The book qualifies this with "when encountering what frightened you". Nothing models that
    // trigger, so the Fear Save carries it and the player can still take the roll at normal.
    modifiers: [{ modifier: 'disadvantage', scope: 'fear' }],
    from: 'Panic 6',
  },
  {
    id: 'haunted',
    name: 'Haunted',
    icon: 'haunted.png',
    text:
      'Something starts visiting you at night. In your dreams. Out of the corner of your eye. And soon it will start making demands.',
    macros: [],
    modifiers: [],
    from: 'Panic 12',
  },
  {
    id: 'loss-of-confidence',
    name: 'Loss of Confidence',
    icon: 'loss_of_confidence.png',
    text: 'Choose one Skill and lose that Skill’s bonus.',
    macros: [],
    modifiers: [],
    from: 'Panic 8',
  },
  {
    id: 'nightmares',
    name: 'Nightmares',
    icon: 'nightmares.png',
    text: 'Sleep is difficult, gain [-] on Rest Saves.',
    macros: ['rest-save-minus'],
    modifiers: [{ modifier: 'disadvantage', scope: 'restSave' }],
    from: 'Panic 7',
  },
  {
    id: 'spiraling',
    name: 'Spiraling',
    icon: 'spiraling.png',
    text: 'Panic Checks are at [-].',
    macros: ['panic-check-minus'],
    modifiers: [{ modifier: 'disadvantage', scope: 'panicCheck' }],
    from: 'Panic 17',
  },
] as const satisfies readonly Condition[];

export type ConditionId = (typeof CONDITIONS)[number]['id'];
