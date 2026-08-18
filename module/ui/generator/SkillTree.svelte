<script>
  // The PSG skill catalog is a many-to-many graph: several Trained skills can unlock one Expert
  // skill, and several Expert skills can unlock one Master skill. Drawing that entire graph on one
  // canvas creates shared "bus" lines which look like relationships that do not exist. This view
  // duplicates shared prerequisites into a small, explicit path for each possible pick instead.
  import { localize } from '../../i18n.ts';
  import { RANK_LABEL } from './picks.js';

  let { skills, rank, onchoose } = $props();

  const RANK_BONUS = { Trained: 10, Expert: 15, Master: 20 };

  // Keep the book's order within each target rank. World-defined skills are appended by name.
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

  const skillById = $derived(new Map(skills.map((skill) => [skill.uuid, skill])));
  const targetSkills = $derived(
    skills
      .filter((skill) => skill.rank === rank)
      .toSorted((left, right) =>
        (ORDER.get(left.name) ?? Number.MAX_SAFE_INTEGER) - (ORDER.get(right.name) ?? Number.MAX_SAFE_INTEGER)
        || left.name.localeCompare(right.name),
      ),
  );

  const stateKey = (state) => `Mothership.CharacterGenerator.SkillTree.${
    state === 'selected' ? 'Selected' : state === 'available' ? 'Available' : 'Unavailable'
  }`;
  const stateSymbol = (state) => state === 'selected' ? '✓' : state === 'available' ? '○' : '×';
  const prerequisite = (uuid) => skillById.get(uuid) ?? {
    uuid,
    name: uuid,
    rank: '',
    prerequisites: [],
    state: 'unavailable',
  };
</script>

