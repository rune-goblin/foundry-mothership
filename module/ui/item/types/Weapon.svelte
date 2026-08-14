<script>
  import Field from '../../parts/Field.svelte';
  import CheckField from '../../parts/CheckField.svelte';
  import { localize } from '../../../i18n.ts';
  import { WEAPON_RANGES } from '../../../data/item-models.js';

  const WOUND_ROLLS = [
    'Bleeding', 'Bleeding [-]', 'Bleeding [+]',
    'Blunt Force', 'Blunt Force [-]', 'Blunt Force [+]',
    'Fire & Explosives', 'Fire & Explosives [-]', 'Fire & Explosives [+]',
    'Gore & Massive', 'Gore & Massive [-]', 'Gore & Massive [+]',
    'Gunshot', 'Gunshot [-]', 'Gunshot [+]',
  ];

  let { system } = $props();

  const RANGE_CHOICES = WEAPON_RANGES.map((range) => ({
    value: range,
    label: localize(`Mothership.RangeBand.${range}`),
  }));
</script>

<div class="item-armor-grid" style="margin-top: 10px; margin-bottom: 10px;">
  <div>
    <div class="circle-statwrapper-horizontal transparentBackground">
      <Field
        name="system.damage"
        label={localize('Mothership.Damage')}
        value={system.damage}
        wrapper="text"
        width="180px"
      />
      <Field
        name="system.critDmg"
        label={localize('Mothership.CriticalDamage')}
        value={system.critDmg}
        wrapper="text"
        width="180px"
      />
    </div>

    <div class="circle-statwrapper-horizontal transparentBackground">
      <CheckField
        name="system.antiArmor"
        label={localize('Mothership.AntiArmor')}
        checked={system.antiArmor}
      />
      <Field
        name="system.range"
        label={localize('Mothership.Range')}
        value={system.range}
        wrapper="text"
        width="180px"
        choices={RANGE_CHOICES}
      />
    </div>

    <div class="circle-statwrapper-horizontal">
      <Field
        name="system.ammoType"
        label={localize('Mothership.AmmoType')}
        value={system.ammoType}
        wrapper="text"
        width="180px"
      />
      <CheckField
        name="system.useAmmo"
        label={localize('Mothership.UsesAmmo')}
        checked={system.useAmmo}
      />
    </div>

    <br />

    <div class="resource">
      <label class="resource-label" for="system.woundEffect">{localize('Mothership.WoundEffect')}</label>
      <input
        id="system.woundEffect"
        type="text"
        list="woundRolls"
        name="system.woundEffect"
        value={system.woundEffect}
        data-dtype="String"
      />
      <datalist id="woundRolls">
        {#each WOUND_ROLLS as roll (roll)}
          <option value={roll}></option>
        {/each}
      </datalist>
    </div>
  </div>

  <div class="circle-statwrapper-vertical" style="gap: 10px;">
    <Field name="system.shots" label={localize('Mothership.MaxShots')} value={system.shots} dtype="Number" />
    <Field
      name="system.curShots"
      label={localize('Mothership.CurrentShots')}
      value={system.curShots}
      dtype="Number"
    />
    <Field
      name="system.shotsPerFire"
      label={localize('Mothership.ShotsPerFiring')}
      value={system.shotsPerFire}
    />
    <Field name="system.ammo" label={localize('Mothership.Ammunition')} value={system.ammo} dtype="Number" />
  </div>
</div>
