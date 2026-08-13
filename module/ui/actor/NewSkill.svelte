<script>
  // Name and rank are one answer, so what the user changed is held here and reported over what the
  // dialog opened with; the fields themselves keep their own live values.
  let { nameLabel, rankLabel, ranks, value, onchange } = $props();

  const changed = {};

  const set = (field) => (event) => {
    changed[field] = event.currentTarget.value;
    onchange({ ...value, ...changed });
  };
</script>

<div class="macro_window">
  <div class="macro_desc" style="padding-left: 8px; padding-bottom: 0px;">
    <h4>{nameLabel}</h4>
  </div>
  <input type="text" id="name" name="name" value={value.name} oninput={set('name')} />
</div>

<div class="macro_window">
  <div class="macro_desc" style="padding-left: 8px; padding-bottom: 0px;">
    <h4>{rankLabel}</h4>
  </div>
  <select name="rank" id="rank" onchange={set('rank')}>
    {#each ranks as rank (rank.value)}
      <option value={rank.value} selected={rank.value === value.rank}>{rank.label}</option>
    {/each}
  </select>
</div>
