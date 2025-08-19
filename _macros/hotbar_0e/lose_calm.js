//init vars
let macroTarget = game.settings.get('mosh','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mosh.noCharSelected();
//else pop up the dialog
} else {
  new foundry.applications.api.DialogV2({
    window: {
      title: "Lose Calm"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: `
      <div class ="macro_window" style="margin-bottom : 7px;">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img"><img src="systems/mosh/images/icons/ui/macros/gain_stress.png" style="border:none"/></div>
          <div class="macro_desc">
            <h4>Lose Calm</h4>
            Occasionally, certain locations or entities can automatically give you Stress from interacting with or witnessing them. You live in a terrifying, uncaring universe, so your <strong>Maximum Calm</strong> caps out at 85 and cannot go lower than zero.
          </div>    
        </div>
      </div>
      <div class="macro_prompt">
        Select your modification:
      </div>
    `,
    buttons: [
      {
      label: `Lose 5 Calm`,
      action: `lose_5`,
      callback: () => game.mosh.initModifyActor('system.other.stress.value',-5,null,true),
      icon: `fas fa-angle-down`
      },
      {
      label: `Lose 10 Calm`,
      action: `lose_10`,
      callback: () => game.mosh.initModifyActor('system.other.stress.value',-10,null,true),
      icon: `fas fa-angle-double-down`
      },
      {
      label: `Lose 1d20 Calm`,
      action: `lose_1d20`,
      callback: () => game.mosh.initModifyActor('system.other.stress.value',null,`-1d20`,true),
      icon: `fas fa-arrow-circle-down`
      }
    ]
  }).render({force: true});
}