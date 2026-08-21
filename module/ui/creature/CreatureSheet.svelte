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
  import { localize } from '../../i18n.ts';
  import {
    adjust,
    createItem,
    deleteItem,
    editItem,
    promptAddItem,
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

  let tab = $state('skills');

  const tabs = $derived([
    { id: 'skills', label: localize('Mothership.Skills') },
    { id: 'weapons', label: localize('Mothership.Weapons') },
    { id: 'armor', label: localize('Mothership.Armor') },
    { id: 'items', label: localize('Mothership.Items') },
    { id: 'conditions', label: localize('Mothership.Conditions') },
    { id: 'notes', label: localize('Mothership.Notes') },
  ]);

  const STATS = [
    { key: 'combat', label: 'Mothership.Combat' },
    { key: 'instinct', label: 'Mothership.Instinct' },
    { key: 'speed', label: 'Mothership.Speed' },
    { key: 'loyalty', label: 'Mothership.Loyalty' },
    { key: 'armor', label: 'Mothership.Armor' },
    { key: 'sanity', label: 'Mothership.Sanity' },
  ];

  const enabledStats = $derived(
    STATS.filter((stat) => system.stats[stat.key].enabled).map((stat) => ({
      ...stat,
      // A swarm's combat value is a whole wound's worth of attacks, so the label says so.
      text:
        stat.key === 'combat' && system.swarm.enabled
          ? `${localize(stat.label)} ${localize('Mothership.SwarmWoundShort')}`
          : localize(stat.label),
    }))
  );

  const statRoll = (key) => () => actor.rollStat(key);

  const describe = (id) => () => actor.printDescription(id);

  const skillRoll = (id) => () => actor.rollSkill(id);

  const weaponRoll = (id) => () => actor.rollWeapon(id, { damage: actor.swarmDamage(id) });

  const damageRoll = (id) => () =>
    actor.rollWeapon(id, { roll: 'damage', damage: actor.swarmDamage(id) });

  const step = (id, path, bounds) => (event) => adjust(actor, id, path, stepBy(event), bounds);

  const shotStep = (id) => (event) => stepShots(actor, id, stepBy(event));
</script>

<header class="creature-header-grid">
  <input
    name="name"
    class="noborder creaturename"
    type="text"
    value={doc.name}
    placeholder={localize('Mothership.Name')}
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

    <!-- Deliberate: two breaks of spacing, not one. -->
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
      {localize('Mothership.SpecialAbilities')}
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
            title={localize('Mothership.EditAbility')}
            onclick={() => editItem(actor, ability.id)}
          />
          <ItemControl
            icon="trash"
            class="darkgrey"
            title={localize('Mothership.DeleteAbility')}
            onclick={() => deleteItem(actor, ability.id)}
          />
        </ItemControls>
      </div>
    {/each}

    <ItemControl
      icon="plus"
      label={localize('Mothership.Add')}
      class="darkgrey"
      style="margin-left: 5px;"
      title={localize('Mothership.CreateAbility')}
      onclick={() => createItem(actor, 'ability')}
    />
  </div>
</div>

<Tabs {tabs} bind:active={tab} />

<section class="sheet-body">
  <TabPanel tab="notes" active={tab} class="biography">
    <div style="display: flex; flex-direction: column; height: 100%; gap: 6px;">
      <div class="item flex-group-left item-header">
        <div class="skill-stat">{localize('Mothership.Bio')}</div>
      </div>
      <div style="flex: 1; min-height: 0;">
        <Editor
          name="system.biography"
          value={system.biography}
          enriched={doc.enriched.biography}
          uuid={doc.uuid}
        />
      </div>
      <div class="item flex-group-left item-header">
        <div class="skill-stat">{localize('Mothership.Notes')}</div>
      </div>
      <div style="flex: 1; min-height: 0;">
        <Editor
          name="system.notes"
          value={system.notes}
          enriched={doc.enriched.notes}
          uuid={doc.uuid}
        />
      </div>
    </div>
  </TabPanel>

  <TabPanel tab="armor" active={tab} class="items">
    <ItemPanel
      headers={[
        { label: localize('Mothership.ArmorName'), grow: 2.5 },
        { label: localize('Mothership.AP') },
        { label: localize('Mothership.DR') },
        { label: localize('Mothership.Speed') },
        { label: localize('Mothership.Oxygen') },
        { label: localize('Mothership.Equipped') },
      ]}
      items={armors}
      create={{ title: localize('Mothership.CreateArmor'), onclick: () => promptAddItem(actor, 'armor') }}
      row={armorRow}
    />
  </TabPanel>

  <TabPanel tab="items" active={tab} class="items">
    <ItemPanel
      headers={[
        { label: localize('Mothership.ItemName'), grow: 1.5 },
        { label: localize('Mothership.Quantity') },
        ...(doc.hideWeight ? [] : [{ label: localize('Mothership.Weight') }]),
        { label: localize('Mothership.Value') },
      ]}
      items={gear}
      create={{ title: localize('Mothership.CreateItem'), onclick: () => promptAddItem(actor, 'item') }}
      row={gearRow}
    />
  </TabPanel>

  <TabPanel tab="skills" active={tab} class="items">
    <ItemPanel
      headers={[
        { label: localize('Mothership.SkillName') },
        { label: localize('Mothership.SkillRank') },
        { label: localize('Mothership.SkillBonus') },
      ]}
      items={skills}
      create={{ title: localize('Mothership.CreateSkill'), onclick: () => promptAddItem(actor, 'skill') }}
      row={skillRow}
    />
  </TabPanel>

  <TabPanel tab="conditions" active={tab} class="items">
    <ItemPanel
      headers={[
        { label: localize('Mothership.Condition') },
        { label: localize('Mothership.Severity') },
        { label: localize('Mothership.Treatment') },
      ]}
      items={conditions}
      create={{
        title: localize('Mothership.CreateCondition'),
        onclick: () => promptAddItem(actor, 'condition'),
      }}
      row={conditionRow}
    />
  </TabPanel>

  <TabPanel tab="weapons" active={tab} class="items">
    <ItemPanel
      headers={[
        { label: localize('Mothership.WeaponName'), grow: 2 },
        { label: localize('Mothership.Damage') },
        { label: localize('Mothership.Ammo') },
        { label: localize('Mothership.Shots') },
        { label: localize('Mothership.Range') },
      ]}
      items={weapons}
      create={{ title: localize('Mothership.CreateWeapon'), onclick: () => promptAddItem(actor, 'weapon') }}
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
    <ItemCell>{localize('Mothership.NA')}</ItemCell>
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
      title={localize('Mothership.EditArmor')}
      onclick={() => editItem(actor, armor.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mothership.DeleteArmor')}
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
      title={localize('Mothership.EditItem')}
      onclick={() => editItem(actor, item.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mothership.DeleteItem')}
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
      title={localize('Mothership.EditSkill')}
      onclick={() => editItem(actor, skill.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mothership.DeleteSkill')}
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
      <PipTrack count={3} value={condition.system.treatment.value} />
    </div>
  </ItemCell>
  <ItemControls>
    <ItemControl
      icon="edit"
      title={localize('Mothership.EditCondition')}
      onclick={() => editItem(actor, condition.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mothership.DeleteCondition')}
      onclick={() => deleteItem(actor, condition.id)}
    />
  </ItemControls>
{/snippet}

{#snippet weaponRow(weapon)}
  <ItemImage src={weapon.img} title={weapon.name} />
  <ItemCell variant="name" grow={2.05} roll onclick={weaponRoll(weapon.id)}>{weapon.name}</ItemCell>
  <ItemCell roll onclick={damageRoll(weapon.id)}>
    {weapon.system.damage}{weapon.system.antiArmor
      ? ` (${localize('Mothership.AntiArmorAcronym')})`
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
          ? localize('Mothership.EditWeapon')
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
          title={localize('Mothership.Reload')}
          onclick={() => actor.reloadWeapon(weapon.id)}
          onkeydown={onActivate(() => actor.reloadWeapon(weapon.id))}
        >
          <i class="fas fa-sync"></i>
        </a>
      {/if}
    </ItemCell>
  {:else}
    <ItemCell>{localize('Mothership.NA')}</ItemCell>
    <ItemCell>{localize('Mothership.NA')}</ItemCell>
  {/if}
  <ItemCell>{localize(`Mothership.RangeBand.${weapon.system.range}`)}</ItemCell>
  <ItemControls>
    <ItemControl
      icon="edit"
      title={localize('Mothership.EditWeapon')}
      onclick={() => editItem(actor, weapon.id)}
    />
    <ItemControl
      icon="trash"
      title={localize('Mothership.DeleteWeapon')}
      onclick={() => deleteItem(actor, weapon.id)}
    />
  </ItemControls>
{/snippet}

<style>
  /* @layer system: Svelte emits component CSS unlayered, which would outrank the rest of the
     application's layered rules. The header grid and description grid are siblings (no single
     root), so `whiteline`'s slots are declared on the pair and inherit down. */
  @layer system {
    .creature-header-grid,
    .creature-description-grid {
      --creaturesheet-header-surface: var(--surface-neutral-lowest);
      --creaturesheet-header-text: var(--text-inverted);
      --creaturesheet-header-font-family: var(--font-display);
      --creaturesheet-header-font-weight: var(--font-weight-bold);
      --creaturesheet-header-padding: var(--space-8);

      --creaturesheet-name-text: var(--text-inverted);
      --creaturesheet-name-font-family: var(--font-display);
      --creaturesheet-name-font-weight: var(--font-weight-bold);
      --creaturesheet-name-font-size: var(--font-size-2xl);
      --creaturesheet-name-padding-inline-start: var(--space-12);

      /* Narrower than MainStat's `1fr 5em`; a grid template, not a spacing-scale value. */
      --creaturesheet-stat-columns: 1fr 3em;
      --creaturesheet-stat-gap: var(--space-0);

      --creaturesheet-rule-border-width: var(--border-width-3);
      --creaturesheet-rule-color: var(--border-neutral-paper);
      /* Mirrors RolltableConfig's `greyline` — keep the two in sync. */
      --creaturesheet-rule-margin-block-start: var(--space-6);
      --creaturesheet-rule-margin-block-end: var(--space-10);
      --creaturesheet-rule-margin-inline: var(--space-16);

      /* Grid template and scroll-box height: measurements of this sheet, not scale steps. */
      --creaturesheet-body-columns: 1fr 15em;
      --creaturesheet-description-height: 400px;
      --creaturesheet-description-padding: var(--space-10);

      --creaturesheet-abilities-surface: var(--surface-neutral-lowest);
      --creaturesheet-abilities-outline-color: var(--surface-neutral-lowest);
      --creaturesheet-abilities-outline-width: var(--border-width-5);
      --creaturesheet-abilities-border-width: var(--border-width-2);
      --creaturesheet-abilities-border-color: var(--border-neutral-paper);
      --creaturesheet-abilities-radius: var(--radius-md);
      --creaturesheet-abilities-margin: var(--space-12);
      /* The panel scrolls: 375 is a layout decision as much as a measurement. */
      --creaturesheet-abilities-height: 375px;

      --creaturesheet-ability-padding: var(--space-4);
      --creaturesheet-ability-margin-inline-start: var(--space-2);
      --creaturesheet-ability-title-font-family: var(--font-display);
      --creaturesheet-ability-title-font-size: var(--font-size-md);
      --creaturesheet-ability-title-font-weight: var(--font-weight-bold);
      --creaturesheet-ability-title-text: var(--text-inverted);
      --creaturesheet-ability-body-font-family: var(--font-display);
      --creaturesheet-ability-body-font-size: var(--font-size-sm);
      --creaturesheet-ability-body-text: var(--text-inverted);
    }

    .creature-header-grid {
      display: grid;
      grid-template-areas:
        'name header header'
        'line line line';
      background: var(--creaturesheet-header-surface);
    }

    .creature-header {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      grid-area: header;
      padding: var(--creaturesheet-header-padding);
      color: var(--creaturesheet-header-text);
      font-family: var(--creaturesheet-header-font-family);
      font-weight: var(--creaturesheet-header-font-weight);
      text-transform: uppercase;
    }

    .creaturename {
      height: auto;
      width: 100%;
      padding-left: var(--creaturesheet-name-padding-inline-start);
      color: var(--creaturesheet-name-text);
      font-family: var(--creaturesheet-name-font-family);
      font-size: var(--creaturesheet-name-font-size);
      font-weight: var(--creaturesheet-name-font-weight);
      text-transform: uppercase;
    }

    .creature-mainstat {
      position: relative;
      display: grid;
      grid-template-columns: var(--creaturesheet-stat-columns);
      align-items: center;
      gap: var(--creaturesheet-stat-gap);
      width: 100%;
    }

    /* `grid-area` places the first of two `.whiteline` elements; the second (in the ability
       panel) receives it inertly. */
    .whiteline {
      grid-area: line;
      border-top: var(--creaturesheet-rule-border-width) solid var(--creaturesheet-rule-color);
      margin-top: var(--creaturesheet-rule-margin-block-start);
      margin-bottom: var(--creaturesheet-rule-margin-block-end);
      margin-left: var(--creaturesheet-rule-margin-inline);
      margin-right: var(--creaturesheet-rule-margin-inline);
    }

    .creature-description-grid {
      display: grid;
      grid-template-columns: var(--creaturesheet-body-columns);
    }

    .creaturedescription {
      height: var(--creaturesheet-description-height);
      padding: var(--creaturesheet-description-padding);
      overflow-y: auto;
    }

    /* :global reaches ProseMirror's own markup, rendered by Editor.svelte and outside this
       component's scoped styles. .creaturedescription does the scrolling for all three. */
    .creaturedescription :global(.editor) {
      overflow: visible;
    }

    .creaturedescription :global(.editor-content) {
      overflow-y: visible;
    }

    .creature-abilities {
      height: var(--creaturesheet-abilities-height);
      margin: var(--creaturesheet-abilities-margin);
      border: var(--creaturesheet-abilities-border-width) solid
        var(--creaturesheet-abilities-border-color);
      outline: var(--creaturesheet-abilities-outline-width) solid
        var(--creaturesheet-abilities-outline-color);
      border-radius: var(--creaturesheet-abilities-radius);
      background: var(--creaturesheet-abilities-surface);
      overflow: auto;
    }

    .creature-ability-container {
      padding: var(--creaturesheet-ability-padding);
      margin-left: var(--creaturesheet-ability-margin-inline-start);
    }

    /* Same specificity as `.list-roll:hover` in css/mothership.css; this file loads after it,
       so the title's color wins on hover instead of reverting to the shared hover color. */
    .creature-ability-title {
      color: var(--creaturesheet-ability-title-text);
      font-family: var(--creaturesheet-ability-title-font-family);
      font-size: var(--creaturesheet-ability-title-font-size);
      font-weight: var(--creaturesheet-ability-title-font-weight);
      text-align: center;
      text-transform: uppercase;
    }

    .creature-ability-text {
      height: auto;
      color: var(--creaturesheet-ability-body-text);
      font-family: var(--creaturesheet-ability-body-font-family);
      font-size: var(--creaturesheet-ability-body-font-size);
    }
  }
</style>
