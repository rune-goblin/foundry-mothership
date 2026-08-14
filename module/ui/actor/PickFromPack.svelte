<script>
  // The pick is mirrored here because the `value` prop never re-renders — svelte-dialog holds it
  // in a closure — and a refilter rebuilds the radio nodes, which would otherwise forget it.
  let { filterLabel, headers, rows, enforceLabel = '', value, onchange } = $props();

  // svelte-ignore state_referenced_locally
  let selected = $state(value);
  let filter = $state('');
  // svelte-ignore state_referenced_locally
  let enforce = $state(enforceLabel !== '');

  const visible = $derived(
    rows.filter((row) => row.name.toLowerCase().includes(filter.trim().toLowerCase())),
  );

  const barred = (row) => enforce && row.unmet === true;

  const columns = $derived(`20px 40px auto${' 90px'.repeat(headers.length - 1)}`);

  const pick = (row) => () => {
    selected = row.id;
    onchange(row.id);
  };

  // Turning enforcement on can bar the row already picked; a barred pick must not survive as
  // the dialog's answer.
  const toggleEnforce = (event) => {
    enforce = event.currentTarget.checked;
    const current = rows.find((row) => row.id === selected);
    if (current !== undefined && barred(current)) {
      selected = null;
      onchange(null);
    }
  };
</script>

<div class="macro_window">
  <input
    type="text"
    id="pick-filter"
    placeholder={filterLabel}
    aria-label={filterLabel}
    bind:value={filter}
  />
  {#if enforceLabel !== ''}
    <label style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;">
      <input type="checkbox" id="pick-enforce" checked={enforce} onchange={toggleEnforce} />
      {enforceLabel}
    </label>
  {/if}
</div>

<div class="macro_window" style="padding-left: 3px;">
  <div class="grid" style="align-items: center; grid-template-columns: {columns};">
    <div></div>
    <div></div>
    {#each headers as header (header)}
      <div class="macro_desc"><strong>{header}</strong></div>
    {/each}
  </div>
</div>

<div style="max-height: 400px; overflow-y: auto;">
  {#each visible as row (row.id)}
    <label for="pick-{row.id}">
      <div
        class="macro_window"
        style="vertical-align: middle; padding-left: 3px;{barred(row) ? ' opacity: 0.4;' : ''}"
      >
        <div class="grid" style="align-items: center; grid-template-columns: {columns};">
          <input
            type="radio"
            id="pick-{row.id}"
            name="pick"
            value={row.id}
            disabled={barred(row)}
            checked={selected === row.id}
            onchange={pick(row)}
          />
          <div class="macro_img" style="padding-top: 5px; padding-bottom: 5px;">
            <img src={row.img} alt={row.name} style="border: none; max-width: 30px; max-height: 30px;" />
          </div>
          <div class="macro_desc"><strong>{row.name}</strong></div>
          {#each row.cells as cell, index (index)}
            <div class="macro_desc">{cell}</div>
          {/each}
        </div>
      </div>
    </label>
  {/each}
</div>
