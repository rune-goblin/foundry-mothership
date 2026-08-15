<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'ChooseAttribute',
    path: 'module/dialogs/ChooseAttribute.svelte',
    width: 600,
    note: 'The radio group is its own state: `value` is what it opens on, and the browser moves the selection from there. Mirroring it into a rune would only be a second copy to keep in step.',
  };
</script>

<script>
  import ChooseAttribute from '../../module/dialogs/ChooseAttribute.svelte';
  import { asset } from '../../module/chat/cards.ts';
  import { localize } from '../../module/i18n.ts';
  import { say } from './fixtures.js';

  // `ATTRIBUTES` is private to prompts.ts, so the four rows are named here — the lang keys are the
  // ones that file uses, which test/lang-keys.test.ts holds it to.
  const stats = [
    ['strength', 'Mothership.Strength', 'Mothership.StrengthSkillExample'],
    ['speed', 'Mothership.Speed', 'Mothership.SpeedSkillExample'],
    ['intellect', 'Mothership.Intellect', 'Mothership.IntellectSkillExample'],
    ['combat', 'Mothership.Combat', 'Mothership.CombatSkillExample'],
  ].map(([key, label, example]) => ({
    key,
    label: localize(label),
    example: localize(example),
    img: asset(`images/icons/ui/attributes/${key}.png`),
  }));
</script>

<div class="mothership macro-popup-dialog">
  <ChooseAttribute
    {stats}
    heading={localize('Mothership.SelectAStat')}
    intro={localize('Mothership.ChooseTheStatForSkillCheck')}
    value="intellect"
    onchange={say('attribute')}
  />
</div>
