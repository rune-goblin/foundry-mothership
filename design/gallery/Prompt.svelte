<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'Prompt',
    path: 'module/dialogs/Prompt.svelte',
    width: 660,
    note: 'The body every dialog in the directory is drawn from — the head that names the question, the readout of the number or die the roll answers to, the list that answers it, and the note a condition adds. Everything else a caller needs arrives as children: so far, only the check’s own sum.',
  };
</script>

<script>
  import Prompt from '../../module/dialogs/Prompt.svelte';
  import { localize } from '../../module/i18n.ts';

  const options = [
    {
      key: 'sanity',
      label: localize('Mothership.Sanity'),
      cells: [{ text: '30', boxed: true }],
      amount: 30,
      description: localize('Mothership.SanitySaveExample'),
    },
    {
      key: 'fear',
      label: localize('Mothership.Fear'),
      cells: [{ text: '40', boxed: true }],
      amount: 40,
      description: localize('Mothership.FearSaveExample'),
    },
    {
      key: 'body',
      label: localize('Mothership.Body'),
      cells: [{ text: '50', boxed: true }],
      amount: 50,
      description: localize('Mothership.BodySaveExample'),
    },
  ];

  let value = $state('fear');
</script>

<div class="mothership macro-popup-dialog">
  <Prompt
    heading={localize('Mothership.SelectASave')}
    intro={localize('Mothership.FailedSaveCostsStress')}
    readout={{ label: localize('Mothership.RollUnder'), value: 40 }}
    {options}
    {value}
    onchange={(next) => (value = next)}
    lines={3}
    note="Phobia: Fear Save [-]"
  />
</div>
