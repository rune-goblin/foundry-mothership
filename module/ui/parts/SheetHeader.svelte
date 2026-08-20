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
      <div class="headerinputfield">
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
  @layer system {
    header {
      --sheet-header-profile-width: 100px; /* measurement, not a spacing-scale step */
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
