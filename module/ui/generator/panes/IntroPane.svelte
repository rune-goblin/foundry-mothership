<script>
  import { localize } from '../../../i18n.ts';
</script>

<div class="wizard-intro">
  <div class="wizard-prose">
    <p>{localize('Mothership.CharacterGenerator.Wizard.Intro.Welcome')}</p>
    <p>{localize('Mothership.CharacterGenerator.Wizard.Intro.Excavate')}</p>
  </div>
  <img
    class="wizard-intro-cover"
    src="/systems/mothershiprpg/images/mothership-cover.webp"
    alt=""
  />
</div>

<style>
  @layer system {
    .wizard-intro {
      position: relative;
      flex: 1;
      min-height: 28rem;
    }

    .wizard-intro .wizard-prose {
      position: relative;
      z-index: 1;
      width: 72%;
      font-size: var(--font-size-lg);
      line-height: var(--body-md-line-height);
    }

    .wizard-intro-cover {
      position: absolute;
      right: 0;
      bottom: 0;
      z-index: 0;
      display: block;
      width: min(77%, 28rem);
      max-height: 28rem;
      border: 0;
      object-fit: contain;
    }
  }
</style>
