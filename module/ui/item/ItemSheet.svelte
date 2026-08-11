<script>
  import SheetHeader from './parts/SheetHeader.svelte';
  import Editor from './parts/Editor.svelte';
  import { ITEM_BODIES, ITEM_EXTRA_TABS } from './types.js';
  import { localize } from '../i18n.js';

  let { store } = $props();

  const doc = $derived(store.current);
  const Body = $derived(ITEM_BODIES[doc.type]);
  const extra = $derived(ITEM_EXTRA_TABS[doc.type]);

  let tab = $state('description');
</script>

<SheetHeader documentName={doc.name} img={doc.img} />
<br />

<Body system={doc.system} />
<br />

<nav class="mosh sheet-tabs tabs" style="height: auto;" data-group="primary">
  <a
    class="tab-select"
    class:active={tab === 'description'}
    data-tab="description"
    href={null}
    role="tab"
    tabindex="0"
    aria-selected={tab === 'description'}
    onclick={() => (tab = 'description')}
  >
    {localize('Mosh.Description')}
  </a>
  {#if extra}
    <a
      class="tab-select"
      class:active={tab === extra.tab}
      data-tab={extra.tab}
      href={null}
      role="tab"
      tabindex="0"
      aria-selected={tab === extra.tab}
      onclick={() => (tab = extra.tab)}
    >
      {localize(extra.label)}
    </a>
  {/if}
</nav>

<br />

<section class="sheet-body">
  {#if tab === 'description'}
    <div class="tab active" data-group="primary" data-tab="description">
      <Editor
        name="system.description"
        value={doc.system.description}
        enriched={doc.enriched.description}
        uuid={doc.uuid}
      />
    </div>
  {:else if extra}
    {@const Extra = extra.component}
    <div class="tab ranges active" data-group="primary" data-tab={extra.tab}>
      <Extra system={doc.system} />
    </div>
  {/if}
</section>
