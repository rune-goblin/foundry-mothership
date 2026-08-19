<script>
  let { lines, step = null } = $props();
</script>

<div class="wizard-prose">
  {#each lines as line, position (position)}
    <p>{line}</p>
  {/each}
  {#if step && step.bullets.length > 0}
    <ul class="wizard-bullets">
      {#each step.bullets as bullet (bullet)}
        <li>{bullet}</li>
      {/each}
    </ul>
  {/if}
  {#if step && step.references.length > 0}
    <p class="wizard-references">
      {#each step.references as reference (reference.text)}
        <span>{reference.text}</span>
      {/each}
    </p>
  {/if}
</div>

<style>
  @layer system {
    .wizard-prose p {
      margin: 0 0 var(--space-8);
    }

    .wizard-bullets {
      margin: 0;
      padding-left: var(--space-20);
    }

    .wizard-references {
      margin: var(--space-8) 0 0;
      font-size: var(--font-size-sm);
      font-style: italic;
      color: var(--wizard-ink-muted);
    }

    .wizard-references span::after {
      content: ' ';
    }
  }
</style>
