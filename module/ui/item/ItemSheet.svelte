<script>
  import SheetHeader from '../parts/SheetHeader.svelte';
  import Editor from '../parts/Editor.svelte';
  import Tabs from '../parts/Tabs.svelte';
  import TabPanel from '../parts/TabPanel.svelte';
  import { ITEM_BODIES, ITEM_EXTRA_TABS } from './types.js';
  import { localize } from '../../i18n.ts';

  // No <style> block: `sheet-body` is shared across five sheets, and `ranges` (handed to
  // TabPanel) has no rule keyed off it here.
  let { store } = $props();

  const doc = $derived(store.current);
  const Body = $derived(ITEM_BODIES[doc.type]);
  const extra = $derived(ITEM_EXTRA_TABS[doc.type]);

  const tabs = $derived([
    { id: 'description', label: localize('Mothership.Description') },
    ...(extra ? [{ id: extra.tab, label: localize(extra.label) }] : []),
  ]);

  let tab = $state('description');
</script>

<SheetHeader documentName={doc.name} img={doc.img} />
<br />

<!-- `store` is for the bodies that edit a list: Foundry's form handling persists a named field,
     but an array's rows are added and removed rather than typed into. -->
<Body system={doc.system} {store} />
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
