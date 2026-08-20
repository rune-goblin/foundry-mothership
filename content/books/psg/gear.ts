import type { ArmorId } from './armor.ts';
import type { EquipmentId } from './equipment.ts';
import { LOADOUTS } from './loadouts.ts';
import { psg, type Source } from './source.ts';
import type { WeaponId } from './weapons.ts';

/** Clothing the loadout tables print with an Armor Point value and the armor table never lists. */
export interface LoadoutArmor {
  id: string;
  name: string;
  description: string;
  armorPoints: number;
  source: Source;
}

export interface LoadoutGear {
  id: string;
  name: string;
  description: string;
  source: Source;
}

// Two of these are AP 2, which no armor in the price list provides — don't fold them into
// Standard Crew Attire, that would quietly halve them.
export const LOADOUT_ARMOR = [
  {
    id: 'civilian-clothes',
    name: 'Civilian Clothes',
    description: 'Ordinary clothes, worn by someone with nowhere in particular to be.',
    armorPoints: 1,
    source: psg(7),
  },
  {
    id: 'corporate-attire',
    name: 'Corporate Attire',
    description: 'Company-issue business dress. Immaculate, and worth more than a month of wages.',
    armorPoints: 1,
    source: psg(7),
  },
  {
    id: 'dress-uniform',
    name: 'Dress Uniform',
    description: 'Parade dress. Pressed, decorated, and useless in a firefight.',
    armorPoints: 1,
    source: psg(7),
  },
  {
    id: 'fatigues',
    name: 'Fatigues',
    description: 'Hard-wearing military working dress.',
    armorPoints: 2,
    source: psg(7),
  },
  {
    id: 'heavy-duty-work-clothes',
    name: 'Heavy Duty Work Clothes',
    description: 'Reinforced coveralls built for a working deck.',
    armorPoints: 2,
    source: psg(7),
  },
  {
    id: 'lab-coat',
    name: 'Lab Coat',
    description: 'A long white coat, pockets full of pens.',
    armorPoints: 1,
    source: psg(7),
  },
  {
    id: 'lounge-wear',
    name: 'Lounge Wear',
    description: 'Off-shift clothes. Comfortable, and nothing else.',
    armorPoints: 1,
    source: psg(7),
  },
  {
    id: 'manufacturer-supplied-attire',
    name: 'Manufacturer Supplied Attire',
    description: 'The outfit your manufacturer shipped you in.',
    armorPoints: 1,
    source: psg(7),
  },
  {
    id: 'scrubs',
    name: 'Scrubs',
    description: 'Surgical scrubs. Easy to clean, up to a point.',
    armorPoints: 1,
    source: psg(7),
  },
  {
    id: 'tank-top-and-camo-pants',
    name: 'Tank Top and Camo Pants',
    description: 'Off-duty fatigues, worn like a uniform.',
    armorPoints: 1,
    source: psg(7),
  },
] as const satisfies readonly LoadoutArmor[];

