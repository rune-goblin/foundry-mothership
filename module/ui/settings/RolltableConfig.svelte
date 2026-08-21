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
  /* `resource-label`, the `.grid*` classes, `resource`, and `close-button` used in the markup
     above are unstyled here — they're still declared in css/mothership.css (shared, or a
     test locator), not migrated. */
  @layer system {
    .circlestattitle,
    .greyline,
    .button-white {
      --rolltableconfig-title-text: var(--text-tertiary);
      --rolltableconfig-title-font-size: var(--font-size-lg);
      --rolltableconfig-title-font-weight: var(--font-weight-bold);
      --rolltableconfig-heading-text: var(--text-primary);

      --rolltableconfig-rule-border-width: var(--border-width-3);
      --rolltableconfig-rule-color: var(--border-neutral);
      --rolltableconfig-rule-margin-block-start: var(--space-6);
      --rolltableconfig-rule-margin-block-end: var(--space-10);
      --rolltableconfig-rule-margin-inline: var(--space-16);

      --rolltableconfig-button-text: var(--text-primary);
      --rolltableconfig-button-surface: var(--surface-neutral-paper);
      /* Assumes 1rem == 16px: nothing in the application sets a root font-size. */
      --rolltableconfig-button-font-size: var(--font-size-lg);
      --rolltableconfig-button-font-weight: var(--font-weight-bold);
      --rolltableconfig-button-radius: var(--radius-xl);
      --rolltableconfig-button-padding: var(--space-10);
      --rolltableconfig-button-margin-inline-start: var(--space-0);
      --rolltableconfig-button-border-width: var(--border-width-3);
      --rolltableconfig-button-border-color: var(--border-neutral-ink);
    }

    /* Misleadingly named: reads like a caption for `circle-statwrapper` but isn't one — no
       stat circle uses it. */
    .circlestattitle {
      width: 100%;
      color: var(--rolltableconfig-title-text);
      font-size: var(--rolltableconfig-title-font-size);
      font-weight: var(--rolltableconfig-title-font-weight);
      text-align: center;
    }

    /* Same specificity as `.circlestattitle` above; overrides it on source order alone. Keep
       this rule below that one. */
    .black {
      color: var(--rolltableconfig-heading-text);
    }

    /* `grid-area` is inert here — the mount div is a flex container, so this is a flex item,
       not a grid one. */
    .greyline {
      grid-area: line;
      border-top: var(--rolltableconfig-rule-border-width) solid var(--rolltableconfig-rule-color);
      margin-top: var(--rolltableconfig-rule-margin-block-start);
      margin-bottom: var(--rolltableconfig-rule-margin-block-end);
      margin-left: var(--rolltableconfig-rule-margin-inline);
      margin-right: var(--rolltableconfig-rule-margin-inline);
    }

    /* `color` here and css/mothership.css's `.list-roll:hover` are equal specificity (0,2,0);
       the FINISH label stays dark on hover only because this scoped block loads after that file. */
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
