<script module>
  export const meta = {
    group: 'Primitives',
    title: 'CheckField',
    path: 'module/ui/parts/CheckField.svelte',
    note: 'A captioned checkbox. Written by the armour body and by the creature settings window.',
  };
</script>

<script>
  import CheckField from '../../module/ui/parts/CheckField.svelte';
</script>

<div class="grid grid-3col">
  <CheckField name="system.equipped" label="Equipped" checked={true} />
  <CheckField name="system.useAmmo" label="Uses Ammo" checked={false} />
  <CheckField name="system.antiArmor" label="Anti-Armor" checked={true} />
</div>
