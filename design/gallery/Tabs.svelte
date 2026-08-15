<script module>
  export const meta = {
    group: 'Primitives',
    title: 'Tabs + TabPanel',
    path: 'module/ui/parts/Tabs.svelte',
    covers: ['module/ui/parts/TabPanel.svelte'],
    note: 'The bar binds `active`; the panel renders only when its tab is the active one. The flex row, gap and line-height come from Foundry’s own `nav.tabs`, which is why the class stays on the markup.',
  };
</script>

<script>
  import Tabs from '../../module/ui/parts/Tabs.svelte';
  import TabPanel from '../../module/ui/parts/TabPanel.svelte';

  const tabs = [
    { id: 'skills', label: 'Skills' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'armor', label: 'Armor' },
    { id: 'notes', label: 'Notes' },
  ];

  let active = $state('skills');
</script>

<Tabs {tabs} bind:active />

<TabPanel tab="skills" {active}><p>Three skills, one of them mastered.</p></TabPanel>
<TabPanel tab="weapons" {active}><p>A pulse rifle and a boarding axe.</p></TabPanel>
<TabPanel tab="armor" {active}><p>Standard battle dress, equipped.</p></TabPanel>
<TabPanel tab="notes" {active}><p>Owes the company 14,000cr.</p></TabPanel>
