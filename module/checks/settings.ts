/**
 * The four GM choices a roll reads. Legacy asked `game.settings.get` at nine sites and compared
 * the answer to a bare string each time; here each choice is one typed reader with the default it
 * was registered with, so a world that has never opened the settings and a test with no Foundry
 * at all give the same answer. `settings.ts` (R4) registers from this same record.
 */

declare const game:
  | { readonly settings?: { get(namespace: string, key: string): unknown } }
  | undefined;

const NAMESPACE = 'mothershiprpg';

/** What a critical hit does to the damage roll — the GM's house rule, as legacy spelled it. */
export type CritDamage =
  | 'advantage'
  | 'doubleDamage'
  | 'doubleDice'
  | 'maxDamage'
  | 'weaponValue'
  | 'none';

export const CRIT_DAMAGE_CHOICES: readonly CritDamage[] = [
  'advantage',
  'doubleDamage',
  'doubleDice',
  'maxDamage',
  'weaponValue',
  'none',
];

export const SETTING_DEFAULTS = {
  autoStress: true,
  critDamage: 'advantage' as CritDamage,
  damageDiceTheme: 'damage',
  panicDieTheme: 'panic',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

function stored(key: SettingKey): unknown {
  return typeof game === 'undefined' ? undefined : game?.settings?.get(NAMESPACE, key);
}

export function autoStress(): boolean {
  const value = stored('autoStress');
  return typeof value === 'boolean' ? value : SETTING_DEFAULTS.autoStress;
}

export function critDamage(): CritDamage {
  const value = stored('critDamage');
  return CRIT_DAMAGE_CHOICES.includes(value as CritDamage)
    ? (value as CritDamage)
    : SETTING_DEFAULTS.critDamage;
}

/** A Dice So Nice colorset, or '' where the GM cleared the field and wants Foundry's own dice. */
function theme(key: 'damageDiceTheme' | 'panicDieTheme'): string {
  const value = stored(key);
  return typeof value === 'string' ? value.trim() : SETTING_DEFAULTS[key];
}

export function damageTheme(): string {
  return theme('damageDiceTheme');
}

export function panicTheme(): string {
  return theme('panicDieTheme');
}
