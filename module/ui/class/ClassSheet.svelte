<script>
  import SheetHeader from '../parts/SheetHeader.svelte';
  import MainStat from '../parts/MainStat.svelte';
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
  import TextareaField from '../parts/TextareaField.svelte';
  import OptionDraft from './OptionDraft.svelte';
  import { dropTarget } from '../parts/drop-target.js';
  import { promptStatOption } from './stat-option.js';
  import { localize } from '../../i18n.ts';

  // No <style> block: every class here is shared vocabulary owned by css/mothership.css, or (the
  // `skills-*`/`stat-option-*` names) an e2e locator with no rule keyed off it.
  let { store } = $props();

  const doc = $derived(store.current);

  const TABS = [
    { id: 'description', label: localize('Mothership.Description') },
    { id: 'stats&saves', label: localize('Mothership.CharacterGenerator.StatOption') },
    { id: 'skills.fixed', label: localize('Mothership.SkillsFixed') },
    { id: 'skills.selected.and', label: localize('Mothership.SkillsOptionalAnd') },
    { id: 'skills.selected.or', label: localize('Mothership.SkillsOptionalOr') },
    { id: 'tables', label: localize('Mothership.CharacterGenerator.Tables') },
  ];

  const PICKS = [
    ['trained', 'Mothership.SkillRankTrained'],
    ['expert', 'Mothership.SkillRankExpert'],
    ['master', 'Mothership.SkillRankMaster'],
    ['expert_full_set', 'Mothership.CharacterGenerator.SkillOption.PopupFullExpertName'],
    ['master_full_set', 'Mothership.CharacterGenerator.SkillOption.PopupFullMasterName'],
  ];

  let tab = $state('description');

  // Read the stored lists off the document rather than the render snapshot, so a second update in
  // the same tick still sees what the first one wrote.
  const granted = () => store.document.system.base_adjustment.skills_granted;
  const groups = () => store.document.system.selected_adjustment.choose_skill_or;
  const chosenStats = () => store.document.system.selected_adjustment.choose_stat;

  const saveGroups = (next) =>
    store.document.update({ 'system.selected_adjustment.choose_skill_or': next });

  const saveStats = (next) =>
    store.document.update({ 'system.selected_adjustment.choose_stat': next });

  async function droppedSkill(data) {
    if (data?.type !== 'Item') return null;
    const dropped = await fromUuid(data.uuid);
    return dropped?.type === 'skill' ? dropped : null;
  }

  const already = () => void ui.notifications.warn(localize('Mothership.Errors.SkillAlreadyInList'));

  async function grantSkill(data) {
    const skill = await droppedSkill(data);
    if (!skill) return;

    const uuids = granted();
    if (uuids.includes(skill.uuid)) return already();
    await store.document.update({ 'system.base_adjustment.skills_granted': [...uuids, skill.uuid] });
  }

  const revokeSkill = (uuid) =>
    store.document.update({
      'system.base_adjustment.skills_granted': granted().filter((id) => id !== uuid),
    });

  const withGroup = (groupIndex, replace) =>
    groups().map((group, index) => (index === groupIndex ? replace(group) : group));

  const addOptionSkill = (groupIndex, optionIndex) => async (data) => {
    const skill = await droppedSkill(data);
    if (!skill) return;
    if (groups()[groupIndex][optionIndex].from_list.includes(skill.uuid)) return already();

    await saveGroups(
      withGroup(groupIndex, (group) =>
        group.map((option, index) =>
          index === optionIndex ? { ...option, from_list: [...option.from_list, skill.uuid] } : option,
        ),
      ),
    );
  };

  async function addStatOption() {
    const option = await promptStatOption();
    if (option) await saveStats([...chosenStats(), option]);
  }

  const removeStatOption = (index) => saveStats(chosenStats().filter((_, i) => i !== index));

  const addGroup = () => saveGroups([...groups(), []]);

  const removeGroup = (groupIndex) => saveGroups(groups().filter((_, i) => i !== groupIndex));

  const removeOption = (groupIndex, optionIndex) =>
    saveGroups(withGroup(groupIndex, (group) => group.filter((_, i) => i !== optionIndex)));

  const addOption = (groupIndex) => (draft) =>
    saveGroups(
      withGroup(groupIndex, (group) => [
        ...group,
        {
          name: draft.name || `Option: ${group.length + 1}`,
          from_list: [],
          // The generator counts these numerically and the generated classes store numbers; an
          // input's value is a string, so convert here rather than storing both shapes.
          ...Object.fromEntries(PICKS.map(([key]) => [key, Number(draft[key]) || 0])),
        },
      ]),
    );

  const dropGranted = dropTarget(grantSkill);
</script>

