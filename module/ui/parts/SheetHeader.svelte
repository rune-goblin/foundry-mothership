<script>
  import { localize } from '../i18n.js';

  let { documentName, img } = $props();
</script>

<header class="sheet-header">
  <div class="header grid" style="grid-template-columns: 75px auto; width:100%;">
    <!-- data-action is what wires the file picker in V2; AppV1 needed only data-edit. -->
    <img
      class="sbt-profile"
      style="height: auto;"
      src={img}
      data-action="editImage"
      data-edit="img"
      title={documentName}
      alt={documentName}
    />

    <div>
      <div class="headerinputtext">{localize('Mosh.Name')}</div>
      <div class="headerinputfield charname">
        <input
          name="name"
          class="noborder"
          type="text"
          value={documentName}
          placeholder={localize('Mosh.Name')}
        />
      </div>
    </div>
  </div>
</header>
