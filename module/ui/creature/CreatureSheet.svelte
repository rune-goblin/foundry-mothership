<script>
  import Editor from '../parts/Editor.svelte';
  import ItemCell from '../parts/ItemCell.svelte';
  import ItemControl from '../parts/ItemControl.svelte';
  import ItemList from '../parts/ItemList.svelte';
  import ItemRow from '../parts/ItemRow.svelte';
  import MainStat from '../parts/MainStat.svelte';
  import HealthBlock from '../parts/sections/HealthBlock.svelte';
  import { onActivate } from '../parts/activate.js';
  import { localize } from '../../i18n.ts';
  import { createItem, deleteItem, editItem, promptAddItem } from '../actor/items.js';

  let { store } = $props();

  const doc = $derived(store.current);
  const system = $derived(doc.system);
  const actor = $derived(store.document);

  // UCR p2 lists seven things and no more: the name, Combat, Instinct, the attacks, AP, the
  // wound total over Health, and the special abilities. Skills, gear, worn armour and
  // conditions belong to characters, so nothing here reads them.
  const abilities = $derived(doc.items.filter((item) => item.type === 'ability'));
  const attacks = $derived(doc.items.filter((item) => item.type === 'weapon'));

  const HERO = [
    { key: 'combat', label: 'Mothership.Combat' },
    { key: 'instinct', label: 'Mothership.Instinct' },
  ];

  // Loyalty is a Contractor's, and Armor Points appear only where a horror has any: both stay
  // off until the creature settings turn them on.
  const OPTIONAL = [
    { key: 'loyalty', label: 'Mothership.Loyalty' },
    { key: 'armor', label: 'Mothership.Armor' },
  ];

  const enabled = (stats) => stats.filter((stat) => system.stats[stat.key].enabled);

  const heroes = $derived(
    enabled(HERO).map((stat) => ({
      ...stat,
      // A swarm's combat value is a whole wound's worth of attacks, so the label says so.
      text:
        stat.key === 'combat' && system.swarm.enabled
          ? `${localize(stat.label)} ${localize('Mothership.SwarmWoundShort')}`
          : localize(stat.label),
    }))
  );

  const extras = $derived(enabled(OPTIONAL));

  const damageText = (weapon) =>
    weapon.system.antiArmor
      ? `${weapon.system.damage} (${localize('Mothership.AntiArmorAcronym')})`
      : weapon.system.damage;

  const statRoll = (key) => () => actor.rollStat(key);

  const describe = (id) => () => actor.printDescription(id);

  const attackRoll = (id) => () => actor.rollWeapon(id, { damage: actor.swarmDamage(id) });

  const damageRoll = (id) => () =>
    actor.rollWeapon(id, { roll: 'damage', damage: actor.swarmDamage(id) });

  // Cover is the only thing the armour readout has ever rolled; AP itself is a plain number.
  const armorRoll = () => actor.chooseCover();
</script>

