<script>
  import MainStat from '../parts/MainStat.svelte';
  import RollBox from './RollBox.svelte';
  import { dropTarget } from '../parts/drop-target.js';
  import { onActivate } from '../parts/activate.js';
  import { localize } from '../../i18n.ts';

  let { draft, close } = $props();

  const STATS = [
    ['strength', 'Mothership.Strength'],
    ['speed', 'Mothership.Speed'],
    ['intellect', 'Mothership.Intellect'],
    ['combat', 'Mothership.Combat'],
  ];

  const SAVES = [
    ['health', 'Mothership.Health'],
    ['sanity', 'Mothership.Sanity'],
    ['fear', 'Mothership.Fear'],
    ['body', 'Mothership.Body'],
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
        <div class="headerinputtext">{localize('Mothership.Name')}</div>
        <div class="headerinputfield">
          <input class="noborder" type="text" name="name" bind:value={draft.name} placeholder="Name" />
        </div>
      </div>

      <div>
        <div class="headerinputtext">{localize('Mothership.CLASS')}</div>
        <div class="headerinputfield">
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
        <div class="headerinputtext">{localize('Mothership.Wounds')}</div>
        <div class="headerinputfield">
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
        <div class="headerinputtext">{localize('Mothership.Credits')}</div>
        <div class="headerinputfield">
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
      <MainStat key="skills" label={localize('Mothership.Skills')} labelClass="fulllabel" wrapper={false}>
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

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     These eight names are the whole of what only this window writes. Everything else its markup
     wears stays declared in css/mothership.css: the shared stat vocabulary this form hand-writes
     at lines 216-266 (`mainstatwrapper`/`resource`/`mainstat`/`mainstatlabel`/`mainstattext`,
     plus `circle-input`, which the roll circles wear everywhere) -- converting those call sites
     is the S9 audit's first work item -- and `char-header`/`header-fields`/`header`,
     `headerinputtext`/`headerinputfield`/`noborder` (CharacterSheet and SheetHeader
     write all of those too) and the `.grid*`/`widegap` set. `actor-generator` itself now styles
     nothing anywhere: it is the scope this block hangs off and the e2e suite's window locator. */
  @layer system {
    .actor-generator {
      --generator-group-margin-block-start: var(--space-10);

      /* 2em is 32px, an exact tie between --radius-2xl (28) and -3xl (36). It takes the same
         step as MainStat's `mainstatlabel`, which is the same 2em cap on the same kind of bar —
         a tie is broken once for the system, not once per site. */
      --generator-full-label-radius: var(--radius-3xl);
      /* The panel's own height — a measurement, not a step. */
      --generator-list-panel-min-height: 150px;
      --generator-credit-image-height: var(--space-32);
      /* `0%` was the original; a zero percentage of any containing block is the same zero. */
      --generator-credit-image-margin-block-start: var(--space-0);

      --generator-action-label-font-size: var(--font-size-xs);

      /* `gray` is #808080 exactly, which is the step --surface-neutral-high reads. */
      --generator-checkbox-checked-surface: var(--surface-neutral-high);
    }

    /* The identity block is a single column inside the black bar `.mothership .header` lays out in two.
       Byte-identical to `.mothership .grid-1col`, which this element does not wear -- the id is
       how the fork spelt the override, and (1,2,0) is what carries it. */
    .actor-generator #generator-header-grid-1col {
      grid-column: span 1 / span 1;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .actor-generator .element-group {
      margin-top: var(--generator-group-margin-block-start);
    }

    /* (0,3,0) against `.mothership .circle-input`'s (0,2,0), as `form.actor-generator` was before it:
       the credits die is smaller than a stat circle and drops its -0.15em top bleed. */
    .actor-generator .credit-img {
      height: var(--generator-credit-image-height);
      margin-top: var(--generator-credit-image-margin-block-start);
    }

    .actor-generator .checkbox-round {
      appearance: none;
    }

    /* (0,4,0) against `.mothership .circle-input`'s (0,2,0), which fills the same box white. */
    .actor-generator .checkbox-round:checked {
      background-color: var(--generator-checkbox-checked-surface);
    }

    /* Beats `.mothership .mainstattext`'s 1.3rem: these three captions are sentences, not stat names. */
    .actor-generator .smalltext {
      font-size: var(--generator-action-label-font-size);
    }

    .actor-generator .ulinputfield {
      min-height: var(--generator-list-panel-min-height);
    }

    /* MainStat renders the skills label from a `labelClass` prop, so the class lands on markup a
       scoped block here can never reach -- the `savetext` case. The form ancestor is what keeps
       the escape inside this window. */
    .actor-generator :global(div.fulllabel) {
      border-radius: var(--generator-full-label-radius);
    }

    /* RollBox writes this class too, and only ever renders inside this form. */
    .actor-generator :global(.clicable-item) {
      cursor: pointer;
    }
  }
</style>
