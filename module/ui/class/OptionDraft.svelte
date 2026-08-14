<script>
  import ItemRow from '../parts/ItemRow.svelte';
  import ItemCell from '../parts/ItemCell.svelte';
  import ItemControls from '../parts/ItemControls.svelte';
  import ItemControl from '../parts/ItemControl.svelte';
  import { localize } from '../../i18n.ts';

  // The half-entered option lives here, in local state, rather than in inputs the sheet reads back
  // out of the DOM -- which is where the old sheet's indexing bug came from. The inputs carry no
  // `name`, so Foundry's form handling never sees them; only `onsave` writes anything.
  let { picks, onsave } = $props();

  const empty = () => ({ name: '', ...Object.fromEntries(picks.map(([key]) => [key, ''])) });

  let draft = $state(empty());

  async function save() {
    await onsave(draft);
    draft = empty();
  }
</script>

<ItemRow>
  <div class="skill-name"><input type="text" bind:value={draft.name} /></div>
  {#each picks as [key] (key)}
    <ItemCell><input type="text" bind:value={draft[key]} /></ItemCell>
  {/each}
  <ItemCell>{localize('Mothership.classNewSkillOptionSkillTip')}</ItemCell>
  <ItemControls>
    <ItemControl
      icon="save"
      class="skills-group-option-createnew"
      title={localize('Mothership.AddOption')}
      onclick={save}
    />
  </ItemControls>
</ItemRow>
