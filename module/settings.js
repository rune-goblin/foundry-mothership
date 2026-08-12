import { RolltableConfigApp } from "./ui/settings/RolltableConfigApp.js";

export const registerSettings = function () {
  

  game.settings.register('mothershiprpg', 'macroTarget', {
    name: "Macro Target",
    hint: "Who should be the target for macros?",
    default: "character",
    scope: 'world',
    type: String,
    choices: {
      "character": "Currently selected character for the player",
      "token": "Currently selected token(s) in the scene"
    },
    config: true,
    onChange: value => {
      //log the change
      console.log("Macro target set to " + value)
    }
  });

  game.settings.register('mothershiprpg', 'critDamage', {
    name: "Critical Hit Damage",
    hint: "What should the damage be on a critical hit?",
    default: "advantage",
    scope: 'world',
    type: String,
    choices: {
      "advantage": "Roll with advantage",
      "doubleDamage": "Double the damage result",
      "doubleDice": "Double the damage dice",
      "maxDamage": "Maximum possible damage result",
      "weaponValue": "Defer to each weapon's critical damage",
      "none": "No critical damage"
    },
    config: true,
    onChange: value => {
      //log the change
      console.log("Critical hits set to " + value)
    }
  });

  game.settings.register('mothershiprpg', 'damageDiceTheme', {
    name: "Damage Dice Theme",
    hint: "If DiceSoNice is installed, what theme should be applied to damage dice?",
    default: "damage",
    scope: 'world',
    type: String,
    config: true,
    onChange: value => {
      //log the change
      console.log("Damage dice theme set to " + value)
    }
  });

  game.settings.register('mothershiprpg', 'panicDieTheme', {
    name: "Panic Die Theme",
    hint: "If DiceSoNice is installed, what theme should be applied to the panic die?",
    default: "panic",
    scope: 'world',
    type: String,
    config: true,
    onChange: value => {
      //log the change
      console.log("Panic die theme set to " + value)
    }
  });

  game.settings.register('mothershiprpg', 'hideWeight', {
    name: "Hide Weight",
    hint: "Hide the weight mechanic in the items list for players and ships?",
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
    onChange: value => {
      //log the change
      console.log("hideWeight set to " + value)
    }
  });
  
  game.settings.register('mothershiprpg', 'autoStress', {
    name: "Auto Stress Gain on Failures?",
    hint: "Automatically handles stress gain on a failed roll.",
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
    onChange: value => {
      //log the change
      console.log("autoStress set to " + value)
    }
  });

  game.settings.registerMenu('mothershiprpg', 'rolltableSelector', {
    name: "Rolltable Configuration",
    label: "Choose Tables",
    hint: "Customize which rolltables are used.",
    icon: "fa-solid fa-list",
    type: RolltableConfigApp
  });

  game.settings.register('mothershiprpg', 'table1ePanicStressNormal', {
    scope: 'world',
    config: false,
    type: String,
    default: "ypcoikqHLhnc9tNs"
  });

  game.settings.register('mothershiprpg', 'table1eWoundBluntForce', {
    scope: 'world',
    config: false,
    type: String,
    default: "31YibfjueXuZdNLb"
  });

  game.settings.register('mothershiprpg', 'table1eWoundBleeding', {
    scope: 'world',
    config: false,
    type: String,
    default: "ata3fRz3uoPfNCLh"
  });

  game.settings.register('mothershiprpg', 'table1eWoundGunshot', {
    scope: 'world',
    config: false,
    type: String,
    default: "XjDU2xFOWEasaZK0"
  });

  game.settings.register('mothershiprpg', 'table1eWoundFireExplosives', {
    scope: 'world',
    config: false,
    type: String,
    default: "lqiaWwh5cGcJhvnu"
  });

  game.settings.register('mothershiprpg', 'table1eWoundGoreMassive', {
    scope: 'world',
    config: false,
    type: String,
    default: "uVfC1CqYdojaJ7yR"
  });

  game.settings.register('mothershiprpg', 'table1eDeath', {
    scope: 'world',
    config: false,
    type: String,
    default: "W36WFIpCfMknKgHy"
  });

};