<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'CheckPrompt — which Stat',
    path: 'module/dialogs/CheckPrompt.svelte',
    width: 660,
    note: 'The same window with the halves swapped: the Skill is known and the list supplies the Stat, so the number beside each row is what the Stat is worth rather than a bonus. Three lines of description here — the Stat and Save examples run to 125 characters.',
  };
</script>

<script>
  import CheckPrompt from '../../module/dialogs/CheckPrompt.svelte';
  import { format, localize } from '../../module/i18n.ts';
  import RailFrame from './RailFrame.svelte';

  const ROWS = [
    ['strength', 'Mothership.Strength', 'Mothership.StrengthSkillExample', 30],
    ['speed', 'Mothership.Speed', 'Mothership.SpeedSkillExample', 45],
    ['intellect', 'Mothership.Intellect', 'Mothership.IntellectSkillExample', 35],
    ['combat', 'Mothership.Combat', 'Mothership.CombatSkillExample', 40],
  ];

  const options = ROWS.map(([key, label, example, amount]) => ({
    key,
    label: localize(label),
    cells: [{ text: String(amount), boxed: true }],
    amount,
    description: localize(example),
  }));

  const buttons = [
    { action: 'none', label: localize('Mothership.Normal'), icon: 'roll-mark', default: true },
    { action: 'advantage', label: localize('Mothership.Advantage'), icon: 'roll-mark roll-mark-advantage' },
    {
      action: 'disadvantage',
      label: localize('Mothership.Disadvantage'),
      icon: 'roll-mark roll-mark-disadvantage',
    },
  ];

  let value = $state('speed');
</script>

<RailFrame {buttons}>
  <CheckPrompt
    heading={localize('Mothership.AgainstWhichStat')}
    intro={format('Mothership.SkillAppliesToStat', { skill: 'Athletics', bonus: 10 })}
    {options}
    {value}
    onchange={(next) => (value = next)}
    picks="stat"
    fixed={{ label: 'Athletics', amount: 10 }}
    lines={3}
  />
</RailFrame>
