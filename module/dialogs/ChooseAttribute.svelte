<script>
  // The radio group is its own state: `value` is what it opens on, and the browser moves the
  // selection from there. Mirroring it into a rune would only be a second copy to keep in step.
  // `intro` is our own lang string and carries the book's emphasis as markup.
  //
  // No <style> block: every class here belongs to the dialog shell tier, and the radio styling
  // that makes these rows readable is keyed on `input[type="radio"]` across five writers.
  let { stats, heading, intro, value, onchange } = $props();
</script>

<div class="macro_window" style="padding-left: 8px;">
  <div class="macro_desc">
    <h4>{heading}</h4>
    {@html intro}
  </div>
</div>

{#each stats as stat (stat.key)}
  <label for="stat-{stat.key}">
    <div class="macro_window" style="vertical-align: middle; padding-left: 3px;">
      <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
        <input
          type="radio"
          id="stat-{stat.key}"
          name="stat"
          value={stat.key}
          checked={value === stat.key}
          onchange={() => onchange(stat.key)}
        />
        <div class="macro_img" style="padding-top: 5px; padding-bottom: 5px;">
          <img src={stat.img} alt={stat.label} style="border:none" />
        </div>
        <div class="macro_desc" style="display: table;">
          <span style="display: table-cell; vertical-align: middle;">
            <strong>{stat.label}:</strong>
            {stat.example}
          </span>
        </div>
      </div>
    </div>
  </label>
{/each}
