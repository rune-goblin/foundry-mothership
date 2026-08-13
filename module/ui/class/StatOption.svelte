<script>
  // The value and the stats it may be spent on are one answer, so both are gathered here and
  // reported whole on every change.
  let { heading, valueLabel, stats, value, onchange } = $props();

  const chosen = new Set();
  let modification = null;

  const report = () =>
    onchange({
      modification: modification ?? value.modification,
      // The order the answer lists them in is this list's, not the order they were ticked.
      stats: stats.filter((stat) => chosen.has(stat.key)).map((stat) => stat.key),
    });

  const setValue = (event) => {
    modification = Number(event.currentTarget.value) || 0;
    report();
  };

  const toggle = (key) => (event) => {
    if (event.currentTarget.checked) chosen.add(key);
    else chosen.delete(key);
    report();
  };
</script>

<div class="macro_desc" style="margin-bottom : -5px;"><h4>{heading}</h4></div>
<div>
  <input type="number" id="modification" placeholder={valueLabel} oninput={setValue} />
</div>

{#each stats as stat (stat.key)}
  <div>
    <label>
      <input type="checkbox" id={stat.key} onchange={toggle(stat.key)} />{stat.label}
    </label>
  </div>
{/each}
