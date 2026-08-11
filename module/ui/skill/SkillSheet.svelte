<script>
  import SheetHeader from '../parts/SheetHeader.svelte';
  import CircleStats from '../parts/CircleStats.svelte';
  import Field from '../parts/Field.svelte';
  import Tabs from '../parts/Tabs.svelte';
  import TabPanel from '../parts/TabPanel.svelte';
  import Editor from '../parts/Editor.svelte';
  import ItemList from '../parts/ItemList.svelte';
  import ItemRow from '../parts/ItemRow.svelte';
  import ItemImage from '../parts/ItemImage.svelte';
  import ItemCell from '../parts/ItemCell.svelte';
  import ItemControls from '../parts/ItemControls.svelte';
  import ItemControl from '../parts/ItemControl.svelte';
  import { dropTarget } from '../parts/drop-target.js';
  import { localize } from '../i18n.js';

  let { store } = $props();

  const doc = $derived(store.current);

  const TABS = [
    { id: 'description', label: localize('Mosh.Description') },
    { id: 'skills.prerequisite', label: localize('Mosh.SkillsPrerequisite') },
  ];

  let tab = $state('description');

  // Read the stored list off the document rather than the render snapshot, so a second update in
  // the same tick still sees what the first one wrote.
  const prerequisiteIds = () => store.document.system.prerequisite_ids;

  async function addPrerequisite(data) {
    if (data?.type !== 'Item') return;

    const dropped = await fromUuid(data.uuid);
    if (dropped?.type !== 'skill') return;

    const ids = prerequisiteIds();
    if (ids.includes(dropped.uuid)) return;
    await store.document.update({ 'system.prerequisite_ids': [...ids, dropped.uuid] });
  }

  const removePrerequisite = (uuid) =>
    store.document.update({
      'system.prerequisite_ids': prerequisiteIds().filter((id) => id !== uuid),
    });

  const dropSkill = dropTarget(addPrerequisite);
</script>

<SheetHeader documentName={doc.name} img={doc.img} />
<br />

<CircleStats variant="horizontal">
  <Field
    name="system.bonus"
    label={localize('Mosh.Bonus')}
    value={doc.system.bonus}
    dtype="Number"
  />
  <Field
    name="system.rank"
    label={localize('Mosh.RANK')}
    value={doc.system.rank}
    wrapper="text"
    width="180px"
  />
</CircleStats>

<br />

<Tabs tabs={TABS} bind:active={tab} />

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

  <TabPanel tab="skills.prerequisite" active={tab} class="items" attach={dropSkill}>
    <ItemList style="margin-bottom: 10px;">
      <ItemRow header>
        <ItemImage />
        <ItemCell>{localize('Mosh.SkillName')}</ItemCell>
        <ItemCell>{localize('Mosh.SkillRank')}</ItemCell>
        <ItemCell>{localize('Mosh.SkillBonus')}</ItemCell>
        <ItemControls />
      </ItemRow>

      {#each doc.prerequisites as { key, uuid, item } (key)}
        <ItemRow itemId={uuid} draggable={false}>
          <ItemImage src={item?.img} title={item?.name} />
          <!-- A prerequisite whose skill has been deleted still has to be removable, so it shows
               its raw UUID rather than being dropped from the list behind the user's back. The
               title is what makes that legible: .skill-name clips, and a UUID does not fit. -->
          <div class="skill-name" title={item?.name ?? uuid}>{item?.name ?? uuid}</div>
          <ItemCell>{item?.system.rank ?? ''}</ItemCell>
          <ItemCell>{item?.system.bonus ?? ''}</ItemCell>
          <ItemControls>
            <ItemControl
              icon="trash"
              title={localize('Mosh.DeleteSkill')}
              onclick={() => removePrerequisite(uuid)}
            />
          </ItemControls>
        </ItemRow>
      {/each}
    </ItemList>
  </TabPanel>
</section>
