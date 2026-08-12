// The macros the shipped tables, sheets and conditions call. Authored here, not transcribed —
// they automate the book's procedures rather than reproducing its text, which is why they carry a
// source but no page.
//
// A macro that raises a Condition cannot hold that Condition's id: the id is minted by the build.
// Those rows name the condition instead, and the loader writes the call.

export interface CommandMacro {
  contentId: string;
  name: string;
  img: string;
  command: string;
}

/** Raises a Condition on the selected actor. The build resolves `condition` to its document id. */
export interface ConditionMacro {
  contentId: string;
  name: string;
  img: string;
  condition: string;
  severity: number;
}

export type MacroRecord = CommandMacro | ConditionMacro;

export function isConditionMacro(macro: MacroRecord): macro is ConditionMacro {
  return 'condition' in macro;
}

/** Called by table results, condition descriptions and the `Mosh.macro.*` flavour-text links. */
export const TRIGGERED_MACROS = [
  {
    contentId: 'bleeding-wound',
    name: 'Bleeding Wound',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundBleeding'),`1d10`,`low`,true,false,null,null);",
  },
  {
    contentId: 'bleeding-wound-minus',
    name: 'Bleeding Wound -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundBleeding'),`1d10 [-]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'bleeding-wound-plus',
    name: 'Bleeding Wound +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundBleeding'),`1d10 [+]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'blunt-force-wound',
    name: 'Blunt Force Wound',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundBluntForce'),`1d10`,`low`,true,false,null,null);",
  },
  {
    contentId: 'blunt-force-wound-minus',
    name: 'Blunt Force Wound -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundBluntForce'),`1d10 [-]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'blunt-force-wound-plus',
    name: 'Blunt Force Wound +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundBluntForce'),`1d10 [+]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'body-save',
    name: 'Body Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100','low','body',null,null,null);",
  },
  {
    contentId: 'body-save-minus',
    name: 'Body Save -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [-]','low','body',null,null,null);",
  },
  {
    contentId: 'body-save-plus',
    name: 'Body Save +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [+]','low','body',null,null,null);",
  },
  {
    contentId: 'combat-check',
    name: 'Combat Check',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100','low','combat',null,null,null);",
  },
  {
    contentId: 'combat-check-minus',
    name: 'Combat Check -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [-]','low','combat',null,null,null);",
  },
  {
    contentId: 'combat-check-plus',
    name: 'Combat Check +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [+]','low','combat',null,null,null);",
  },
  {
    contentId: 'death-save-minus',
    name: 'Death Save -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eDeath'),`1d10 [-]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'death-save-plus',
    name: 'Death Save +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eDeath'),`1d10 [+]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'fear-save',
    name: 'Fear Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100','low','fear',null,null,null);",
  },
  {
    contentId: 'fear-save-minus',
    name: 'Fear Save -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [-]','low','fear',null,null,null);",
  },
  {
    contentId: 'fear-save-plus',
    name: 'Fear Save +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [+]','low','fear',null,null,null);",
  },
  {
    contentId: 'fire-explosives-wound',
    name: 'Fire & Explosives Wound',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundFireExplosives'),`1d10`,`low`,true,false,null,null);",
  },
  {
    contentId: 'fire-explosives-wound-minus',
    name: 'Fire & Explosives Wound -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundFireExplosives'),`1d10 [-]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'fire-explosives-wound-plus',
    name: 'Fire & Explosives Wound +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundFireExplosives'),`1d10 [+]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'gore-massive-wound',
    name: 'Gore & Massive Wound',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundGoreMassive'),`1d10`,`low`,true,false,null,null);",
  },
  {
    contentId: 'gore-massive-wound-minus',
    name: 'Gore & Massive Wound -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundGoreMassive'),`1d10 [-]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'gore-massive-wound-plus',
    name: 'Gore & Massive Wound +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundGoreMassive'),`1d10 [+]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'gunshot-wound',
    name: 'Gunshot Wound',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundGunshot'),`1d10`,`low`,true,false,null,null);",
  },
  {
    contentId: 'gunshot-wound-minus',
    name: 'Gunshot Wound -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundGunshot'),`1d10 [-]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'gunshot-wound-plus',
    name: 'Gunshot Wound +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1eWoundGunshot'),`1d10 [+]`,`low`,true,false,null,null);",
  },
  {
    contentId: 'intellect-check',
    name: 'Intellect Check',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100','low','intellect',null,null,null);",
  },
  {
    contentId: 'intellect-check-minus',
    name: 'Intellect Check -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [-]','low','intellect',null,null,null);",
  },
  {
    contentId: 'intellect-check-plus',
    name: 'Intellect Check +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [+]','low','intellect',null,null,null);",
  },
  {
    contentId: 'lower-minimum-stress-to-2',
    name: 'Lower Minimum Stress to 2',
    img: 'icons/svg/d10-grey.svg',
    command: `prepModifyActor();

