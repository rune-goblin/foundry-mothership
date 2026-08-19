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
  <!-- Three labelled fields, not three sentences. The label says what the slot holds and the slot
       holds the answer, so an empty one reads as a field waiting rather than as an instruction the
       player has to read once and never again. -->
  <div class="skill-selector-readout">
    <div class="skill-selector-field is-entry">
      <span class="skill-selector-label">{localize('Mothership.CharacterGenerator.SkillTree.Skill')}</span>
      <div class="skill-selector-entry">
        <span class="skill-selector-entry-name" class:is-blank={!hovered}>{hovered?.name ?? '—'}</span>
        <!-- Why the row cannot be taken belongs beside its name, not in Requires: both reasons are
             facts about the budget or the rank above it, and neither is answered by the chips. -->
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
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies. */
  @layer system {
    .skill-selector {
      --skillselector-transition: 150ms ease;
      --skillselector-edge: var(--border-neutral-ink);
      --skillselector-rule: var(--border-neutral-medium);
      --skillselector-picked-surface: var(--surface-neutral-lowest);
      --skillselector-picked-text: var(--text-inverted);
      /* A wash, not a step on the neutral ramp: `highest` stops at #bbb, heavy enough that a row
         wearing it reads as a second kind of selection next to the black one. Hover is not a
         state the player owns, so it gets the faintest mark that still registers. */
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

    /* The readout is the tree's masthead, so it closes on the same 2px ink rule each rank heading
       draws rather than the hairline that divides fields inside it. Nothing here is filled: the
       plate is paper, which leaves the greys free and the black spent entirely on the rows. */
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

    /* Doubled to outweigh the wizard's typography reset, which flattens case across the window —
       the same escape SkillSelector's rank headings take. A label has to look like a label here or
       it reads as more of the answer. */
    .skill-selector-label.skill-selector-label {
      font-family: var(--font-display);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: var(--letter-spacing-wider);
      text-transform: uppercase;
      color: var(--skillselector-muted);
    }

    /* Every height in this plate is explicit, never a floor content may exceed: the tree below it
       must not shift by a pixel as the hovered skill changes, and entries, prerequisite lists and
       warnings all vary in length. Text clamps, chips scroll sideways. */
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
      color: var(--text-muted);
    }

    .skill-selector-note {
      flex: none;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--text-warning-muted);
      white-space: nowrap;
    }

    .skill-selector-entry-text {
      margin: 0;
      height: 2.1rem;
      font-size: var(--font-size-sm);
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

    .skill-selector-blank,
    .skill-selector-conj {
      flex: none;
      font-size: var(--font-size-sm);
      color: var(--skillselector-muted);
      white-space: nowrap;
    }

    .skill-selector-blank {
      color: var(--text-muted);
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

    /* The class is doubled to outweigh the wizard's typography reset, which flattens case across
       everything inside that window. These four rank headings are the one thing in it that means
       to shout. */
    .skill-selector-column-head.skill-selector-column-head h4 {
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
      /* 2px on every row, transparent until a state claims it, so the outline a granted row wears
         costs its neighbours no reflow — the border box is the same on all four states. */
      border: var(--border-width-2) solid transparent;
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

    /* available: an open pick, waiting. Hover deliberately draws no border — an ink outline is the
       one thing that says "you hold this", and a row the cursor merely rests on must not borrow it.
       A wash barely off the paper and a dot that comes up to full ink are enough to say where the
       cursor is, and both vanish the moment it leaves. */
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

    /* Two rows you hold, told apart by agency rather than by tint: filled is the one you chose and
       can unchoose, outlined is the one the class handed you. Both are the same ink, so "held"
       reads at a glance across all three columns and only the fill says whether it is yours to
       change — a distinction a second grey could never carry. */

    /* picked: this session's answer — filled dot, filled row, and clicking it again clears it. The
       inverted ink sits on the row itself, not only on the name, so every descendant inherits it
       and the e2e contrast probe measures the pair that is actually painted. */
    .skill-selector-row.is-picked {
      background: var(--skillselector-picked-surface);
      border-color: var(--skillselector-picked-surface);
      color: var(--skillselector-picked-text);
    }
    .skill-selector-row.is-picked .skill-selector-dot { background: var(--skillselector-picked-text); border-color: var(--skillselector-picked-text); }
    .skill-selector-row.is-picked .skill-selector-dot::after { background: var(--skillselector-picked-surface); transform: scale(1); }
    .skill-selector-row.is-picked .skill-selector-chev { color: var(--skillselector-picked-text); }

    /* granted: the class handed it out, nothing to decide */
    .skill-selector-row.is-granted {
      border-color: var(--skillselector-edge);
      cursor: default;
    }
    .skill-selector-row.is-granted .skill-selector-dot {
      background: var(--border-accent);
      border-color: var(--border-accent);
    }
    .skill-selector-row.is-granted .skill-selector-chev { color: var(--skillselector-muted); }

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
    .skill-selector-row.is-granted.is-lit,
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
