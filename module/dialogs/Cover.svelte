<script>
  import ArmorBar from '../ui/parts/ArmorBar.svelte';
  import { asset } from '../chat/cards.ts';
  import { localize } from '../i18n.ts';
  import { COVER_BONUS } from '../rules.ts';

  // No <style> block: the dialog vocabulary is the shell tier's, declared in css/mothership.css.
  let { options, armorPoints, damageReduction, value, onchange } = $props();
</script>

<div class="macro_window">
  <div class="grid grid-2col" style="grid-template-columns: 150px auto">
    <div>
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
        <div class="macro_desc health resource healthspread minmaxtopstat">
          <ArmorBar
            spread
            left={armorPoints}
            leftBonus={COVER_BONUS[option.key].armorPoints}
            right={damageReduction}
            rightBonus={COVER_BONUS[option.key].damageReduction}
          />
          <div class="grid">
            <div class="healthmaxtext health resource">{localize('Mothership.ArmorPoints')}</div>
            <div class="healthmaxtext health resource">{localize('Mothership.DMGReduction')}</div>
          </div>
        </div>
      </div>
    </div>
  </label>
{/each}
