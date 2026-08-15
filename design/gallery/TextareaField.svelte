<script module>
  export const meta = {
    group: 'Primitives',
    title: 'TextareaField',
    path: 'module/ui/parts/TextareaField.svelte',
    note: 'A captioned textarea spanning both columns. Foundry stretches a textarea to its container only inside an AppV1 window, so this box collapsed to the 20-column intrinsic default until the component took the rule home.',
  };
</script>

<script>
  import TextareaField from '../../module/ui/parts/TextareaField.svelte';
</script>

<div class="grid grid-2col">
  <TextareaField
    name="system.trauma_response"
    label="Trauma Response"
    value="Whenever you Panic, every close friendly character gains 1 Stress."
  />
</div>
