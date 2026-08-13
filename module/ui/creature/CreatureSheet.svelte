<script>
  import Editor from '../parts/Editor.svelte';
  import ItemCell from '../parts/ItemCell.svelte';
  import ItemControl from '../parts/ItemControl.svelte';
  import ItemControls from '../parts/ItemControls.svelte';
  import ItemImage from '../parts/ItemImage.svelte';
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
    promptNewSkill,
    stepBy,
    stepShots,
    toggleEquipped,
  } from '../actor/items.js';

  let { store } = $props();

  const doc = $derived(store.current);
  const system = $derived(doc.system);
  const actor = $derived(store.document);

  const abilities = $derived(doc.items.filter((item) => item.type === 'ability'));
  const armors = $derived(doc.items.filter((item) => item.type === 'armor'));
  const conditions = $derived(doc.items.filter((item) => item.type === 'condition'));
  const gear = $derived(doc.items.filter((item) => item.type === 'item'));
  const skills = $derived(doc.items.filter((item) => item.type === 'skill'));
  const weapons = $derived(doc.items.filter((item) => item.type === 'weapon'));

  // AppV1 opened on a tab named "character", which no panel declares, so the body started blank.
  let tab = $state('skills');

  const tabs = $derived([
    { id: 'skills', label: localize('Mosh.Skills') },
    { id: 'weapons', label: localize('Mosh.Weapons') },
    { id: 'items', label: localize('Mosh.Items') },
    { id: 'description', label: localize('Mosh.Bio') },
    { id: 'notes', label: localize('Mosh.Notes') },
  ]);

  const STATS = [
    { key: 'combat', label: 'Mosh.Combat' },
    { key: 'instinct', label: 'Mosh.Instinct' },
    { key: 'speed', label: 'Mosh.Speed' },
    { key: 'loyalty', label: 'Mosh.Loyalty' },
    { key: 'armor', label: 'Mosh.Armor' },
    { key: 'sanity', label: 'Mosh.Sanity' },
  ];

  const enabledStats = $derived(
    STATS.filter((stat) => system.stats[stat.key].enabled).map((stat) => ({
      ...stat,
      // A swarm's combat value is a whole wound's worth of attacks, so the label says so.
      text:
        stat.key === 'combat' && system.swarm.enabled
          ? `${localize(stat.label)} ${localize('Mosh.SwarmWoundShort')}`
          : localize(stat.label),
    }))
  );

  const XP_MILESTONES = {
    5: { label: 'Trained', left: -54 },
    10: { label: 'Expert', left: -50 },
    15: { label: 'Master', left: -52 },
  };

  const statRoll = (key) => () => actor.rollStat(key);

  const describe = (id) => () => actor.printDescription(id);

  const stepXp = (event) => {
    const value = Math.min(16, Math.max(0, Number(system.xp.value) + stepBy(event)));
    actor.update({ 'system.xp.value': value });
  };

  const skillRoll = (id) => () => actor.rollSkill(id);

  /**
   * A swarm attacks once per remaining wound, so its damage scales with the dice count. A weapon
   * whose damage names no dice is left alone -- AppV1 indexed the failed match and threw.
   */
  const swarmDamage = (weapon) => {
    if (!system.swarm.enabled) return null;
    const dice = weapon.system.damage?.match(/([0-9]+)d[0-9]+/i);
    if (!dice) return null;
    const count = dice[1] * (system.hits.max - system.hits.value);
    return weapon.system.damage.replace(/([0-9]+)(d[0-9]+)/i, `${count}$2`);
  };

  const weaponRoll = (id) => () =>
    actor.rollWeapon(id, { damage: swarmDamage(actor.items.get(id)) });

  const damageRoll = (id) => () =>
    actor.rollWeapon(id, { roll: 'damage', damage: swarmDamage(actor.items.get(id)) });

  const step = (id, path, bounds) => (event) => adjust(actor, id, path, stepBy(event), bounds);

  const shotStep = (id) => (event) => stepShots(actor, id, stepBy(event));
</script>

<header class="creature-header-grid">
  <input
    name="name"
    class="noborder creaturename"
    type="text"
    value={doc.name}
    placeholder={localize('Mosh.Name')}
  />

  <div class="creature-header">
    {#each enabledStats as stat (stat.key)}
      <div class="mainstatwrapper">
        <div class="resource creature-mainstat">
          <RollableStat
            label={stat.text}
            key={stat.key}
            class="creaturestat"
            onroll={statRoll(stat.key)}
          />
          <input
            class="creaturestat noborder"
            style="width: 30px;"
            type="text"
            name="system.stats.{stat.key}.value"
            value={system.stats[stat.key].value}
            data-dtype="Number"
          />
        </div>
      </div>
    {/each}
  </div>

  <div class="whiteline"></div>
</header>

<div class="creature-description-grid">
  <div class="creaturedescription">
    <div class="grid grid-3col">
      <HealthBlock health={system.health} hits={system.hits} />
      <ArmorBlock armor={system.stats.armor} onroll={() => actor.chooseCover()} />
    </div>

    <!-- `<br></br>` in the old template parsed as two breaks, not one. -->
    <br /><br />

    <Editor
      name="system.description"
      value={system.description}
      enriched={doc.enriched.description}
      uuid={doc.uuid}
    />
  </div>

  <div class="creature-abilities">
    <img
      class="profile noborder"
      style="height:auto; width:100%;"
      src={doc.img}
      data-action="editImage"
      data-edit="img"
      title={doc.name}
      alt={doc.name}
    />

    <div class="creature-ability-container creature-ability-title">
      {localize('Mosh.SpecialAbilities')}
    </div>
    <div class="whiteline"></div>

    {#each abilities as ability (ability.id)}
      <div
        class="creature-ability-container item draggable"
        style="margin-top: -12px"
        draggable="true"
        data-item-id={ability.id}
      >
        <div
          class="creature-ability-title list-roll"
          role="button"
          tabindex="0"
          onclick={describe(ability.id)}
          onkeydown={onActivate(describe(ability.id))}
        >
          {ability.name}
        </div>
        <div class="creature-ability-text">{@html ability.system.description}</div>
        <ItemControls style="margin-left: 3px; font-size: 0.7rem;">
          <ItemControl
            icon="edit"
            class="darkgrey"
            title={localize('Mosh.EditAbility')}
            onclick={() => editItem(actor, ability.id)}
          />
          <ItemControl
            icon="trash"
            class="darkgrey"
            title={localize('Mosh.DeleteAbility')}
            onclick={() => deleteItem(actor, ability.id)}
          />
        </ItemControls>
      </div>
    {/each}

    <ItemControl
      icon="plus"
      label={localize('Mosh.Add')}
      class="darkgrey"
      style="margin-left: 5px;"
      title={localize('Mosh.CreateAbility')}
      onclick={() => createItem(actor, 'ability')}
    />
  </div>
</div>

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
