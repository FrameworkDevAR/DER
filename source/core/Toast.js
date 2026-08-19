/**
 * The Toast
 */
export default class Toast {

    /** @type {HTMLElement} */
    #element;

    /** @type {Number} */
    #timer = 0;


    /**
     * Toast constructor
     */
    constructor() {
        this.#element = document.querySelector(".toast");
    }

    /**
     * Says the given message for a moment
     * @param {String} message
     * @returns {Void}
     */
    show(message) {
        this.#element.innerHTML = message;
        this.#element.classList.add("visible");

        if (this.#timer) {
            window.clearTimeout(this.#timer);
        }
        this.#timer = window.setTimeout(() => {
            this.#element.classList.remove("visible");
            this.#timer = 0;
        }, 2400);
    }
}
