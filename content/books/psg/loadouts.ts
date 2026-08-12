import type { ClassId } from './classes.ts';
import { psg, type Source } from './source.ts';
import type { RollRange } from '../common.ts';

export interface LoadoutResult {
  range: RollRange;
  /** The row as the book prints it. */
  text: string;
  /** The row split into its items, still as free text — `gear.ts` maps each onto a real document. */
  items: readonly string[];
}

export interface Loadout {
  id: string;
  name: string;
  class: ClassId;
  die: string;
  results: readonly LoadoutResult[];
  source: Source;
}

export const LOADOUTS = [
  {
    id: 'loadout-marine',
    name: 'Marine Loadouts',
    class: 'marine',
    die: '1d10',
    results: [
      {
        range: [0, 0],
        text: 'Tank Top and Camo Pants (AP 1), Combat Knife (as Scalpel DMG [+]), Stimpak (x5)',
        items: ['Tank Top and Camo Pants (AP 1)', 'Combat Knife (as Scalpel DMG [+])', 'Stimpak (x5)'],
      },
      {
        range: [1, 1],
        text: 'Advanced Battle Dress (AP 10), Flamethrower (4 shots), Boarding Axe',
        items: ['Advanced Battle Dress (AP 10)', 'Flamethrower (4 shots)', 'Boarding Axe'],
      },
      {
        range: [2, 2],
        text: 'Standard Battle Dress (AP 7), Combat Shotgun (4 rounds), Rucksack, Camping Gear',
        items: ['Standard Battle Dress (AP 7)', 'Combat Shotgun (4 rounds)', 'Rucksack', 'Camping Gear'],
      },
      {
        range: [3, 3],
        text: 'Standard Battle Dress (AP 7), Pulse Rifle (3 mags), Infrared Goggles',
        items: ['Standard Battle Dress (AP 7)', 'Pulse Rifle (3 mags)', 'Infrared Goggles'],
      },
      {
        range: [4, 4],
        text: 'Standard Battle Dress (AP 7), Smart Rifle (3 mags), Binoculars, Personal Locator',
        items: ['Standard Battle Dress (AP 7)', 'Smart Rifle (3 mags)', 'Binoculars', 'Personal Locator'],
      },
      {
        range: [5, 5],
        text: 'Standard Battle Dress (AP 7), SMG (3 mags), MRE (x7)',
        items: ['Standard Battle Dress (AP 7)', 'SMG (3 mags)', 'MRE (x7)'],
      },
      {
        range: [6, 6],
        text: 'Fatigues (AP 2), Combat Shotgun (2 rounds), Dog (pet), Leash, Tennis Ball',
        items: ['Fatigues (AP 2)', 'Combat Shotgun (2 rounds)', 'Dog (pet)', 'Leash', 'Tennis Ball'],
      },
      {
        range: [7, 7],
        text: 'Fatigues (AP 2), Revolver (12 rounds), Frag Grenade',
        items: ['Fatigues (AP 2)', 'Revolver (12 rounds)', 'Frag Grenade'],
      },
      {
        range: [8, 8],
        text: 'Dress Uniform (AP 1), Revolver (1 round), Challenge Coin',
        items: ['Dress Uniform (AP 1)', 'Revolver (1 round)', 'Challenge Coin'],
      },
      {
        range: [9, 9],
        text: 'Advanced Battle Dress (AP 10), General-Purpose Machine Gun (1 Can of ammo), HUD',
        items: ['Advanced Battle Dress (AP 10)', 'General-Purpose Machine Gun (1 Can of ammo)', 'HUD'],
      },
    ],
    source: psg(7),
  },
  {
    id: 'loadout-android',
    name: 'Android Loadouts',
    class: 'android',
    die: '1d10',
    results: [
      {
        range: [0, 0],
        text: 'Vaccsuit (AP 3), Smart Rifle (2 mags), Infrared Goggles, Mylar Blanket',
        items: ['Vaccsuit (AP 3)', 'Smart Rifle (2 mags)', 'Infrared Goggles', 'Mylar Blanket'],
      },
      {
        range: [1, 1],
        text: 'Vaccsuit (AP 3), Revolver (12 rounds), Long-range Comms, Satchel',
        items: ['Vaccsuit (AP 3)', 'Revolver (12 rounds)', 'Long-range Comms', 'Satchel'],
      },
      {
        range: [2, 2],
        text: 'Hazard Suit (AP 5), Revolver (6 rounds), Defibrillator, First Aid Kit, Flashlight',
        items: ['Hazard Suit (AP 5)', 'Revolver (6 rounds)', 'Defibrillator', 'First Aid Kit', 'Flashlight'],
      },
      {
        range: [3, 3],
        text: 'Hazard Suit (AP 5), Foam Gun (2 charges), Sample Collection Kit, Screwdriver (as Assorted Tools)',
        items: [
          'Hazard Suit (AP 5)',
          'Foam Gun (2 charges)',
          'Sample Collection Kit',
          'Screwdriver (as Assorted Tools)',
        ],
      },
      {
        range: [4, 4],
        text: 'Standard Battle Dress (AP 7), Tranq Pistol (3 shots), Paracord (100m)',
        items: ['Standard Battle Dress (AP 7)', 'Tranq Pistol (3 shots)', 'Paracord (100m)'],
      },
      {
        range: [5, 5],
        text: 'Standard Crew Attire (AP 1), Stun Baton, Small Pet (organic).',
        items: ['Standard Crew Attire (AP 1)', 'Stun Baton', 'Small Pet (organic).'],
      },
      {
        range: [6, 6],
        text: 'Standard Crew Attire (AP 1), Scalpel, Bioscanner',
        items: ['Standard Crew Attire (AP 1)', 'Scalpel', 'Bioscanner'],
      },
      {
        range: [7, 7],
        text: 'Standard Crew Attire (AP 1), Frag Grenade, Pen Knife',
        items: ['Standard Crew Attire (AP 1)', 'Frag Grenade', 'Pen Knife'],
      },
      {
        range: [8, 8],
        text: 'Manufacturer Supplied Attire (AP 1), Jump-9 Ticket (destination blank)',
        items: ['Manufacturer Supplied Attire (AP 1)', 'Jump-9 Ticket (destination blank)'],
      },
      {
        range: [9, 9],
        text: 'Corporate Attire (AP 1), VIP Corporate Key Card',
        items: ['Corporate Attire (AP 1)', 'VIP Corporate Key Card'],
      },
    ],
    source: psg(7),
  },
  {
    id: 'loadout-scientist',
    name: 'Scientist Loadouts',
    class: 'scientist',
    die: '1d10',
    results: [
      {
        range: [0, 0],
        text: 'Hazard Suit (AP 5), Tranq Pistol (3 shots), Bioscanner, Sample Collection Kit',
        items: ['Hazard Suit (AP 5)', 'Tranq Pistol (3 shots)', 'Bioscanner', 'Sample Collection Kit'],
      },
      {
        range: [1, 1],
        text: 'Hazard Suit (AP 5), Flamethrower (1 charge), Stimpak, Electronic Tool Set',
        items: ['Hazard Suit (AP 5)', 'Flamethrower (1 charge)', 'Stimpak', 'Electronic Tool Set'],
      },
      {
        range: [2, 2],
        text: 'Vaccsuit (AP 3), Rigging Gun, Sample Collection Kit, Flashlight, Lab Rat (pet)',
        items: ['Vaccsuit (AP 3)', 'Rigging Gun', 'Sample Collection Kit', 'Flashlight', 'Lab Rat (pet)'],
      },
      {
        range: [3, 3],
        text: 'Vaccsuit (AP 3), Foam Gun (2 charges), Foldable Stretcher, First Aid Kit, Radiation Pills (x5)',
        items: [
          'Vaccsuit (AP 3)',
          'Foam Gun (2 charges)',
          'Foldable Stretcher',
          'First Aid Kit',
          'Radiation Pills (x5)',
        ],
      },
      {
        range: [4, 4],
        text: 'Lab Coat (AP 1), Screwdriver (as Assorted Tools), Medscanner, Vaccine (1 dose)',
        items: ['Lab Coat (AP 1)', 'Screwdriver (as Assorted Tools)', 'Medscanner', 'Vaccine (1 dose)'],
      },
      {
        range: [5, 5],
        text: 'Lab Coat (AP 1), Cybernetic Diagnostic Scanner, Portable Computer Terminal',
        items: ['Lab Coat (AP 1)', 'Cybernetic Diagnostic Scanner', 'Portable Computer Terminal'],
      },
      {
        range: [6, 6],
        text: 'Scrubs (AP 1), Scalpel, Automed (x5), Oxygen Tank with Filter Mask',
        items: ['Scrubs (AP 1)', 'Scalpel', 'Automed (x5)', 'Oxygen Tank with Filter Mask'],
      },
      {
        range: [7, 7],
        text: 'Scrubs (AP 1), Vial of Acid, Mylar Blanket, First Aid Kit',
        items: ['Scrubs (AP 1)', 'Vial of Acid', 'Mylar Blanket', 'First Aid Kit'],
      },
      {
        range: [8, 8],
        text: 'Standard Crew Attire (AP 1), Utility Knife (as Scalpel), Cybernetic Diagnostic Scanner, Duct Tape',
        items: [
          'Standard Crew Attire (AP 1)',
          'Utility Knife (as Scalpel)',
          'Cybernetic Diagnostic Scanner',
          'Duct Tape',
        ],
      },
      {
        range: [9, 9],
        text: 'Civilian Clothes (AP 1), Briefcase, Prescription Pad, Fountain Pen (Poison Injector)',
        items: ['Civilian Clothes (AP 1)', 'Briefcase', 'Prescription Pad', 'Fountain Pen (Poison Injector)'],
      },
    ],
    source: psg(7),
  },
  {
    id: 'loadout-teamster',
    name: 'Teamster Loadouts',
    class: 'teamster',
    die: '1d10',
    results: [
      {
        range: [0, 0],
        text: 'Vaccsuit (AP 3), Laser Cutter (1 extra battery), Patch Kit (x3), Toolbelt with Assorted Tools',
        items: [
          'Vaccsuit (AP 3)',
          'Laser Cutter (1 extra battery)',
          'Patch Kit (x3)',
          'Toolbelt with Assorted Tools',
        ],
      },
      {
        range: [1, 1],
        text: 'Vaccsuit (AP 3), Revolver (6 rounds), Crowbar, Flashlight',
        items: ['Vaccsuit (AP 3)', 'Revolver (6 rounds)', 'Crowbar', 'Flashlight'],
      },
      {
        range: [2, 2],
        text: 'Vaccsuit (AP 3), Rigging Gun (1 shot), Shovel, Salvage Drone',
        items: ['Vaccsuit (AP 3)', 'Rigging Gun (1 shot)', 'Shovel', 'Salvage Drone'],
      },
      {
        range: [3, 3],
        text: 'Hazard Suit (AP 5), Vibechete, Spanner, Camping Gear, Water Filtration Device',
        items: ['Hazard Suit (AP 5)', 'Vibechete', 'Spanner', 'Camping Gear', 'Water Filtration Device'],
      },
      {
        range: [4, 4],
        text: 'Heavy Duty Work Clothes (AP 2), Explosives & Detonator, Cigarettes',
        items: ['Heavy Duty Work Clothes (AP 2)', 'Explosives & Detonator', 'Cigarettes'],
      },
      {
        range: [5, 5],
        text: 'Heavy Duty Work Clothes (AP 2), Drill (as Assorted Tools), Paracord (100m), Salvage Drone',
        items: ['Heavy Duty Work Clothes (AP 2)', 'Drill (as Assorted Tools)', 'Paracord (100m)', 'Salvage Drone'],
      },
      {
        range: [6, 6],
        text: 'Standard Crew Attire (AP 1), Combat Shotgun (4 rounds), Extension Cord (20m), Cat (pet)',
        items: ['Standard Crew Attire (AP 1)', 'Combat Shotgun (4 rounds)', 'Extension Cord (20m)', 'Cat (pet)'],
      },
      {
        range: [7, 7],
        text: 'Standard Crew Attire (AP 1), Nail Gun (32 rounds), Head Lamp, Toolbelt with Assorted Tools, Lunch Box',
        items: [
          'Standard Crew Attire (AP 1)',
          'Nail Gun (32 rounds)',
          'Head Lamp',
          'Toolbelt with Assorted Tools',
          'Lunch Box',
        ],
      },
      {
        range: [8, 8],
        text: 'Standard Crew Attire (AP 1), Flare Gun (2 rounds), Water Filtration Device, Personal Locator, Subsurface Scanner',
        items: [
          'Standard Crew Attire (AP 1)',
          'Flare Gun (2 rounds)',
          'Water Filtration Device',
          'Personal Locator',
          'Subsurface Scanner',
        ],
      },
      {
        range: [9, 9],
        text: 'Lounge Wear (AP 1), Crowbar, Stimpak, Six Pack of Beer',
        items: ['Lounge Wear (AP 1)', 'Crowbar', 'Stimpak', 'Six Pack of Beer'],
      },
    ],
    source: psg(7),
  },
] as const satisfies readonly Loadout[];
