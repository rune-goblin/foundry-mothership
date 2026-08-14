<script>
  import { asset } from '../chat/cards.ts';
  import { localize } from '../i18n.ts';
  import { COVER_BONUS } from '../rules.ts';

  // The radio group holds the choice; `value` is the cover the actor is already behind.
  let { options, armorPoints, damageReduction, value, onchange } = $props();
</script>

<div class="macro_window">
  <div class="grid grid-2col" style="grid-template-columns: 150px auto">
    <div class="macro_img">
      <img src={asset('images/icons/ui/attributes/armor.png')} alt={localize('Mothership.Cover')} />
    </div>
    <div class="macro_desc">
      <h4>{localize('Mothership.Cover')}</h4>
      {localize('Mothership.TheEnvironmentCanProvideProtectionCalled')}
      <strong>{localize('Mothership.Cover')}</strong>. {localize('Mothership.ItCanBeDestroyedLikeArmor')}
      <strong>{localize('Mothership.IfYouShotWhileInCover')}.</strong>
      {localize('Mothership.YourCoverValuesAreDisplayedIn')}
      <strong><span style="color: orangered">{localize('Mothership.Orange')}</span></strong>.
    </div>
  </div>
</div>

<div class="macro_prompt">{localize('Mothership.SelectYourCurrentCoverSituation')}:</div>

{#each options as option (option.key)}
  <label for="cover-{option.key}">
    <div class="macro_window" style="vertical-align: middle; padding-left: 3px;">
      <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px auto 250px">
        <input
          type="radio"
          id="cover-{option.key}"
          name="cover"
          value={option.key}
          checked={value === option.key}
          onchange={() => onchange(option.key)}
        />
        <div class="macro_desc" style="display: table; padding-left: 5px;">
          <span style="display: table-cell; vertical-align: middle;">
            <strong>{option.label}</strong><br />{option.examples}
          </span>
        </div>
        <div class="macro_desc mosh health resource healthspread minmaxtopstat">
          <div class="minmaxwrapper" style="width: 100%; background: black; border-radius: 0.3em;">
            <div class="maxhealth-input" style="display: flex;">
              <div class="maxhealth-input whiteText">{armorPoints}</div>
              {#if COVER_BONUS[option.key].armorPoints > 0}
                <!-- The gap is a non-breaking space in the text node, not a margin. -->
                <div class="highlightText" style="font-size: 0.8rem;">&nbsp;{COVER_BONUS[option.key].armorPoints}</div>
              {/if}
            </div>
            <div class="slant" style="border-right: 2px solid #ffffff; transform: skewX(0deg);"></div>
            <div class="maxhealth-input" style="display: flex;">
              <div class="maxhealth-input whiteText">{damageReduction}</div>
              {#if COVER_BONUS[option.key].damageReduction > 0}
                <div class="highlightText" style="font-size: 0.8rem;">&nbsp;{COVER_BONUS[option.key].damageReduction}</div>
              {/if}
            </div>
          </div>
          <div class="grid">
            <div class="healthmaxtext mosh health resource">{localize('Mothership.ArmorPoints')}</div>
            <div class="healthmaxtext mosh health resource">{localize('Mothership.DMGReduction')}</div>
          </div>
        </div>
      </div>
    </div>
  </label>
{/each}
