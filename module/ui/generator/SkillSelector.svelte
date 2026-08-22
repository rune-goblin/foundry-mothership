<script>
  import { localize, format } from '../../i18n.ts';
  import { RANK_LABEL } from './picks.js';

  let { skills, budget = null, picks = [], groups = [], onchoose, onswitch = null } = $props();

  const uid = $props.id();

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

  // A group offering one package is not a question, so it offers no switch either. The index is
  // carried because `onswitch` addresses the group by its place in the class's own list.
  const switchable = $derived(
    groups.map((group, index) => ({ ...group, index })).filter((group) => group.options.length > 1),
  );

  // One chip per pick the class promised, the slots of a gated chain kept together so the chain
  // reads as one.
  const pickSets = $derived.by(() => {
    const sets = [];
    for (const pick of picks) {
      const last = sets.at(-1);
      if (last?.set === pick.set) last.picks.push(pick);
      else sets.push({ set: pick.set, picks: [pick] });
    }
    return sets;
  });

  let card = $state(null);
  let anchor = $state(null);
  let spot = $state({ top: 0, left: 0 });
  // Not $state: the popover API is the only reader, and the effect below both reads and writes it.
  let shown = false;

  const GAP = 8;

  function place() {
    if (!card || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const box = card.getBoundingClientRect();
    const right = rect.right + GAP;
    const left = right + box.width > window.innerWidth - GAP ? rect.left - GAP - box.width : right;
    const top = Math.min(rect.top - GAP, window.innerHeight - GAP - box.height);
    spot = { top: Math.max(GAP, top), left: Math.max(GAP, left) };
  }

  // A popover, so the card draws in the top layer: the pane it hangs over is the scroller, and an
  // in-flow card would be clipped by it. It follows the anchor while that pane scrolls.
  $effect(() => {
    if (!hovered || !anchor) {
      if (shown) card?.hidePopover?.();
      shown = false;
      return;
    }
    if (!shown) card?.showPopover?.();
    shown = true;
    place();
    const follow = () => place();
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    return () => {
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
  });

  const hover = (uuid, element) => { hoveredId = uuid; anchor = element; };
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
  {#if pickSets.length > 0 || switchable.length > 0}
    <div class="skill-selector-picks">
      {#if pickSets.length > 0}
        <span class="skill-selector-label">{localize('Mothership.CharacterGenerator.SkillTree.YourPicks')}</span>
      {/if}
      <div class="skill-selector-pick-sets">
        {#each pickSets as group (group.set)}
          <div class="skill-selector-pick-set">
            {#each group.picks as pick, index (pick.key)}
              {#if index > 0}<span class="skill-selector-pick-arrow" aria-hidden="true">&rarr;</span>{/if}
              <button
                type="button"
                class="skill-selector-pick"
                class:is-filled={pick.chosen !== null}
                data-pick={pick.key}
                data-rank={pick.rank}
                aria-disabled={pick.chosen === null}
                aria-describedby={pick.chosen && hoveredId === pick.chosen ? uid : null}
                title={pick.chosen ? localize('Mothership.CharacterGenerator.SkillTree.ClearPick') : null}
                onmousedown={(event) => { if (!pick.chosen) event.preventDefault(); }}
                onmouseenter={(event) => { if (pick.chosen) hover(pick.chosen, event.currentTarget); }}
                onfocus={(event) => { if (pick.chosen) hover(pick.chosen, event.currentTarget); }}
                onmouseleave={() => { if (pick.chosen) unhover(pick.chosen); }}
                onblur={() => { if (pick.chosen) unhover(pick.chosen); }}
                onclick={() => { if (pick.chosen) onchoose(pick.chosen); }}
              >
                <span class="skill-selector-pick-rank">{localize(RANK_LABEL[pick.rank])}</span>
                <span class="skill-selector-pick-name">
                  {pick.name ?? localize('Mothership.CharacterGenerator.SkillTree.ChooseOne')}
                </span>
              </button>
            {/each}
          </div>
        {/each}
      </div>
      {#each switchable as group (group.index)}
        <label class="skill-selector-swap">
          <span class="skill-selector-label">{localize('Mothership.CharacterGenerator.SkillTree.BonusOption')}</span>
          <select
            class="skill-selector-swap-select"
            data-swap={group.index}
            value={group.chosen === null ? '' : String(group.chosen)}
            onchange={(event) => onswitch?.(group.index, Number(event.currentTarget.value))}
          >
            {#if group.chosen === null}
              <option value="" disabled>{localize('Mothership.CharacterGenerator.SkillTree.ChooseOne')}</option>
            {/if}
            {#each group.options as option, index (option.name)}
              <option value={String(index)}>{option.name}</option>
            {/each}
          </select>
        </label>
      {/each}
    </div>
  {/if}

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
              aria-describedby={hoveredId === skill.uuid ? uid : null}
              data-skill={skill.uuid}
              data-state={skill.state}
              data-reason={skill.reason ?? null}
              onmousedown={(event) => holdFocus(event, skill)}
              onmouseenter={(event) => hover(skill.uuid, event.currentTarget)}
              onfocus={(event) => hover(skill.uuid, event.currentTarget)}
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

<!-- The skill's own name is left to the row the card hangs off; it carries only what a column
     has no room for. -->
<div
  bind:this={card}
  id={uid}
  class="skill-selector-card"
  class:is-open={Boolean(hovered)}
  role="tooltip"
  popover="manual"
  style="top: {spot.top}px; left: {spot.left}px"
>
  {#if hovered}
    <p class="skill-selector-card-text">{hovered.summary}</p>
    <div class="skill-selector-card-field">
      <span class="skill-selector-label">{localize('Mothership.CharacterGenerator.SkillTree.Requires')}</span>
      <div class="skill-selector-chips">
        {#if hovered.prerequisites.length === 0}
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
    <div class="skill-selector-card-field">
      <span class="skill-selector-label">{localize('Mothership.CharacterGenerator.SkillTree.Unlocks')}</span>
      <div class="skill-selector-chips">
        {#if hoveredUnlocks.length === 0}
          <span class="skill-selector-blank">{localize('Mothership.CharacterGenerator.SkillTree.NothingFurther')}</span>
        {:else}
          {#each hoveredUnlocks as dep (dep)}
            <span class="skill-selector-chip met">{byUuid.get(dep)?.name ?? dep}</span>
          {/each}
        {/if}
      </div>
    </div>
    {#if hovered.reason === 'strands'}
      <p class="skill-selector-note">{localize('Mothership.CharacterGenerator.SkillTree.WouldStrandMaster')}</p>
    {:else if hovered.reason === 'spent'}
      <p class="skill-selector-note">
        {format('Mothership.CharacterGenerator.SkillTree.NoPicksLeft', { rank: localize(RANK_LABEL[hovered.rank]) })}
      </p>
    {/if}
  {/if}
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

    .skill-selector-picks {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-8) var(--space-12);
      padding: var(--space-8) var(--space-12);
      border-bottom: var(--border-width-2) solid var(--skillselector-edge);
    }

    /* Doubled for specificity to beat the wizard's typography reset. */
    .skill-selector-label.skill-selector-label {
      font-family: var(--font-display);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      color: var(--skillselector-muted);
    }

    .skill-selector-pick-sets {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      gap: var(--space-8) var(--space-16);
    }

    /* One set is one chain: its slots stand in the order they have to be filled in. */
    .skill-selector-pick-set {
      display: flex;
      align-items: stretch;
      gap: var(--space-6);
    }

    /* Last in the row and pushed to its end: switching the package is a change to the slots
       beside it, not another slot. */
    .skill-selector-swap {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      margin-left: auto;
    }

    .skill-selector-swap-select {
      width: auto;
      padding: var(--space-4) var(--space-8);
      border: var(--border-width-2) solid var(--skillselector-edge);
      border-radius: var(--radius-md);
      background: var(--surface-neutral-paper);
      color: inherit;
      height: auto;
      min-height: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
    }

    .skill-selector-pick-arrow {
      align-self: center;
      color: var(--skillselector-muted);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
    }

    .skill-selector-pick {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-10);
      border: var(--border-width-2) dotted var(--skillselector-rule);
      border-radius: var(--radius-md);
      background: var(--surface-neutral-paper);
      color: var(--skillselector-muted);
      height: auto;
      min-height: 0;
      text-align: left;
      cursor: default;
    }

    .skill-selector-pick.is-filled {
      border-style: solid;
      border-color: var(--skillselector-edge);
      color: var(--text-primary);
      cursor: pointer;
    }

    .skill-selector-pick.is-filled:hover,
    .skill-selector-pick.is-filled:focus-visible {
      background: var(--skillselector-hover-surface);
    }

    .skill-selector-pick-rank {
      font-family: var(--font-display);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--skillselector-muted);
    }

    .skill-selector-pick-name {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
    }

    /* A popover, so it draws in the top layer and the scrolling pane cannot clip it. The UA
       centres popovers in the viewport; `inset: auto` hands placement back to the script. */
    .skill-selector-card {
      position: fixed;
      inset: auto;
      display: none;
      width: min(22rem, calc(100vw - 2 * var(--space-16)));
      margin: 0;
      padding: var(--space-10) var(--space-12);
      border: var(--border-width-2) solid var(--skillselector-edge);
      border-radius: var(--radius-md);
      background: var(--surface-neutral-paper);
      color: var(--text-primary);
      box-shadow: var(--shadow-glow-soft);
      font-family: var(--font-sans-mothership);
    }

    .skill-selector-card.is-open {
      display: grid;
      gap: var(--space-8);
    }

    .skill-selector-card-text {
      margin: 0;
      font-size: var(--font-size-md);
      line-height: var(--line-height-tight);
    }

    .skill-selector-card-field {
      display: flex;
      align-items: baseline;
      gap: var(--space-8);
      min-width: 0;
    }

    .skill-selector-card-field .skill-selector-label {
      flex: none;
    }

    .skill-selector-note {
      margin: 0;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--text-warning-muted);
    }

    /* `blank` prints "None"/"Nothing further", not a placeholder dash — it reads as text and is
       inked as text. */
    .skill-selector-blank,
    .skill-selector-conj {
      flex: none;
      font-size: var(--font-size-md);
      color: var(--skillselector-muted);
      white-space: nowrap;
    }

    .skill-selector-chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-6);
      min-width: 0;
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
