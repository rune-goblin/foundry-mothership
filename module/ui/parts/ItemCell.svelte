<script>
  import RollDie from './RollDie.svelte';
  import { onActivate } from './activate.js';

  let {
    children,
    grow,
    variant = 'stat',
    roll = false,
    die = false,
    class: extra = '',
    onclick,
    oncontextmenu,
    title,
    role,
  } = $props();

  // A click handler on a <div> needs the button role, a tab stop and a key handler; without one
  // it needs none of them. Spreading keeps that an either/or on one element.
  const interactive = $derived(
    onclick || oncontextmenu
      ? {
          role: 'button',
          tabindex: 0,
          onclick,
          oncontextmenu,
          onkeydown: onclick ? onActivate(onclick) : undefined,
        }
      : { role }
  );
</script>

<div
  class={[`skill-${variant}`, roll && 'list-roll', die && 'has-die', extra]}
  style={grow ? `flex-grow: ${grow};` : undefined}
  {title}
  {...interactive}
>
  {#if die}
    <span class="cell-label">{@render children()}</span>
    <!-- The name variant is a black pill, where the muted die silts up. -->
    <RollDie tone={variant === 'name' ? 'solid' : 'muted'} />
  {:else}
    {@render children()}
  {/if}
</div>

<style>
  /* creature-sheet.spec.ts locates the quantity cell by `.skill-stat` -- keep the class name. */
  @layer system {
    .skill-stat {
      --itemcell-stat-text: var(--text-primary);
      --itemcell-stat-font-size: var(--font-size-lg);
      --itemcell-stat-margin-inline-start: var(--space-0);
      --itemcell-stat-padding-block: var(--space-2);
      --itemcell-stat-padding-inline-start: var(--space-8);
      --itemcell-stat-padding-inline-end: var(--space-2);
      --itemcell-stat-radius: var(--radius-xl);

      color: var(--itemcell-stat-text);
      font-size: var(--itemcell-stat-font-size);
      margin-left: var(--itemcell-stat-margin-inline-start);
      padding: var(--itemcell-stat-padding-block) var(--itemcell-stat-padding-inline-end)
        var(--itemcell-stat-padding-block) var(--itemcell-stat-padding-inline-start);
      border-radius: var(--itemcell-stat-radius);
      text-align: center;
      white-space: nowrap;
    }

    /* The .items-list ancestor is what wins specificity over list-roll:hover; drop it and
       hover repaints the pill white on white. */
    :global(.items-list) .skill-name {
      --itemcell-name-text: var(--text-inverted);
      --itemcell-name-surface: var(--surface-neutral-lowest);
      --itemcell-name-font-weight: var(--font-weight-bold);
      --itemcell-name-font-size: var(--font-size-md);
      --itemcell-name-height: 27px; /* measurement, not a spacing-scale step */
      --itemcell-name-margin-inline-start: var(--space-0);
      --itemcell-name-padding: var(--space-2);
      /* Clears the pill's cap: at 27px tall the ends curve for about half that, so a badge's
         word and die are inset this far to sit inside the straight part. */
      --itemcell-name-padding-inline: var(--space-12);
      --itemcell-name-radius: var(--radius-xl);

      color: var(--itemcell-name-text);
      background: var(--itemcell-name-surface);
      font-weight: var(--itemcell-name-font-weight);
      font-size: var(--itemcell-name-font-size);
      height: var(--itemcell-name-height);
      margin-left: var(--itemcell-name-margin-inline-start);
      padding: var(--itemcell-name-padding);
      border-radius: var(--itemcell-name-radius);
      text-align: center;
      overflow: hidden;
    }

    /* A badge reads left to right: the name on the pill's left edge, the die on its right. Must
       stay after the `.skill-name` rule above — equal specificity, so order decides the padding. */
    .skill-name.has-die {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-inline: var(--itemcell-name-padding-inline);
    }

    /* The die keeps its size and the name gives way, so a long name ellipsizes rather than
       pushing the die out of the pill. */
    .has-die .cell-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