export const LOADOUT_GEAR = [
  {
    id: 'briefcase',
    name: 'Briefcase',
    description: 'A hard-shell case for documents nobody is meant to read.',
    source: psg(7),
  },
  {
    id: 'camping-gear',
    name: 'Camping Gear',
    description: 'A tent, a bedroll, and enough of a stove to boil water.',
    source: psg(7),
  },
  {
    id: 'challenge-coin',
    name: 'Challenge Coin',
    description: 'A unit token. Produce it when asked, or buy the round.',
    source: psg(7),
  },
  {
    id: 'cigarettes',
    name: 'Cigarettes',
    description: 'A pack, most of it still there.',
    source: psg(7),
  },
  {
    id: 'defibrillator',
    name: 'Defibrillator',
    description: 'Portable paddles and a charge pack, for restarting a stopped heart.',
    source: psg(7),
  },
  {
    id: 'duct-tape',
    name: 'Duct Tape',
    description: 'A roll of it. Fixes most things once.',
    source: psg(7),
  },
  {
    id: 'extension-cord',
    name: 'Extension Cord (20m)',
    description: 'Twenty metres of heavy-gauge power cable on a reel.',
    source: psg(7),
  },
  {
    id: 'fountain-pen-poison-injector',
    name: 'Fountain Pen (Poison Injector)',
    description: 'Writes. Also does one other thing, once.',
    source: psg(7),
  },
  {
    id: 'head-lamp',
    name: 'Head Lamp',
    description: 'A lamp on a headband, leaving both hands free.',
    source: psg(7),
  },
  {
    id: 'jump-9-ticket',
    name: 'Jump-9 Ticket (destination blank)',
    description: 'One passage, anywhere on the network. The destination field has not been filled in.',
    source: psg(7),
  },
  {
    id: 'leash',
    name: 'Leash',
    description: 'A lead and collar, for something that will not stay put.',
    source: psg(7),
  },
  {
    id: 'lunch-box',
    name: 'Lunch Box',
    description: 'A sealed metal box. Contents vary; the smell does not.',
    source: psg(7),
  },
  {
    id: 'pen-knife',
    name: 'Pen Knife',
    description: 'A folding blade, small enough to forget you are carrying.',
    source: psg(7),
  },
  {
    id: 'prescription-pad',
    name: 'Prescription Pad',
    description: 'Blank, signed, and worth a great deal to the wrong person.',
    source: psg(7),
  },
  {
    id: 'satchel',
    name: 'Satchel',
    description: 'A shoulder bag. Holds what a rucksack would not be worth carrying for.',
    source: psg(7),
  },
  {
    id: 'shovel',
    name: 'Shovel',
    description: 'A short-handled spade.',
    source: psg(7),
  },
  {
    id: 'six-pack-of-beer',
    name: 'Six Pack of Beer',
    description: 'Six cans. Warm, unless you planned ahead.',
    source: psg(7),
  },
  {
    id: 'subsurface-scanner',
    name: 'Subsurface Scanner',
    description: 'Reads density and voids through rock and hull plate.',
    source: psg(7),
  },
  {
    id: 'tennis-ball',
    name: 'Tennis Ball',
    description: 'For throwing. Something will bring it back.',
    source: psg(7),
  },
  {
    id: 'vaccine',
    name: 'Vaccine (1 dose)',
    description: 'A single dose against one named pathogen. Useless against any other.',
    source: psg(7),
  },
  {
    id: 'vial-of-acid',
    name: 'Vial of Acid',
    description: 'A stoppered vial. Eats through most seals given time.',
    source: psg(7),
  },
  {
    id: 'vip-corporate-key-card',
    name: 'VIP Corporate Key Card',
    description: 'Opens doors several pay grades above yours.',
    source: psg(7),
  },
] as const satisfies readonly LoadoutGear[];

export type LoadoutArmorId = (typeof LOADOUT_ARMOR)[number]['id'];
export type LoadoutGearId = (typeof LOADOUT_GEAR)[number]['id'];

/** `kind` decides which compendium the emitted `@UUID` points into — `crowbar` is both an EquipmentId and a WeaponId. */
export type GearRef =
  | { kind: 'weapon'; id: WeaponId; quantity?: number }
  | { kind: 'armor'; id: ArmorId | LoadoutArmorId; quantity?: number }
  | { kind: 'item'; id: EquipmentId | LoadoutGearId; quantity?: number };

/** Every distinct item string the four loadout tables print. */
export type LoadoutItemText = (typeof LOADOUTS)[number]['results'][number]['items'][number];

