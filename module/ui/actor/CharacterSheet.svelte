<script>
  import Editor from '../parts/Editor.svelte';
  import ItemCell from '../parts/ItemCell.svelte';
  import ItemControl from '../parts/ItemControl.svelte';
  import ItemControls from '../parts/ItemControls.svelte';
  import ItemImage from '../parts/ItemImage.svelte';
  import MainStat from '../parts/MainStat.svelte';
  import MinMaxField from '../parts/MinMaxField.svelte';
  import PipTrack from '../parts/PipTrack.svelte';
  import RollableStat from '../parts/RollableStat.svelte';
  import TabPanel from '../parts/TabPanel.svelte';
  import Tabs from '../parts/Tabs.svelte';
  import ArmorBlock from '../parts/sections/ArmorBlock.svelte';
  import HealthBlock from '../parts/sections/HealthBlock.svelte';
  import ItemPanel from '../parts/sections/ItemPanel.svelte';
  import { onActivate } from '../parts/activate.js';
  import { localize } from '../i18n.js';
  import {
    adjust,
    createItem,
    deleteItem,
    editItem,
    itemData,
    promptNewSkill,
    stepBy,
    stepShots,
    toggleEquipped,
  } from './items.js';

  let { store } = $props();

  const doc = $derived(store.current);
  const system = $derived(doc.system);
  const actor = $derived(store.document);

  const armors = $derived(doc.items.filter((item) => item.type === 'armor'));
  const conditions = $derived(doc.items.filter((item) => item.type === 'condition'));
  const gear = $derived(doc.items.filter((item) => item.type === 'item'));
  const skills = $derived(doc.items.filter((item) => item.type === 'skill'));
  const weapons = $derived(doc.items.filter((item) => item.type === 'weapon'));

  // AppV1 named "character" as the initial tab, which no panel declares; Foundry's Tabs falls
  // back to the first nav entry, so Skills is what the sheet has always opened on.
  let tab = $state('skills');

  const tabs = $derived([
    { id: 'skills', label: localize('Mosh.Skills') },
    { id: 'weapons', label: localize('Mosh.Weapons') },
    { id: 'items', label: localize('Mosh.Items') },
    { id: 'description', label: localize('Mosh.Bio') },
    { id: 'notes', label: localize('Mosh.Notes') },
  ]);

  // The header's five free-text fields differ only by path and caption. The path is spelled out
  // rather than built from a key, because test/sheet-bindings.test.ts checks these against the
  // schema and it can only do that for a literal.
  const IDENTITY = [
    { name: 'system.credits.value', label: 'Mosh.Credits' },
    { name: 'system.class.value', label: 'Mosh.CLASS' },
    { name: 'system.rank.value', label: 'Mosh.RANK' },
    { name: 'system.pronouns.value', label: 'Mosh.Pronouns' },
    { name: 'system.attributes.level.value', label: 'Mosh.HighScore' },
  ];

  const STATS = [
    { key: 'strength', label: 'Mosh.Strength' },
    { key: 'speed', label: 'Mosh.Speed' },
    { key: 'intellect', label: 'Mosh.Intellect' },
    { key: 'combat', label: 'Mosh.Combat' },
  ];

  const SAVES = [
    { key: 'sanity', label: 'Mosh.Sanity' },
    { key: 'fear', label: 'Mosh.Fear' },
    { key: 'body', label: 'Mosh.Body' },
  ];

  const XP_MILESTONES = {
    5: { label: 'Trained', left: -54 },
    10: { label: 'Expert', left: -50 },
    15: { label: 'Master', left: -52 },
  };

  const at = (path) => path.split('.').reduce((node, key) => node?.[key], doc);

  const statRoll = (key) => () => actor.rollCheck(null, 'low', key, null, null, null);

  const describe = (id) => () => actor.printDescription(id);

  const stepXp = (event) => {
    const value = Math.min(16, Math.max(0, Number(system.xp.value) + stepBy(event)));
    actor.update({ 'system.xp.value': value });
  };

  const skillRoll = (id) => () => {
    const skill = itemData(actor, id);
    actor.rollCheck(null, null, null, skill.name, skill.system.bonus, null);
  };

  const weaponRoll = (id) => () =>
    actor.rollCheck(null, 'low', 'combat', null, null, itemData(actor, id));

  const damageRoll = (id) => () =>
    actor.rollCheck(null, null, 'damage', null, null, itemData(actor, id));

  const step = (id, path, bounds) => (event) => adjust(actor, id, path, stepBy(event), bounds);

  const shotStep = (id) => (event) => stepShots(actor, id, stepBy(event));

  const panic = () => actor.rollTable('panicCheck', null, null, null, null, null, null);
