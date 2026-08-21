<script module>
  export const meta = {
    group: 'Primitives',
    title: 'StatModifier',
    path: 'module/ui/parts/StatModifier.svelte',
    note: 'The dot on the right rim of a stat circle, on the number\'s own line, so closed it reads as the second term of a sum and open it is the field you type it in. Hollow while the modifier is zero; filled green above it and red below, carrying the sign in white so the state does not rest on colour alone. It opens once the pointer rests on it, or at once on a click. Enter commits and shuts it; it stays shut until the pointer leaves and comes back. Hover the circles below to see it open.',
  };
</script>

<script>
  import MainStat from '../../module/ui/parts/MainStat.svelte';
  import StatModifier from '../../module/ui/parts/StatModifier.svelte';

  const rows = [
    { key: 'strength', label: 'Strength', value: 26, mod: 0 },
    { key: 'speed', label: 'Speed', value: 26, mod: 9 },
    { key: 'intellect', label: 'Intellect', value: 48, mod: -10 },
  ];

  const tone = (mod) => (mod > 0 ? 'up' : mod < 0 ? 'down' : null);
</script>

<div class="grid grid-2col" style="max-width: 496px;">
  {#each rows as row (row.key)}
    <MainStat
      key={row.key}
      label={row.label}
      name="system.stats.{row.key}.value"
      value={row.value}
      adjusted={row.mod ? row.value + row.mod : null}
      tone={tone(row.mod)}
    >
      {#snippet modifier()}
        <StatModifier name="system.stats.{row.key}.mod" value={row.mod} label={row.label} />
      {/snippet}
    </MainStat>
  {/each}
</div>
