<script>
  import { cases, groups, uncovered } from '../lib/catalog.js';
  import Stage from '../parts/Stage.svelte';

  let query = $state('');

  const shown = $derived(
    cases.filter((entry) => {
      const needle = query.trim().toLowerCase();
      return (
        !needle ||
        entry.title.toLowerCase().includes(needle) ||
        entry.path.toLowerCase().includes(needle)
      );
    }),
  );
</script>

<header class="ds-page-head">
  <h1>Components</h1>
  <p>
    Every one of these is the component the system ships, imported from <code>module/</code> — not a
    copy. Edit a file here and the sheet in Foundry changes with it. Only the sample props are the
    gallery's own.
  </p>
  <p>
    <strong>{cases.length}</strong> specimens over
    <strong>{cases.length + uncovered.length}</strong> components.
  </p>
</header>

<div class="ds-toolbar">
  <input type="search" placeholder="Filter by name or path" bind:value={query} />
  <span class="ds-tally">{shown.length} shown</span>
</div>

<div class="ds-sections">
  {#each groups as group (group)}
    {@const entries = shown.filter((entry) => entry.group === group)}
    {#if entries.length}
      <section class="ds-section" id="g-{group.replace(/\s+/g, '-')}">
        <h2 class="ds-section-title">{group}</h2>
        <div class="ds-groups">
          {#each entries as entry (entry.id)}
            {@const Specimen = entry.component}
            <article class="ds-case" id={entry.id}>
              <header class="ds-case-head">
                <h3>{entry.title}</h3>
                <span class="ds-path">{entry.path}</span>
              </header>
              {#if entry.note}<p class="ds-case-note">{entry.note}</p>{/if}
              {#if entry.standIn}
                <p class="ds-case-note stand-in">Stand-in: {entry.standIn}</p>
              {/if}
              <Stage width={entry.width}>
                <Specimen />
              </Stage>
            </article>
          {/each}
        </div>
      </section>
    {/if}
  {/each}

  {#if uncovered.length}
    <section class="ds-section" id="g-uncovered">
      <h2 class="ds-section-title">No specimen yet</h2>
      <p class="ds-intro">
        Components under <code>module/</code> that no file in <code>design/gallery/</code> mounts or
        claims. Adding a specimen file is all it takes to move one out of this list.
      </p>
      <div class="ds-rows">
        {#each uncovered as path (path)}
          <div class="ds-row"><span class="ds-token-value">{path}</span></div>
        {/each}
      </div>
    </section>
  {/if}
</div>

{#if shown.length === 0}
  <p class="ds-empty">Nothing matches “{query}”.</p>
{/if}