//tell the actor to run the function
async function prepModifyActor(fieldAddress,modValue,modRollString,outputChatMsg) {
  //determine who to run the macro for
  if (game.settings.get('mothershiprpg','macroTarget') === 'character') {
    //is there a selected character? warn if no
    if (!game.user.character) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //get the health for this token
      let curValue = game.user.character.system.other.stress.min;
      //calculate difference
      let lowerBy = 2 - curValue;
      //run the function for the player's 'Selected Character'
      game.user.character.modifyActor('system.other.stress.min',lowerBy,null,true);
    }
  } else if (game.settings.get('mothershiprpg','macroTarget') === 'token') {
    //is there a selected character? warn if no
    if (!canvas.tokens.controlled.length) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //run the function for all selected tokens
      canvas.tokens.controlled.forEach(function(token){
        //get the health for this token
        let curValue = token.actor.system.other.stress.min;
        //calculate difference
        let lowerBy = 2 - curValue;
        //run the function on this token
        token.actor.modifyActor('system.other.stress.min',lowerBy,null,true);
      });
    }
  }
}`,
  },
  {
    contentId: 'lower-wounds-to-0',
    name: 'Lower Wounds to 0',
    img: 'icons/svg/d10-grey.svg',
    command: `prepModifyActor();

//tell the actor to run the function
async function prepModifyActor(fieldAddress,modValue,modRollString,outputChatMsg) {
  //determine who to run the macro for
  if (game.settings.get('mothershiprpg','macroTarget') === 'character') {
    //is there a selected character? warn if no
    if (!game.user.character) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //get the health for this token
      let curValue = game.user.character.system.hits.value;
      //calculate difference
      let lowerBy = 0 - curValue;
      //run the function for the player's 'Selected Character'
      game.user.character.modifyActor('system.hits.value',lowerBy,null,true);
    }
  } else if (game.settings.get('mothershiprpg','macroTarget') === 'token') {
    //is there a selected character? warn if no
    if (!canvas.tokens.controlled.length) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //run the function for all selected tokens
      canvas.tokens.controlled.forEach(function(token){
        //get the health for this token
        let curValue = token.actor.system.hits.value;
        //calculate difference
        let lowerBy = 0 - curValue;
        //run the function on this token
        token.actor.modifyActor('system.hits.value',lowerBy,null,true);
      });
    }
  }
}`,
  },
  {
    contentId: 'panic-check-minus',
    name: 'Panic Check -',
    img: 'icons/svg/d10-grey.svg',
    command: 'game.mothershiprpg.initRollTable(`panicCheck`,`[-]`,null,false,false,null,null);',
  },
  {
    contentId: 'panic-check-plus',
    name: 'Panic Check +',
    img: 'icons/svg/d10-grey.svg',
    command: 'game.mothershiprpg.initRollTable(`panicCheck`,`[+]`,null,false,false,null,null);',
  },
  {
    contentId: 'raise-maximum-stress-to-85',
    name: 'Raise Maximum Stress to 85',
    img: 'icons/svg/d10-grey.svg',
    command: `prepModifyActor();

