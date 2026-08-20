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
  import TextareaField from '../parts/TextareaField.svelte';
  import ArmorBlock from '../parts/sections/ArmorBlock.svelte';
  import HealthBlock from '../parts/sections/HealthBlock.svelte';
  import ItemPanel from '../parts/sections/ItemPanel.svelte';
  import { onActivate } from '../parts/activate.js';
  import { localize } from '../../i18n.ts';
  import { XP_PIPS, XP_MILESTONES } from '../../rules.ts';
  import {
    adjust,
    deleteItem,
    editItem,
    promptAddItem,
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

  let tab = $state('skills');

  const tabs = $derived([
    { id: 'skills', label: localize('Mothership.Skills') },
    { id: 'weapons', label: localize('Mothership.Weapons') },
    { id: 'armor', label: localize('Mothership.Armor') },
    { id: 'items', label: localize('Mothership.Items') },
    { id: 'conditions', label: localize('Mothership.Conditions') },
    { id: 'notes', label: localize('Mothership.Notes') },
  ]);

  // Paths are literal strings, not built from a key: test/sheet-bindings.test.ts checks each
  // against the schema and can only do that for a literal.
  const IDENTITY = [
    { name: 'system.credits.value', label: 'Mothership.Credits' },
    { name: 'system.class.value', label: 'Mothership.CLASS' },
    { name: 'system.rank.value', label: 'Mothership.RANK' },
    { name: 'system.pronouns.value', label: 'Mothership.Pronouns' },
    { name: 'system.attributes.level.value', label: 'Mothership.HighScore' },
  ];

  const STATS = [
    { key: 'strength', label: 'Mothership.Strength' },
    { key: 'speed', label: 'Mothership.Speed' },
    { key: 'intellect', label: 'Mothership.Intellect' },
    { key: 'combat', label: 'Mothership.Combat' },
  ];

  const SAVES = [
    { key: 'sanity', label: 'Mothership.Sanity' },
    { key: 'fear', label: 'Mothership.Fear' },
    { key: 'body', label: 'Mothership.Body' },
  ];

  const xpMilestones = Object.fromEntries(
    Object.entries(XP_MILESTONES).map(([pip, key]) => [pip, localize(key)]),
  );

  const at = (path) => path.split('.').reduce((node, key) => node?.[key], doc);

  const statRoll = (key) => () => actor.rollStat(key);

  const describe = (id) => () => actor.printDescription(id);

  const stepXp = (event) => actor.stepXp(stepBy(event));

  const skillRoll = (id) => () => actor.rollSkill(id);

  const weaponRoll = (id) => () => actor.rollWeapon(id);

  const damageRoll = (id) => () => actor.rollWeapon(id, { roll: 'damage' });

  const step = (id, path, bounds) => (event) => adjust(actor, id, path, stepBy(event), bounds);

  const shotStep = (id) => (event) => stepShots(actor, id, stepBy(event));

  const panic = () => actor.rollPanic();
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
          <div class="headerinputtext">{localize('Mothership.Name')}</div>
          <div class="headerinputfield">
            <input
              name="name"
              class="noborder"
              type="text"
              value={doc.name}
              placeholder={localize('Mothership.Name')}
            />
          </div>
        </div>

        {#each IDENTITY as field (field.name)}
          <div>
            <div class="headerinputtext">{localize(field.label)}</div>
            <div class="headerinputfield">
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
        label={localize('Mothership.Stress')}
        labelClass="rollable"
        onroll={panic}
        name="system.other.stress.value"
        value={system.other.stress.value}
        rightName="system.other.stress.min"
        rightValue={system.other.stress.min}
        leftLabel={localize('Mothership.Current')}
        rightLabel={localize('Mothership.Minimum')}
      />

      <ArmorBlock
        armor={system.stats.armor}
        onroll={() => actor.chooseCover()}
        style="grid-column-start: 2; grid-column-end: 3;"
      />

      <TextareaField
        name="system.other.stressdesc.value"
        label={localize('Mothership.TraumaResponse')}
        value={system.other.stressdesc.value}
      />
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

    {#if !doc.hideWeight}
      <div class="item flex-group-left item-header">
        <div class="skill-stat" style="flex-grow: 1.5;">
          {localize('Mothership.CarryingCapacity')}: {system.weight.capacity}
        </div>
        <div class="skill-stat">{localize('Mothership.CurrentWeight')}: {system.weight.current}</div>
      </div>
    {/if}
  </TabPanel>

  <TabPanel tab="skills" active={tab} class="items">
    <ItemPanel
      style="margin-bottom: 10px;"
      headers={[
        { label: localize('Mothership.SkillName') },
        { label: localize('Mothership.SkillRank') },
        { label: localize('Mothership.SkillBonus') },
      ]}
      items={skills}
      create={{ title: localize('Mothership.CreateSkill'), onclick: () => promptAddItem(actor, 'skill') }}
      row={skillRow}
    />

    <div class="skill_training_frame" style="margin-bottom: 10px;">
      <div class="grid grid-3col" style="grid-template-columns: 90px auto 283px ;">
        <div class="skill-stat" style="position: relative; top: 6px;">
          <strong>{localize('Mothership.SkillTraining')}</strong>
        </div>
        <textarea
          name="system.xp.selectedSkill"
          rows="2"
          class="textarea-input-grey"
          style="height: 30px; margin: 0; position: relative; top: 50%; -ms-transform: translateY(-50%); transform: translateY(-50%); background: white; color: black;"
          value={system.xp.selectedSkill}
        ></textarea>
        <div
          class="list-roll"
          role="button"
          tabindex="0"
          onclick={stepXp}
          oncontextmenu={stepXp}
          onkeydown={onActivate(stepXp)}
        >
          <PipTrack count={XP_PIPS} value={system.xp.value} milestones={xpMilestones} />
        </div>
      </div>
    </div>

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
      <PipTrack count={3} value={condition.system.treatment.value} variant="icon" />
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
     application's layered rules. */
  @layer system {
    .char-header {
      --charactersheet-header-grid-gap: var(--space-10);
      --charactersheet-header-grid-padding: var(--space-2);
      /* Fixed-px tracks measure this header; no spacing-scale step governs them. */
      --charactersheet-header-grid-columns: 238px auto 100px;

      --charactersheet-identity-gap: var(--space-4);
      --charactersheet-identity-padding: var(--space-16);

      --charactersheet-saves-surface: var(--surface-neutral-lowest);
      --charactersheet-saves-radius: var(--radius-md);
      --charactersheet-saves-padding-block-start: var(--space-6);
      --charactersheet-saves-padding-block-end: var(--space-4);
      /* The panel's own height — a measurement, not a step. */
      --charactersheet-saves-height: 225px;

      --charactersheet-save-value-font-family: var(--font-display);
      --charactersheet-save-value-font-size: var(--font-size-xl);
      --charactersheet-save-value-font-weight: var(--font-weight-bold);
      --charactersheet-save-value-surface: var(--surface-neutral-paper);
      --charactersheet-save-value-border-width: var(--border-width-4);
      --charactersheet-save-value-border-color: var(--border-neutral-ink);
      --charactersheet-save-value-radius: var(--radius-md);
      --charactersheet-save-value-margin: calc(var(--space-2) * -1);
      /* The box's own size — measurements, not steps. */
      --charactersheet-save-value-height: 42px;
      --charactersheet-save-value-width: 45px;
      --charactersheet-save-value-padding: var(--space-0);

      --charactersheet-save-modifier-font-family: var(--font-display);
      --charactersheet-save-modifier-font-size: var(--font-size-sm);
      --charactersheet-save-modifier-font-weight: var(--font-weight-bold);
      --charactersheet-save-modifier-text: var(--color-danger-300);
      /* `lightgrey` (#d3d3d3) maps to the nearest existing surface tier; no exact token. */
      --charactersheet-save-modifier-surface: var(--surface-neutral-highest);
      --charactersheet-save-modifier-radius: var(--radius-md);
      --charactersheet-save-modifier-border-width: var(--border-width-0);
      /* The badge's own size — measurements, not steps. */
      --charactersheet-save-modifier-height: 26px;
      --charactersheet-save-modifier-width: 28px;
      --charactersheet-save-modifier-padding: var(--space-0);
      --charactersheet-save-modifier-margin-inline-start: calc(var(--space-24) * -1);
      --charactersheet-save-modifier-offset-block: var(--space-8);
      --charactersheet-save-modifier-offset-inline: var(--space-12);
    }

    /* Selector must stay chained: `centercol`/`mobilehealth` are claimed by
       `.mothership .health` in css/mothership.css, which this block cannot take. */
    .char-header .header-grid {
      display: grid;
      grid-template-areas:
        'header header header'
        'abilities centercol saves'
        'mobilehealth mobilehealth mobilehealth';
      grid-gap: var(--charactersheet-header-grid-gap);
      padding: var(--charactersheet-header-grid-padding);
      grid-template-columns: var(--charactersheet-header-grid-columns);
      container-type: inline-size;
    }

    .abilities {
      grid-area: abilities;
    }

    .saves {
      grid-area: saves;
    }

    .headergrid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: var(--charactersheet-identity-gap);
      padding: var(--charactersheet-identity-padding);
    }

    .headernamegrid {
      grid-column: 1/-2;
    }

    /* Same specificity as `.mothership .grid`'s `padding: 0`; wins on load order only. */
    .savebackground {
      border-radius: var(--charactersheet-saves-radius);
      background: var(--charactersheet-saves-surface);
      padding-bottom: var(--charactersheet-saves-padding-block-end);
      padding-top: var(--charactersheet-saves-padding-block-start);
      height: var(--charactersheet-saves-height);
    }

    .square-input {
      font-family: var(--charactersheet-save-value-font-family);
      margin: var(--charactersheet-save-value-margin);
      height: var(--charactersheet-save-value-height);
      width: var(--charactersheet-save-value-width);
      padding: var(--charactersheet-save-value-padding);
      border: var(--charactersheet-save-value-border-width) solid
        var(--charactersheet-save-value-border-color);
      background-color: var(--charactersheet-save-value-surface);
      border-radius: var(--charactersheet-save-value-radius);
      font-size: var(--charactersheet-save-value-font-size);
      font-weight: var(--charactersheet-save-value-font-weight);
      text-align: center;
    }

    /* Padding zeroed: a two-digit bonus overflows the 28px pill under ApplicationV2's
       wider default input padding. */
    .mainsavemod-input {
      font-family: var(--charactersheet-save-modifier-font-family);
      height: var(--charactersheet-save-modifier-height);
      width: var(--charactersheet-save-modifier-width);
      padding: var(--charactersheet-save-modifier-padding);
      border: var(--charactersheet-save-modifier-border-width);
      border-radius: var(--charactersheet-save-modifier-radius);
      color: var(--charactersheet-save-modifier-text);
      font-size: var(--charactersheet-save-modifier-font-size);
      font-weight: var(--charactersheet-save-modifier-font-weight);
      text-align: center;
      margin-left: var(--charactersheet-save-modifier-margin-inline-start);
      z-index: 5;
      background: var(--charactersheet-save-modifier-surface);
      top: var(--charactersheet-save-modifier-offset-block);
      left: var(--charactersheet-save-modifier-offset-inline);
      position: relative;
    }
  }
</style>
