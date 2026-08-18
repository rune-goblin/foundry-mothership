<script>
  // The whole skill catalog in three columns by rank, always visible — no per-slot accordion to
  // open one at a time. A skill's state (granted/picked/available/unavailable) is the draft's own
  // judgment, handed in as a prop; this component only draws the tree from it and reports a toggle
  // back up. `budget` is optional — the wizard passes remaining picks per rank, a future sheet use
  // can leave it out and skip the counters entirely.
  import { localize, format } from '../../i18n.ts';
  import { RANK_LABEL } from './picks.js';

  let { skills, budget = null, onchoose } = $props();

  const RANK_BONUS = { Trained: 10, Expert: 15, Master: 20 };
  const RANKS = ['Trained', 'Expert', 'Master'];

  // The book's own order within each rank; a skill the catalog defines but this list does not
  // know about is appended by name rather than dropped.
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

  // The reverse edge of `prerequisites`: every skill a given skill is itself one step toward.
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

  // A standing fact — everything on the route to something already granted or picked — stays lit
  // independent of the mouse. Kept apart from the hover set below so the two never draw
  // identically: a route you already hold reads differently from the route to wherever the
  // cursor happens to be right now.
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

  // Both directions from whatever is hovered or focused: what it needed, so hovering a skill you
  // don't have yet previews its route in, and what it leads to, so hovering one you do have shows
  // what it opened up.
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

  // A row that cannot be chosen must leave nothing behind when it is clicked: it is still a button,
  // so the press would focus it and the focus ring would sit there afterwards reading as a
  // selection. Refusing the mousedown's default keeps the row hoverable and still reachable by
  // keyboard, where a focus ring means what it says.
  const holdFocus = (event, skill) => { if (!choosable(skill)) event.preventDefault(); };
</script>

