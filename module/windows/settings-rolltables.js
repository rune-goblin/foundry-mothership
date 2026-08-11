export class rolltableConfig extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        console.log(options);
        //options.id = 'sheet-modifiers';
        //options.classes = ["mosh", "sheet", "actor", "ship"];
        options.id = 'rolltable-modifiers';
        options.classes = ["mosh"];
        options.template = 'systems/mothershiprpg/templates/dialogs/settings-rolltableconfig-dialog.html';
        options.width = 800;
        options.height = 'auto';
        options.resizeable = false;
        options.submitOnChange = true;
        options.submitOnClose = true;
        options.closeOnSubmit = false;
        return options;
    }

    /**
     * Construct and return the data object used to render the HTML template for this form application.
     * @return {Object}
     */
    getData() {
        const tableSelection = super.getData();
        tableSelection.table1ePanicStressNormal = game.settings.get("mothershiprpg", "table1ePanicStressNormal");
        tableSelection.table1ePanicStressAndroid = game.settings.get("mothershiprpg", "table1ePanicStressAndroid");
        tableSelection.table1ePanicCalmNormal = game.settings.get("mothershiprpg", "table1ePanicCalmNormal");
        tableSelection.table1ePanicCalmAndroid = game.settings.get("mothershiprpg", "table1ePanicCalmAndroid");
        tableSelection.table1eWoundBluntForce = game.settings.get("mothershiprpg", "table1eWoundBluntForce");
        tableSelection.table1eWoundBleeding = game.settings.get("mothershiprpg", "table1eWoundBleeding");
        tableSelection.table1eWoundGunshot = game.settings.get("mothershiprpg", "table1eWoundGunshot");
        tableSelection.table1eWoundFireExplosives = game.settings.get("mothershiprpg", "table1eWoundFireExplosives");
        tableSelection.table1eWoundGoreMassive = game.settings.get("mothershiprpg", "table1eWoundGoreMassive");
        tableSelection.table1eDeath = game.settings.get("mothershiprpg", "table1eDeath");
        tableSelection.table1eDistressSignal = game.settings.get("mothershiprpg", "table1eDistressSignal");
        tableSelection.table1eMegadamageEffects = game.settings.get("mothershiprpg", "table1eMegadamageEffects");
        tableSelection.table1eMaintenance = game.settings.get("mothershiprpg", "table1eMaintenance");
        tableSelection.table1eBankruptcy = game.settings.get("mothershiprpg", "table1eBankruptcy");
        
        return tableSelection;
    }
    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Close Button
        html.find('.close-button').click(ev => {
            this.close()
        });
    }

    /**
     * This method is called upon form submission after form data is validated
     * @param event {Event}       The initial triggering submission event
     * @param formData {Object}   The object of validated form data with which to update the object
     * @private
     */
    async _updateObject(event, formData) {
        await Promise.all([
            game.settings.set("mothershiprpg", "table1ePanicStressNormal", formData["table1ePanicStressNormal"]),
            game.settings.set("mothershiprpg", "table1ePanicStressAndroid", formData["table1ePanicStressAndroid"]),
            game.settings.set("mothershiprpg", "table1ePanicCalmNormal", formData["table1ePanicCalmNormal"]),
            game.settings.set("mothershiprpg", "table1ePanicCalmAndroid", formData["table1ePanicCalmAndroid"]),
            game.settings.set("mothershiprpg", "table1eWoundBluntForce", formData["table1eWoundBluntForce"]),
            game.settings.set("mothershiprpg", "table1eWoundBleeding", formData["table1eWoundBleeding"]),
            game.settings.set("mothershiprpg", "table1eWoundGunshot", formData["table1eWoundGunshot"]),
            game.settings.set("mothershiprpg", "table1eWoundFireExplosives", formData["table1eWoundFireExplosives"]),
            game.settings.set("mothershiprpg", "table1eWoundGoreMassive", formData["table1eWoundGoreMassive"]),
            game.settings.set("mothershiprpg", "table1eDeath", formData["table1eDeath"]),
            game.settings.set("mothershiprpg", "table1eDistressSignal", formData["table1eDistressSignal"]),
            game.settings.set("mothershiprpg", "table1eMegadamageEffects", formData["table1eMegadamageEffects"]),
            game.settings.set("mothershiprpg", "table1eMaintenance", formData["table1eMaintenance"]),
            game.settings.set("mothershiprpg", "table1eBankruptcy", formData["table1eBankruptcy"])
        ]);

    }
}
