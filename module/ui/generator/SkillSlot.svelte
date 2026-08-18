<script>
  // One skill the class promises, and the prerequisite tree it may be picked from. Closed, the
  // slot is a line: the rank it draws from and the pick standing in it. Open, it shows one explicit
  // prerequisite route per possible pick, avoiding ambiguous shared connector lines.
  import { localize } from '../../i18n.ts';
  import SkillTree from './SkillTree.svelte';

  let { pick, rank, label, skills, chosen, chosenName, open, ontoggle, onchoose } = $props();
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
    <SkillTree {skills} {rank} {onchoose} />
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
      --skillslot-edge: var(--border-neutral-ink);
      --skillslot-ink-muted: var(--text-secondary);

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
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
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

  }
</style>
