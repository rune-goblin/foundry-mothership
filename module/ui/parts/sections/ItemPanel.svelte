<script>
  import ItemList from '../ItemList.svelte';
  import ItemRow from '../ItemRow.svelte';
  import ItemDisclosure from '../ItemDisclosure.svelte';
  import ItemCell from '../ItemCell.svelte';
  import ItemControls from '../ItemControls.svelte';
  import ItemControl from '../ItemControl.svelte';
  import { localize } from '../../../i18n.ts';

  let { headers, items, row, create, style } = $props();

  // Keyed by id, not by item: `items` is a fresh snapshot on every render of the sheet, so
  // anything holding a row object would forget which rows were open each time it redraws.
  let open = $state({});

  const toggle = (id) => () => {
    open[id] = !open[id];
  };

  // A row with nothing to say offers no chevron, and its name is not a control.
  const disclose = (item) => (item.description ? toggle(item.id) : undefined);
</script>

<ItemList {style}>
  <ItemRow header>
    <ItemDisclosure />
    {#each headers as header (header.label)}
      <ItemCell grow={header.grow}>{header.label}</ItemCell>
    {/each}
    <ItemControls>
      <ItemControl
        icon="plus"
        label={localize('Mothership.Add')}
        title={create.title}
        onclick={create.onclick}
      />
    </ItemControls>
  </ItemRow>

  {#each items as item (item.id)}
    {@const expanded = Boolean(item.description && open[item.id])}
    <ItemRow itemId={item.id}>
      <ItemDisclosure
        open={expanded}
        label={localize(expanded ? 'Mothership.HideDescription' : 'Mothership.ShowDescription')}
        onclick={disclose(item)}
      />
      {@render row(item, disclose(item))}
    </ItemRow>

    {#if expanded}
      <li class="item-description">{@html item.description}</li>
    {/if}
  {/each}
</ItemList>

<style>
  @layer system {
    .item-description {
      /* Clears the chevron column so the text starts under the name, not under its control. */
      --itempanel-description-padding-inline-start: var(--space-32);
      --itempanel-description-padding-inline-end: var(--space-8);
      --itempanel-description-padding-block: var(--space-8);
      --itempanel-description-border-width: var(--border-width-1);
      --itempanel-description-border-color: var(--border-neutral-medium);
      --itempanel-description-text: var(--text-primary);
      --itempanel-description-font-family: var(--font-sans-mothership);
      --itempanel-description-font-size: var(--font-size-sm);
      --itempanel-description-line-height: var(--line-height-tight);

      padding: var(--itempanel-description-padding-block)
        var(--itempanel-description-padding-inline-end) var(--itempanel-description-padding-block)
        var(--itempanel-description-padding-inline-start);
      border-bottom: var(--itempanel-description-border-width) solid
        var(--itempanel-description-border-color);
      color: var(--itempanel-description-text);
      font-family: var(--itempanel-description-font-family);
      font-size: var(--itempanel-description-font-size);
      line-height: var(--itempanel-description-line-height);
    }

    /* :global reaches the enriched HTML, which no scoped selector can be stamped onto. */
    .item-description :global(p:first-child) {
      margin-top: 0;
    }

    .item-description :global(p:last-child) {
      margin-bottom: 0;
    }
  }
</style>
