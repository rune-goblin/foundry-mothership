<script>
  import { onActivate } from './activate.js';

  let { name, value, label, dtype = 'Number', key, roll, onroll } = $props();

  // A rollable label is a button; a plain one carries no role, no tab stop and no handlers.
  // Spreading keeps that an either/or on one element.
  const rollable = $derived(
    onroll
      ? {
          'data-key': key,
          'data-roll': roll,
          'data-label': label,
          role: 'button',
          tabindex: 0,
          onclick: onroll,
          onkeydown: onActivate(onroll),
        }
      : {}
  );
</script>

<div class="resource circle-stat">
  <input class="circle-input" type="text" {name} {value} data-dtype={dtype} />
</div>

{#if label}
  <div class="circlestatlabel">
    <span class="circlestattext {onroll ? 'ability-mod stat-roll rollable' : ''}" {...rollable}>
      {label}
    </span>
  </div>
{/if}
