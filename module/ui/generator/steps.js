import IntroPane from './panes/IntroPane.svelte';
import RollsPane from './panes/RollsPane.svelte';
import ClassPane from './panes/ClassPane.svelte';
import AdjustmentsPane from './panes/AdjustmentsPane.svelte';
import HealthPane from './panes/HealthPane.svelte';
import SkillsPane from './panes/SkillsPane.svelte';
import GearPane from './panes/GearPane.svelte';
import FinishPane from './panes/FinishPane.svelte';
import { CLASS_ICONS, SAVES, STATS } from './labels.js';
import { format, localize } from '../../i18n.ts';

const K = 'Mothership.CharacterGenerator.Wizard';

// Single source of truth for the rail, counter, gate and pane — add/reorder/drop steps only here.
// `done` gates the next step and ticks the rail; `blocked` is the nav message while `done` is false.
// Book steps 5-6 aren't here (fixed values, applied elsewhere); `adjustments` is the wizard's own.
export const STEPS = [
  {
    id: 'intro',
    // Asks nothing, so it's the one step the rail stars instead of numbering.
    numbered: false,
    // Cover runs to the pane's own edge; test/e2e/actor-generator.spec.ts pins that edge.
    bleed: true,
    title: `${K}.Intro.Title`,
    pane: IntroPane,
    done: () => true,
  },
  {
    id: 'stats',
    title: `${K}.Stats.Title`,
    instruction: `${K}.Stats.Instruction`,
    pane: RollsPane,
    props: { rolls: STATS },
    done: (draft) => draft.statsRolled,
  },
  {
    id: 'saves',
    title: `${K}.Saves.Title`,
    instruction: `${K}.Saves.Instruction`,
    pane: RollsPane,
    props: { rolls: SAVES },
    done: (draft) => draft.savesRolled,
  },
  {
    id: 'class',
    title: `${K}.Class.Title`,
    pane: ClassPane,
    done: (draft) => draft.classChosen,
    blocked: () => localize('Mothership.CharacterGenerator.Error.NoClass'),
  },
  {
    id: 'adjustments',
    title: (draft) => (draft.className
      ? format(`${K}.Adjustments.TitleFor`, { class: draft.className })
      : localize(`${K}.Adjustments.Title`)),
    art: (draft) => (draft.selectedClass
      ? CLASS_ICONS[draft.selectedClass.name] ?? draft.selectedClass.img
      : null),
    pane: AdjustmentsPane,
    done: (draft) => draft.adjustmentsMade,
    blocked: (draft) => localize(draft.statChoicesSpent
      ? 'Mothership.CharacterGenerator.Error.UnpickedSkillBonus'
      : 'Mothership.CharacterGenerator.Error.UnspentAdjustment'),
  },
  {
    id: 'health',
    title: `${K}.Health.Title`,
    instruction: `${K}.Health.Instruction`,
    pane: HealthPane,
    done: (draft) => draft.healthRolled,
  },
  {
    id: 'skills',
    title: `${K}.Skills.Title`,
    instruction: `${K}.Skills.Instruction`,
    pane: SkillsPane,
    done: (draft) => draft.skillsPicked,
  },
  {
    id: 'gear',
    title: `${K}.Gear.Title`,
    pane: GearPane,
    done: (draft) => draft.gearRolled,
  },
  {
    id: 'finish',
    title: `${K}.Finish.Title`,
    pane: FinishPane,
    done: (draft) => draft.named,
  },
];

export const LAST_STEP = STEPS.length - 1;

const NUMBERED = STEPS.filter((step) => step.numbered !== false);

/** What the counter counts. The star is not one of them, so "Step 1 of 8" stays true. */
export const STEP_TOTAL = NUMBERED.length;

export const stepNumber = (step) => NUMBERED.indexOf(step) + 1;

// value is either a lang key or a function of the draft returning the finished text.
const resolve = (value, draft) => (typeof value === 'function' ? value(draft) : localize(value));

export const stepTitle = (step, draft) => resolve(step.title, draft);

export const stepBlocked = (step, draft) => resolve(step.blocked ?? `${K}.CompleteStep`, draft);
