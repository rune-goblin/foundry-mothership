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
