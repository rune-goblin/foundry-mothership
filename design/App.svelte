<script>
  // The Live Tokens editor panel's shell: a sticky rail that collapses to its icon column, a radio
  // group at the top choosing the view, and one nav item per section of whatever that view shows.
  import { tick } from 'svelte';
  import ThemeTokens from './pages/ThemeTokens.svelte';
  import ComponentTokens from './pages/ComponentTokens.svelte';
  import Components from './pages/Components.svelte';
  import { themeTokens, themeTokenCount } from './lib/theme-tokens.js';
  import { families, remainingBlocks } from './lib/families.js';
  import { componentTokens, componentTokenCount } from './lib/component-tokens.js';
  import { cases, groups } from './lib/catalog.js';
  import { clipboard } from './lib/copy.svelte.js';

  const VIEWS = [
    { id: 'tokens', label: 'Theme tokens', component: ThemeTokens, count: themeTokenCount },
    {
      id: 'component-tokens',
      label: 'Component tokens',
      component: ComponentTokens,
      count: componentTokenCount,
    },
    { id: 'components', label: 'Components', component: Components, count: cases.length },
  ];

  /** "Typography — sizes" is the Typography family; "Space — the value is the name" is Space. */
  const familyName = (title) => title.split(' — ')[0];

  /**
   * What the rail calls a group. The family alone is enough where it is unique, and where several
   * groups share one — Typography has five — the qualifier after the dash is the whole distinction.
   */
  function railLabel(title) {
    const [head, ...rest] = title.split(' — ');
    const shared = themeTokens.filter((block) => !block.heading && familyName(block.title) === head);
    if (shared.length < 2 || rest.length === 0) return head;
    const qualifier = rest.join(' — ').split('. ')[0];
    return `${head} — ${qualifier}`;
  }

  /** An icon per section, picked off what the section is. Font Awesome comes from Foundry's build. */
  function icon(title) {
    const what = title.toLowerCase();
    if (/colour|color|neutral|danger|success|warning|alternate|canvas|brand|accent|special|info/.test(what))
      return 'fa-solid fa-palette';
    if (what.startsWith('surface')) return 'fa-solid fa-layer-group';
    if (what.startsWith('border')) return 'fa-solid fa-border-top-left';
    if (what.startsWith('text')) return 'fa-solid fa-a';
    if (what.startsWith('typography') || what.startsWith('the sizes')) return 'fa-solid fa-font';
    if (what.startsWith('space')) return 'fa-solid fa-ruler-combined';
    if (what.startsWith('radius')) return 'fa-solid fa-border-style';
    if (what.startsWith('gradient')) return 'fa-solid fa-droplet';
    if (what.startsWith('effect') || what.startsWith('shadow')) return 'fa-solid fa-cloud';
    if (what.startsWith('invariant')) return 'fa-solid fa-lock';
    return 'fa-solid fa-sliders';
  }

  const GALLERY_ICONS = {
    Primitives: 'fa-solid fa-cube',
    Sections: 'fa-solid fa-table-cells-large',
    'Item bodies': 'fa-solid fa-box-open',
    'Dialog bodies': 'fa-solid fa-comment',
    Windows: 'fa-solid fa-window-maximize',
  };

  /** The rail's contents for each view: a heading is a divider, everything else is a jump target. */
  const RAILS = {
    tokens: [
      { kind: 'divider', id: 'colour', label: 'Colour' },
      ...families.map((entry) => ({
        kind: 'item',
        id: entry.id,
        label: familyName(entry.title),
        icon: 'fa-solid fa-palette',
        count: entry.count,
      })),
      ...remainingBlocks.map((block) =>
        block.heading
          ? { kind: 'divider', id: block.id, label: familyName(block.title) }
          : {
              kind: 'item',
              id: block.id,
              // Five groups share the family "Typography", so the rail says which one. A group
              // with no title is the composite styles, which the heading above it names.
              label: block.title ? railLabel(block.title) : 'Composite styles',
              icon: icon(block.title || 'typography'),
              count: block.tokens.length,
            },
      ),
    ],
    'component-tokens': componentTokens.map((component) => ({
      kind: 'item',
      id: `c-${component.name}`,
      label: component.name,
      icon: 'fa-solid fa-cube',
      count: component.tokens.length,
    })),
    components: groups.flatMap((group) => [
      { kind: 'divider', id: `g-${group.replace(/\s+/g, '-')}`, label: group },
      ...cases
        .filter((entry) => entry.group === group)
        .map((entry) => ({
          kind: 'item',
          id: entry.id,
          label: entry.title,
          icon: GALLERY_ICONS[group] ?? 'fa-solid fa-cube',
        })),
    ]),
  };

  const routeFromHash = () => location.hash.replace(/^#\/?/, '') || VIEWS[0].id;

  let route = $state(routeFromHash());
  let condensed = $state(false);
  let here = $state('');
  let foundryAssets = $state(true);
  // Every token's live value is read off this node; the pages resolve against it rather than
  // inheriting, because the app's own chrome is deliberately outside `.mothership`.
  let scope = $state(null);

  const clip = clipboard();

  $effect(() => {
    const sync = () => {
      route = routeFromHash();
      here = '';
    };
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  });

  $effect(() => {
    fetch('/foundry/css/foundry2.css', { method: 'HEAD' })
      .then((response) => (foundryAssets = response.ok))
      .catch(() => (foundryAssets = false));
  });

  const View = $derived(VIEWS.find((view) => view.id === route)?.component ?? ThemeTokens);
  const rail = $derived(RAILS[route] ?? []);

  /** The target only exists once the view has rendered, hence the tick. */
  async function jump(id) {
    here = id;
    await tick();
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function show(id) {
    route = id;
    here = '';
    history.replaceState(null, '', `#/${id}`);
  }
</script>

<!-- The scope the tokens are declared on, present so the pages can read their computed values. -->
<div class="mothership" bind:this={scope} aria-hidden="true" style="display: none;"></div>

<div class="ds-app" class:condensed>
  <nav class="ds-rail">
    <div class="ds-rail-toggle-row">
      <button
        type="button"
        class="ds-rail-toggle"
        aria-label={condensed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!condensed}
        onclick={() => (condensed = !condensed)}
      >
        <i class="fa-solid {condensed ? 'fa-arrow-right' : 'fa-arrow-left'}"></i>
      </button>
    </div>

    {#if !condensed}
      <div class="ds-seg-group">
        <span class="ds-seg-label">View</span>
        <div class="ds-seg" role="tablist" aria-label="View">
          {#each VIEWS as view (view.id)}
            <button
              type="button"
              role="tab"
              class="ds-seg-btn"
              class:active={route === view.id}
              aria-selected={route === view.id}
              onclick={() => show(view.id)}
            >
              <span class="ds-radio" aria-hidden="true"></span>
              <span>{view.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="ds-nav">
      {#each rail as entry (entry.id)}
        {#if entry.kind === 'divider'}
          <div class="ds-nav-divider"><span>{entry.label}</span></div>
        {:else}
          <button
            type="button"
            class="ds-nav-item"
            class:active={here === entry.id}
            title={entry.label}
            onclick={() => jump(entry.id)}
          >
            <i class={entry.icon}></i>
            <span class="ds-nav-label">{entry.label}</span>
            {#if entry.count}<span class="ds-nav-count">{entry.count}</span>{/if}
          </button>
        {/if}
      {/each}
    </div>

    {#if !condensed}
      <div class="ds-rail-footer">
        <strong>Mothership design system</strong>
        {#if foundryAssets}
          Rendering against the installed Foundry build.
        {:else}
          No installed Foundry build found, so <code>foundry2.css</code> and the icon font are
          missing — the cascade layer order and every icon come from there. Set
          <code>FOUNDRY_APP</code> and restart.
        {/if}
      </div>
    {/if}
  </nav>

  <main class="ds-content">
    <View {scope} {clip} />
  </main>
</div>
