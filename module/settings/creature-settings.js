export class DLCreatureSettings extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'sheet-modifiers';
        options.classes = ["mosh", "sheet", "actor", "creature"];
        options.template = 'systems/mothershiprpg/templates/dialogs/creature-settings-dialog.html';
        options.width = 320;
        options.height = 150;
        return options;
    }
    /* -------------------------------------------- */
    /**
     * Add the Entity name into the window title
     * @type {String}
     */
    get title() {
        return `${this.object.name}: Creature Settings`;
    }
    /* -------------------------------------------- */

    /**
     * Construct and return the data object used to render the HTML template for this form application.
     * @return {Object}
     */
    getData() {
        const actor = this.object;
        console.log(this.object);

        return {
            actor
        };
    }
    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        html.find(`input[type=checkbox][id="system.stats.combat.enabled"]`).click(ev => {
            if (ev.currentTarget.checked) {
                const combat = html.find(`input[type=checkbox][id="system.stats.combat.enabled"]`).prop('checked', true);
            }

            this.object.update({
                "system.stats.combat.enabled": ev.currentTarget.checked
            });
        });
        html.find(`input[type=checkbox][id="system.stats.instinct.enabled"]`).click(ev => {
            if (ev.currentTarget.checked) {
                const instinct = html.find(`input[type=checkbox][id="system.stats.instinct.enabled"]`).prop('checked', true);
            }

            this.object.update({
                "system.stats.instinct.enabled": ev.currentTarget.checked
            });
        });
        html.find(`input[type=checkbox][id="system.stats.loyalty.enabled"]`).click(ev => {
            if (ev.currentTarget.checked) {
                const loyalty = html.find(`input[type=checkbox][id="system.stats.loyalty.enabled"]`).prop('checked', true);
            }

            this.object.update({
                "system.stats.loyalty.enabled": ev.currentTarget.checked
            });
        });
        html.find(`input[type=checkbox][id="system.stats.speed.enabled"]`).click(ev => {
            if (ev.currentTarget.checked) {
                const speed = html.find(`input[type=checkbox][id="system.stats.speed.enabled"]`).prop('checked', true);
            }

            this.object.update({
                "system.stats.speed.enabled": ev.currentTarget.checked
            });
        });
        html.find(`input[type=checkbox][id="system.stats.armor.enabled"]`).click(ev => {
            if (ev.currentTarget.checked) {
                const armor = html.find(`input[type=checkbox][id="system.stats.armor.enabled"]`).prop('checked', true);
            }

            this.object.update({
                "system.stats.armor.enabled": ev.currentTarget.checked
            });
        });
        html.find(`input[type=checkbox][id="system.stats.sanity.enabled"]`).click(ev => {
            if (ev.currentTarget.checked) {
                const sanity = html.find(`input[type=checkbox][id="system.stats.sanity.enabled"]`).prop('checked', true);
            }

            this.object.update({
                "system.stats.sanity.enabled": ev.currentTarget.checked
            });
        });
        html.find(`input[type=checkbox][id="system.swarm.enabled"]`).click(ev => {
            this.object.update({
                "system.swarm.enabled": ev.currentTarget.checked
            });
            
            let swarm_combat = 0;
            let current_combat = 0;

            if (ev.currentTarget.checked) {
                //set backup of current combat
                swarm_combat = this.object.system.stats.combat.value;
                //calculate new combat stat based on wounds,
                current_combat = this.object.system.stats.combat.value * ( this.object.system.hits.max -  this.object.system.hits.value); 
            }
            else{
                //revert back combat if swarm is disabled
                current_combat = this.object.system.swarm.combat.value;
            }
            this.object.update({
                "system.stats.combat.value":current_combat,
                "system.swarm.combat.value":swarm_combat
            });
        });
    }

    /**
     * This method is called upon form submission after form data is validated
     * @param event {Event}       The initial triggering submission event
     * @param formData {Object}   The object of validated form data with which to update the object
     * @private
     */
    /**
     * Deliberately empty. Every toggle is already persisted by its own click handler above,
     * with the real update path and the actual checked value. This form has no submit button
     * and neither `submitOnChange` nor `submitOnClose`, so nothing ever submits it -- the
     * override exists only because FormApplication throws if a subclass omits it. It goes
     * away with the ApplicationV2 conversion, which declares no form handler at all.
     */
    async _updateObject(_event, _formData) {}
}