<SheetHeader documentName={doc.name} img={doc.img} />
<br />

<!-- Adjustments are written out rather than looped: an interpolated `name` is invisible to
     test/sheet-bindings.test.ts, and an undeclared SchemaField key is silently dropped. -->
<div class="grid">
  <div class="grid grid-1col widegap">
    <MainStat
      name="system.base_adjustment.strength"
      value={doc.system.base_adjustment.strength}
      label={localize('Mothership.Strength')}
      key="strength"
    />
    <MainStat
      name="system.base_adjustment.speed"
      value={doc.system.base_adjustment.speed}
      label={localize('Mothership.Speed')}
      key="speed"
    />
    <MainStat
      name="system.base_adjustment.intellect"
      value={doc.system.base_adjustment.intellect}
      label={localize('Mothership.Intellect')}
      key="intellect"
    />
    <MainStat
      name="system.base_adjustment.combat"
      value={doc.system.base_adjustment.combat}
      label={localize('Mothership.Combat')}
      key="combat"
    />
  </div>

  <div class="grid grid-1col widegap">
    <MainStat
      name="system.base_adjustment.max_wounds"
      value={doc.system.base_adjustment.max_wounds}
      label={localize('Mothership.Wounds')}
      key="max_wounds"
    />
    <MainStat
      name="system.base_adjustment.sanity"
      value={doc.system.base_adjustment.sanity}
      label={localize('Mothership.Sanity')}
      key="sanity"
    />
    <MainStat
      name="system.base_adjustment.fear"
      value={doc.system.base_adjustment.fear}
      label={localize('Mothership.Fear')}
      key="fear"
    />
    <MainStat
      name="system.base_adjustment.body"
      value={doc.system.base_adjustment.body}
      label={localize('Mothership.Body')}
      key="body"
    />

    <MainStat
      name="system.robotic"
      type="checkbox"
      checked={doc.system.robotic}
      dtype="Boolean"
      label={localize('Mothership.Robotic')}
      key="robotic"
    />
  </div>
</div>

<br />

<TextareaField
  name="system.trauma_response"
  label={localize('Mothership.TraumaResponse')}
  value={doc.system.trauma_response}
/>

<Tabs tabs={TABS} bind:active={tab} />