// Mapping rules, in priority order: a parenthetical names the item to use ("Screwdriver (as
// Assorted Tools)" is Assorted Tools); a near-miss maps to the priced entry ("Oxygen Tank with
// Filter Mask" is an Oxygen Tank); anything else becomes a document here.
export const LOADOUT_ITEMS = {
  'Advanced Battle Dress (AP 10)': [{ kind: 'armor', id: 'advanced-battle-dress' }],
  'Automed (x5)': [{ kind: 'item', id: 'automed' }],
  Binoculars: [{ kind: 'item', id: 'binoculars' }],
  Bioscanner: [{ kind: 'item', id: 'bioscanner' }],
  'Boarding Axe': [{ kind: 'weapon', id: 'boarding-axe' }],
  Briefcase: [{ kind: 'item', id: 'briefcase' }],
  'Camping Gear': [{ kind: 'item', id: 'camping-gear' }],
  'Cat (pet)': [{ kind: 'item', id: 'pet-organic' }],
  'Challenge Coin': [{ kind: 'item', id: 'challenge-coin' }],
  Cigarettes: [{ kind: 'item', id: 'cigarettes' }],
  'Civilian Clothes (AP 1)': [{ kind: 'armor', id: 'civilian-clothes' }],
  // "as Scalpel" — the book names the profile to use, so the Scalpel document is the profile.
  'Combat Knife (as Scalpel DMG [+])': [{ kind: 'weapon', id: 'scalpel' }],
  'Combat Shotgun (2 rounds)': [{ kind: 'weapon', id: 'combat-shotgun' }],
  'Combat Shotgun (4 rounds)': [{ kind: 'weapon', id: 'combat-shotgun' }],
  'Corporate Attire (AP 1)': [{ kind: 'armor', id: 'corporate-attire' }],
  // The price list carries the Crowbar twice; only the weapon document is emitted.
  Crowbar: [{ kind: 'weapon', id: 'crowbar' }],
  'Cybernetic Diagnostic Scanner': [{ kind: 'item', id: 'cybernetic-diagnostic-scanner' }],
  Defibrillator: [{ kind: 'item', id: 'defibrillator' }],
  'Dog (pet)': [{ kind: 'item', id: 'pet-organic' }],
  'Dress Uniform (AP 1)': [{ kind: 'armor', id: 'dress-uniform' }],
  'Drill (as Assorted Tools)': [{ kind: 'item', id: 'assorted-tools' }],
  'Duct Tape': [{ kind: 'item', id: 'duct-tape' }],
  'Electronic Tool Set': [{ kind: 'item', id: 'electronic-tool-set' }],
  'Explosives & Detonator': [{ kind: 'item', id: 'explosives-detonator' }],
  'Extension Cord (20m)': [{ kind: 'item', id: 'extension-cord' }],
  'Fatigues (AP 2)': [{ kind: 'armor', id: 'fatigues' }],
  'First Aid Kit': [{ kind: 'item', id: 'first-aid-kit' }],
  'Flamethrower (1 charge)': [{ kind: 'weapon', id: 'flamethrower' }],
  'Flamethrower (4 shots)': [{ kind: 'weapon', id: 'flamethrower' }],
  'Flare Gun (2 rounds)': [{ kind: 'weapon', id: 'flare-gun' }],
  Flashlight: [{ kind: 'item', id: 'flashlight' }],
  'Foam Gun (2 charges)': [{ kind: 'weapon', id: 'foam-gun' }],
  'Foldable Stretcher': [{ kind: 'item', id: 'foldable-stretcher' }],
  'Fountain Pen (Poison Injector)': [{ kind: 'item', id: 'fountain-pen-poison-injector' }],
  'Frag Grenade': [{ kind: 'weapon', id: 'frag-grenade' }],
  'General-Purpose Machine Gun (1 Can of ammo)': [
    { kind: 'weapon', id: 'general-purpose-machine-gun' },
    { kind: 'weapon', id: 'ammo' },
  ],
  HUD: [{ kind: 'item', id: 'heads-up-display-hud' }],
  'Hazard Suit (AP 5)': [{ kind: 'armor', id: 'hazard-suit' }],
  'Head Lamp': [{ kind: 'item', id: 'head-lamp' }],
  'Heavy Duty Work Clothes (AP 2)': [{ kind: 'armor', id: 'heavy-duty-work-clothes' }],
  'Infrared Goggles': [{ kind: 'item', id: 'infrared-goggles' }],
  'Jump-9 Ticket (destination blank)': [{ kind: 'item', id: 'jump-9-ticket' }],
  'Lab Coat (AP 1)': [{ kind: 'armor', id: 'lab-coat' }],
  'Lab Rat (pet)': [{ kind: 'item', id: 'pet-organic' }],
  'Laser Cutter (1 extra battery)': [
    { kind: 'weapon', id: 'laser-cutter' },
    { kind: 'item', id: 'battery-high-power' },
  ],
  Leash: [{ kind: 'item', id: 'leash' }],
  'Long-range Comms': [{ kind: 'item', id: 'long-range-comms' }],
  'Lounge Wear (AP 1)': [{ kind: 'armor', id: 'lounge-wear' }],
  'Lunch Box': [{ kind: 'item', id: 'lunch-box' }],
  'MRE (x7)': [{ kind: 'item', id: 'mre' }],
  'Manufacturer Supplied Attire (AP 1)': [{ kind: 'armor', id: 'manufacturer-supplied-attire' }],
  Medscanner: [{ kind: 'item', id: 'medscanner' }],
  'Mylar Blanket': [{ kind: 'item', id: 'mylar-blanket' }],
  'Nail Gun (32 rounds)': [{ kind: 'weapon', id: 'nail-gun' }],
  'Oxygen Tank with Filter Mask': [{ kind: 'item', id: 'oxygen-tank' }],
  // The price list stocks Paracord by the 50m coil, so 100m is two of them.
  'Paracord (100m)': [{ kind: 'item', id: 'paracord-50m', quantity: 2 }],
  'Patch Kit (x3)': [{ kind: 'item', id: 'patch-kit' }],
  'Pen Knife': [{ kind: 'item', id: 'pen-knife' }],
  'Personal Locator': [{ kind: 'item', id: 'personal-locator' }],
  'Portable Computer Terminal': [{ kind: 'item', id: 'portable-computer-terminal' }],
  'Prescription Pad': [{ kind: 'item', id: 'prescription-pad' }],
  'Pulse Rifle (3 mags)': [{ kind: 'weapon', id: 'pulse-rifle' }],
  'Radiation Pills (x5)': [{ kind: 'item', id: 'radiation-pills' }],
  'Revolver (1 round)': [{ kind: 'weapon', id: 'revolver' }],
  'Revolver (12 rounds)': [{ kind: 'weapon', id: 'revolver' }],
  'Revolver (6 rounds)': [{ kind: 'weapon', id: 'revolver' }],
  'Rigging Gun': [{ kind: 'weapon', id: 'rigging-gun' }],
  'Rigging Gun (1 shot)': [{ kind: 'weapon', id: 'rigging-gun' }],
  Rucksack: [{ kind: 'item', id: 'rucksack' }],
  'SMG (3 mags)': [{ kind: 'weapon', id: 'smg' }],
  'Salvage Drone': [{ kind: 'item', id: 'salvage-drone' }],
  'Sample Collection Kit': [{ kind: 'item', id: 'sample-collection-kit' }],
  Satchel: [{ kind: 'item', id: 'satchel' }],
  Scalpel: [{ kind: 'weapon', id: 'scalpel' }],
  'Screwdriver (as Assorted Tools)': [{ kind: 'item', id: 'assorted-tools' }],
  'Scrubs (AP 1)': [{ kind: 'armor', id: 'scrubs' }],
  Shovel: [{ kind: 'item', id: 'shovel' }],
  'Six Pack of Beer': [{ kind: 'item', id: 'six-pack-of-beer' }],
  'Small Pet (organic).': [{ kind: 'item', id: 'pet-organic' }],
  'Smart Rifle (2 mags)': [{ kind: 'weapon', id: 'smart-rifle' }],
  'Smart Rifle (3 mags)': [{ kind: 'weapon', id: 'smart-rifle' }],
  // Assorted Tools is "wrenches, spanners, screwdrivers, etc." — the book's own wording.
  Spanner: [{ kind: 'item', id: 'assorted-tools' }],
  'Standard Battle Dress (AP 7)': [{ kind: 'armor', id: 'standard-battle-dress' }],
  'Standard Crew Attire (AP 1)': [{ kind: 'armor', id: 'standard-crew-attire' }],
  Stimpak: [{ kind: 'item', id: 'stimpak' }],
  'Stimpak (x5)': [{ kind: 'item', id: 'stimpak' }],
  'Stun Baton': [{ kind: 'weapon', id: 'stun-baton' }],
  'Subsurface Scanner': [{ kind: 'item', id: 'subsurface-scanner' }],
  'Tank Top and Camo Pants (AP 1)': [{ kind: 'armor', id: 'tank-top-and-camo-pants' }],
  'Tennis Ball': [{ kind: 'item', id: 'tennis-ball' }],
  'Toolbelt with Assorted Tools': [{ kind: 'item', id: 'assorted-tools' }],
  'Tranq Pistol (3 shots)': [{ kind: 'weapon', id: 'tranq-pistol' }],
  'Utility Knife (as Scalpel)': [{ kind: 'weapon', id: 'scalpel' }],
  'VIP Corporate Key Card': [{ kind: 'item', id: 'vip-corporate-key-card' }],
  'Vaccine (1 dose)': [{ kind: 'item', id: 'vaccine' }],
  'Vaccsuit (AP 3)': [{ kind: 'armor', id: 'vaccsuit' }],
  'Vial of Acid': [{ kind: 'item', id: 'vial-of-acid' }],
  Vibechete: [{ kind: 'weapon', id: 'vibechete' }],
  'Water Filtration Device': [{ kind: 'item', id: 'water-filtration-device' }],
} as const satisfies Record<LoadoutItemText, readonly GearRef[]>;

/** The equipment record a weapon of the same name already covers, so it is emitted once. */
export const EQUIPMENT_COVERED_BY_WEAPON: readonly EquipmentId[] = ['crowbar'];
