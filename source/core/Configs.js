import Storage from "./Storage.js";
import Link    from "../board/Link.js";
import Pointer from "../board/Pointer.js";
import Minimap from "../board/Minimap.js";



// What the app does when nothing has been asked of it
const DEFAULTS = {
    showGrid         : true,
    showDescriptions : true,
    showTypes        : true,
    onlyKeys         : false,
    showAudit        : true,
    keysFirst        : false,
    showAllFields    : false,
    isStraight       : false,
    showDots         : false,
    flowLinks        : false,
    snapToGrid       : false,
    tidyOnAdd        : true,
    showMinimap      : false,
};



/**
 * The Configs
 */
export default class Configs {

    /** @type {Storage} */
    #storage;

    /** @type {HTMLElement} */
    #body;


    /**
     * Configs constructor
     * @param {Storage} storage
     */
    constructor(storage) {
        this.#storage = storage;
        this.#body    = document.querySelector("body");
        this.values   = { ...DEFAULTS, ...(storage.getSettings() || {}) };
    }

    /**
     * Returns the value of the given Config
     * @param {String} name
     * @returns {*}
     */
    get(name) {
        return this.values[name];
    }

    /**
     * Takes the given Configs, keeping the rest as they are
     * @param {Object} values
     * @returns {Void}
     */
    set(values) {
        this.values = { ...this.values, ...values };
        this.#storage.setSettings(this.values);
        this.apply();
    }

    /**
     * Draws the board the way the Configs ask for
     * @returns {Void}
     */
    apply() {
        this.#body.classList.toggle("no-grid", !this.values.showGrid);
        this.#body.classList.toggle("no-descs", !this.values.showDescriptions);
        this.#body.classList.toggle("no-types", !this.values.showTypes);
        this.#body.classList.toggle("flow-links", this.values.flowLinks);

        // Every Link is drawn the same way, so the Configs sit on the class
        Link.isStraight    = this.values.isStraight;
        Link.showDots      = this.values.showDots;
        Pointer.snapToGrid = this.values.snapToGrid;
        Minimap.isShown    = this.values.showMinimap;
    }
}
