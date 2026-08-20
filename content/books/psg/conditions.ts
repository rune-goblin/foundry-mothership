// The PSG has no conditions dataset: these nine are the Panic table's "Gain a new Condition"
// results plus Bleeding, which the wound tables inflict.
import type { ChatAction } from '../../../module/chat/enrichers.ts';
import type { ScopedModifier } from '../common.ts';

export interface Condition {
  id: string;
  name: string;
  /** Filename under `images/icons/ui/conditions/`. */
  icon: string;
  text: string;
  actions: readonly ChatAction[];
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
    // Same mutation as the enricher tag `@Gain[health -bleeding]`.
    actions: [
      { verb: 'gain', field: 'health', leaf: 'value', amount: { kind: 'severity', condition: 'bleeding', sign: -1 } },
    ],
    modifiers: [],
    from: 'the wound tables',
  },
  {
    id: 'coward',
    name: 'Coward',
    icon: 'coward.png',
    text: 'You must make a Fear Save to engage in violence, otherwise you flee.',
    actions: [{ verb: 'check', scope: 'fear', advantage: 'none' }],
    modifiers: [],
    from: 'Panic 5',
  },
  {
    id: 'deflated',
    name: 'Deflated',
    icon: 'deflated.png',
    text: 'Whenever a Close crewmember fails a Save, gain 1 Stress.',
    actions: [{ verb: 'gain', field: 'stress', leaf: 'value', amount: { kind: 'amount', amount: 1 } }],
    modifiers: [],
    from: 'Panic 9',
  },
  {
    id: 'doomed',
    name: 'Doomed',
    icon: 'doomed.png',
    text: 'You feel cursed and unlucky. All Critical Successes are instead Critical Failures.',
    actions: [],
    modifiers: [],
    from: 'Panic 10',
  },
  {
    id: 'frightened',
    name: 'Frightened',
    icon: 'frightened.png',
    text: 'When encountering what frightened you make a Fear Save [-] or gain 1d5 Stress.',
    // Book: "when encountering what frightened you" — untracked, so both actions stay offered.
    actions: [
      { verb: 'check', scope: 'fear', advantage: 'disadvantage' },
      { verb: 'gain', field: 'stress', leaf: 'value', amount: { kind: 'roll', dice: '1d5' } },
    ],
    modifiers: [{ modifier: 'disadvantage', scope: 'fear' }],
    from: 'Panic 6',
  },
  {
    id: 'haunted',
    name: 'Haunted',
    icon: 'haunted.png',
    text:
      'Something starts visiting you at night. In your dreams. Out of the corner of your eye. And soon it will start making demands.',
    actions: [],
    modifiers: [],
    from: 'Panic 12',
  },
  {
    id: 'loss-of-confidence',
    name: 'Loss of Confidence',
    icon: 'loss_of_confidence.png',
    text: 'Choose one Skill and lose that Skill’s bonus.',
    actions: [],
    modifiers: [],
    from: 'Panic 8',
  },
  {
    id: 'nightmares',
    name: 'Nightmares',
    icon: 'nightmares.png',
    text: 'Sleep is difficult, gain [-] on Rest Saves.',
    actions: [{ verb: 'check', scope: 'restSave', advantage: 'disadvantage' }],
    modifiers: [{ modifier: 'disadvantage', scope: 'restSave' }],
    from: 'Panic 7',
  },
  {
    id: 'spiraling',
    name: 'Spiraling',
    icon: 'spiraling.png',
    text: 'Panic Checks are at [-].',
    actions: [{ verb: 'check', scope: 'panicCheck', advantage: 'disadvantage' }],
    modifiers: [{ modifier: 'disadvantage', scope: 'panicCheck' }],
    from: 'Panic 17',
  },
] as const satisfies readonly Condition[];

export type ConditionId = (typeof CONDITIONS)[number]['id'];
