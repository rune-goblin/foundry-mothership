//init vars
let macroTarget = game.settings.get('mosh','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mosh.noCharSelected();
//else pop up the dialog
} else {
  //pop up the death save dialog box
  new new foundry.applications.api.DialogV2({
    window: {
      title: "Death Save"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: `
      <div class ="macro_window" style="margin-bottom : 7px;">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img"><img src="systems/mosh/images/icons/ui/rolltables/death_save.png" style="border:none"/></div>
          <div class="macro_desc">
            <h4>Death Save</h4>
            <strong>Whenever you reach 0 Health, make a Body Save: Failure means you die.</strong> Success means you fall unconscious, make a <strong>Death Save</strong> to find out when you regain consciousness. Crew members with a medscanner, relevant skills like First Aid or Biology, or scientists and androids who pass an <strong>Intellect Check</strong> can determine your condition.
          </div>    
        </div>
      </div>
      <div class="macro_prompt">
        Select your roll type:
      </div>
    `,
    buttons: [
      {
        label: `Advantage`,
        action: `action_advantage`,
        callback: () => game.mosh.initRollTable(game.settings.get('mosh','table0eDeath'),`1d10 [+]`,`high`,false,false,null,null),
        icon: `fas fa-angle-double-up`
      },
      {
        label: `Normal`,
        action: `action_normal`,
        callback: () => game.mosh.initRollTable(game.settings.get('mosh','table0eDeath'),`1d10`,`high`,false,false,null,null),
        icon: `fas fa-minus`
      },
      {
        label: `Disadvantage`,
        action: `action_disadvantage`,
        callback: () => game.mosh.initRollTable(game.settings.get('mosh','table0eDeath'),`1d10 [-]`,`high`,false,false,null,null),
        icon: `fas fa-angle-double-down`
      }
    ]
  }).render({force: true});
}