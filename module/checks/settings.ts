declare const game:
  | { readonly settings?: { get(namespace: string, key: string): unknown } }
  | undefined;

const NAMESPACE = 'mothershiprpg';

/** The GM's house rule for what a critical hit does to the damage roll. */
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
  autoRollDamagePlayers: true,
  autoRollDamageCreatures: true,
  autoRollWoundsCharacters: true,
  autoRollWoundsCreatures: false,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

function stored(key: SettingKey): unknown {
  return typeof game === 'undefined' ? undefined : game?.settings?.get(NAMESPACE, key);
}

export function autoStress(): boolean {
  const value = stored('autoStress');
  return typeof value === 'boolean' ? value : SETTING_DEFAULTS.autoStress;
}

/** Two answers: a table wanting players to roll their own damage rarely wants the Warden rolling every creature's too. */
export function autoRollDamage(character: boolean): boolean {
  const key: SettingKey = character ? 'autoRollDamagePlayers' : 'autoRollDamageCreatures';
  const value = stored(key);
  return typeof value === 'boolean' ? value : SETTING_DEFAULTS[key];
}

/**
 * Off by default for creatures: a Wound the players inflicted is theirs to roll, and the card
 * offers it as a button rather than the Warden's client answering it for them.
 */
export function autoRollWounds(character: boolean): boolean {
  const key: SettingKey = character ? 'autoRollWoundsCharacters' : 'autoRollWoundsCreatures';
  const value = stored(key);
  return typeof value === 'boolean' ? value : SETTING_DEFAULTS[key];
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