<div class="skill-selector" role="group" aria-label={localize('Mothership.CharacterGenerator.SkillTree.Label')}>
  <div class="skill-selector-desc">
    {#if hovered}
      <span class="skill-selector-desc-name">{hovered.name}</span>
      <p class="skill-selector-desc-text">{hovered.summary}</p>
    {:else}
      <p class="skill-selector-desc-text">{localize('Mothership.CharacterGenerator.SkillTree.DescHint')}</p>
    {/if}
  </div>

  <div class="skill-selector-info">
    <div class="skill-selector-info-line">
      {#if !hovered}
        <span class="skill-selector-info-muted">{localize('Mothership.CharacterGenerator.SkillTree.HoverHint')}</span>
      {:else if hovered.reason === 'spent'}
        <!-- Its prerequisites are beside the point: nothing of this rank can be taken at all until
             a pick is freed, and that is a fact about the budget, not about the skill. -->
        <span class="skill-selector-info-name">{hovered.name}</span>
        <span class="skill-selector-info-warn">
          {format('Mothership.CharacterGenerator.SkillTree.NoPicksLeft', { rank: localize(RANK_LABEL[hovered.rank]) })}
        </span>
      {:else if hovered.prerequisites.length === 0}
        <span class="skill-selector-info-name">{hovered.name}</span>
        <span class="skill-selector-info-muted">{localize('Mothership.CharacterGenerator.SkillTree.NoPrerequisites')}</span>
      {:else}
        <span class="skill-selector-info-name">
          {hovered.name} {localize('Mothership.CharacterGenerator.SkillTree.Requires')}
        </span>
        <span class="skill-selector-chips">
          {#each hovered.prerequisites as req, index (req)}
            {#if index > 0}<span class="skill-selector-info-muted">{localize('Mothership.CharacterGenerator.SkillTree.Or')}</span>{/if}
            <span class="skill-selector-chip" class:met={held(req)} class:unmet={!held(req)}>
              {byUuid.get(req)?.name ?? req}
            </span>
          {/each}
        </span>
      {/if}
    </div>
    <div class="skill-selector-info-line" class:is-empty={hoveredUnlocks.length === 0}>
      <span class="skill-selector-info-name">{localize('Mothership.CharacterGenerator.SkillTree.Unlocks')}</span>
      <span class="skill-selector-chips">
        {#each hoveredUnlocks.length ? hoveredUnlocks : ['—'] as dep (dep)}
          <span class="skill-selector-chip met">{dep === '—' ? '—' : byUuid.get(dep)?.name ?? dep}</span>
        {/each}
      </span>
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
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies. */
  @layer system {
    .skill-selector {
      --skillselector-transition: 150ms ease;
      --skillselector-edge: var(--border-neutral-ink);
      --skillselector-rule: var(--border-neutral-medium);
      --skillselector-picked-surface: var(--surface-neutral-lowest);
      --skillselector-picked-text: var(--text-inverted);
      --skillselector-granted-surface: var(--surface-neutral-highest);
      --skillselector-muted: var(--text-secondary);
      --skillselector-warn-stripe: color-mix(in srgb, var(--border-warning) 12%, transparent);
      --skillselector-warn-border: color-mix(in srgb, var(--border-warning) 45%, transparent);

      display: flex;
      flex-direction: column;
      border: var(--border-width-1) solid var(--skillselector-rule);
      border-radius: var(--radius-md);
      font-family: var(--font-sans-mothership);
    }

    .skill-selector-desc,
    .skill-selector-info {
      display: flex;
      align-items: baseline;
      gap: var(--space-10);
      padding: var(--space-8) var(--space-12);
      border-bottom: var(--border-width-1) solid var(--skillselector-rule);
      background: var(--skillselector-granted-surface);
      font-size: var(--font-size-sm);
      color: var(--skillselector-muted);
    }

    /* Book entries run from one short sentence to a long one; clamped to two lines at a fixed
       height (not a min-height) so the box the tree sits under never grows or shrinks as the
       hovered skill's entry gets longer or shorter — the fourth wiggle source alongside the two
       info-lines below and the rows' own rings, all fixed the same way: an explicit height content
       is capped to, never one content is left free to stretch. */
    .skill-selector-desc {
      align-items: flex-start;
      height: 2.7rem;
      overflow: hidden;
    }

    .skill-selector-info {
      flex-direction: column;
      gap: var(--space-4);
      background: none;
    }

    /* A fixed, explicit height, not a `min-height` guess — a chip pill and a plain text line
       don't naturally render at quite the same height, and a longer Requires/Unlocks list (some
       skills chain three or four) would otherwise wrap to a second line and grow the box every
       time the hovered skill changes. Content never wraps here; `.skill-selector-chips` scrolls
       sideways instead, so the line's height truly cannot vary with what it's showing. */
    .skill-selector-info-line {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-wrap: nowrap;
      height: 1.75rem;
      overflow: hidden;
    }

    .skill-selector-info-line.is-empty {
      visibility: hidden;
    }

    .skill-selector-desc-name,
    .skill-selector-info-name {
      flex: none;
      white-space: nowrap;
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
    }

    .skill-selector-desc-text {
      margin: 0;
      line-height: var(--line-height-tight);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
    }

    .skill-selector-info-muted,
    .skill-selector-info-warn {
      white-space: nowrap;
    }

    .skill-selector-info-warn {
      color: var(--text-warning-muted);
    }

    .skill-selector-chips {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: var(--space-6);
      min-width: 0;
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
      font-size: var(--font-size-xs);
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

    .skill-selector-chip.met { border-color: var(--border-accent); color: var(--text-accent-secondary); }
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

    .skill-selector-column-head h4 {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-sm);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .skill-selector-bonus {
      flex: none;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--skillselector-muted);
    }

    /* The whole column is greyed out when the last pick of its rank is spent; the count is the only
       thing on the page that says why, so it answers in the same ink the rows below it use for
       "you cannot act here". */
    .skill-selector-bonus.is-spent {
      color: var(--text-warning-muted);
    }

    .skill-selector-list {
      display: flex;
      flex-direction: column;
      /* Wide enough that even the thickest ring any row draws (the 3px picked+hover-lit shadow
         below) never visually touches a neighbour, whether that shadow is inset or not — a row's
         own box never grows or shrinks, but a gap this tight would still look like it does. */
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
      border: var(--border-width-1) solid transparent;
      border-radius: var(--radius-md);
      /* Explicit, not `none` — every state needs a real declared background for the e2e contrast
         check to measure against, not the paper surface it happens to inherit visually. */
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
      font-size: var(--font-size-sm);
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

    /* available: an open pick, waiting */
    .skill-selector-row.is-available:hover,
    .skill-selector-row.is-available:focus-visible {
      background: var(--skillselector-granted-surface);
      border-color: var(--border-neutral-strong);
    }

    /* picked: this session's answer — filled dot, filled row, and clicking it again clears it */
    .skill-selector-row.is-picked {
      background: var(--skillselector-picked-surface);
      border-color: var(--skillselector-picked-surface);
    }
    .skill-selector-row.is-picked .skill-selector-name { color: var(--skillselector-picked-text); }
    .skill-selector-row.is-picked .skill-selector-dot { background: var(--skillselector-picked-text); border-color: var(--skillselector-picked-text); }
    .skill-selector-row.is-picked .skill-selector-dot::after { background: var(--skillselector-picked-surface); transform: scale(1); }
    .skill-selector-row.is-picked .skill-selector-chev { color: var(--skillselector-picked-text); }

    /* granted: the class handed it out, nothing to decide — locked on, quieter than a fresh pick */
    .skill-selector-row.is-granted {
      background: var(--skillselector-granted-surface);
      border-color: var(--skillselector-rule);
      cursor: default;
    }
    .skill-selector-row.is-granted .skill-selector-dot {
      background: var(--border-accent);
      border-color: var(--border-accent);
    }
    .skill-selector-row.is-granted .skill-selector-chev { color: var(--border-neutral-strong); }

    /* unavailable: no open slot can take it yet. The dot itself is hidden, not just dimmed, so a
       dot's mere presence always means "you can act on this row" — an empty ring next to another
       empty ring barely reads as different, an absent one doesn't. */
    .skill-selector-row.is-unavailable {
      cursor: not-allowed;
    }
    .skill-selector-row.is-unavailable .skill-selector-dot { visibility: hidden; }
    .skill-selector-row.is-unavailable .skill-selector-name { color: var(--skillselector-muted); }
    .skill-selector-row.is-unavailable .skill-selector-chev { color: var(--border-neutral-strong); }

    /* Hovering an unavailable row gets its own language — amber hatching, not the solid dark fill
       an available row uses on hover — so "can't take this yet" never reads as "nothing happened".
       A ::before layer fades via opacity rather than swapping background-image, since gradients
       don't interpolate reliably across browsers. */
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

    /* Two different facts, two different line styles. is-lit (solid border/ring) is a standing
       fact — this skill is on the route to something already granted or picked, true regardless
       of the mouse. is-hover-lit (dotted, via `outline` rather than `border` so it layers over
       is-lit/is-granted/is-picked without a style conflict) is only true while the cursor or
       keyboard focus sits on the skill that leads to or from it. */
    .skill-selector-row.is-lit:not(.is-picked):not(.is-granted) {
      border-color: var(--border-accent);
    }
    .skill-selector-row.is-lit .skill-selector-chev,
    .skill-selector-row.is-hover-lit .skill-selector-chev {
      color: var(--border-accent);
      transform: translateX(2px);
    }
    .skill-selector-row.is-granted.is-lit { box-shadow: 0 0 0 1px var(--border-accent) inset; }
    .skill-selector-row.is-picked.is-lit { box-shadow: 0 0 0 2px var(--border-accent) inset; }

    .skill-selector-row.is-hover-lit { outline-color: var(--border-accent); }

    /* A skill already held reads its own ring, not a second dotted one layered on top of it —
       hovering its route just thickens the ring it is already wearing. Every ring here is inset:
       drawn inside the row's own border box, never outside it, so a row's footprint on the page —
       and the gap to its neighbours — never changes no matter which ring is showing. */
    .skill-selector-row.is-granted.is-hover-lit,
    .skill-selector-row.is-picked.is-hover-lit {
      outline-color: transparent;
    }
    .skill-selector-row.is-granted.is-hover-lit { box-shadow: 0 0 0 2px var(--border-accent) inset; }
    .skill-selector-row.is-picked.is-hover-lit { box-shadow: 0 0 0 3px var(--border-accent) inset; }

    /* Reclaims a visible keyboard-focus ring now that `outline` is spoken for above — solid, and
       in the system's ink rather than accent, so tabbing through the tree never reads as a route
       highlight. */
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