//tell the actor to run the function
async function prepModifyActor(fieldAddress,modValue,modRollString,outputChatMsg) {
  //determine who to run the macro for
  if (game.settings.get('mothershiprpg','macroTarget') === 'character') {
    //is there a selected character? warn if no
    if (!game.user.character) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //get the health for this character
      let curValue = game.user.character.system.other.stress.max;
      //calculate difference
      let raiseBy = 85 - curValue;
      //zero out if negative
      if (raiseBy < 0) {raiseBy = 0;}
      //run the function for the player's 'Selected Character'
      game.user.character.modifyActor('system.other.stress.max',raiseBy,null,true);
    }
  } else if (game.settings.get('mothershiprpg','macroTarget') === 'token') {
    //is there a selected character? warn if no
    if (!canvas.tokens.controlled.length) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //run the function for all selected tokens
      canvas.tokens.controlled.forEach(function(token){
        //get the health for this token
        let curValue = token.actor.system.other.stress.max;
        //calculate difference
        let raiseBy = 85 - curValue;
        //zero out if negative
        if (raiseBy < 0) {raiseBy = 0;}
        //run the function on this token
        token.actor.modifyActor('system.other.stress.max',raiseBy,null,true);
      });
    }
  }
}`,
  },
  {
    contentId: 'rest-save-minus',
    name: 'Rest Save -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [-]','low','restSave',null,null,null);",
  },
  {
    contentId: 'rest-save-plus',
    name: 'Rest Save +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [+]','low','restSave',null,null,null);",
  },
  {
    contentId: 'roll-on-panic-table',
    name: 'Roll on Panic Table',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollTable(game.settings.get('mothershiprpg','table1ePanicStressNormal'),`1d20`,`high`,false,false,'system.other.stress.value','>');",
  },
  {
    contentId: 'sanity-save',
    name: 'Sanity Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100','low','sanity',null,null,null);",
  },
  {
    contentId: 'sanity-save-minus',
    name: 'Sanity Save -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [-]','low','sanity',null,null,null);",
  },
  {
    contentId: 'sanity-save-plus',
    name: 'Sanity Save +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [+]','low','sanity',null,null,null);",
  },
  {
    contentId: 'speed-check',
    name: 'Speed Check',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100','low','speed',null,null,null);",
  },
  {
    contentId: 'speed-check-minus',
    name: 'Speed Check -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [-]','low','speed',null,null,null);",
  },
  {
    contentId: 'speed-check-plus',
    name: 'Speed Check +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [+]','low','speed',null,null,null);",
  },
  {
    contentId: 'strength-check',
    name: 'Strength Check',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100','low','strength',null,null,null);",
  },
  {
    contentId: 'strength-check-minus',
    name: 'Strength Check -',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [-]','low','strength',null,null,null);",
  },
  {
    contentId: 'strength-check-plus',
    name: 'Strength Check +',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initRollCheck('1d100 [+]','low','strength',null,null,null);",
  },
  {
    contentId: 'take-bleeding-damage',
    name: 'Take Bleeding Damage',
    img: 'icons/svg/d10-grey.svg',
    command: `prepBleedingDamage();

