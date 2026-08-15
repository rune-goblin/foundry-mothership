<script>
  import { localize } from '../../i18n.ts';

  let { documentName, img } = $props();
</script>

<header class="sheet-header">
  <div class="header grid" style="grid-template-columns: 75px auto; width:100%;">
    <!-- data-action is what wires the file picker in V2; AppV1 needed only data-edit. -->
    <img
      class="sheet-header-profile"
      src={img}
      data-action="editImage"
      data-edit="img"
      title={documentName}
      alt={documentName}
    />

    <div>
      <div class="headerinputtext">{localize('Mothership.Name')}</div>
      <div class="headerinputfield charname">
        <input
          name="name"
          class="noborder"
          type="text"
          value={documentName}
          placeholder={localize('Mothership.Name')}
        />
      </div>
    </div>
  </div>
</header>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     One class is here because one class is this component's own: `sheet-header-profile`,
     renamed off the Shipbreaker's-Toolkit prefix no other file ever wore. Everything else
     the markup wears is shared vocabulary css/mothership.css keeps declaring — Generator
     and CharacterSheet hand-write `header`, `headerinputtext`, `headerinputfield` and
     `charname`; those two and CreatureSheet write `noborder`; CreatureSettings writes
     `sheet-header`; forty sites write `grid`.
     The image also carried an inline `height: auto` saying what the rule already said;
     one copy survives, here. */
  @layer system {
    header {
      /* 100px sits off the space scale, between --space-96 and --space-128, and §4.7 maps
         neither: it waits for the reviewed literal sweep. */
      --sheet-header-profile-width: 100px;
      --sheet-header-profile-padding: var(--space-10);
      --sheet-header-profile-border-width: var(--border-width-0);
    }

    .sheet-header-profile {
      width: var(--sheet-header-profile-width);
      height: auto;
      padding: var(--sheet-header-profile-padding);
      border: var(--sheet-header-profile-border-width);
    }
  }
</style>
