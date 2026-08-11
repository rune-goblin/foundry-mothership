<script>
  import CircleStats from '../parts/CircleStats.svelte';
  import { onActivate } from '../parts/activate.js';
  import { localize } from '../i18n.js';

  let { actor, app } = $props();

  // The button reads "Roll Starting Condition" but the table id is Maintenance Issues -- that
  // mismatch is inherited from the AppV1 window, not a bug introduced here.
  const rollStartingCondition = () =>
    actor.rollTable('kqz8GsFVPfjvqO0N', '1d5+1', 'low', true, false, null, null);

  const finish = () => app.close();
</script>

<CircleStats style="gap: 10px;">
  <div class="circlestattitle" style="font-size: 1.4rem;">
    {localize('Mosh.ShipSetup')}<i class="fa-solid fa-wrench"></i>
  </div>

  <div
    class="button-black conditions-button list-roll"
    style="width: 95%;"
    role="button"
    tabindex="0"
    onclick={rollStartingCondition}
    onkeydown={onActivate(rollStartingCondition)}
  >
    {localize('Mosh.RollStartingCondition')}
  </div>

  <div
    class="button-white close-button list-roll"
    style="width: 95%;"
    role="button"
    tabindex="0"
    onclick={finish}
    onkeydown={onActivate(finish)}
  >
    {localize('Mosh.Finish')} <i class="fa-solid fa-right-long"></i>
  </div>
</CircleStats>