{#snippet bar(title, control)}
  <div class="creature-bar">
    <div class="creature-bar-title" role="heading" aria-level="2">{title}</div>
    <div class="creature-bar-rule"></div>
    {#if control}<div class="creature-bar-control">{@render control()}</div>{/if}
  </div>
{/snippet}

<article class="creature-block">
  <header class="creature-masthead">
    <img
      class="creature-portrait noborder"
      src={doc.img}
      data-action="editImage"
      data-edit="img"
      title={doc.name}
      alt={doc.name}
    />

    <input
      name="name"
      class="noborder creature-name"
      type="text"
      value={doc.name}
      placeholder={localize('Mothership.Name')}
    />
  </header>

  <div class="creature-hero">
    {#each heroes as stat (stat.key)}
      <MainStat
        size="lg"
        key={stat.key}
        label={stat.text}
        name="system.stats.{stat.key}.value"
        value={system.stats[stat.key].value}
        onroll={statRoll(stat.key)}
      />
    {/each}
  </div>

  <div class="creature-vitals grid grid-2col">
    <HealthBlock health={system.health} hits={system.hits} />
  </div>

  {#if extras.length}
    <div class="creature-extras">
      {#each extras as stat (stat.key)}
        <MainStat
          key={stat.key}
          label={localize(stat.label)}
          name="system.stats.{stat.key}.value"
          value={system.stats[stat.key].value}
          onroll={stat.key === 'armor' ? armorRoll : statRoll(stat.key)}
        />
      {/each}
    </div>
  {/if}

  <div class="creature-columns">
    <div class="creature-column">
      <section class="creature-attacks">
        {@render bar(localize('Mothership.Attack'), addAttack)}

        {#if attacks.length}
          <ItemList>
            {#each attacks as attack (attack.id)}
              <ItemRow itemId={attack.id}>
                <ItemCell variant="name" die grow={2} roll onclick={attackRoll(attack.id)}>
                  {attack.name}
                </ItemCell>
                <ItemCell die roll onclick={damageRoll(attack.id)}>
                  {damageText(attack)}
                </ItemCell>
                <div class="creature-row-controls">
                  <ItemControl
                    icon="edit"
                    title={localize('Mothership.EditWeapon')}
                    onclick={() => editItem(actor, attack.id)}
                  />
                  <ItemControl
                    icon="trash"
                    title={localize('Mothership.DeleteWeapon')}
                    onclick={() => deleteItem(actor, attack.id)}
                  />
                </div>
              </ItemRow>
            {/each}
          </ItemList>
        {:else}
          <p class="creature-empty">{localize('Mothership.NoAttack')}</p>
        {/if}
      </section>

      <section class="creature-brief">
        {@render bar(localize('Mothership.Description'))}

        <Editor
          name="system.description"
          value={system.description}
          enriched={doc.enriched.description}
          uuid={doc.uuid}
        />
      </section>
    </div>

    <section class="creature-specials">
      {@render bar(localize('Mothership.SpecialAbilities'), addAbility)}

      {#each abilities as ability (ability.id)}
        <div class="creature-special item draggable" draggable="true" data-item-id={ability.id}>
          <div
            class="creature-special-title list-roll"
            role="button"
            tabindex="0"
            onclick={describe(ability.id)}
            onkeydown={onActivate(describe(ability.id))}
          >
            {ability.name}
          </div>
          <div class="creature-special-controls">
            <ItemControl
              icon="edit"
              title={localize('Mothership.EditAbility')}
              onclick={() => editItem(actor, ability.id)}
            />
            <ItemControl
              icon="trash"
              title={localize('Mothership.DeleteAbility')}
              onclick={() => deleteItem(actor, ability.id)}
            />
          </div>
          <div class="creature-special-text">{@html ability.system.description}</div>
        </div>
      {:else}
        <p class="creature-empty is-ink">{localize('Mothership.NoSpecialAbility')}</p>
      {/each}
    </section>
  </div>
</article>

{#snippet addAttack()}
  <ItemControl
    icon="plus"
    label={localize('Mothership.Add')}
    title={localize('Mothership.AddWeapon')}
    onclick={() => promptAddItem(actor, 'weapon')}
  />
{/snippet}

{#snippet addAbility()}
  <ItemControl
    icon="plus"
    label={localize('Mothership.Add')}
    title={localize('Mothership.CreateAbility')}
    onclick={() => createItem(actor, 'ability')}
  />
{/snippet}

<style>
  @layer system {
    .creature-block {
      --creaturesheet-gap: var(--space-16);
      --creaturesheet-padding-inline: var(--space-16);

      --creaturesheet-masthead-surface: var(--surface-neutral-lowest);
      --creaturesheet-masthead-padding-block: var(--space-12);
      --creaturesheet-masthead-padding-inline: var(--space-16);
      --creaturesheet-masthead-gap: var(--space-16);

      /* A dossier photo, square and keylined — sized to the two lines of type beside it. */
      --creaturesheet-portrait-size: 76px;
      --creaturesheet-portrait-border-width: var(--border-width-2);
      --creaturesheet-portrait-border-color: var(--border-neutral-paper);
      --creaturesheet-portrait-radius: var(--radius-sm);

      --creaturesheet-name-text: var(--text-inverted);
      --creaturesheet-name-font-family: var(--font-display);
      --creaturesheet-name-font-size: var(--font-size-6xl);
      --creaturesheet-name-font-weight: var(--font-weight-bold);

      --creaturesheet-hero-gap: var(--space-32);
      --creaturesheet-extras-gap: var(--space-16);

      --creaturesheet-bar-gap: var(--space-8);
      --creaturesheet-bar-rule-width: var(--border-width-3);
      --creaturesheet-bar-font-family: var(--font-display);
      --creaturesheet-bar-font-size: var(--font-size-md);
      --creaturesheet-bar-font-weight: var(--font-weight-bold);
      --creaturesheet-bar-letter-spacing: var(--letter-spacing-wide);

      --creaturesheet-columns: 1fr 17em;
      --creaturesheet-columns-gap: var(--space-16);
      --creaturesheet-column-gap: var(--space-12);

      --creaturesheet-controls-basis: 52px; /* two icons and the gap between them */

      --creaturesheet-empty-text: var(--text-secondary);
      --creaturesheet-empty-font-family: var(--font-display);
      --creaturesheet-empty-font-size: var(--font-size-sm);
      --creaturesheet-empty-padding-block: var(--space-10);

      --creaturesheet-specials-surface: var(--surface-neutral-lowest);
      --creaturesheet-specials-radius: var(--radius-md);
      --creaturesheet-specials-padding: var(--space-10);
      --creaturesheet-specials-gap: var(--space-16);
      --creaturesheet-special-title-font-family: var(--font-display);
      --creaturesheet-special-title-font-size: var(--font-size-md);
      --creaturesheet-special-title-font-weight: var(--font-weight-bold);
      --creaturesheet-special-body-font-family: var(--font-sans-mothership);
      --creaturesheet-special-body-font-size: var(--font-size-sm);
      --creaturesheet-special-body-line-height: var(--line-height-tight);

      display: flex;
      flex-direction: column;
      gap: var(--creaturesheet-gap);
      height: 100%;
    }

    .creature-masthead {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: var(--creaturesheet-masthead-gap);
      padding: var(--creaturesheet-masthead-padding-block)
        var(--creaturesheet-masthead-padding-inline);
      background: var(--creaturesheet-masthead-surface);
    }

    .creature-portrait {
      height: var(--creaturesheet-portrait-size);
      width: var(--creaturesheet-portrait-size);
      border: var(--creaturesheet-portrait-border-width) solid
        var(--creaturesheet-portrait-border-color);
      border-radius: var(--creaturesheet-portrait-radius);
      object-fit: cover;
      cursor: pointer;
    }

    .creature-name {
      height: auto;
      width: 100%;
      padding: 0;
      /* No background of its own: Foundry paints its input ground from a layer this one cannot
         outrank, and the shade it leaves is what marks the name as a field on the black plate. */
      color: var(--creaturesheet-name-text);
      font-family: var(--creaturesheet-name-font-family);
      font-size: var(--creaturesheet-name-font-size);
      font-weight: var(--creaturesheet-name-font-weight);
      line-height: var(--line-height-tightest);
      text-transform: uppercase;
    }

    .creature-hero {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
      gap: var(--creaturesheet-hero-gap);
      padding-inline: var(--creaturesheet-padding-inline);
    }

    .creature-vitals,
    .creature-extras {
      padding-inline: var(--creaturesheet-padding-inline);
    }

    /* One row whatever the settings turn on, so a lone stat never wraps onto a line of its own. */
    .creature-extras {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
      gap: var(--creaturesheet-extras-gap);
    }

    .creature-bar {
      display: flex;
      align-items: center;
      gap: var(--creaturesheet-bar-gap);
    }

    .creature-bar-title {
      flex: 0 0 auto;
      margin: 0;
      border: 0;
      font-family: var(--creaturesheet-bar-font-family);
      font-size: var(--creaturesheet-bar-font-size);
      font-weight: var(--creaturesheet-bar-font-weight);
      letter-spacing: var(--creaturesheet-bar-letter-spacing);
      line-height: var(--line-height-none);
      text-transform: uppercase;
      white-space: nowrap;
    }

    .creature-bar-rule {
      flex: 1 1 0;
      min-width: 0;
      border-top: var(--creaturesheet-bar-rule-width) solid currentColor;
    }

    .creature-bar-control {
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .creature-columns {
      display: grid;
      grid-template-columns: var(--creaturesheet-columns);
      gap: var(--creaturesheet-columns-gap);
      flex: 1;
      min-height: 0;
      padding-inline: var(--creaturesheet-padding-inline);
      padding-bottom: var(--creaturesheet-padding-inline);
    }

    .creature-column {
      display: flex;
      flex-direction: column;
      gap: var(--creaturesheet-column-gap);
      min-height: 0;
    }

    /* The description takes what the attacks leave: a horror with one attack gets a tall
       write-up, a horror with six gets a short one, and neither scrolls the window. */
    .creature-brief {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    /* :global reaches ProseMirror's own markup, rendered by Editor.svelte and outside this
       component's scoped styles. */
    .creature-brief :global(.editor) {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .creature-row-controls {
      flex: 0 0 var(--creaturesheet-controls-basis);
      text-align: right;
    }

    .creature-special {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      column-gap: var(--space-6);
    }

    .creature-special-controls {
      align-self: start;
      white-space: nowrap;
    }

    /* :global reaches ItemControl's own anchor. `darkgrey` is a paper colour and silts up here. */
    .creature-specials :global(.item-control) {
      color: var(--text-muted);
    }

    .creature-specials :global(.item-control:hover) {
      color: var(--text-inverted);
      text-shadow: none;
    }

    .creature-empty {
      margin: 0;
      padding-block: var(--creaturesheet-empty-padding-block);
      color: var(--creaturesheet-empty-text);
      font-family: var(--creaturesheet-empty-font-family);
      font-size: var(--creaturesheet-empty-font-size);
    }

    .creature-empty.is-ink {
      color: var(--text-muted);
    }

    .creature-specials {
      display: flex;
      flex-direction: column;
      gap: var(--creaturesheet-specials-gap);
      min-height: 0;
      padding: var(--creaturesheet-specials-padding);
      border-radius: var(--creaturesheet-specials-radius);
      background: var(--creaturesheet-specials-surface);
      color: var(--text-inverted);
      overflow-y: auto;
    }

    .creature-special-title {
      margin: 0;
      border: 0;
      color: var(--text-inverted);
      font-family: var(--creaturesheet-special-title-font-family);
      font-size: var(--creaturesheet-special-title-font-size);
      font-weight: var(--creaturesheet-special-title-font-weight);
      line-height: var(--line-height-tightest);
      text-transform: uppercase;
    }

    .creature-special-text {
      grid-column: 1 / -1;
      color: var(--text-inverted);
      font-family: var(--creaturesheet-special-body-font-family);
      font-size: var(--creaturesheet-special-body-font-size);
      line-height: var(--creaturesheet-special-body-line-height);
    }
  }
</style>
