import Dialog from "./Dialog.js";



/**
 * The Welcome
 */
export default class Welcome {

    /** @type {Dialog} */
    #dialog;


    /**
     * Welcome constructor
     */
    constructor() {
        this.#dialog = new Dialog("welcome");
    }

    /**
     * Returns true if the Welcome is Open
     * @returns {Boolean}
     */
    get isOpen() {
        return this.#dialog.isOpen;
    }

    /**
     * Opens the Welcome Dialog
     * @returns {Void}
     */
    open() {
        this.#dialog.open();
    }

    /**
     * Closes the Welcome Dialog
     * @returns {Void}
     */
    close() {
        this.#dialog.close();
    }
}
