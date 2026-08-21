<script>
  import { localize, format } from '../../i18n.ts';
  import { RANK_LABEL } from './picks.js';

  let { skills, budget = null, onchoose } = $props();

  const RANK_BONUS = { Trained: 10, Expert: 15, Master: 20 };
  const RANKS = ['Trained', 'Expert', 'Master'];

  // Book order per rank; a skill not listed here sorts by name at the end.
  const BOOK_ORDER = [
    'Linguistics', 'Zoology', 'Botany', 'Geology', 'Industrial Equipment', 'Jury-Rigging',
    'Chemistry', 'Computers', 'Zero-G', 'Mathematics', 'Art', 'Archaeology', 'Theology',
    'Military Training', 'Rimwise', 'Athletics',
    'Psychology', 'Pathology', 'Field Medicine', 'Ecology', 'Asteroid Mining', 'Mechanical Repair',
    'Explosives', 'Pharmacology', 'Hacking', 'Piloting', 'Physics', 'Mysticism',
    'Wilderness Survival', 'Firearms', 'Hand-to-Hand Combat',
    'Sophontology', 'Exobiology', 'Surgery', 'Planetology', 'Robotics', 'Engineering', 'Cybernetics',
    'Artificial Intelligence', 'Hyperspace', 'Xenoesotericism', 'Command',
  ];
  const ORDER = new Map(BOOK_ORDER.map((name, index) => [name, index]));
  const byBookOrder = (left, right) =>
    (ORDER.get(left.name) ?? Number.MAX_SAFE_INTEGER) - (ORDER.get(right.name) ?? Number.MAX_SAFE_INTEGER)
    || left.name.localeCompare(right.name);

  const byUuid = $derived(new Map(skills.map((skill) => [skill.uuid, skill])));

  // Reverse edge of `prerequisites`: what each skill is itself one step toward.
  const dependents = $derived.by(() => {
    const map = new Map(skills.map((skill) => [skill.uuid, []]));
    for (const skill of skills) {
      for (const req of skill.prerequisites) map.get(req)?.push(skill.uuid);
    }
    return map;
  });

  const columns = $derived(
    RANKS.map((rank) => ({
      rank,
      bonus: RANK_BONUS[rank],
      remaining: budget?.[rank] ?? null,
      skills: skills.filter((skill) => skill.rank === rank).toSorted(byBookOrder),
    })),
  );

  function upstreamOf(uuid, into = new Set()) {
    for (const req of byUuid.get(uuid)?.prerequisites ?? []) {
      if (!into.has(req)) {
        into.add(req);
        upstreamOf(req, into);
      }
    }
    return into;
  }

  function downstreamOf(uuid, into = new Set()) {
    for (const dep of dependents.get(uuid) ?? []) {
      if (!into.has(dep)) {
        into.add(dep);
        downstreamOf(dep, into);
      }
    }
    return into;
  }

  const held = (uuid) => {
    const state = byUuid.get(uuid)?.state;
    return state === 'granted' || state === 'picked';
  };

  // Stays lit regardless of hover; kept separate from hoverLit so an owned route and a hovered
  // route never draw identically.
  const ownedLit = $derived.by(() => {
    const lit = new Set();
    for (const skill of skills) {
      if (held(skill.uuid)) {
        lit.add(skill.uuid);
        for (const req of upstreamOf(skill.uuid)) lit.add(req);
      }
    }
    return lit;
  });

  let hoveredId = $state(null);
  const hovered = $derived(hoveredId ? byUuid.get(hoveredId) : null);
  const hoveredUnlocks = $derived(hoveredId ? (dependents.get(hoveredId) ?? []) : []);

  // Both directions from the hovered/focused skill: what it needed and what it unlocks.
  const hoverLit = $derived.by(() => {
    if (!hoveredId) return new Set();
    const lit = upstreamOf(hoveredId);
    for (const dep of downstreamOf(hoveredId)) lit.add(dep);
    return lit;
  });

  const STATE_LABEL = {
    granted: 'Mothership.CharacterGenerator.SkillTree.Granted',
    picked: 'Mothership.CharacterGenerator.SkillTree.Picked',
    available: 'Mothership.CharacterGenerator.SkillTree.Available',
    unavailable: 'Mothership.CharacterGenerator.SkillTree.Unavailable',
  };

  const hover = (uuid) => { hoveredId = uuid; };
  const unhover = (uuid) => { if (hoveredId === uuid) hoveredId = null; };

  const choosable = (skill) => skill.state === 'available' || skill.state === 'picked';

  function choose(skill) {
    if (!choosable(skill)) return;
    onchoose(skill.uuid);
  }

  // Prevents mousedown's default so clicking an unchoosable row leaves no focus ring behind;
  // it stays reachable and focusable by keyboard, where the ring is meaningful.
  const holdFocus = (event, skill) => { if (!choosable(skill)) event.preventDefault(); };
