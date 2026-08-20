<script>
  import { localize } from '../../../i18n.ts';

  let { draft } = $props();

  // No document yet, so no `editImage` action like the character sheet uses.
  async function choosePortrait() {
    const picker = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: draft.portraitSrc,
      callback: (path) => {
        draft.portrait = path;
      },
    });
    await picker.browse();
  }
</script>

<div class="wizard-prose">
  <p>{localize('Mothership.CharacterGenerator.Wizard.Finish.Ready')}</p>
</div>

<div class="wizard-finish">
  <button
    type="button"
    class="wizard-portrait"
    data-action="pickPortrait"
    title={localize('Mothership.CharacterGenerator.Wizard.PortraitPick')}
    onclick={choosePortrait}
  >
    <img src={draft.portraitSrc} alt={localize('Mothership.CharacterGenerator.Wizard.Portrait')} />
  </button>

  <div class="wizard-identity">
    <label>
      <span>{localize('Mothership.Name')}</span>
      <input type="text" name="name" bind:value={draft.name} />
    </label>
    <label>
      <span>{localize('Mothership.Pronouns')}</span>
      <input type="text" name="pronouns" bind:value={draft.pronouns} />
    </label>
  </div>
</div>

<div class="wizard-identity wizard-longform">
  <label>
    <span>{localize('Mothership.Bio')}</span>
    <textarea name="biography" rows="4" bind:value={draft.biography}></textarea>
  </label>
  <label>
    <span>{localize('Mothership.Notes')}</span>
    <textarea name="notes" rows="4" bind:value={draft.notes}></textarea>
  </label>
</div>

<style>
  @layer system {
    .wizard-finish {
      --finishpane-portrait-size: 8rem;

      display: grid;
      grid-template-columns: var(--finishpane-portrait-size) minmax(0, 1fr);
      gap: var(--space-16);
      align-items: start;
    }

    /* `height`/`min-height` release Foundry's pinned button box, as every button in this window
       has to. */
    .wizard-portrait {
      display: block;
      width: var(--finishpane-portrait-size);
      height: var(--finishpane-portrait-size);
      min-height: 0;
      padding: var(--space-6);
      border: var(--border-width-2) solid var(--wizard-edge);
      border-radius: var(--radius-md);
      background: none;
      cursor: pointer;
    }

    .wizard-portrait img {
      width: 100%;
      height: 100%;
      border: 0;
      object-fit: contain;
    }

    .wizard-identity {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-12);
    }

    .wizard-identity label {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .wizard-identity span {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--wizard-ink-muted);
    }

    .wizard-longform textarea {
      min-height: calc(var(--space-20) * 4);
      resize: vertical;
      font-family: inherit;
      font-size: var(--font-size-sm);
    }
  }
</style>