<section class="sheet-body">
  <TabPanel tab="description" active={tab}>
    <Editor
      name="system.description"
      value={doc.system.description}
      enriched={doc.enriched.description}
      uuid={doc.uuid}
    />
  </TabPanel>

  <TabPanel tab="stats&saves" active={tab}>
    <ItemList style="margin-bottom: 10px;">
      <ItemRow header>
        <ItemCell>{localize('Mothership.Value')}</ItemCell>
        <ItemCell>{localize('Mothership.StatsAndSaves')}</ItemCell>
        <ItemControls>
          <ItemControl
            icon="plus"
            class="stat-option-add"
            title={localize('Mothership.AddOption')}
            label={localize('Mothership.AddOption')}
            onclick={addStatOption}
          />
        </ItemControls>
      </ItemRow>

      {#each doc.system.selected_adjustment.choose_stat as option, index (index)}
        <ItemRow itemId={index} draggable={false}>
          <ItemCell variant="name" roll class="skill-roll">{option.modification}</ItemCell>
          <ItemCell>{option.stats.join(', ')}</ItemCell>
          <ItemControls>
            <ItemControl
              icon="trash"
              class="stat-option-delete"
              title={localize('Mothership.DeleteOption')}
              onclick={() => removeStatOption(index)}
            />
          </ItemControls>
        </ItemRow>
      {/each}
    </ItemList>
  </TabPanel>

  <TabPanel tab="skills.fixed" active={tab} class="items" attach={dropGranted}>
    <ItemList style="margin-bottom: 10px;">
      <ItemRow header>
        <ItemImage />
        <ItemCell>{localize('Mothership.SkillName')}</ItemCell>
        <ItemCell>{localize('Mothership.SkillRank')}</ItemCell>
        <ItemCell>{localize('Mothership.SkillBonus')}</ItemCell>
        <ItemControls />
      </ItemRow>

      {#each doc.grantedSkills as { key, uuid, item } (key)}
        <ItemRow itemId={uuid} draggable={false}>
          <ItemImage src={item?.img} title={item?.name} />
          <!-- A granted skill that has been deleted keeps its row so it can still be removed. The
               raw UUID identifies it, and .skill-name clips it without the title. -->
          <ItemCell variant="name" title={item?.name ?? uuid}>{item?.name ?? uuid}</ItemCell>
          <ItemCell>{item?.system.rank ?? ''}</ItemCell>
          <ItemCell>{item?.system.bonus ?? ''}</ItemCell>
          <ItemControls>
            <ItemControl
              icon="trash"
              class="skills-granted-delete"
              title={localize('Mothership.DeleteSkill')}
              onclick={() => revokeSkill(uuid)}
            />
          </ItemControls>
        </ItemRow>
      {/each}
    </ItemList>
  </TabPanel>

  <TabPanel tab="skills.selected.and" active={tab}>
    <div class="grid grid-3col widegap">
      <Field
        name="system.selected_adjustment.choose_skill_and.trained"
        label={localize('Mothership.SkillRankTrained')}
        value={doc.system.selected_adjustment.choose_skill_and.trained}
        dtype="Number"
        wrapper="text"
        width="100%"
        slim
      />
      <Field
        name="system.selected_adjustment.choose_skill_and.expert"
        label={localize('Mothership.SkillRankExpert')}
        value={doc.system.selected_adjustment.choose_skill_and.expert}
        dtype="Number"
        wrapper="text"
        width="100%"
        slim
      />
      <Field
        name="system.selected_adjustment.choose_skill_and.master"
        label={localize('Mothership.SkillRankMaster')}
        value={doc.system.selected_adjustment.choose_skill_and.master}
        dtype="Number"
        wrapper="text"
        width="100%"
        slim
      />
      <Field
        name="system.selected_adjustment.choose_skill_and.expert_full_set"
        label={localize('Mothership.CharacterGenerator.SkillOption.PopupFullExpertName')}
        value={doc.system.selected_adjustment.choose_skill_and.expert_full_set}
        dtype="Number"
        wrapper="text"
        width="100%"
        slim
      />
      <Field
        name="system.selected_adjustment.choose_skill_and.master_full_set"
        label={localize('Mothership.CharacterGenerator.SkillOption.PopupFullMasterName')}
        value={doc.system.selected_adjustment.choose_skill_and.master_full_set}
        dtype="Number"
        wrapper="text"
        width="100%"
        slim
      />
    </div>
  </TabPanel>

  <TabPanel tab="skills.selected.or" active={tab} class="items">
    <!-- No `skill-name` here: the pill's rule needs an `.items-list` ancestor this wrapper has
         never had, so the class styled nothing. -->
    <div>
      <ItemControl
        icon="plus"
        class="skills-group-add"
        title={localize('Mothership.AddGroup')}
        label={localize('Mothership.AddGroup')}
        onclick={addGroup}
      />
    </div>

    {#each doc.skillGroups as group (group.key)}
      <ItemList style="margin-bottom: 10px;">
        <ItemRow header>
          <div></div>
          {#each PICKS as [key, label] (key)}
            <ItemCell>{localize(label)}</ItemCell>
          {/each}
          <ItemCell>{localize('Mothership.Skills')}</ItemCell>
          <ItemControls>
            <ItemControl
              icon="trash"
              class="skills-group-delete"
              title={localize('Mothership.DeleteGroup')}
              onclick={() => removeGroup(group.index)}
            />
          </ItemControls>
        </ItemRow>

        {#each group.options as { key, index, option, fromList } (key)}
          <ItemRow
            itemId={index}
            draggable={false}
            attach={dropTarget(addOptionSkill(group.index, index))}
          >
            <ItemCell variant="name">{option.name}</ItemCell>
            {#each PICKS as [pick] (pick)}
              <ItemCell>{option[pick]}</ItemCell>
            {/each}
            <ItemCell title={fromList.map(({ uuid, item }) => item?.name ?? uuid).join('\n')}>
              {fromList.length}
              <i class="fas fa-info"></i>
            </ItemCell>
            <ItemControls>
              <ItemControl
                icon="trash"
                class="skills-group-option-delete"
                title={localize('Mothership.DeleteOption')}
                onclick={() => removeOption(group.index, index)}
              />
            </ItemControls>
          </ItemRow>
        {/each}

        <OptionDraft picks={PICKS} onsave={addOption(group.index)} />
      </ItemList>
    {/each}
  </TabPanel>

  <TabPanel tab="tables" active={tab}>
    <br />
    <Field
      name="system.roll_tables.patch"
      label={localize('Mothership.CharacterGenerator.Table.Patch')}
      value={doc.system.roll_tables.patch}
      wrapper="text"
      width="100%"
    />
    <br />
    <Field
      name="system.roll_tables.trinket"
      label={localize('Mothership.CharacterGenerator.Table.Trinket')}
      value={doc.system.roll_tables.trinket}
      wrapper="text"
      width="100%"
    />
    <br />
    <Field
      name="system.roll_tables.loadout"
      label={localize('Mothership.CharacterGenerator.Table.Loadout')}
      value={doc.system.roll_tables.loadout}
      wrapper="text"
      width="100%"
    />
  </TabPanel>
</section>
