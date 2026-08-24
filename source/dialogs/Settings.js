import Dialog  from "./Dialog.js";
import Configs from "../core/Configs.js";



// What the dialog asks for, and how each answer is read back
const SWITCHES = [
    "showGrid", "snapToGrid", "tidyOnAdd",
    "showDescriptions", "showTypes", "onlyKeys", "showAudit", "keysFirst", "showAllFields",
    "isStraight", "showDots",
];



/**
 * The Settings Dialog
 */
export default class Settings {

    /** @type {Dialog} */
    #dialog;

    /** @type {Configs} */
    #configs;


    /**
     * Settings Dialog constructor
     * @param {Configs} configs
     */
    constructor(configs) {
        this.#dialog  = new Dialog("settings");
        this.#configs = configs;
    }

    /**
     * Opens the Dialog with the Configs as they are
     * @returns {Void}
     */
    open() {
        for (const name of SWITCHES) {
            this.#dialog.setInput(name, this.#configs.get(name));
        }
        this.#dialog.hideErrors();
        this.#dialog.open();
    }

    /**
     * Returns what the Dialog was left at
     * @returns {Object?}
     */
    update() {
        if (!this.#dialog.isOpen) {
            return null;
        }

        const result = {};
        for (const name of SWITCHES) {
            result[name] = Boolean(this.#dialog.getInput(name));
        }

        this.#dialog.close();
        return result;
    }

    /**
     * Closes the Dialog
     * @returns {Void}
     */
    close() {
        this.#dialog.close();
    }
}