{#snippet stateMark(state)}
  <span class="skill-tree-state {state}" aria-hidden="true">{stateSymbol(state)}</span>
{/snippet}

{#snippet prerequisiteNode(skill)}
  <span
    class="skill-path-node prerequisite"
    class:selected={skill.state === 'selected'}
    class:unavailable={skill.state !== 'selected'}
    data-prerequisite={skill.uuid}
  >
    {@render stateMark(skill.state === 'selected' ? 'selected' : 'unavailable')}
    <span>{skill.name}</span>
  </span>
{/snippet}

{#snippet prerequisiteSet(ids)}
  <span class="skill-path-set">
    {#each ids as uuid, index (uuid)}
      {#if index > 0}<span class="skill-path-or">{localize('Mothership.CharacterGenerator.SkillTree.Or')}</span>{/if}
      {@render prerequisiteNode(prerequisite(uuid))}
    {/each}
  </span>
{/snippet}

{#snippet targetNode(skill)}
  {@const stateLabel = localize(stateKey(skill.state))}
  <button
    type="button"
    class="skill-tree-node target"
    class:selected={skill.state === 'selected'}
    class:available={skill.state === 'available'}
    class:unavailable={skill.state === 'unavailable'}
    disabled={skill.state !== 'available'}
    aria-label={`${skill.name}, ${stateLabel}`}
    title={skill.summary}
    data-skill={skill.uuid}
    data-state={skill.state}
    onclick={() => onchoose(skill.uuid)}
  >
    {@render stateMark(skill.state)}
    <span class="skill-tree-name">{skill.name}</span>
    {#if skill.summary}<span class="skill-tree-summary">{skill.summary}</span>{/if}
  </button>
{/snippet}

<div
  class="skill-tree"
  class:trained={rank === 'Trained'}
  role="group"
  aria-label={localize('Mothership.CharacterGenerator.SkillTree.Label')}
  data-target-rank={rank}
>
  <header class="skill-tree-guide">
    <div class="skill-tree-rank">
      <h4>{localize(RANK_LABEL[rank])}</h4>
      <p>+{RANK_BONUS[rank]} {localize('Mothership.Bonus')}</p>
    </div>
    <p>
      {rank === 'Trained'
        ? localize('Mothership.CharacterGenerator.SkillTree.StartingSkills')
        : localize('Mothership.CharacterGenerator.SkillTree.PathHelp')}
    </p>
  </header>

  {#if rank === 'Trained'}
    <div class="skill-starting-options">
      {#each targetSkills as skill (skill.uuid)}
        {@render targetNode(skill)}
      {/each}
    </div>
  {:else}
    <div class="skill-path-options">
      {#each targetSkills as target (target.uuid)}
        <article class="skill-path-card" data-skill-path={target.uuid}>
          <div class="skill-path-routes">
            <p class="skill-path-kicker">
              {target.prerequisites.length > 1
                ? localize('Mothership.CharacterGenerator.SkillTree.AnyRoute')
                : localize('Mothership.CharacterGenerator.SkillTree.Requires')}
            </p>

            {#each target.prerequisites as directId (directId)}
              {@const direct = prerequisite(directId)}
              <div class="skill-path-route" data-route={directId}>
                {#if rank === 'Master' && direct.prerequisites.length}
                  {@render prerequisiteSet(direct.prerequisites)}
                  <span class="skill-path-arrow" aria-hidden="true">→</span>
                {/if}
                {@render prerequisiteNode(direct)}
              </div>
            {/each}
          </div>

          <span class="skill-path-arrow to-target" aria-hidden="true">→</span>
          <div class="skill-path-target">
            <span class="skill-path-rank-label">{localize(RANK_LABEL[rank])}</span>
            {@render targetNode(target)}
          </div>
        </article>
      {/each}
    </div>
  {/if}

  <div class="skill-tree-legend" aria-label={localize('Mothership.CharacterGenerator.SkillTree.Legend')}>
    {#each ['selected', 'available', 'unavailable'] as state (state)}
      <span data-legend={state}>
        {@render stateMark(state)}
        {localize(stateKey(state))}
      </span>
    {/each}
  </div>
</div>

<style>
  @layer system {
    .skill-tree {
      --skilltree-edge: var(--border-neutral-ink);
      --skilltree-rule: var(--border-neutral-medium);
      --skilltree-selected-surface: var(--surface-neutral-lowest);
      --skilltree-selected-text: var(--text-inverted);
      --skilltree-available-surface: var(--surface-neutral-paper);
      --skilltree-available-text: var(--text-primary);
      --skilltree-unavailable-surface: var(--surface-neutral-paper);
      --skilltree-unavailable-text: var(--color-neutral-700);

      padding: var(--space-12);
      border-top: var(--border-width-1) solid var(--skilltree-rule);
    }

    .skill-tree-guide {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-16);
      margin-bottom: var(--space-12);
      padding-bottom: var(--space-10);
      border-bottom: var(--border-width-2) solid var(--skilltree-edge);
      background: none;
    }

    .skill-tree-rank {
      display: flex;
      align-items: baseline;
      gap: var(--space-8);
      flex: none;
    }

    .skill-tree-guide h4,
    .skill-tree-guide p,
    .skill-path-kicker {
      margin: 0;
    }

    .skill-tree-guide h4 {
      font-family: var(--font-display);
      font-size: var(--font-size-md);
    }

    .skill-tree-rank p,
    .skill-path-kicker,
    .skill-path-rank-label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .skill-tree-guide > p {
      max-width: 48rem;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      text-align: right;
    }

    .skill-starting-options,
    .skill-path-options {
      display: grid;
      gap: var(--space-10);
    }

    .skill-starting-options {
      grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    }

    .skill-path-options {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 34rem), 1fr));
      align-items: stretch;
    }

    .skill-path-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(11rem, 14rem);
      align-items: center;
      gap: var(--space-8);
      min-width: 0;
      padding: var(--space-10);
      border: var(--border-width-1) solid var(--skilltree-rule);
      border-radius: var(--radius-md);
      background: var(--surface-neutral-paper);
    }

    .skill-path-routes {
      display: grid;
      align-content: center;
      gap: var(--space-6);
      min-width: 0;
    }

    .skill-path-kicker {
      color: var(--text-secondary);
    }

    .skill-path-route,
    .skill-path-set {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      min-width: 0;
    }

    .skill-path-set {
      flex-wrap: wrap;
    }

    .skill-path-node,
    .skill-tree-node {
      display: inline-grid;
      grid-template-columns: 1.1rem minmax(0, 1fr);
      align-items: center;
      gap: var(--space-4);
      min-width: 0;
      min-height: 2.125rem;
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-full);
      font-family: var(--font-display);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      line-height: 1.1;
      text-align: left;
    }

    .skill-path-node {
      border: var(--border-width-1) solid var(--skilltree-rule);
      background: var(--skilltree-unavailable-surface);
      color: var(--skilltree-unavailable-text);
    }

    .skill-path-node.selected,
    .skill-tree-node.selected {
      border: var(--border-width-2) solid var(--skilltree-edge);
      background: var(--skilltree-selected-surface);
      color: var(--skilltree-selected-text);
    }

    .skill-tree-node {
      width: 100%;
    }

    .skill-tree-node.available {
      border: var(--border-width-2) solid var(--skilltree-edge);
      background: var(--skilltree-available-surface);
      color: var(--skilltree-available-text);
      cursor: pointer;
    }

    .skill-tree-node.available:hover,
    .skill-tree-node.available:focus-visible {
      outline: var(--border-width-2) solid var(--skilltree-edge);
      outline-offset: var(--border-width-2);
    }

    .skill-tree-node.unavailable {
      border: var(--border-width-1) dashed var(--skilltree-rule);
      background: var(--skilltree-unavailable-surface);
      color: var(--skilltree-unavailable-text);
      cursor: not-allowed;
    }

    .skill-tree-node:disabled {
      opacity: 1;
    }

    .skill-tree-state {
      display: inline-grid;
      place-items: center;
      width: 1.1rem;
      height: 1.1rem;
      border: var(--border-width-2) solid currentcolor;
      border-radius: var(--radius-full);
      font-family: var(--font-sans-mothership);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      line-height: 1;
    }

    .skill-path-arrow {
      flex: none;
      color: var(--text-secondary);
      font-family: var(--font-display);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
    }

    .skill-path-or {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
    }

    .skill-path-target {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }

    .skill-path-rank-label {
      padding-left: var(--space-8);
      color: var(--text-secondary);
    }

    .skill-tree-name,
    .skill-path-node > span:last-child {
      overflow-wrap: anywhere;
    }

    .skill-tree-summary {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .skill-tree-legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-12);
      margin-top: var(--space-12);
      padding-top: var(--space-10);
      border-top: var(--border-width-1) solid var(--skilltree-rule);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
    }

    .skill-tree-legend > span {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
    }

    .skill-tree-legend .skill-tree-state.selected {
      background: var(--skilltree-selected-surface);
      color: var(--skilltree-selected-text);
    }

    @media (max-width: 50rem) {
      .skill-tree-guide {
        align-items: flex-start;
        flex-direction: column;
        gap: var(--space-4);
      }

      .skill-tree-guide > p {
        text-align: left;
      }

      .skill-path-card {
        grid-template-columns: minmax(0, 1fr) auto minmax(9rem, 12rem);
      }
    }

    @media (max-width: 34rem) {
      .skill-path-card {
        grid-template-columns: minmax(0, 1fr);
      }

      .skill-path-card > .to-target {
        justify-self: center;
        transform: rotate(90deg);
      }
    }
  }
</style>
