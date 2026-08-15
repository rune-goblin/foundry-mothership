<script>
  import { localize } from '../i18n.ts';

  // The radio group holds the table; the roll-type buttons are the dialog's own footer.
  //
  // No <style> block: every class here is the dialog shell's vocabulary — fourteen components
  // write it, and css/mothership.css declares the tier.
  let { image, heading, body, tables, value, onchange } = $props();
</script>

<div class="macro_window" style="margin-bottom: 7px;">
  <div class="grid grid-2col" style="grid-template-columns: 150px auto">
    <div class="macro_img">
      <img src={image} alt={heading} style="border:none" />
    </div>
    <div class="macro_desc">
      <h4>{heading}</h4>
      {body}
    </div>
  </div>
</div>

{#each tables as table (table.key)}
  <label for="wound-{table.key}">
    <div class="macro_window" style="vertical-align: middle; padding-left: 3px;">
      <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
        <input
          type="radio"
          id="wound-{table.key}"
          name="wound_table"
          value={table.key}
          checked={value === table.key}
          onchange={() => onchange(table.key)}
        />
        <div class="macro_img" style="padding-top: 5px; padding-bottom: 5px;">
          <img src={table.img} alt={table.label} style="border:none" />
        </div>
        <div class="macro_desc" style="display: table;">
          <span style="display: table-cell; vertical-align: middle;">
            <strong>{table.label}</strong>
          </span>
        </div>
      </div>
    </div>
  </label>
{/each}

<div class="macro_prompt">{localize('Mothership.SelectYourRollType')}:</div>
