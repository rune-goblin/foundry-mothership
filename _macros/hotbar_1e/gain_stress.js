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
      title: "Gain Stress"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: `
      <div class ="macro_window" style="margin-bottom : 7px;">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img"><img src="systems/mosh/images/icons/ui/macros/gain_stress.png" style="border:none"/></div>
          <div class="macro_desc">
            <h4>Gain Stress</h4>
            <strong>You gain 1 Stress every time you fail a Stat Check or Save.</strong> Occasionally, certain locations or entities can automatically give you Stress from interacting with or witnessing them. Your <strong>Minimum Stress</strong> starts at 2, and the <strong>Maximum Stress you can have is 20.</strong> Any Stress you take over 20 instead reduces the most relevant Stat or Save by that amount.
          </div>    
        </div>
      </div>
      <div class="macro_prompt">
        Select your modification:
      </div>
    `,
    buttons: [
      {
      label: `Gain 1 Stress`,
      action: 'button_1',
      callback: () => game.mosh.initModifyActor('system.other.stress.value',1,null,true),
      icon: `fas fa-angle-up`
      },
      {
      label: `Gain 2 Stress`,
      action: 'button_2',
      callback: () => game.mosh.initModifyActor('system.other.stress.value',2,null,true),
      icon: `fas fa-angle-double-up`
      },
      {
      label: `Gain 1d5 Stress`,
      action: 'button_3',
      callback: () => game.mosh.initModifyActor('system.other.stress.value',null,`1d5`,true),
      icon: `fas fa-arrow-circle-up`
      }
    ]
  }).render({force: true});
}