<script>
  import { format } from '../../i18n.ts';

  let { value, label, onstep, min = -Infinity, max = Infinity } = $props();

  const count = $derived(Number(value) || 0);
  const less = $derived(format('Mothership.Decrease', { label }));
  const more = $derived(format('Mothership.Increase', { label }));
</script>

<span class="stepper">
  <button
    type="button"
    class="stepper-step"
    title={less}
    aria-label={less}
    disabled={count <= min}
    onclick={() => onstep(-1)}
  >
    <i class="fas fa-minus"></i>
  </button>
  <span class="stepper-value">{value}</span>
  <button
    type="button"
    class="stepper-step"
    title={more}
    aria-label={more}
    disabled={count >= max}
    onclick={() => onstep(1)}
  >
    <i class="fas fa-plus"></i>
  </button>
</span>

<style>
  /* Foundry dresses every `button` in its own `elements` layer — a height, a border, a background
     and a transition. `system` is declared after `elements` in core's layer order, so the reset
     below outranks it without !important. */
  @layer system {
    .stepper {
      --stepper-gap: var(--space-8);

      display: inline-flex;
      align-items: center;
      gap: var(--stepper-gap);
    }

    .stepper-step {
      --stepper-step-text: var(--text-secondary);
      --stepper-step-font-size: var(--font-size-sm);
      /* A glyph this small needs a hit area larger than its ink. */
      --stepper-step-size: var(--space-16);

      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--stepper-step-size);
      height: var(--stepper-step-size);
      min-height: var(--space-0);
      padding: var(--space-0);
      border: 0;
      background: none;
      color: var(--stepper-step-text);
      font-size: var(--stepper-step-font-size);
      line-height: 1;
      transition: none;
      cursor: pointer;
    }

    .stepper-step:hover {
      --stepper-step-text: var(--text-primary);

      background: none;
    }

    .stepper-step:disabled {
      --stepper-step-text: var(--text-disabled);

      cursor: default;
    }
  }
</style>
