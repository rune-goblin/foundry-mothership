import Ability from './types/Ability.svelte';
import Armor from './types/Armor.svelte';
import ArmorExtra from './types/ArmorExtra.svelte';
import Condition from './types/Condition.svelte';
import Item from './types/Item.svelte';
import Weapon from './types/Weapon.svelte';
import WeaponExtra from './types/WeaponExtra.svelte';

export const ITEM_BODIES = {
  ability: Ability,
  armor: Armor,
  condition: Condition,
  item: Item,
  weapon: Weapon,
};

export const ITEM_EXTRA_TABS = {
  armor: { tab: 'item', label: 'Mothership.Item', component: ArmorExtra },
  weapon: { tab: 'item', label: 'Mothership.Other', component: WeaponExtra },
};