</script>

<div class="skill-selector" role="group" aria-label={localize('Mothership.CharacterGenerator.SkillTree.Label')}>
  <div class="skill-selector-readout">
    <div class="skill-selector-field is-entry">
      <span class="skill-selector-label">{localize('Mothership.CharacterGenerator.SkillTree.Skill')}</span>
      <div class="skill-selector-entry">
        <span class="skill-selector-entry-name" class:is-blank={!hovered}>{hovered?.name ?? '—'}</span>
        {#if hovered?.reason === 'strands'}
          <span class="skill-selector-note">
            {localize('Mothership.CharacterGenerator.SkillTree.WouldStrandMaster')}
          </span>
        {:else if hovered?.reason === 'spent'}
          <span class="skill-selector-note">
            {format('Mothership.CharacterGenerator.SkillTree.NoPicksLeft', { rank: localize(RANK_LABEL[hovered.rank]) })}
          </span>
        {/if}
      </div>
      <p class="skill-selector-entry-text">{hovered?.summary ?? ''}</p>
    </div>

    <div class="skill-selector-split">
      <div class="skill-selector-field">
        <span class="skill-selector-label">{localize('Mothership.CharacterGenerator.SkillTree.Requires')}</span>
        <div class="skill-selector-chips">
          {#if !hovered}
            <span class="skill-selector-blank">—</span>
          {:else if hovered.prerequisites.length === 0}
            <span class="skill-selector-blank">{localize('Mothership.CharacterGenerator.SkillTree.NoPrerequisites')}</span>
          {:else}
            {#each hovered.prerequisites as req, index (req)}
              {#if index > 0}<span class="skill-selector-conj">{localize('Mothership.CharacterGenerator.SkillTree.Or')}</span>{/if}
              <span class="skill-selector-chip" class:met={held(req)} class:unmet={!held(req)}>
                {byUuid.get(req)?.name ?? req}
              </span>
            {/each}
          {/if}
        </div>
      </div>

      <div class="skill-selector-field">
        <span class="skill-selector-label">{localize('Mothership.CharacterGenerator.SkillTree.Unlocks')}</span>
        <div class="skill-selector-chips">
          {#if hoveredUnlocks.length === 0}
            <span class="skill-selector-blank">—</span>
          {:else}
            {#each hoveredUnlocks as dep (dep)}
              <span class="skill-selector-chip met">{byUuid.get(dep)?.name ?? dep}</span>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>

  <div class="skill-selector-columns">
    {#each columns as column (column.rank)}
      <div class="skill-selector-column" data-rank={column.rank}>
        <div class="skill-selector-column-head">
          <h4>{localize(RANK_LABEL[column.rank])}</h4>
          <span class="skill-selector-bonus" class:is-spent={column.remaining === 0}>
            +{column.bonus}{#if column.remaining !== null} · {column.remaining === 0
              ? localize('Mothership.CharacterGenerator.SkillTree.NoneLeft')
              : format('Mothership.CharacterGenerator.SkillTree.SlotsRemaining', { count: column.remaining })}{/if}
          </span>
        </div>
        <div class="skill-selector-list">
          {#each column.skills as skill (skill.uuid)}
            <button
              type="button"
              class="skill-selector-row is-{skill.state}"
              class:is-lit={ownedLit.has(skill.uuid)}
              class:is-hover-lit={hoverLit.has(skill.uuid)}
              aria-pressed={skill.state === 'granted' || skill.state === 'picked'}
              aria-disabled={!choosable(skill)}
              aria-label={`${skill.name}, ${localize(STATE_LABEL[skill.state])}`}
              data-skill={skill.uuid}
              data-state={skill.state}
              data-reason={skill.reason ?? null}
              onmousedown={(event) => holdFocus(event, skill)}
              onmouseenter={() => hover(skill.uuid)}
              onfocus={() => hover(skill.uuid)}
              onmouseleave={() => unhover(skill.uuid)}
              onblur={() => unhover(skill.uuid)}
              onclick={() => choose(skill)}
            >
              <span class="skill-selector-dot"></span>
              <span class="skill-selector-name">{skill.name}</span>
              {#if (dependents.get(skill.uuid) ?? []).length > 0}
                <span class="skill-selector-chev">&rsaquo;</span>
              {:else}
                <span></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  @layer system {
    .skill-selector {
      --skillselector-transition: 150ms ease;
      --skillselector-edge: var(--border-neutral-ink);
      --skillselector-rule: var(--border-neutral-medium);
      --skillselector-picked-surface: var(--surface-neutral-lowest);
      --skillselector-picked-text: var(--text-inverted);
      --skillselector-hover-surface: color-mix(in srgb, var(--surface-neutral-lowest) 7%, var(--surface-neutral-paper));
      --skillselector-muted: var(--text-secondary);
      --skillselector-warn-stripe: color-mix(in srgb, var(--border-warning) 12%, transparent);
      --skillselector-warn-border: color-mix(in srgb, var(--border-warning) 45%, transparent);

      display: flex;
      flex-direction: column;
      border: var(--border-width-1) solid var(--skillselector-rule);
      border-radius: var(--radius-md);
      font-family: var(--font-sans-mothership);
    }

    .skill-selector-readout {
      border-bottom: var(--border-width-2) solid var(--skillselector-edge);
    }

    .skill-selector-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 0;
      padding: var(--space-8) var(--space-12);
    }

    .skill-selector-field.is-entry {
      border-bottom: var(--border-width-1) solid var(--skillselector-rule);
    }

    /* Doubled for specificity to beat the wizard's typography reset. */
    .skill-selector-label.skill-selector-label {
      font-family: var(--font-display);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      letter-spacing: var(--letter-spacing-wider);
      color: var(--skillselector-muted);
    }

    /* Heights are fixed so the tree below doesn't shift as the hovered entry changes; text
       clamps, chips scroll sideways. */
    .skill-selector-entry {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-12);
      height: 1.5rem;
      overflow: hidden;
    }

    .skill-selector-entry-name {
      min-width: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .skill-selector-entry-name.is-blank {
      color: var(--skillselector-muted);
    }

    .skill-selector-note {
      flex: none;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--text-warning-muted);
      white-space: nowrap;
    }

    .skill-selector-entry-text {
      margin: 0;
      /* Two lines of its own text, so the clamp crops nothing the fixed height then hides. */
      height: calc(var(--line-height-tight) * 2em);
      font-size: var(--font-size-md);
      line-height: var(--line-height-tight);
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
    }

    .skill-selector-split {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .skill-selector-split .skill-selector-field + .skill-selector-field {
      border-left: var(--border-width-1) solid var(--skillselector-rule);
    }

    /* `blank` prints "No prerequisites", not only the placeholder dash — it reads as text and
       is inked as text. */
    .skill-selector-blank,
    .skill-selector-conj {
      flex: none;
      font-size: var(--font-size-md);
      color: var(--skillselector-muted);
      white-space: nowrap;
    }

    .skill-selector-chips {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: var(--space-6);
      min-width: 0;
      height: 1.5rem;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .skill-selector-chip {
      display: inline-flex;
      flex: none;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-2) var(--space-8) var(--space-2) var(--space-6);
      border: var(--border-width-1) solid var(--skillselector-rule);
      border-radius: var(--radius-full);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
    }

    .skill-selector-chip::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
      background: currentcolor;
    }

    /* accent-secondary measures 4.42:1 on paper — one step darker clears the floor. */
    .skill-selector-chip.met { border-color: var(--border-accent); color: var(--text-accent-tertiary); }
    .skill-selector-chip.unmet { border-color: var(--border-danger); color: var(--text-danger-secondary); }

    .skill-selector-columns {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .skill-selector-column {
      padding: var(--space-12);
      border-left: var(--border-width-1) solid var(--skillselector-rule);
    }

    .skill-selector-column:first-child { border-left: 0; }

    .skill-selector-column-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-8);
      margin-bottom: var(--space-8);
      padding-bottom: var(--space-6);
      border-bottom: var(--border-width-2) solid var(--skillselector-edge);
    }

    /* Doubled for specificity to beat the wizard's typography reset. */
    .skill-selector-column-head.skill-selector-column-head h4 {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-md);
      letter-spacing: 0.03em;
    }

    .skill-selector-bonus {
      flex: none;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--skillselector-muted);
    }

    .skill-selector-bonus.is-spent {
      color: var(--text-warning-muted);
    }

    .skill-selector-list {
      display: flex;
      flex-direction: column;
      /* Must clear the 3px picked+hover-lit ring so rows never look like they touch. */
      gap: var(--space-8);
    }

    .skill-selector-row {
      position: relative;
      display: grid;
      grid-template-columns: 1rem minmax(0, 1fr) 1.1rem;
      align-items: center;
      gap: var(--space-8);
      width: 100%;
      padding: var(--space-6) var(--space-8) var(--space-6) var(--space-6);
      /* Always 2px, transparent by default, so a state's border color doesn't reflow neighbours. */
      border: var(--border-width-2) solid transparent;
      border-radius: var(--radius-md);
      /* Explicit, not `none` — the e2e contrast check measures the declared background. */
      background: var(--surface-neutral-paper);
      color: inherit;
      height: auto;
      min-height: 0;
      text-align: left;
      cursor: pointer;
      outline: var(--border-width-2) dotted transparent;
      outline-offset: 1px;
      transition:
        background var(--skillselector-transition),
        border-color var(--skillselector-transition),
        box-shadow var(--skillselector-transition),
        outline-color var(--skillselector-transition);
    }

    .skill-selector-name {
      font-size: var(--font-size-md);
      overflow-wrap: anywhere;
      transition: color var(--skillselector-transition);
    }

    .skill-selector-dot {
      width: 0.9rem;
      height: 0.9rem;
      border-radius: var(--radius-full);
      border: var(--border-width-2) solid var(--border-neutral-strong);
      background: var(--surface-neutral-paper);
      transition: background var(--skillselector-transition), border-color var(--skillselector-transition);
    }

    .skill-selector-dot::after {
      content: '';
      display: block;
      width: 0.4rem;
      height: 0.4rem;
      margin: 0.15rem;
      border-radius: var(--radius-full);
      background: transparent;
      transform: scale(0);
      transition: transform var(--skillselector-transition), background var(--skillselector-transition);
    }

    .skill-selector-chev {
      display: flex;
      align-items: center;
      justify-self: end;
      align-self: stretch;
      color: var(--skillselector-muted);
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      line-height: 1;
      transition: color var(--skillselector-transition), transform var(--skillselector-transition);
    }

    .skill-selector-row.is-available:hover,
    .skill-selector-row.is-available:focus-visible {
      background: var(--skillselector-hover-surface);
    }
    .skill-selector-row.is-available:hover .skill-selector-dot,
    .skill-selector-row.is-available:focus-visible .skill-selector-dot {
      border-color: var(--skillselector-edge);
    }
    .skill-selector-row.is-available:hover .skill-selector-chev,
    .skill-selector-row.is-available:focus-visible .skill-selector-chev {
      color: var(--text-primary);
    }

    /* Ink applies to the row itself, not just the name, so the e2e contrast probe measures the
       colors actually painted (inherited by every descendant). */
    .skill-selector-row.is-picked {
      background: var(--skillselector-picked-surface);
      border-color: var(--skillselector-picked-surface);
      color: var(--skillselector-picked-text);
    }
    .skill-selector-row.is-picked .skill-selector-dot { background: var(--skillselector-picked-text); border-color: var(--skillselector-picked-text); }
    .skill-selector-row.is-picked .skill-selector-dot::after { background: var(--skillselector-picked-surface); transform: scale(1); }
    .skill-selector-row.is-picked .skill-selector-chev { color: var(--skillselector-picked-text); }

    .skill-selector-row.is-granted {
      border-color: var(--skillselector-edge);
      cursor: default;
    }
    .skill-selector-row.is-granted .skill-selector-dot {
      background: var(--border-accent);
      border-color: var(--border-accent);
    }
    .skill-selector-row.is-granted .skill-selector-chev { color: var(--skillselector-muted); }

    .skill-selector-row.is-unavailable {
      cursor: not-allowed;
    }
    .skill-selector-row.is-unavailable .skill-selector-dot { visibility: hidden; }
    .skill-selector-row.is-unavailable .skill-selector-name { color: var(--skillselector-muted); }
    .skill-selector-row.is-unavailable .skill-selector-chev { color: var(--border-neutral-strong); }

    /* Opacity fades rather than swapping background-image — gradients don't interpolate reliably
       across browsers. */
    .skill-selector-row.is-unavailable::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: calc(var(--radius-md) - 1px);
      background-image: repeating-linear-gradient(135deg, var(--skillselector-warn-stripe) 0 5px, transparent 5px 11px);
      opacity: 0;
      transition: opacity var(--skillselector-transition);
      pointer-events: none;
    }
    .skill-selector-row.is-unavailable:hover::before,
    .skill-selector-row.is-unavailable:focus-visible::before {
      opacity: 1;
    }
    .skill-selector-row.is-unavailable:hover,
    .skill-selector-row.is-unavailable:focus-visible {
      border-color: var(--skillselector-warn-border);
    }
    .skill-selector-row.is-unavailable:hover .skill-selector-name,
    .skill-selector-row.is-unavailable:focus-visible .skill-selector-name {
      color: var(--text-warning-muted);
    }
    .skill-selector-row.is-unavailable:hover .skill-selector-chev,
    .skill-selector-row.is-unavailable:focus-visible .skill-selector-chev {
      color: var(--text-warning-muted);
    }

    /* is-hover-lit uses outline rather than border so it layers over is-lit/granted/picked
       without conflicting. */
    .skill-selector-row.is-lit:not(.is-picked):not(.is-granted) {
      border-color: var(--border-accent);
    }
    .skill-selector-row.is-lit .skill-selector-chev,
    .skill-selector-row.is-hover-lit .skill-selector-chev {
      color: var(--border-accent);
      transform: translateX(2px);
    }
    .skill-selector-row.is-granted.is-lit,
    .skill-selector-row.is-picked.is-lit { box-shadow: 0 0 0 2px var(--border-accent) inset; }

    .skill-selector-row.is-hover-lit { outline-color: var(--border-accent); }

    /* Rings are inset so a row's box size never changes when a ring is added. */
    .skill-selector-row.is-granted.is-hover-lit,
    .skill-selector-row.is-picked.is-hover-lit {
      outline-color: transparent;
    }
    .skill-selector-row.is-granted.is-hover-lit { box-shadow: 0 0 0 2px var(--border-accent) inset; }
    .skill-selector-row.is-picked.is-hover-lit { box-shadow: 0 0 0 3px var(--border-accent) inset; }

    /* `outline` is already used for hover-lit above; this reclaims it for keyboard focus. */
    .skill-selector-row:focus-visible {
      outline-style: solid;
      outline-color: var(--skillselector-edge);
    }

    @media (max-width: 40rem) {
      .skill-selector-columns {
        grid-template-columns: 1fr;
      }
      .skill-selector-column {
        border-left: 0;
        border-top: var(--border-width-1) solid var(--skillselector-rule);
      }
      .skill-selector-column:first-child { border-top: 0; }
    }
  }
</style>
