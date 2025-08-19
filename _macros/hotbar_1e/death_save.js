//init vars
let macroTarget = game.settings.get('mosh','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mosh.noCharSelected();
//else pop up the dialog
} else {
  //pop up the death save dialog box
  new foundry.applications.api.DialogV2({
    window: {
      title: "Death Save"
    },
    classes: ["macro-popup-dialog"],
    position: { width: 600 },
    content: `
      <div class="macro_window">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img">
            <img src="systems/mosh/images/icons/ui/rolltables/death_save.png" />
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
    `,
    buttons: [
      {
        label: "Advantage",
        action: "action_advantage",
        callback: () => game.mosh.initRollTable(game.settings.get("mosh","table1eDeath"), "1d10 [+]", "low", true, false, null, null),
        icon: `fas fa-angle-double-up`
      },
      {
        label: "Normal",
        action: "action_normal",
        callback: () => game.mosh.initRollTable(game.settings.get("mosh","table1eDeath"), "1d10", "low", true, false, null, null),
        icon: `fas fa-minus`
      },
      {
        label: "Disadvantage",
        action: "action_disadvantage",
        callback: () => game.mosh.initRollTable(game.settings.get("mosh","table1eDeath"), "1d10 [-]", "low", true, false, null, null),
        icon: `fas fa-angle-double-down`
      }
    ]
  }).render({ force: true });
}