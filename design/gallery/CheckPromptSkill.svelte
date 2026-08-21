<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'CheckPrompt — which Skill',
    path: 'module/dialogs/CheckPrompt.svelte',
    covers: ['module/ui/parts/ChoiceList.svelte', 'module/dialogs/DialogBody.svelte'],
    width: 660,
    note: 'The Stat is known and the list supplies the Skill. Only the chosen row prints its description, in a slot two lines deep whether it needs them or not — Heavy Machinery is the longest the book ships, at 114 characters. The three roll buttons are DialogV2’s own footer, stood up as the rail by css/mothership.css.',
  };
</script>

<script>
  import CheckPrompt from '../../module/dialogs/CheckPrompt.svelte';
  import DialogBody from '../../module/dialogs/DialogBody.svelte';
  import { localize } from '../../module/i18n.ts';
  import { say } from './fixtures.js';
  import RailFrame from './RailFrame.svelte';

  const options = [
    {
      key: '',
      label: localize('Mothership.NoSkill'),
      amount: 0,
      description: localize('Mothership.NoSkillExplanation'),
      muted: true,
    },
    {
      key: 'military',
      label: 'Military Training',
      cells: [localize('Mothership.SkillRankTrained'), { text: '+10', boxed: true }],
      amount: 10,
      description: '<p>Basic training provided to all military personnel.</p>',
    },
    {
      key: 'machinery',
      label: 'Heavy Machinery',
      cells: [localize('Mothership.SkillRankTrained'), { text: '+10', boxed: true }],
      amount: 10,
      description:
        '<p>The safe and proper use of heavy machinery and tools (exosuits, forklifts, drills, breakers, laser cutters, etc.).</p>',
    },
    {
      key: 'firearms',
      label: 'Firearms',
      cells: [localize('Mothership.SkillRankExpert'), { text: '+15', boxed: true }],
      amount: 15,
      description: '<p>Safe and effective use of guns.</p>',
    },
    {
      key: 'hyperspace',
      label: 'Hyperspace',
      cells: [localize('Mothership.SkillRankMaster'), { text: '+20', boxed: true }],
      amount: 20,
      description: '<p>Plotting jumps and surviving the transit.</p>',
    },
  ];

  const buttons = [
    { action: 'none', label: localize('Mothership.Normal'), icon: 'roll-mark', default: true },
    { action: 'advantage', label: localize('Mothership.Advantage'), icon: 'roll-mark roll-mark-advantage' },
    {
      action: 'disadvantage',
      label: localize('Mothership.Disadvantage'),
      icon: 'roll-mark roll-mark-disadvantage',
      class: 'condition-preselect',
    },
  ];

  // Mounted the way `svelte-dialog.ts` mounts it, not through a rune the real dialog never uses.
  const props = {
    heading: localize('Mothership.AddASkill'),
    intro: localize('Mothership.ARelevantSkillRaises'),
    options,
    picks: 'skill',
    fixed: { label: 'Speed', amount: 45 },
    lines: 2,
    note: 'Frightened: Fear Save [-]',
  };
</script>

<RailFrame {buttons}>
  <DialogBody component={CheckPrompt} {props} initial="machinery" report={say('skill')} />
</RailFrame>
