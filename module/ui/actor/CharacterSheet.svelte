<script>
  import Editor from '../parts/Editor.svelte';
  import ItemCell from '../parts/ItemCell.svelte';
  import ItemControl from '../parts/ItemControl.svelte';
  import ItemControls from '../parts/ItemControls.svelte';
  import ItemImage from '../parts/ItemImage.svelte';
  import MainStat from '../parts/MainStat.svelte';
  import MinMaxField from '../parts/MinMaxField.svelte';
  import StatModifier from '../parts/StatModifier.svelte';
  import PipTrack from '../parts/PipTrack.svelte';
  import TabPanel from '../parts/TabPanel.svelte';
  import Tabs from '../parts/Tabs.svelte';
  import TextareaField from '../parts/TextareaField.svelte';
  import ArmorBlock from '../parts/sections/ArmorBlock.svelte';
  import HealthBlock from '../parts/sections/HealthBlock.svelte';
  import ItemPanel from '../parts/sections/ItemPanel.svelte';
  import { onActivate } from '../parts/activate.js';
  import { localize } from '../../i18n.ts';
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

  const at = (path) => path.split('.').reduce((node, key) => node?.[key], doc);

  const statRoll = (key) => () => actor.rollStat(key);

  const describe = (id) => () => actor.printDescription(id);

  const skillRoll = (id) => () => actor.rollSkill(id);

  const weaponRoll = (id) => () => actor.rollWeapon(id);

  const damageRoll = (id) => () => actor.rollWeapon(id, { roll: 'damage' });

  const step = (id, path, bounds) => (event) => adjust(actor, id, path, stepBy(event), bounds);

  const shotStep = (id) => (event) => stepShots(actor, id, stepBy(event));

  const panic = () => actor.rollPanic();

  const setCover = (cover) => actor.update({ 'system.stats.armor.cover': cover });
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

    <div class="health vitals">
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

      <ArmorBlock armor={system.stats.armor} oncover={setCover} />
    </div>

    <div class="abilities grid grid-1col widegap">
      {#each STATS as stat (stat.key)}
        {@render checkStat(stat)}
      {/each}
    </div>

    <div class="saves">
      <div class="savepanel">
        {#each SAVES as save (save.key)}
          {@render checkStat(save)}
        {/each}
      </div>

      <TextareaField
        fill
        name="system.other.stressdesc.value"
        label={localize('Mothership.TraumaResponse')}
        value={system.other.stressdesc.value}
      />
    </div>
  </div>
</header>

{#snippet checkStat(stat)}
  {@const pod = system.stats[stat.key]}
  {@const mod = Number(pod.mod) || 0}
  <MainStat
    key={stat.key}
    label={localize(stat.label)}
    name="system.stats.{stat.key}.value"
    value={pod.value}
    adjusted={mod ? Number(pod.value) + mod : null}
    tone={mod > 0 ? 'up' : mod < 0 ? 'down' : null}
    onroll={statRoll(stat.key)}
  >
    {#snippet modifier()}
      <StatModifier
        name="system.stats.{stat.key}.mod"
        value={pod.mod}
        label={localize(stat.label)}
      />
    {/snippet}
  </MainStat>
{/snippet}

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
      headers={[
        { label: localize('Mothership.SkillName') },
        { label: localize('Mothership.SkillRank') },
        { label: localize('Mothership.SkillBonus') },
      ]}
      items={skills}
      create={{ title: localize('Mothership.CreateSkill'), onclick: () => promptAddItem(actor, 'skill') }}
      row={skillRow}
      image={false}
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
  <ItemCell variant="name" die roll onclick={skillRoll(skill.id)}>{skill.name}</ItemCell>
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
  <ItemCell variant="name" die grow={2.05} roll onclick={weaponRoll(weapon.id)}>{weapon.name}</ItemCell>
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
      /* Both rails carry the same control now, so they are the same measurement; the vitals take
         what is left of the 820px window. The stat pill's own word sets the floor -- below about
         230px "Strength" outgrows its track and shoves the number circle off the row. */
      --charactersheet-rail-width: 238px;

      --charactersheet-identity-gap: var(--space-4);
      --charactersheet-identity-padding: var(--space-16);

      /* The vitals rows, measured off the blocks they hold, not off the spacing scale. */
      --charactersheet-vitals-row-height: 76px;

      --charactersheet-saves-radius: var(--radius-md);
      --charactersheet-saves-border-width: var(--border-width-2);
      --charactersheet-saves-border-color: var(--border-neutral-ink);
      --charactersheet-saves-padding-block: var(--space-8);
      /* Asymmetric only in that the pills need no room on the right any more: the modifier moved
         inside them. */
      --charactersheet-saves-padding-inline: var(--space-6);
      --charactersheet-saves-gap: var(--space-6);
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
      grid-template-columns:
        var(--charactersheet-rail-width) minmax(0, 1fr) var(--charactersheet-rail-width);
      container-type: inline-size;
    }

    .abilities {
      grid-area: abilities;
    }

    /* Health beside Stress, Wounds beside Armour: the pool you spend on the left of each row, the
       thing that empties it on the right. Armour's row is taller because the cover chip hangs off
       the bottom of it. */
    .vitals {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: var(--charactersheet-vitals-row-height) auto;
      grid-auto-flow: column;
      gap: var(--charactersheet-header-grid-gap);
      align-content: start;
    }

    /* Every block keeps its own row height; only the armour block, which the cover chip hangs off
       the bottom of, is allowed to be as tall as it is. Without this a MinMaxField in the shorter
       row stretches and its captions drift away from the box they name. */
    .vitals > :global(*) {
      width: 100%;
      height: var(--charactersheet-vitals-row-height);
      align-self: start;
    }

    .vitals > :global(*:last-child) {
      height: auto;
    }

    /* The trauma response belongs to the saves, not to the vitals: it is the sentence a failed
       Fear save writes. */
    .saves {
      grid-area: saves;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: var(--charactersheet-header-grid-gap);
      min-height: 0;
    }

    /* A frame, not a slab: three black pills on a black ground made the rail the heaviest thing
       on the sheet, and it is not the most important one. */
    .savepanel {
      display: grid;
      gap: var(--charactersheet-saves-gap);
      align-content: start;
      padding-block: var(--charactersheet-saves-padding-block);
      padding-inline: var(--charactersheet-saves-padding-inline);
      border: var(--charactersheet-saves-border-width) solid var(--charactersheet-saves-border-color);
      border-radius: var(--charactersheet-saves-radius);
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
  }
</style>
