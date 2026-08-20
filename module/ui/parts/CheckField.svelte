<script>
  // id/onchange let a caller (CreatureSettings' swarm toggle) keep this out of formData
  // and drive it manually.
  let { name, label, checked, id, onchange } = $props();
</script>

<div class="resource healthspread blankstat flex-center" style="grid-template-rows: max-content;">
  <label for={id ?? name} class="resource-label minmaxtext">{label}</label>
  <input type="checkbox" {id} {name} data-dtype="Boolean" {checked} {onchange} />
</div>