//tell the actor to run the function
async function prepBleedingDamage() {
  //determine who to run the macro for
  if (game.settings.get('mothershiprpg','macroTarget') === 'character') {
    //is there a selected character? warn if no
    if (!game.user.character) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //run the function for the player's 'Selected Character'
      game.user.character.takeBleedingDamage();
    }
  } else if (game.settings.get('mothershiprpg','macroTarget') === 'token') {
    //is there a selected character? warn if no
    if (!canvas.tokens.controlled.length) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //run the function for all selected tokens
      canvas.tokens.controlled.forEach(function(token){
        token.actor.takeBleedingDamage();
      });
    }
  }
}`,
  },
  {
    contentId: 'minus-10-health',
    name: '-10 Health',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.health.value',-10,null,true);",
  },
  {
    contentId: 'minus-1-health',
    name: '-1 Health',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.health.value',-1,null,true);",
  },
  {
    contentId: 'minus-1-maximum-wound',
    name: '-1 Maximum Wound',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.hits.max',-1,null,true);",
  },
  {
    contentId: 'minus-1-minimum-stress',
    name: '-1 Minimum Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.min',-1,null,true);",
  },
  {
    contentId: 'minus-1-stress',
    name: '-1 Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.value',-1,null,true);",
  },
  {
    contentId: 'minus-1-wound',
    name: '-1 Wound',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.hits.value',-1,null,true);",
  },
  {
    contentId: 'minus-1d10-body-save',
    name: '-1d10 Body Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.body.value',null,'-1d10',true);",
  },
  {
    contentId: 'minus-1d10-health',
    name: '-1d10 Health',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.health.value',null,'-1d10',true);",
  },
  {
    contentId: 'minus-1d10-intellect',
    name: '-1d10 Intellect',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.intellect.value',null,'-1d10',true);",
  },
  {
    contentId: 'minus-1d10-maximum-stress',
    name: '-1d10 Maximum Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.max',null,'-1d10',true);",
  },
  {
    contentId: 'minus-1d10-strength',
    name: '-1d10 Strength',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.strength.value',null,'-1d10',true);",
  },
  {
    contentId: 'minus-1d10-stress',
    name: '-1d10 Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.value',null,'-1d10',true);",
  },
  {
    contentId: 'minus-1d5-maximum-health',
    name: '-1d5 Maximum Health',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.health.max',null,'-1d5',true);",
  },
  {
    contentId: 'minus-1d5-sanity-save',
    name: '-1d5 Sanity Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.sanity.value',null,'-1d5',true);",
  },
  {
    contentId: 'minus-1d5-stress',
    name: '-1d5 Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.value',null,'-1d5',true);",
  },
  {
    contentId: 'minus-2-maximum-stress',
    name: '-2 Maximum Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.max',-2,null,true);",
  },
  {
    contentId: 'minus-2d10-body-save',
    name: '-2d10 Body Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.body.value',null,'-2d10',true);",
  },
  {
    contentId: 'minus-2d10-health',
    name: '-2d10 Health',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.health.value',null,'-2d10',true);",
  },
  {
    contentId: 'minus-3d10-health',
    name: '-3d10 Health',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.health.value',null,'-3d10',true);",
  },
  {
    contentId: 'plus-1-bleeding',
    name: '+1 Bleeding',
    img: 'icons/svg/d10-grey.svg',
    condition: 'bleeding',
    severity: 1,
  },
  {
    contentId: 'plus-1-coward',
    name: '+1 Coward',
    img: 'icons/svg/d10-grey.svg',
    condition: 'coward',
    severity: 1,
  },
  {
    contentId: 'plus-1-deflated',
    name: '+1 Deflated',
    img: 'icons/svg/d10-grey.svg',
    condition: 'deflated',
    severity: 1,
  },
  {
    contentId: 'plus-1-doomed',
    name: '+1 Doomed',
    img: 'icons/svg/d10-grey.svg',
    condition: 'doomed',
    severity: 1,
  },
  {
    contentId: 'plus-1-frightened',
    name: '+1 Frightened',
    img: 'icons/svg/d10-grey.svg',
    condition: 'frightened',
    severity: 1,
  },
  {
    contentId: 'plus-1-haunted',
    name: '+1 Haunted',
    img: 'icons/svg/d10-grey.svg',
    condition: 'haunted',
    severity: 1,
  },
  {
    contentId: 'plus-1-loss-of-confidence',
    name: '+1 Loss of Confidence',
    img: 'icons/svg/d10-grey.svg',
    condition: 'loss-of-confidence',
    severity: 1,
  },
  {
    contentId: 'plus-1-minimum-stress',
    name: '+1 Minimum Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.min',1,null,true);",
  },
  {
    contentId: 'plus-1-nightmares',
    name: '+1 Nightmares',
    img: 'icons/svg/d10-grey.svg',
    condition: 'nightmares',
    severity: 1,
  },
  {
    contentId: 'plus-1-sanity-save',
    name: '+1 Sanity Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.sanity.value',1,null,true);",
  },
  {
    contentId: 'plus-1-spiraling',
    name: '+1 Spiraling',
    img: 'icons/svg/d10-grey.svg',
    condition: 'spiraling',
    severity: 1,
  },
  {
    contentId: 'plus-1-stress',
    name: '+1 Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.value',1,null,true);",
  },
  {
    contentId: 'plus-1d10-combat',
    name: '+1d10 Combat',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.combat.value',null,'1d10',true);",
  },
  {
    contentId: 'plus-1d10-fear-save',
    name: '+1d10 Fear Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.fear.value',null,'1d10',true);",
  },
  {
    contentId: 'plus-1d10-health',
    name: '+1d10 Health',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.health.value',null,'1d10',true);",
  },
  {
    contentId: 'plus-1d10-maximum-stress',
    name: '+1d10 Maximum Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.max',null,'1d10',true);",
  },
  {
    contentId: 'plus-1d10-stress',
    name: '+1d10 Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.value',null,'1d10',true);",
  },
  {
    contentId: 'plus-1d5-stress',
    name: '+1d5 Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.value',null,'1d5',true);",
  },
  {
    contentId: 'plus-2-bleeding',
    name: '+2 Bleeding',
    img: 'icons/svg/d10-grey.svg',
    condition: 'bleeding',
    severity: 2,
  },
  {
    contentId: 'plus-2-minimum-stress',
    name: '+2 Minimum Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.min',2,null,true);",
  },
  {
    contentId: 'plus-2-stress',
    name: '+2 Stress',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.other.stress.value',2,null,true);",
  },
  {
    contentId: 'plus-2d10-body-save',
    name: '+2d10 Body Save',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.body.value',null,'2d10',true);",
  },
  {
    contentId: 'plus-2d10-speed',
    name: '+2d10 Speed',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.speed.value',null,'2d10',true);",
  },
  {
    contentId: 'plus-2d10-strength',
    name: '+2d10 Strength',
    img: 'icons/svg/d10-grey.svg',
    command: "game.mothershiprpg.initModifyActor('system.stats.strength.value',null,'2d10',true);",
  },
  {
    contentId: 'plus-3-bleeding',
    name: '+3 Bleeding',
    img: 'icons/svg/d10-grey.svg',
    condition: 'bleeding',
    severity: 3,
  },
  {
    contentId: 'plus-4-bleeding',
    name: '+4 Bleeding',
    img: 'icons/svg/d10-grey.svg',
    condition: 'bleeding',
    severity: 4,
  },
  {
    contentId: 'plus-5-bleeding',
    name: '+5 Bleeding',
    img: 'icons/svg/d10-grey.svg',
    condition: 'bleeding',
    severity: 5,
  },
  {
    contentId: 'plus-6-bleeding',
    name: '+6 Bleeding',
    img: 'icons/svg/d10-grey.svg',
    condition: 'bleeding',
    severity: 6,
  },
  {
    contentId: 'plus-7-bleeding',
    name: '+7 Bleeding',
    img: 'icons/svg/d10-grey.svg',
    condition: 'bleeding',
    severity: 7,
  },
] as const satisfies readonly MacroRecord[];

/** The macros a player drags to the hotbar: one per procedure the book asks them to run. */
export const HOTBAR_MACROS = [
  {
    contentId: 'cover',
    name: 'Cover',
    img: 'systems/mothershiprpg/images/icons/ui/attributes/armor.png',
    command: `prepCover();

