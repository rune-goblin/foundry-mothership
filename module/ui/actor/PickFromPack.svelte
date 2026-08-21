<script>
  import ChoiceList from '../parts/ChoiceList.svelte';

  let { filterLabel, headers, rows, enforceLabel = '', value, onchange } = $props();

  // Where the toggle starts, not a channel it listens on: from here the reader owns it.
  // svelte-ignore state_referenced_locally
  let enforce = $state(enforceLabel !== '');

  const barred = (row) => enforce && row.unmet === true;

  const options = $derived(
    rows.map((row) => ({
      key: row.id,
      label: row.name,
      cells: row.cells,
      disabled: barred(row),
    })),
  );

  // Turning enforcement on can bar the row already picked; a barred pick must not survive as
  // the dialog's answer.
  const toggleEnforce = (event) => {
    enforce = event.currentTarget.checked;
    const current = rows.find((row) => row.id === value);
    if (current !== undefined && barred(current)) onchange(null);
  };
</script>

{#snippet enforceToggle()}
  <label class="pick-enforce">
    <input type="checkbox" id="pick-enforce" checked={enforce} onchange={toggleEnforce} />
    {enforceLabel}
  </label>
{/snippet}

<ChoiceList
  {filterLabel}
  {headers}
  {options}
  {value}
  {onchange}
  label={headers[0]}
  aside={enforceLabel === '' ? null : enforceToggle}
/>

<style>
  @layer system {
    .pick-enforce {
      --pick-from-pack-enforce-font-size: var(--font-size-sm);
      --pick-from-pack-enforce-text: var(--text-secondary);

      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: var(--space-6);
      font-family: var(--font-sans-mothership);
      font-size: var(--pick-from-pack-enforce-font-size);
      color: var(--pick-from-pack-enforce-text);
      white-space: nowrap;
    }
  }
</style>
