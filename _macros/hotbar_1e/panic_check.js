//init vars
let macroTarget = game.settings.get('mosh','macroTarget');
//warn user if character is not selected
if ((macroTarget === 'character' && !game.user.character) || (macroTarget === 'token' && !canvas.tokens.controlled.length)) {
  //warn player
  game.mosh.noCharSelected();
//else pop up the dialog
} else {
  //pop up the panic check dialog box
  new foundry.applications.api.DialogV2({
    window: {
      title: "Panic Check"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: `
      <div class ="macro_window" style="margin-bottom : 7px;">
        <div class="grid grid-2col" style="grid-template-columns: 150px auto">
          <div class="macro_img"><img src="systems/mosh/images/icons/ui/rolltables/panic_check.png" style="border:none"/></div>
          <div class="macro_desc">
            <h4>Panic Check</h4>
            Stress, Damage, and emotional wear and tear eventually bring characters to their breaking point. When that happens, there’s a chance they Panic. You determine this by making a <strong>Panic Check</strong>. Some results of the Panic Table are so severe that they leave a lasting impression on you. These are called <strong>Conditions</strong>, and they affect you until you are able to treat them.
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
        action: 'button_advantage',
        callback: () => game.mosh.initRollTable(`panicCheck`,`[+]`,null,false,false,null,null),
        icon: `fas fa-angle-double-up`
      },
      {
        label: `Normal`,
        action: 'button_normal',
        callback: () => game.mosh.initRollTable(`panicCheck`,``,null,false,false,null,null),
        icon: `fas fa-minus`
      },
      {
        label: `Disadvantage`,
        action: 'button_disadvantage',
        callback: () => game.mosh.initRollTable(`panicCheck`,`[-]`,null,false,false,null,null),
        icon: `fas fa-angle-double-down`
      }
    ]
  }).render({force: true});
}