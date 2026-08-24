// The one that says which way the system reads
const DARK_QUERY = "(prefers-color-scheme: dark)";



/**
 * The Mode
 */
export default class Mode {

    /** @type {HTMLElement} */
    #body;
    /** @type {Object.<String, HTMLElement>} */
    #buttons;


    /**
     * Mode constructor
     */
    constructor() {
        this.#body    = document.querySelector("body");
        this.#buttons = {
            light  : document.querySelector(".mode-light"),
            system : document.querySelector(".mode-system"),
            dark   : document.querySelector(".mode-dark"),
        };
        this.mode = "light";

        // The system is asked again whenever it changes its mind, which it
        // does at dusk on the machines that follow the hour
        window.matchMedia(DARK_QUERY).addEventListener("change", () => {
            if (this.mode === "system") {
                this.restore("system");
            }
        });
    }

    /**
     * Returns true if the system reads dark
     * @returns {Boolean}
     */
    get isSystemDark() {
        return window.matchMedia(DARK_QUERY).matches;
    }

    /**
     * Takes the Light, the Dark or whichever of the two the system reads
     * @param {String} mode
     * @returns {Void}
     */
    restore(mode) {
        this.mode = this.#buttons[mode] ? mode : "light";
        const isDark = this.mode === "dark" || (this.mode === "system" && this.isSystemDark);

        this.#body.classList.toggle("dark-mode", isDark);
        this.#body.classList.toggle("light-mode", !isDark);
        for (const [ name, button ] of Object.entries(this.#buttons)) {
            button.classList.toggle("selected", name === this.mode);
        }
    }
}
