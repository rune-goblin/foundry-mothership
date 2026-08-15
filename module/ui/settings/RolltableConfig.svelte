<script>
  import { ROLLTABLE_GROUPS } from './RolltableConfigApp.js';
  import { onActivate } from '../parts/activate.js';

  let { app, values } = $props();

  const close = () => app.close();
</script>

<div class="circlestattitle black" style="font-size: 1.25rem;">
  Rolltable Configuration <i class="fa-solid fa-list"></i>
</div>
<div class="greyline"></div>

{#each ROLLTABLE_GROUPS as group (group.label)}
  <div class="circle-statwrapper" style="gap: 2px;">
    <div class="circlestattitle">{group.label} <i class={group.icon}></i></div>
    <div class="grid grid-{group.columns}col" style="padding-left: 8px; padding-right: 8px;">
      {#each group.fields as field, i (field?.key ?? i)}
        {#if field}
          <div class="resource">
            <label class="resource-label" for={field.key}>{field.label}</label>
            <input type="text" name={field.key} id={field.key} value={values[field.key]} data-dtype="String" />
          </div>
        {:else}
          <div></div>
        {/if}
      {/each}
    </div>
  </div>
  <br />
{/each}

<div style="gap: 10px;">
  <div
    class="button-white close-button list-roll"
    style="width: 100%;"
    role="button"
    tabindex="0"
    onclick={close}
    onkeydown={onActivate(close)}
  >
    FINISH <i class="fa-solid fa-right-long"></i>
  </div>
</div>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     Four names, all four written by this file alone. `circlestattitle` is the naming trap in
     the set: it reads like a caption belonging to `circle-statwrapper`, and it never was one --
     no stat circle in the system writes it, and CircleStat.svelte was deleted with no consumer.
     `black` is the modifier the window heading wears over it.
     What css/mothership.css keeps declaring for this window: `circle-statwrapper`, which the
     skill sheet's CircleStats mounts too; `resource-label`, hand-written by eleven files; the
     `.grid*` set, whose column count this markup builds by interpolation (`grid-{n}col`) --
     the audit's dynamic channel is what keeps those alive. `resource` and `close-button` carry
     no rule anywhere: the first is markup habit, the second is rolltable-config.spec.ts's
     locator for the bar below.
     There is no single root to hang the slots off -- the heading, the rule and the three group
     panels are siblings under the mount div -- so they are declared on the elements that read
     them, the way CreatureSheet declares them on its pair of grids.
     The tie to preserve is the FINISH bar's: `.mothership .button-white`'s `color` and
     `:where(.mothership) .list-roll:hover`'s both weigh (0,2,0), and the bar kept its dark
     label under the cursor only because it sat later in css/mothership.css. Scoped, it weighs
     the same (0,2,0) and the component sheet loads after that file, so the survival holds. */
  @layer system {
    .circlestattitle,
    .greyline,
    .button-white {
      --rolltableconfig-title-text: var(--text-tertiary);
      --rolltableconfig-title-font-size: var(--font-size-lg);
      --rolltableconfig-title-font-weight: var(--font-weight-bold);
      --rolltableconfig-heading-text: var(--color-black);

      --rolltableconfig-rule-border-width: var(--border-width-3);
      --rolltableconfig-rule-color: var(--border-neutral);
      /* §4.7 snaps 5 to 4 or 6 and 15 to 16; both move the line off its measured position, so
         they wait for the reviewed sweep. 10 is on the scale already. CreatureSheet holds the
         same three values for the same reason: this rule and its `whiteline` twin were
         identical byte for byte apart from the colour. */
      --rolltableconfig-rule-margin-block-start: 5px;
      --rolltableconfig-rule-margin-block-end: var(--space-10);
      --rolltableconfig-rule-margin-inline: 15px;

      --rolltableconfig-button-text: var(--text-primary);
      --rolltableconfig-button-surface: var(--color-white);
      /* 16px against a rem scale: nothing in the application sets a root font-size -- neither
         foundry2.css nor any runtime setter in foundry.mjs -- so 1rem is the same 16px. The
         call ItemCell's `medium` took. */
      --rolltableconfig-button-font-size: var(--font-size-lg);
      --rolltableconfig-button-font-weight: var(--font-weight-bold);
      --rolltableconfig-button-radius: var(--radius-xl);
      --rolltableconfig-button-padding: var(--space-10);
      --rolltableconfig-button-margin-inline-start: var(--space-0);
      --rolltableconfig-button-border-width: var(--border-width-3);
      /* Every border tier reads a step built for a dark ground (faint is #444), so none of them
         holds this edge -- DS6b's parked tier-inversion call. The rule above escapes it: its
         `grey` is `--border-neutral` byte for byte. */
      --rolltableconfig-button-border-color: var(--color-neutral-900);
    }

    .circlestattitle {
      width: 100%;
      color: var(--rolltableconfig-title-text);
      font-size: var(--rolltableconfig-title-font-size);
      font-weight: var(--rolltableconfig-title-font-weight);
      text-align: center;
      text-transform: uppercase;
    }

    /* Equal specificity with the rule above, which it overrides on source order alone -- the
       order it had in css/mothership.css. Keep it below. */
    .black {
      color: var(--rolltableconfig-heading-text);
    }

    /* `grid-area` is inert here: the mount div is a column flex container (css/mothership.css
       gives every Svelte root that layout), so this line is a flex item and never a grid one.
       It is what `whiteline` still needs on the creature sheet, and the two rules were one. */
    .greyline {
      grid-area: line;
      border-top: var(--rolltableconfig-rule-border-width) solid var(--rolltableconfig-rule-color);
      margin-top: var(--rolltableconfig-rule-margin-block-start);
      margin-bottom: var(--rolltableconfig-rule-margin-block-end);
      margin-left: var(--rolltableconfig-rule-margin-inline);
      margin-right: var(--rolltableconfig-rule-margin-inline);
    }

    .button-white {
      margin-left: var(--rolltableconfig-button-margin-inline-start);
      padding: var(--rolltableconfig-button-padding);
      border: var(--rolltableconfig-button-border-width) solid
        var(--rolltableconfig-button-border-color);
      border-radius: var(--rolltableconfig-button-radius);
      background: var(--rolltableconfig-button-surface);
      color: var(--rolltableconfig-button-text);
      font-size: var(--rolltableconfig-button-font-size);
      font-weight: var(--rolltableconfig-button-font-weight);
      text-align: center;
      overflow: hidden;
    }
  }
</style>
