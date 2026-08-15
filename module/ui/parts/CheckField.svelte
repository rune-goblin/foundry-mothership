<script>
  // `id` and `onchange` exist for the toggle that is not a form field: CreatureSettings' swarm
  // rewrites Combat as well as itself, so it stays out of `formData` and needs an id of its own
  // for the label and for the e2e locator.
  let { name, label, checked, id, onchange } = $props();
</script>

<div class="resource healthspread blankstat flex-center" style="grid-template-rows: max-content;">
  <label for={id ?? name} class="resource-label minmaxtext">{label}</label>
  <input type="checkbox" {id} {name} data-dtype="Boolean" {checked} {onchange} />
</div>
