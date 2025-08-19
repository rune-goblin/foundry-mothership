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
      title: "Save"
    },
    classes: ["macro-popup-dialog"],
    position: {width: 600},
    content: `
    <div class ="macro_window">
      <div class="grid grid-2col" style="grid-template-columns: 150px auto">
        <div class="macro_img"><img src="systems/mosh/images/icons/ui/macros/save.png" style="border:none"/></div>
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
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mosh/images/icons/ui/attributes/sanity.png" style="border:none"/></div>
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
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mosh/images/icons/ui/attributes/fear.png" style="border:none"/></div>
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
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mosh/images/icons/ui/attributes/body.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Body:</strong> Employ quick reflexes and resist hunger, disease, or organisms that might try and invade your insides.
            </span>
          </div>
        </div>
      </div>
    </label>
    <label for="arm">
      <div class ="macro_window" style="vertical-align: middle; padding-left: 3px;">
        <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
          <input type="radio" id="arm" name="save" value="armor">
          <div class="macro_img" style="padding-top: 5px; padding-left: 0px; padding-right: 0px; padding-bottom: 5px;"><img src="systems/mosh/images/icons/ui/attributes/armor.png" style="border:none"/></div>
          <div class="macro_desc" style="display: table;">
            <span style="display: table-cell; vertical-align: middle;">
              <strong>Armor:</strong> Resistance to damage sustained during combat, whether that be through bullets, claws, teeth, etc.
            </span>
          </div>
        </div>
      </div>
    </label>
    `,
    buttons: [
      {
        label: `Next`,
        action: `next`,
        callback: (html) => game.mosh.initRollCheck(null,'low',html.find("input[name='save']:checked").val(),null,null,null),
        icon: `fas fa-chevron-circle-right`
      }
    ]
  }).render({force: true});
}