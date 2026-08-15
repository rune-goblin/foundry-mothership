<script>
  import { localize } from '../../../i18n.ts';

  // No <style> block: the `.grid*` set is the Boilerplate layout every sheet reads, and
  // `resource-label` has eleven writers.
  let { system } = $props();
</script>

<div class="grid grid-3col">
  <div class="resource">
    <label class="resource-label" for="system.cost">{localize('Mothership.Value')}</label>
    <input id="system.cost" type="text" name="system.cost" value={system.cost} data-dtype="Number" />
  </div>
  <div class="resource">
    <label class="resource-label" for="system.weight">{localize('Mothership.Weight')}</label>
    <input id="system.weight" type="text" name="system.weight" value={system.weight} data-dtype="Number" />
  </div>
</div>
