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
      title: "Rest Save"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: `
      <div class ="macro_window" style="margin-bottom : 7px;">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img"><img src="systems/mosh/images/icons/ui/macros/rest_save.png" style="border:none"/></div>
          <div class="macro_desc">
            <h4>Rest Save</h4>
            You can relieve Stress by resting in a relatively safe place. If you succeed, reduce your Stress; <strong>if you fail, you gain 1 Stress instead.</strong> Players can gain Advantage on their Rest Save by participating in consensual sex, recreational drug use, a night of heavy drinking, prayer, or any other suitable leisure activity. Unsafe locations may incur Disadvantage.
          </div>
        </div>
      </div>
    `,
    buttons: [
      {
        label: `Next`,
        action: `next`,
        callback: () => game.mosh.initRollCheck(null,'low','restSave',null,null,null),
        icon: `fas fa-chevron-circle-right`
      }
    ]
  }).render({force: true});
}