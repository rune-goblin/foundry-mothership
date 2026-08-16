<script>
  // One skill the class promises, and the skills it may be. Closed, the slot is a line: the rank
  // it draws from and the pick standing in it. Open, it is the list to browse — every skill the
  // rank still offers, each with the sentence the book prints under it, because a name alone is
  // not something a player can choose between.
  import { localize } from '../../i18n.ts';
  import { onActivate } from '../parts/activate.js';

  let { pick, label, options, chosen, chosenName, open, ontoggle, onchoose } = $props();
</script>

<div class="skill-slot" class:open data-pick={pick}>
  <button
    type="button"
    class="skill-slot-summary"
    aria-expanded={open}
    data-slot="open"
    onclick={ontoggle}
  >
    <span class="skill-slot-rank">{label}</span>
    <span class="skill-slot-pick" class:empty={chosen === null}>
      {chosenName || localize('Mothership.CharacterGenerator.SkillOption.Unpicked')}
    </span>
    <i class="fas {open ? 'fa-chevron-up' : 'fa-chevron-down'}" aria-hidden="true"></i>
  </button>

  {#if open}
    <ul class="skill-slot-list">
      {#each options as option (option.uuid)}
        <li>
          <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
          <div
            class="skill-card"
            class:chosen={option.uuid === chosen}
            class:held={option.disabled}
            role="button"
            tabindex={option.disabled ? -1 : 0}
            aria-pressed={option.uuid === chosen}
            aria-disabled={option.disabled}
            data-skill={option.uuid}
            onclick={() => !option.disabled && onchoose(option.uuid)}
            onkeydown={onActivate(() => !option.disabled && onchoose(option.uuid))}
          >
            <p class="skill-name">
              {option.name}
              <span class="skill-bonus">+{option.bonus}</span>
            </p>
            {#if option.summary}<p class="skill-summary">{option.summary}</p>{/if}
            {#if option.prerequisiteNames.length > 0}
              <p class="skill-needs">
                {localize('Mothership.SkillsPrerequisite')}: {option.prerequisiteNames.join(', ')}
              </p>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies. The slot
     renders only inside the wizard but reads no token of the wizard's: the two happen to paint
     the same ladder, and each names it for itself. */
  @layer system {
    .skill-slot {
      --skillslot-radius: var(--radius-md);
      --skillslot-list-max-height: 18rem;
      --skillslot-edge: var(--border-neutral-ink);
      --skillslot-rule: var(--border-neutral-medium);
      --skillslot-ink-muted: var(--text-secondary);
      --skillslot-ink-held: var(--text-muted);
      --skillslot-fill: var(--surface-neutral-lowest);
      --skillslot-fill-ink: var(--text-inverted);

      border: var(--border-width-2) solid var(--skillslot-edge);
      border-radius: var(--skillslot-radius);
    }

    .skill-slot-summary {
      display: grid;
      grid-template-columns: 7rem minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-8);
      width: 100%;
      padding: var(--space-8) var(--space-10);
      border: 0;
      border-radius: var(--skillslot-radius);
      background: none;
      color: inherit;
      /* Foundry pins every button to `height: var(--button-size)` and the matching min-height;
         both have to be released or a slot clips its own row. */
      height: auto;
      min-height: 0;
      text-align: left;
      cursor: pointer;
    }

    .skill-slot-rank {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--skillslot-ink-muted);
    }

    .skill-slot-pick {
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
    }

    .skill-slot-pick.empty {
      font-family: var(--font-sans-mothership);
      font-weight: var(--font-weight-normal);
      color: var(--skillslot-ink-muted);
    }

    .skill-slot-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-6);
      max-height: var(--skillslot-list-max-height);
      overflow-y: auto;
      margin: 0;
      padding: var(--space-10);
      border-top: var(--border-width-1) solid var(--skillslot-rule);
      list-style: none;
    }

    .skill-card {
      height: 100%;
      padding: var(--space-8);
      border: var(--border-width-1) solid var(--skillslot-rule);
      border-radius: var(--skillslot-radius);
      cursor: pointer;
    }

    .skill-card.chosen {
      background: var(--skillslot-fill);
      color: var(--skillslot-fill-ink);
    }

    /* A skill the draft already holds stays listed rather than vanishing, so a closed branch is
       visible — it is just not a pick. */
    .skill-card.held {
      color: var(--skillslot-ink-held);
      cursor: default;
    }

    .skill-card p {
      margin: 0;
    }

    .skill-name {
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
    }

    .skill-bonus {
      font-size: var(--font-size-xs);
    }

    .skill-summary,
    .skill-needs {
      font-size: var(--font-size-sm);
    }

    .skill-needs {
      font-style: italic;
    }
  }
</style>
