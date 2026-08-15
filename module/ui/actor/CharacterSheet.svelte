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
  import { localize } from '../../i18n.ts';
  import { XP_PIPS } from '../../rules.ts';
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

  // AppV1 named "character" as the initial tab, which no panel declares; Foundry's Tabs falls
  // back to the first nav entry, so Skills is what the sheet has always opened on.
  let tab = $state('skills');

  const tabs = $derived([
    { id: 'skills', label: localize('Mothership.Skills') },
    { id: 'weapons', label: localize('Mothership.Weapons') },
    { id: 'armor', label: localize('Mothership.Armor') },
    { id: 'items', label: localize('Mothership.Items') },
    { id: 'conditions', label: localize('Mothership.Conditions') },
    { id: 'notes', label: localize('Mothership.Notes') },
  ]);

  // The header's five free-text fields differ only by path and caption. The path is spelled out
  // rather than built from a key, because test/sheet-bindings.test.ts checks these against the
  // schema and it can only do that for a literal.
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

  const XP_MILESTONES = {
    5: { label: 'Trained', left: -54 },
    10: { label: 'Expert', left: -50 },
    15: { label: 'Master', left: -52 },
  };

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
          <div class="headerinputfield charname">
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

      <div style="margin-left: 6px; margin-right: 0px; flex: 0; grid-column-start: 1; grid-column-end: 3;">
        <div class="resource-label">{localize('Mothership.TraumaResponse')}</div>
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
          class="list-roll flex"
          style="position: relative; top: -7px;"
          role="button"
          tabindex="0"
          onclick={stepXp}
          oncontextmenu={stepXp}
          onkeydown={onActivate(stepXp)}
        >
          <PipTrack count={XP_PIPS} value={system.xp.value} milestones={XP_MILESTONES} />
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
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     Only the eight names nothing else emits are here, and all eight sit inside the header --
     which is why the slots are declared on it. The rest of this sheet's markup wears shared
     vocabulary css/mothership.css keeps declaring: `char-header`, `header-fields` and `header`
     (Generator hand-writes all three), `headerinputtext`/`headerinputfield`/`charname`/
     `noborder` (Generator and SheetHeader), `profile` (CreatureSheet), `textarea-input`
     (ClassSheet), `textarea-input-grey` and `skill_training_frame` (CreatureSheet),
     `resource-label`, `sheet-body` (five sheets), the modifier pair `mainstatmod-input`/
     `mainstatmod-title` (RollBox), the `.grid*`/`.flex*`/`widegap` set and the
     `list-roll`/`rollable` hover group.
     `savetext` stays there despite this sheet being its only writer: RollableStat renders the
     element the class lands on, so a scoped block here can never reach it -- and its
     `color: white` only beats the hover group because it sits later in that one file, the tie
     `mainstattext` documents. Moving it would move it out of the order it wins on. */
  @layer system {
    .char-header {
      --charactersheet-header-grid-gap: var(--space-10);
      --charactersheet-header-grid-padding: var(--space-2);
      /* Neither track is on the space scale (96 | 128 straddles both), and both set the width
         of the whole header: a snap here is a reviewed pixel change, not this unit's. */
      --charactersheet-header-grid-columns: 238px auto 100px;

      /* rem against a px scale -- 0.25rem is 4px only while nothing sets a root font-size, and
         1em is the identity field's own size. Both wait for the reviewed literal sweep. */
      --charactersheet-identity-gap: 0.25rem;
      --charactersheet-identity-padding: 1em;

      --charactersheet-saves-surface: var(--surface-neutral-lowest);
      --charactersheet-saves-radius: var(--radius-md);
      /* 0.3rem and 0.4rem are 4.8px and 6.4px; 225 is off the scale outright. */
      --charactersheet-saves-padding-block-start: 0.4rem;
      --charactersheet-saves-padding-block-end: 0.3rem;
      --charactersheet-saves-height: 225px;

      --charactersheet-save-value-font-family: var(--font-display);
      --charactersheet-save-value-font-size: var(--font-size-xl);
      --charactersheet-save-value-font-weight: var(--font-weight-bold);
      --charactersheet-save-value-surface: var(--color-white);
      --charactersheet-save-value-border-width: var(--border-width-4);
      /* Every border tier reads a step built for a dark ground (faint is #444), so none of them
         holds this line -- DS6b's parked tier-inversion call. */
      --charactersheet-save-value-border-color: var(--color-neutral-900);
      /* em radius against a px scale, and the box's own -0.15em bleed: both off it. */
      --charactersheet-save-value-radius: 0.5em;
      --charactersheet-save-value-margin: -0.15em;
      --charactersheet-save-value-height: 42px;
      --charactersheet-save-value-width: 45px;
      --charactersheet-save-value-padding: var(--space-0);

      --charactersheet-save-modifier-font-family: var(--font-display);
      --charactersheet-save-modifier-font-size: var(--font-size-sm);
      --charactersheet-save-modifier-font-weight: var(--font-weight-bold);
      --charactersheet-save-modifier-text: var(--color-danger-300);
      /* lightgrey is #d3d3d3, between --color-neutral-200 (#e3e3e3) and -300 (#bbbbbb) and on
         neither. It arrived as the second of two `background` declarations, the first of which
         (white) never rendered; the dead one is gone. */
      --charactersheet-save-modifier-surface: lightgrey;
      --charactersheet-save-modifier-radius: 0.5em;
      --charactersheet-save-modifier-border-width: var(--border-width-0);
      --charactersheet-save-modifier-height: 26px;
      --charactersheet-save-modifier-width: 28px;
      --charactersheet-save-modifier-padding: var(--space-0);
      --charactersheet-save-modifier-margin-inline-start: -22px;
      --charactersheet-save-modifier-offset-block: 7px;
      --charactersheet-save-modifier-offset-inline: 13px;
    }

    /* The header carries both classes, so this reaches the inner grid only -- keep the chain.
       `centercol` and `mobilehealth` are claimed by `.mothership .health` in css/mothership.css,
       which Cover also writes and this block therefore cannot take. */
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

    /* (0,2,0), the same weight `.mothership .grid` gives `padding: 0` on this element: the
       component sheet loads after css/mothership.css, so these two paddings keep winning. */
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

    /* The padding is zeroed for the reason the stat modifier's twin still records in
       css/mothership.css: a two-digit bonus overflows the 28px pill under an ApplicationV2
       window's input padding, which is wider than AppV1's. */
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