</script>

<header class="char-header header-grid">
  <div class="header-fields header-grid">
    <div class="header">
      <img
        class="profile"
        src={doc.img}
        data-action="editImage"
        data-edit="img"
        title={doc.name}
        alt={doc.name}
        height="150"
        width="150"
      />

      <div class="headergrid">
        <div class="headernamegrid">
          <div class="headerinputtext">{localize('Mosh.Name')}</div>
          <div class="headerinputfield charname">
            <input
              name="name"
              class="noborder"
              type="text"
              value={doc.name}
              placeholder={localize('Mosh.Name')}
            />
          </div>
        </div>

        {#each IDENTITY as field (field.name)}
          <div>
            <div class="headerinputtext">{localize(field.label)}</div>
            <div class="headerinputfield charname">
              <input
                name={field.name}
                class="noborder"
                type="text"
                value={at(field.name)}
              />
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="health grid grid-2col" style="margin-top: 0; grid-template-rows: 76px 77px 72px;">
      <HealthBlock health={system.health} hits={system.hits} />

      <MinMaxField
        label={localize('Mosh.Stress')}
        labelClass="rollable"
        onroll={panic}
        name="system.other.stress.value"
        value={system.other.stress.value}
        rightName="system.other.stress.min"
        rightValue={system.other.stress.min}
        leftLabel={localize('Mosh.Current')}
        rightLabel={localize('Mosh.Minimum')}
      />

      <ArmorBlock
        armor={system.stats.armor}
        onroll={() => actor.chooseCover()}
        style="grid-column-start: 2; grid-column-end: 3;"
      />

      <div style="margin-left: 6px; margin-right: 0px; flex: 0; grid-column-start: 1; grid-column-end: 3;">
        <div class="resource-label">{localize('Mosh.TraumaResponse')}</div>
        <textarea
          name="system.other.stressdesc.value"
          rows="2"
          class="textarea-input"
          style="height: 50px;"
          value={system.other.stressdesc.value}
        ></textarea>
      </div>
    </div>

    <div class="abilities">
      <div class="grid grid-1col widegap">
        {#each STATS as stat (stat.key)}
          <MainStat
            key={stat.key}
            label={localize(stat.label)}
            name="system.stats.{stat.key}.value"
            value={system.stats[stat.key].value}
            onroll={statRoll(stat.key)}
          >
            {#snippet after()}
              <input
                class="mainstatmod-input"
                type="text"
                name="system.stats.{stat.key}.mod"
                value={system.stats[stat.key].mod}
                data-dtype="Number"
              />
              <div class="mainstatmod-title">+</div>
            {/snippet}
          </MainStat>
        {/each}
      </div>
    </div>

    <div class="saves grid grid-1col savebackground">
      {#each SAVES as save (save.key)}
        <div class="resource flex-group-center">
          <RollableStat
            key={save.key}
            label={localize(save.label)}
            class="savetext"
            onroll={statRoll(save.key)}
          />
          <div class="grid grid-3col" style="grid-template-columns: 44px 14px 42px; margin-left:6px;">
            <input
              class="square-input"
              type="text"
              name="system.stats.{save.key}.value"
              value={system.stats[save.key].value}
              data-dtype="Number"
            />
            <div class="mainstatmod-title" style="top: 10px;">+</div>
            <input
              class="mainsavemod-input"
              style="top: 5px;"
              type="text"
              name="system.stats.{save.key}.mod"
              value={system.stats[save.key].mod}
              data-dtype="Number"
            />
          </div>
        </div>
      {/each}
    </div>
  </div>
</header>

<Tabs {tabs} bind:active={tab} />

<section class="sheet-body">
  <TabPanel tab="description" active={tab} class="biography">
    <Editor
      name="system.biography"
      value={system.biography}
      enriched={doc.enriched.biography}
      uuid={doc.uuid}
    />
  </TabPanel>

  <TabPanel tab="notes" active={tab} class="biography">
    <Editor
      name="system.notes"
      value={system.notes}
      enriched={doc.enriched.notes}
      uuid={doc.uuid}
    />
  </TabPanel>

  <TabPanel tab="items" active={tab} class="items">
    <ItemPanel
      headers={[
        { label: localize('Mosh.ArmorName'), grow: 2.5 },
        { label: localize('Mosh.AP') },
        { label: localize('Mosh.DR') },
        { label: localize('Mosh.Speed') },
        { label: localize('Mosh.Oxygen') },
        { label: localize('Mosh.Equipped') },
      ]}
      items={armors}
      create={{ title: localize('Mosh.CreateArmor'), onclick: () => createItem(actor, 'armor') }}
      row={armorRow}
    />

    <ItemPanel
      headers={[
        { label: localize('Mosh.ItemName'), grow: 1.5 },
        { label: localize('Mosh.Quantity') },
        ...(doc.hideWeight ? [] : [{ label: localize('Mosh.Weight') }]),
        { label: localize('Mosh.Value') },
      ]}
      items={gear}
      create={{ title: localize('Mosh.CreateItem'), onclick: () => createItem(actor, 'item') }}
      row={gearRow}
    />

    {#if !doc.hideWeight}
      <div class="item flex-group-left item-header">
        <div class="skill-stat" style="flex-grow: 1.5;">
          {localize('Mosh.CarryingCapacity')}: {system.weight.capacity}
        </div>
        <div class="skill-stat">{localize('Mosh.CurrentWeight')}: {system.weight.current}</div>
      </div>
    {/if}
  </TabPanel>

  <TabPanel tab="skills" active={tab} class="items">
    <ItemPanel
      style="margin-bottom: 10px;"
      headers={[
        { label: localize('Mosh.SkillName') },
        { label: localize('Mosh.SkillRank') },
        { label: localize('Mosh.SkillBonus') },
      ]}
      items={skills}
      create={{ title: localize('Mosh.CreateSkill'), onclick: () => promptNewSkill(actor) }}
      row={skillRow}
    />

    <div class="skill_training_frame" style="margin-bottom: 10px;">
      <div class="grid grid-3col" style="grid-template-columns: 90px auto 283px ;">
        <div class="skill-stat" style="position: relative; top: 6px;">
          <strong>{localize('Mosh.SkillTraining')}</strong>
        </div>
        <textarea
          name="system.xp.selectedSkill"
          rows="2"
          class="textarea-input-grey"
          style="height: 30px; margin: 0; position: relative; top: 50%; -ms-transform: translateY(-50%); transform: translateY(-50%); background: white; color: black;"
          value={system.xp.selectedSkill}
        ></textarea>
        <div
          class="list-roll flex"
          style="position: relative; top: -7px;"
          role="button"
          tabindex="0"
          onclick={stepXp}
          oncontextmenu={stepXp}
          onkeydown={onActivate(stepXp)}
        >
          <PipTrack count={15} value={system.xp.value} milestones={XP_MILESTONES} />
        </div>
      </div>
    </div>

    <div class="seperatorLine"></div>

    <ItemPanel
      headers={[
        { label: localize('Mosh.Condition') },
        { label: localize('Mosh.Severity') },
        { label: localize('Mosh.Treatment') },
      ]}
      items={conditions}
      create={{
        title: localize('Mosh.CreateCondition'),
        onclick: () => createItem(actor, 'condition'),
      }}
      row={conditionRow}
    />
  </TabPanel>

  <TabPanel tab="weapons" active={tab} class="items">
    <ItemPanel
      headers={[
        { label: localize('Mosh.WeaponName'), grow: 2 },
        { label: localize('Mosh.Damage') },
        { label: localize('Mosh.Ammo') },
        { label: localize('Mosh.Shots') },
        { label: localize('Mosh.Range') },
      ]}
      items={weapons}
      create={{ title: localize('Mosh.CreateWeapon'), onclick: () => createItem(actor, 'weapon') }}
      row={weaponRow}
    />
  </TabPanel>
</section>

{#snippet armorRow(armor)}
  <ItemImage src={armor.img} title={armor.name} />
  <ItemCell variant="name" grow={2.55} roll onclick={describe(armor.id)}>{armor.name}</ItemCell>
  <ItemCell
    roll
    onclick={step(armor.id, 'armorPoints')}
    oncontextmenu={step(armor.id, 'armorPoints', { min: 0 })}
  >
    {armor.system.armorPoints}
  </ItemCell>
  <ItemCell
    roll
    onclick={step(armor.id, 'damageReduction')}
    oncontextmenu={step(armor.id, 'damageReduction', { min: 0 })}
  >
    {armor.system.damageReduction}
  </ItemCell>
  <ItemCell>{armor.system.speed}</ItemCell>
  {#if armor.system.oxygenMax}
    <ItemCell
      roll
      onclick={step(armor.id, 'oxygenCurrent', { max: armor.system.oxygenMax })}
      oncontextmenu={step(armor.id, 'oxygenCurrent', { min: 0 })}
    >
      {armor.system.oxygenCurrent}/{armor.system.oxygenMax}
    </ItemCell>
  {:else}
    <ItemCell>{localize('Mosh.NA')}</ItemCell>
  {/if}
  <ItemCell>
    <input
      type="checkbox"
      checked={armor.system.equipped}
      onchange={() => toggleEquipped(actor, armor.id)}
    />
  </ItemCell>
  <ItemControls>
    <ItemControl
      icon="edit"
      title={localize('Mosh.EditArmor')}
      onclick={() => editItem(actor, armor.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mosh.DeleteArmor')}
      onclick={() => deleteItem(actor, armor.id)}
    />
  </ItemControls>
{/snippet}

{#snippet gearRow(item)}
  <ItemImage src={item.img} title={item.name} />
  <ItemCell variant="name" grow={doc.hideWeight ? 1.5 : 1.54} roll onclick={describe(item.id)}>
    {item.name}
  </ItemCell>
  <ItemCell roll onclick={step(item.id, 'quantity')} oncontextmenu={step(item.id, 'quantity')}>
    {item.system.quantity}
  </ItemCell>
  {#if !doc.hideWeight}
    <ItemCell>{item.system.weight}</ItemCell>
  {/if}
  <ItemCell>{item.system.cost}</ItemCell>
  <ItemControls>
    <ItemControl
      icon="edit"
      title={localize('Mosh.EditItem')}
      onclick={() => editItem(actor, item.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mosh.DeleteItem')}
      onclick={() => deleteItem(actor, item.id)}
    />
  </ItemControls>
{/snippet}

{#snippet skillRow(skill)}
  <ItemImage src={skill.img} title={skill.name} />
  <ItemCell variant="name" roll onclick={skillRoll(skill.id)}>{skill.name}</ItemCell>
  <ItemCell>{skill.system.rank}</ItemCell>
  <ItemCell>{skill.system.bonus}</ItemCell>
  <ItemControls>
    <ItemControl
      icon="edit"
      title={localize('Mosh.EditSkill')}
      onclick={() => editItem(actor, skill.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mosh.DeleteSkill')}
      onclick={() => deleteItem(actor, skill.id)}
    />
  </ItemControls>
{/snippet}

{#snippet conditionRow(condition)}
  <ItemImage src={condition.img} title={condition.name} />
  <ItemCell variant="name" roll onclick={describe(condition.id)}>{condition.name}</ItemCell>
  <ItemCell
    roll
    onclick={step(condition.id, 'severity')}
    oncontextmenu={step(condition.id, 'severity', { min: 0 })}
  >
    {condition.system.severity}
  </ItemCell>
  <ItemCell>
    <div
      class="list-roll flex"
      style="margin: 0; position: relative; top: 50%; -ms-transform: translateY(-50%); transform: translateY(-50%);"
      role="button"
      tabindex="0"
      onclick={step(condition.id, 'treatment.value', { max: 3 })}
      oncontextmenu={step(condition.id, 'treatment.value', { min: 0 })}
      onkeydown={onActivate(step(condition.id, 'treatment.value', { max: 3 }))}
    >
      <PipTrack count={3} value={condition.system.treatment.value} variant="icon" />
    </div>
  </ItemCell>
  <ItemControls>
    <ItemControl
      icon="edit"
      title={localize('Mosh.EditCondition')}
      onclick={() => editItem(actor, condition.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mosh.DeleteCondition')}
      onclick={() => deleteItem(actor, condition.id)}
    />
  </ItemControls>
{/snippet}

{#snippet weaponRow(weapon)}
  <ItemImage src={weapon.img} title={weapon.name} />
  <ItemCell variant="name" grow={2.05} roll onclick={weaponRoll(weapon.id)}>{weapon.name}</ItemCell>
  <ItemCell roll onclick={damageRoll(weapon.id)}>
    {weapon.system.damage}{weapon.system.antiArmor
      ? ` (${localize('Mosh.AntiArmorAcronym')})`
      : ''}
  </ItemCell>
  {#if weapon.system.useAmmo}
    <ItemCell roll onclick={step(weapon.id, 'ammo')} oncontextmenu={step(weapon.id, 'ammo', { min: 0 })}>
      {weapon.system.ammo}
    </ItemCell>
    <ItemCell>
      <a
        class="list-roll"
        href={null}
        role="button"
        tabindex="0"
        title={weapon.system.curShots === weapon.system.shots
          ? localize('Mosh.EditWeapon')
          : undefined}
        onclick={shotStep(weapon.id)}
        oncontextmenu={shotStep(weapon.id)}
        onkeydown={onActivate(shotStep(weapon.id))}
      >
        {weapon.system.curShots}/{weapon.system.shots}
      </a>
      {#if weapon.system.curShots !== weapon.system.shots}
        <a
          class="list-roll"
          href={null}
          role="button"
          tabindex="0"
          title={localize('Mosh.Reload')}
          onclick={() => actor.reloadWeapon(weapon.id)}
          onkeydown={onActivate(() => actor.reloadWeapon(weapon.id))}
        >
          <i class="fas fa-sync"></i>
        </a>
      {/if}
    </ItemCell>
  {:else}
    <ItemCell>{localize('Mosh.NA')}</ItemCell>
    <ItemCell>{localize('Mosh.NA')}</ItemCell>
  {/if}
  <ItemCell>{localize(`Mosh.RangeBand.${weapon.system.range}`)}</ItemCell>
  <ItemControls>
    <ItemControl
      icon="edit"
      title={localize('Mosh.EditWeapon')}
      onclick={() => editItem(actor, weapon.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mosh.DeleteWeapon')}
      onclick={() => deleteItem(actor, weapon.id)}
    />
  </ItemControls>
{/snippet}
