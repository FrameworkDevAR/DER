import Dialog  from "./Dialog.js";
import Configs from "../core/Configs.js";



// What the dialog asks for, and how each answer is read back
const SWITCHES = [
    "showGrid", "snapToGrid", "tidyOnAdd",
    "showDescriptions", "showTypes", "onlyKeys", "showAudit", "keysFirst", "showAllFields",
    "isStraight", "showDots", "flowLinks",
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
     * @param {Configs}  configs
     * @param {Object[]} shortcuts
     */
    constructor(configs, shortcuts) {
        this.#dialog  = new Dialog("settings");
        this.#configs = configs;

        const list = this.#dialog.getElement(".keys-list");
        for (const shortcut of shortcuts) {
            const item = document.createElement("li");
            const keys = document.createElement("div");
            const text = document.createElement("span");

            keys.className = "keys-keys";
            for (const name of shortcut.names) {
                const key = document.createElement("b");
                key.innerHTML = name;
                keys.appendChild(key);
            }

            text.innerHTML = shortcut.text;
            item.appendChild(keys);
            item.appendChild(text);
            list.appendChild(item);
        }
    }

    /**
     * Shows the Options or the Shortcuts
     * @param {HTMLElement} target
     * @returns {Void}
     */
    setTab(target) {
        this.showTab(target.dataset.tab);
    }

    /**
     * Shows the given tab, and moves the mark under it
     * @param {String}   tab
     * @param {Boolean=} withMove
     * @returns {Void}
     */
    showTab(tab, withMove = true) {
        for (const element of this.#dialog.getElements("[data-tab]")) {
            element.classList.toggle("selected", element.dataset.tab === tab);
        }
        this.#dialog.getElement("dialog").classList.toggle("show-keys", tab === "keys");
        this.setMark(withMove);
    }

    /**
     * Puts the mark of the tabs under the one that is selected, which it
     * slides to from wherever it was
     * @param {Boolean=} withMove
     * @returns {Void}
     */
    setMark(withMove = true) {
        const tab  = this.#dialog.getElement("[data-tab].selected");
        const mark = this.#dialog.getElement(".dialog-tabs-mark");
        if (!(tab instanceof HTMLElement) || !(mark instanceof HTMLElement)) {
            return;
        }

        // An open has nowhere to slide from, so the mark just appears there
        mark.style.transition = withMove ? "" : "none";
        mark.style.setProperty("--mark-width", `${tab.offsetWidth}px`);
        mark.style.setProperty("--mark-left", `${tab.offsetLeft}px`);
        if (!withMove) {
            void mark.offsetWidth;
            mark.style.transition = "";
        }
    }

    /**
     * Opens the Dialog with the Configs as they are, on the given tab
     * @param {String=} tab
     * @returns {Void}
     */
    open(tab = "options") {
        for (const name of SWITCHES) {
            this.#dialog.setInput(name, this.#configs.get(name));
        }
        this.#dialog.hideErrors();
        this.#dialog.open();
        this.showTab(tab, false);
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
