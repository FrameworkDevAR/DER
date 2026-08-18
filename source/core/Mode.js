/**
 * The Mode
 */
export default class Mode {

    /** @type {HTMLElement} */
    #body;
    /** @type {HTMLElement} */
    #light;
    /** @type {HTMLElement} */
    #dark;


    /**
     * Mode constructor
     */
    constructor() {
        this.#body  = document.querySelector("body");
        this.#light = document.querySelector(".mode-light");
        this.#dark  = document.querySelector(".mode-dark");
    }

    /**
     * Restores the Light or Dark mode
     * @param {String} mode
     * @returns {Void}
     */
    restore(mode) {
        if (mode === "light") {
            this.setLight();
        } else {
            this.setDark();
        }
    }

    /**
     * Sets the Light Mode
     * @returns {Void}
     */
    setLight() {
        this.#body.classList.add("light-mode");
        this.#body.classList.remove("dark-mode");
        this.#light.classList.add("selected");
        this.#dark.classList.remove("selected");
    }

    /**
     * Sets the Dark Mode
     * @returns {Void}
     */
    setDark() {
        this.#body.classList.remove("light-mode");
        this.#body.classList.add("dark-mode");
        this.#light.classList.remove("selected");
        this.#dark.classList.add("selected");
    }
}
