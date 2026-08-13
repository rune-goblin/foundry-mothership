<script>
  import MainStat from '../parts/MainStat.svelte';
  import RollBox from './RollBox.svelte';
  import { dropTarget } from '../parts/drop-target.js';
  import { onActivate } from '../parts/activate.js';
  import { localize } from '../../i18n.ts';

  let { draft, close } = $props();

  const STATS = [
    ['strength', 'Mosh.Strength'],
    ['speed', 'Mosh.Speed'],
    ['intellect', 'Mosh.Intellect'],
    ['combat', 'Mosh.Combat'],
  ];

  const SAVES = [
    ['health', 'Mosh.Health'],
    ['sanity', 'Mosh.Sanity'],
    ['fear', 'Mosh.Fear'],
    ['body', 'Mosh.Body'],
  ];

  /** The name field doubles as the class picker: a datalist entry carries the class it names. */
  function onClassName(event) {
    const chosen = draft.classOptions.find((option) => option.name === event.currentTarget.value);
    if (chosen) draft.chooseClass(chosen.uuid);
  }

  async function onDropClass(data) {
    if (data?.type !== 'Item') return;
    await draft.chooseClass(data.uuid);
  }

  async function save() {
    await draft.apply();
    close();
  }
</script>

<form class="actor-generator" onsubmit={(event) => event.preventDefault()} {@attach dropTarget(onDropClass)}>
  <header class="char-header grid">
    <div id="generator-header-grid-1col" class="header">
      <div>
        <div class="headerinputtext">{localize('Mosh.Name')}</div>
        <div class="headerinputfield charname">
          <input class="noborder" type="text" name="name" bind:value={draft.name} placeholder="Name" />
        </div>
      </div>

      <div>
        <div class="headerinputtext">{localize('Mosh.CLASS')}</div>
        <div class="headerinputfield charname">
          <input
            class="noborder"
            type="text"
            name="class"
            list="class_options"
            value={draft.className}
            onchange={onClassName}
          />
          <datalist id="class_options">
            {#each draft.classOptions as option (option.uuid)}
              <option value={option.name} label="{option.name} - {option.source}"></option>
            {/each}
          </datalist>
        </div>
      </div>

      <div>
        <div class="headerinputtext">{localize('Mosh.Wounds')}</div>
        <div class="headerinputfield charname">
          <input
            class="noborder"
            type="text"
            data-bonus="max_wounds"
            value={draft.bonus.max_wounds}
            oninput={(event) => (draft.bonus.max_wounds = Number(event.currentTarget.value) || 0)}
          />
        </div>
      </div>

      <div>
        <div class="headerinputtext">{localize('Mosh.Credits')}</div>
        <div class="headerinputfield charname">
          {#if draft.rolled.credits === null}
            <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
            <img
              class="clicable-item credit-img circle-input"
              src="icons/svg/d20-black.svg"
              alt="roll"
              data-roll="credits"
              role="button"
              tabindex="0"
              onclick={() => draft.roll('credits')}
              onkeydown={onActivate(() => draft.roll('credits'))}
            />
          {:else}
            <input class="noborder" type="text" readonly data-value="credits" value={draft.rolled.credits} />
          {/if}
        </div>
      </div>
    </div>

    <div class="header-fields grid">
      <div class="grid grid-1col widegap">
        {#each STATS as [key, label] (key)}
          <RollBox
            {key}
            label={localize(label)}
            value={draft.rolled[key]}
            bind:bonus={draft.bonus[key]}
            onroll={() => draft.roll(key)}
          />
        {/each}
      </div>

      <div class="grid grid-1col widegap">
        {#each SAVES as [key, label] (key)}
          <RollBox
            {key}
            label={localize(label)}
            value={draft.rolled[key]}
            bind:bonus={draft.bonus[key]}
            onroll={() => draft.roll(key)}
          />
        {/each}
      </div>
    </div>
  </header>

  <div class="element-group grid grid-2col">
    {#each [['patch', 'PATCH'], ['trinket', 'TRINKET']] as [kind, label] (kind)}
      <div class="grid grid-1col">
        <MainStat key={kind} {label} wrapper={false}>
          {#snippet control()}
            {#if draft[kind] === null}
              <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
              <img
                class="clicable-item circle-input"
                src="icons/svg/d20-black.svg"
                alt="roll"
                data-roll={kind}
                role="button"
                tabindex="0"
                onclick={() => draft.rollTable(kind)}
                onkeydown={onActivate(() => draft.rollTable(kind))}
              />
            {:else}
              <input class="circle-input" type="text" readonly data-value={kind} value={draft[kind].roll} />
            {/if}
          {/snippet}
        </MainStat>
        <div class="headerinputfield">
          <input class="noborder" type="text" readonly data-text={kind} value={draft[kind]?.text ?? ''} />
        </div>
      </div>
    {/each}
  </div>

  <div class="element-group grid grid-2col">
    <div class="grid grid-1col">
      <MainStat key="skills" label={localize('Mosh.Skills')} labelClass="fulllabel" wrapper={false}>
        {#snippet control()}
          <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
          <i
            class="clicable-item circle-input fa fa-undo"
            style="font-size: 37px; text-align: center;"
            data-roll="skills"
            role="button"
            tabindex="0"
            aria-label="restart"
            onclick={() => draft.applyClassSkills()}
            onkeydown={onActivate(() => draft.applyClassSkills())}
          ></i>
        {/snippet}
      </MainStat>
      <div class="headerinputfield ulinputfield">
        <ul data-list="skills">
          {#each draft.skills as skill (skill.uuid)}
            <li>{skill.name}</li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="grid grid-1col">
      <MainStat key="loadout" label="loadout" wrapper={false}>
        {#snippet control()}
          {#if draft.loadout === null}
            <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
            <img
              class="clicable-item circle-input"
              src="icons/svg/d20-black.svg"
              alt="roll"
              data-roll="loadout"
              role="button"
              tabindex="0"
              onclick={() => draft.rollTable('loadout')}
              onkeydown={onActivate(() => draft.rollTable('loadout'))}
            />
          {:else}
            <input class="circle-input" type="text" readonly data-value="loadout" value={draft.loadout.roll} />
          {/if}
        {/snippet}
      </MainStat>
      <div class="headerinputfield ulinputfield">
        <ul data-list="loadout">
          {#each draft.loadout?.entries ?? [] as entry, index (index)}
            <li>{entry.name}</li>
          {/each}
        </ul>
      </div>
    </div>
  </div>

  <div class="element-group grid grid-3col">
    <div class="mainstatwrapper">
      <div class="resource mainstat">
        <div class="mainstatlabel">
          <span class="smalltext mainstattext" data-label="all">Roll everything</span>
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
        <img
          class="clicable-item circle-input"
          src="icons/svg/d20-black.svg"
          alt="roll"
          data-roll="everything"
          role="button"
          tabindex="0"
          onclick={() => draft.rollEverything()}
          onkeydown={onActivate(() => draft.rollEverything())}
        />
      </div>
    </div>

    <div class="resource mainstat">
      <div class="fulllabel mainstatlabel">
        <span class="smalltext mainstattext" data-key="removepreviousitems" data-label="removepreviousitems">
          Remove previous items
        </span>
      </div>
      <input
        class="clicable-item checkbox-round circle-input"
        type="checkbox"
        data-check="removepreviousitems"
        bind:checked={draft.removePreviousItems}
      />
    </div>

    <div class="resource mainstat">
      <div class="mainstatlabel">
        <span class="smalltext mainstattext" data-label="save">Save character</span>
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
      <img
        class="clicable-item circle-input"
        src="icons/svg/wall-direction.svg"
        alt="save"
        data-action="save"
        role="button"
        tabindex="0"
        onclick={save}
        onkeydown={onActivate(save)}
      />
    </div>
  </div>
</form>
