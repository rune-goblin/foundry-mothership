<script>
  import MainStat from '../../parts/MainStat.svelte';
  import { onActivate } from '../../parts/activate.js';
  import { localize } from '../../../i18n.ts';
  import { TABLES } from '../labels.js';

  let { draft } = $props();

  async function rollGear() {
    for (const [kind] of TABLES) await draft.rollTable(kind);
    await draft.roll('credits');
  }
</script>

{#snippet die(kind, onclick)}
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <img
    class="clicable-item circle-input"
    src="icons/svg/d20-black.svg"
    alt="roll"
    data-roll={kind}
    role="button"
    tabindex="0"
    {onclick}
    onkeydown={onActivate(onclick)}
  />
{/snippet}

<div class="wizard-prose">
  <p>{localize('Mothership.CharacterGenerator.Wizard.Gear.Loadout')}</p>
  <p>{localize('Mothership.CharacterGenerator.Wizard.Gear.Trinket')}</p>
  <p>{localize('Mothership.CharacterGenerator.Wizard.Gear.Credits')}</p>
  <p class="wizard-reference">{localize('Mothership.CharacterGenerator.Wizard.Gear.Reference')}</p>
</div>

<div class="wizard-tables">
  {#each TABLES as [kind, label] (kind)}
    <div class="wizard-table">
      <MainStat key={kind} label={localize(label)} wrapper={false}>
        {#snippet control()}
          {#if draft[kind] === null}
            {@render die(kind, () => draft.rollTable(kind))}
          {:else}
            <input class="circle-input" type="text" readonly data-value={kind} value={draft[kind].roll} />
          {/if}
        {/snippet}
      </MainStat>
      <!-- A loadout row is a comma-separated list of the items it hands out, so printing the
           row and then itemising it says everything twice. The row stands in only when the
           draw resolved to no items at all. -->
      {#if kind !== 'loadout' || !draft.loadout?.entries.length}
        <p class="wizard-readout" data-text={kind}>{draft[kind]?.text ?? ''}</p>
      {/if}
      {#if kind === 'loadout' && draft.loadout !== null}
        <ul class="wizard-list" data-list="loadout">
          {#each draft.loadout.entries as entry, position (position)}
            <li>{entry.name}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}

  <div class="wizard-table">
    <MainStat key="credits" label={localize('Mothership.Credits')} wrapper={false}>
      {#snippet control()}
        {#if draft.rolled.credits === null}
          {@render die('credits', () => draft.roll('credits'))}
        {:else}
          <input class="circle-input" type="text" readonly data-value="credits" value={draft.rolled.credits} />
        {/if}
      {/snippet}
    </MainStat>
  </div>
</div>
<button type="button" class="wizard-bulk" data-roll="all" onclick={rollGear}>
  {localize('Mothership.CharacterGenerator.Wizard.RollRemaining')}
</button>

<style>
  @layer system {
    /* A table row that drew nothing still holds its line, so the pane does not jump as each of
       the three resolves. */
    .wizard-readout {
      min-height: var(--wizard-readout-min-height);
      margin: var(--space-6) 0 0;
    }
  }
</style>
