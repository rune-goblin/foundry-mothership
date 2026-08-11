<script>
  import SheetHeader from '../parts/SheetHeader.svelte';
  import Editor from '../parts/Editor.svelte';
  import Tabs from '../parts/Tabs.svelte';
  import TabPanel from '../parts/TabPanel.svelte';
  import { ITEM_BODIES, ITEM_EXTRA_TABS } from './types.js';
  import { localize } from '../i18n.js';

  let { store } = $props();

  const doc = $derived(store.current);
  const Body = $derived(ITEM_BODIES[doc.type]);
  const extra = $derived(ITEM_EXTRA_TABS[doc.type]);

  const tabs = $derived([
    { id: 'description', label: localize('Mosh.Description') },
    ...(extra ? [{ id: extra.tab, label: localize(extra.label) }] : []),
  ]);

  let tab = $state('description');
</script>

<SheetHeader documentName={doc.name} img={doc.img} />
<br />

<Body system={doc.system} />
<br />

<Tabs {tabs} bind:active={tab} />

<br />

<section class="sheet-body">
  <TabPanel tab="description" active={tab}>
    <Editor
      name="system.description"
      value={doc.system.description}
      enriched={doc.enriched.description}
      uuid={doc.uuid}
    />
  </TabPanel>

  {#if extra}
    {@const Extra = extra.component}
    <TabPanel tab={extra.tab} active={tab} class="ranges">
      <Extra system={doc.system} />
    </TabPanel>
  {/if}
</section>
