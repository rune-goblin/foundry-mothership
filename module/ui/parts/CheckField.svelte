<script>
  let { name, label, checked } = $props();
</script>

<div class="resource healthspread blankstat flex-center" style="grid-template-rows: max-content;">
  <label for={name} class="resource-label minmaxtext">{label}</label>
  <input type="checkbox" {name} data-dtype="Boolean" {checked} />
</div>