//tell the actor to run the function
async function prepCover() {
  //determine who to run the macro for
  if (game.settings.get('mothershiprpg','macroTarget') === 'character') {
    //is there a selected character? warn if no
    if (!game.user.character) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //run the function for the player's 'Selected Character'
      game.user.character.chooseCover();
    }
  } else if (game.settings.get('mothershiprpg','macroTarget') === 'token') {
    //is there a selected character? warn if no
    if (!canvas.tokens.controlled.length) {
      //warn player
      game.mothershiprpg.noCharSelected();
    } else {
      //run the function for all selected tokens
      canvas.tokens.controlled.forEach(function(token){
        token.actor.chooseCover();
      });
    }
  }
}`,
  },
  {
    contentId: 'death-save',
    name: 'Death Save',
    img: 'systems/mothershiprpg/images/icons/ui/rolltables/death_save.png',
    command: `//init vars
let macroTarget = game.settings.get('mothershiprpg','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mothershiprpg.noCharSelected();
//else pop up the dialog
} else {
  //pop up the death save dialog box
  new foundry.applications.api.DialogV2({
    window: {
      title: "Death Save"
    },
    classes: ["macro-popup-dialog"],
    position: { width: 600 },
    content: \`
      <div class="macro_window">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img">
            <img src="systems/mothershiprpg/images/icons/ui/rolltables/death_save.png" />
          </div>
          <div class="macro_desc">
            <h4>Death Save</h4>
            Your character is incapacitated when you receive a fatal wound, or once your Current Wounds equal your Maximum Wounds. As soon as someone spends a turn checking your vitals, make a <strong>Death Save</strong> to reveal your fate. If your death seems imminent, make your last moments count: save someone’s life, solve an important mystery, or give the others time to escape.
          </div>    
        </div>
      </div>
      <div class="macro_prompt">
        Select your roll type:
      </div>
    \`,
    buttons: [
      {
        label: "Advantage",
        action: "action_advantage",
        callback: () => game.mothershiprpg.initRollTable(game.settings.get("mosh","table1eDeath"), "1d10 [+]", "low", true, false, null, null),
        icon: \`fas fa-angle-double-up\`
      },
      {
        label: "Normal",
        action: "action_normal",
        callback: () => game.mothershiprpg.initRollTable(game.settings.get("mosh","table1eDeath"), "1d10", "low", true, false, null, null),
        icon: \`fas fa-minus\`
      },
      {
        label: "Disadvantage",
        action: "action_disadvantage",
        callback: () => game.mothershiprpg.initRollTable(game.settings.get("mosh","table1eDeath"), "1d10 [-]", "low", true, false, null, null),
        icon: \`fas fa-angle-double-down\`
      }
    ]
  }).render({ force: true });
}`,
  },
  {
    contentId: 'gain-stress',
    name: 'Gain Stress',
    img: 'systems/mothershiprpg/images/icons/ui/macros/gain_stress.png',
    command: `//init vars
let macroTarget = game.settings.get('mothershiprpg','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mothershiprpg.noCharSelected();
//else pop up the dialog
} else {
  new foundry.applications.api.DialogV2({
    window: {
      title: "Gain Stress"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: \`
      <div class ="macro_window" style="margin-bottom : 7px;">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/macros/gain_stress.png" style="border:none"/></div>
          <div class="macro_desc">
            <h4>Gain Stress</h4>
            <strong>You gain 1 Stress every time you fail a Stat Check or Save.</strong> Occasionally, certain locations or entities can automatically give you Stress from interacting with or witnessing them. Your <strong>Minimum Stress</strong> starts at 2, and the <strong>Maximum Stress you can have is 20.</strong> Any Stress you take over 20 instead reduces the most relevant Stat or Save by that amount.
          </div>    
        </div>
      </div>
      <div class="macro_prompt">
        Select your modification:
      </div>
    \`,
    buttons: [
      {
      label: \`Gain 1 Stress\`,
      action: 'button_1',
      callback: () => game.mothershiprpg.initModifyActor('system.other.stress.value',1,null,true),
      icon: \`fas fa-angle-up\`
      },
      {
      label: \`Gain 2 Stress\`,
      action: 'button_2',
      callback: () => game.mothershiprpg.initModifyActor('system.other.stress.value',2,null,true),
      icon: \`fas fa-angle-double-up\`
      },
      {
      label: \`Gain 1d5 Stress\`,
      action: 'button_3',
      callback: () => game.mothershiprpg.initModifyActor('system.other.stress.value',null,\`1d5\`,true),
      icon: \`fas fa-arrow-circle-up\`
      }
    ]
  }).render({force: true});
}`,
  },
  {
    contentId: 'panic-check',
    name: 'Panic Check',
    img: 'systems/mothershiprpg/images/icons/ui/rolltables/panic_check.png',
    command: `//init vars
let macroTarget = game.settings.get('mothershiprpg','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mothershiprpg.noCharSelected();
//else pop up the dialog
} else {
  //pop up the panic check dialog box
  new foundry.applications.api.DialogV2({
    window: {
      title: "Panic Check"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: \`
      <div class ="macro_window" style="margin-bottom : 7px;">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/rolltables/panic_check.png" style="border:none"/></div>
          <div class="macro_desc">
            <h4>Panic Check</h4>
            Stress, Damage, and emotional wear and tear eventually bring characters to their breaking point. When that happens, there’s a chance they Panic. You determine this by making a <strong>Panic Check</strong>. Some results of the Panic Table are so severe that they leave a lasting impression on you. These are called <strong>Conditions</strong>, and they affect you until you are able to treat them.
          </div>
        </div>
      </div>
      <div class="macro_prompt">
        Select your roll type:
      </div>
    \`,
    buttons: [
      {
        label: \`Advantage\`,
        action: 'button_advantage',
        callback: () => game.mothershiprpg.initRollTable(\`panicCheck\`,\`[+]\`,null,false,false,null,null),
        icon: \`fas fa-angle-double-up\`
      },
      {
        label: \`Normal\`,
        action: 'button_normal',
        callback: () => game.mothershiprpg.initRollTable(\`panicCheck\`,\`\`,null,false,false,null,null),
        icon: \`fas fa-minus\`
      },
      {
        label: \`Disadvantage\`,
        action: 'button_disadvantage',
        callback: () => game.mothershiprpg.initRollTable(\`panicCheck\`,\`[-]\`,null,false,false,null,null),
        icon: \`fas fa-angle-double-down\`
      }
    ]
  }).render({force: true});
}`,
  },
  {
    contentId: 'relieve-stress',
    name: 'Relieve Stress',
    img: 'systems/mothershiprpg/images/icons/ui/macros/relieve_stress.png',
    command: `//init vars
let macroTarget = game.settings.get('mothershiprpg','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mothershiprpg.noCharSelected();
//else pop up the dialog
} else {
  new foundry.applications.api.DialogV2({
    window: {
      title: "Relieve Stress"
    },
    classes: ["macro-popup-dialog"],
      position: {width: 600},
      content: \`
        <div class ="macro_window" style="margin-bottom : 7px;">
          <div class="grid grid-2col" style="grid-template-columns: 150px auto">
            <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/macros/relieve_stress.png" style="border:none"/></div>
            <div class="macro_desc">
              <h4>Relieve Stress</h4>
              Occasionally, certain moments, places, or events can automatically <strong>relieve your stress.</strong> Escaping perilous situations, finding a serene location, or experiencing a touching moment with a loved one can have meaningful impacts on your mood and outlook on life. If your stress is getting close to 20, you should consider making a <strong>Rest Save</strong> - as the effects of a failed <strong>Panic Check</strong> can be devastating.
            </div>    
          </div>
        </div>
        <div class="macro_prompt">
          Select your modification:
        </div>
      \`,
      buttons: [
        {
        label: \`Relieve 1 Stress\`,
        action: 'button_1',
        callback: () => game.mothershiprpg.initModifyActor('system.other.stress.value',-1,null,true),
        icon: \`fas fa-angle-down\`
        },
        {
        label: \`Relieve 2 Stress\`,
        action: 'button_2',
        callback: () => game.mothershiprpg.initModifyActor('system.other.stress.value',-2,null,true),
        icon: \`fas fa-angle-double-down\`
        },
        {
        label: \`Relieve 1d5 Stress\`,
        action: 'button_3',
        callback: () => game.mothershiprpg.initModifyActor('system.other.stress.value',null,\`-1d5\`,true),
        icon: \`fas fa-arrow-circle-down\`
        }
      ]
  }).render({force: true});
}`,
  },
  {
    contentId: 'rest-save',
    name: 'Rest Save',
    img: 'systems/mothershiprpg/images/icons/ui/macros/rest_save.png',
    command: `//init vars
let macroTarget = game.settings.get('mothershiprpg','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mothershiprpg.noCharSelected();
//else pop up the dialog
} else {
  new foundry.applications.api.DialogV2({
    window: {
      title: "Rest Save"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: \`
    <div class ="macro_window" style="margin-bottom : 7px;">
      <div class="grid grid-2col" style="grid-template-columns: 150px auto">
        <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/macros/rest_save.png" style="border:none"/></div>
        <div class="macro_desc">
          <h4>Rest Save</h4>
          You can relieve Stress by resting in a relatively safe place. If you succeed, reduce your Stress; <strong>if you fail, you gain 1 Stress instead.</strong> Players can gain Advantage on their Rest Save by participating in consensual sex, recreational drug use, a night of heavy drinking, prayer, or any other suitable leisure activity. Unsafe locations may incur Disadvantage.
        </div>
      </div>
    </div>
    \`,
    buttons: [
     {
        label: \`Next\`,
        action: 'button_next',
        callback: () => game.mothershiprpg.initRollCheck(null,'low','restSave',null,null,null),
        icon: \`fas fa-chevron-circle-right\`
      }
    ]
  }).render({force: true});
}`,
  },
  {
    contentId: 'save',
    name: 'Save',
    img: 'systems/mothershiprpg/images/icons/ui/macros/save.png',
    command: `//init vars
let macroTarget = game.settings.get('mothershiprpg','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mothershiprpg.noCharSelected();
//else pop up the dialog
} else {
  new foundry.applications.api.DialogV2({
    window: {
      title: "Save"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: \`
    <div class ="macro_window">
      <div class="grid grid-2col" style="grid-template-columns: 150px auto">
        <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/macros/save.png" style="border:none"/></div>
        <div class="macro_desc">
          <h4>Save</h4>
          You have three Saves which represent your ability to withstand different kinds of trauma. In order to avoid certain dangers, you sometimes need to roll a Save. <strong>If you roll less than your Save you succeed. Otherwise you fail, and gain 1 Stress.</strong> A roll of 90-99 is always a failure. A Critical Failure means something bad happens, and furthermore you must make a Panic Check.
        </div>    
      </div>
    </div>
    <label for="san">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="san" name="save" value="sanity" checked="checked">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/attributes/sanity.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Sanity:</strong> Rationalize logical inconsistencies in the universe, make sense out of chaos, detect illusions and mimicry, cope with <strong>Stress</strong>.
            </span>
          </div>    
        </div>
      </div>
    </label>
    <label for="fer">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="fer" name="save" value="fear">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/attributes/fear.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Fear:</strong> Maintain a level head while struggling with fear, loneliness, depression, and other emotional surges.
            </span>
          </div>    
        </div>
      </div>
    </label>
    <label for="bod">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="bod" name="save" value="body">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/attributes/body.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Body:</strong> Employ quick reflexes and resist hunger, disease, or organisms that might try and invade your insides.
            </span>
          </div>
        </div>
      </div>
    </label>
    \`,
    buttons: [
      {
        label: \`Next\`,
        action: 'button_1',
        callback: (event, button, dialog) => game.mothershiprpg.initRollCheck(null,'low',button.form.querySelector("input[name='save']:checked").value,null,null,null),
        icon: \`fas fa-chevron-circle-right\`
      }
    ]
  }).render({force: true});
}`,
  },
  {
    contentId: 'stat-check',
    name: 'Stat Check',
    img: 'systems/mothershiprpg/images/icons/ui/macros/stat_check.png',
    command: `//init vars
let macroTarget = game.settings.get('mothershiprpg','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mothershiprpg.noCharSelected();
//else pop up the dialog
} else {
  new foundry.applications.api.DialogV2({
    window: {
      title: "Stat Check"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: \`
    <div class ="macro_window">
      <div class="grid grid-2col" style="grid-template-columns: 150px auto">
        <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/macros/stat_check.png" style="border:none"/></div>
        <div class="macro_desc">
          <h4>Stat Check</h4>
          You have four Stats which represent your ability to act under extreme pressure. Whenever you want to do something and the price for failure is high, roll a stat check. <strong>If you roll less than your Stat you succeed. Otherwise, you fail and gain 1 Stress.</strong> A roll of 90-99 is always a failure. A Critical Failure means something bad happens, and furthermore you must make a Panic Check.
        </div>    
      </div>
    </div>
    <label for="str">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="str" name="stat" value="strength" checked="checked">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/attributes/strength.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Strength:</strong> Holding airlocks closed, carrying fallen comrades, climbing, pushing, jumping.
            </span>
          </div>    
        </div>
      </div>
    </label>
    <label for="spd">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="spd" name="stat" value="speed">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/attributes/speed.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Speed:</strong> Getting out of the cargo bay before the blast doors close, acting before someone <em>(or something)</em> else, running away.
            </span>
          </div>    
        </div>
      </div>
    </label>
    <label for="int">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="int" name="stat" value="intellect">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/attributes/intellect.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Intellect:</strong> Recalling your training and experience under duress, thinking through difficult problems, inventing or fixing things.
            </span>
          </div>
        </div>
      </div>
    </label>
    <label for="com">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="com" name="stat" value="combat">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/attributes/combat.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Combat:</strong> Fighting for your life.
            </span>
          </div>    
        </div>
      </div>
    </label>
    \`,
    buttons: [
     {
        label: \`Next\`,
        action: 'button_1',
        callback: (event, button, dialog) => game.mothershiprpg.initRollCheck(null,'low',button.form.querySelector("input[name='stat']:checked").value,null,null,null),
        icon: \`fas fa-chevron-circle-right\`
      }
    ]
  }).render({force: true});
}`,
  },
  {
    contentId: 'wound-roll',
    name: 'Wound Roll',
    img: 'systems/mothershiprpg/images/icons/ui/macros/wound_roll.png',
    command: `//init vars
let macroTarget = game.settings.get('mothershiprpg','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mothershiprpg.noCharSelected();
//else pop up the dialog
} else {
  //pop up the wound roll dialog box
  new foundry.applications.api.DialogV2({
    window: {
      title: "Wound Roll"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: \`
      <div class ="macro_window">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/macros/wound_roll.png" style="border:none"/></div>
          <div class="macro_desc">
            <h4>Wound Roll</h4>
            Make a <strong>Wound Roll</strong> according to the type of Damage received.<br><strong>Flesh Wounds</strong> are small inconveniences.<br><strong>Minor/Major Injuries</strong> cause lasting issues that require treatment.<br><strong>Lethal Injuries</strong> can kill you if not dealt with immediately.<br><strong>Fatal Injuries</strong> can kill outright.<br><strong>Bleeding</strong> wounds, if not treated can quickly overwhelm you.
          </div>    
        </div>
      </div>
      <label for="bf">
        <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
          <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
            <input type="radio" id="bf" name="wound_table" value="31YibfjueXuZdNLb" checked="checked">
            <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/rolltables/wounds_blunt_force.png" style="border:none"/></div>
            <div class="macro_desc" style="display: table;">
              <span style="display: table-cell; vertical-align: middle;">
                <strong>Blunt Force:</strong> Getting punched, hit with a crowbar or a thrown object, falling, etc.
              </span>
            </div>
          </div>
        </div>
      </label>
      <label for="b">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="b" name="wound_table" value="ata3fRz3uoPfNCLh">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/rolltables/wounds_bleeding.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Bleeding:</strong> Getting stabbed or cut.
            </span>
          </div>
        </div>
      </div>
      </label>
      <label for="g">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="g" name="wound_table" value="XjDU2xFOWEasaZK0">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/rolltables/wounds_gunshot.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Gunshot:</strong> Getting shot by a firearm.
            </span>
          </div>
        </div>
      </div>
      </label>
      <label for="fe">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="fe" name="wound_table" value="lqiaWwh5cGcJhvnu">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/rolltables/wounds_fire_&_explosives.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Fire & Explosives:</strong> Grenades, flamethrowers, doused in fuel and lit on fire, etc.
            </span>
          </div>
        </div>
      </div>
      </label>
      <label for="gm">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="gm" name="wound_table" value="uVfC1CqYdojaJ7yR">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mothershiprpg/images/icons/ui/rolltables/wounds_gore_&_massive.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Gore & Massive:</strong> Giant or gruesome attacks.
            </span>
          </div>
        </div>
      </div>
      </label>
      <div class="macro_prompt">
        Select your roll type:
      </div>
    \`,
    buttons: [
      {
        label: \`Advantage\`,
        action: 'action_advantage',
        callback: (event, button, dialog) => game.mothershiprpg.initRollTable(button.form.querySelector("input[name='wound_table']:checked").value,\`1d10 [+]\`,\`low\`,true,false,null,null),
        icon: \`fas fa-angle-double-up\`
      },
      {
        label: \`Normal\`,
        action: 'action_normal',
        callback: (event, button, dialog) => game.mothershiprpg.initRollTable(button.form.querySelector("input[name='wound_table']:checked").value,\`1d10\`,\`low\`,true,false,null,null),
        icon: \`fas fa-minus\`
      },
      {
        label: \`Disadvantage\`,
        action: 'action_disadvantage',
        callback: (event, button, dialog) => game.mothershiprpg.initRollTable(button.form.querySelector("input[name='wound_table']:checked").value,\`1d10 [-]\`,\`low\`,true,false,null,null),
        icon: \`fas fa-angle-double-down\`
      }
    ]
  }).render({force: true});
}`,
  },
] as const satisfies readonly CommandMacro[];

export type TriggeredMacroId = (typeof TRIGGERED_MACROS)[number]['contentId'];
