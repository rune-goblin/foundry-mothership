<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'OptionDraft',
    path: 'module/ui/class/OptionDraft.svelte',
    note: 'The half-entered skill option lives in local state rather than in inputs the sheet reads back out of the DOM — which is where the old sheet’s indexing bug came from. The inputs carry no `name`, so Foundry’s form handling never sees them.',
  };
</script>

<script>
  import ItemList from '../../module/ui/parts/ItemList.svelte';
  import OptionDraft from '../../module/ui/class/OptionDraft.svelte';
  import { say } from './fixtures.js';

  // The class sheet's own five picks.
  const picks = [
    ['trained', 'Mothership.SkillRankTrained'],
    ['expert', 'Mothership.SkillRankExpert'],
    ['master', 'Mothership.SkillRankMaster'],
    ['expert_full_set', 'Mothership.CharacterGenerator.SkillOption.PopupFullExpertName'],
    ['master_full_set', 'Mothership.CharacterGenerator.SkillOption.PopupFullMasterName'],
  ];
</script>

<ItemList>
  <OptionDraft {picks} onsave={say('save option')} />
</ItemList>
