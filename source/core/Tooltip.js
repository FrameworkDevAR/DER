/**
 * The Tooltip
 */
export default class Tooltip {

    /** @type {HTMLElement} */
    #element;

    /** @type {?HTMLElement} */
    #target = null;

    /** @type {Number} */
    #timer = 0;


    /**
     * Tooltip constructor
     */
    constructor() {
        this.#element = document.querySelector(".tooltip");

        // The one bubble of the page is opened the once and left in the top
        // layer, where a panel that hides what overflows it cannot cut the
        // bubble of a button of its own, and nothing drawn later covers it
        this.#element.showPopover();
    }

    /**
     * Takes the tip of whatever the mouse is over, once it has rested on it
     * @param {MouseEvent} event
     * @returns {Void}
     */
    follow(event) {
        /** @type {?HTMLElement} */
        const target = event.target instanceof HTMLElement ? event.target.closest("[data-tip]") : null;
        if (target === this.#target) {
            return;
        }

        this.hide();
        if (!target) {
            return;
        }
        this.#target = target;
        this.#timer  = window.setTimeout(() => this.show(), 500);
    }

    /**
     * Says the tip of the Element the mouse rested on
     * @returns {Void}
     */
    show() {
        this.#timer = 0;
        this.#element.innerHTML = this.#target.dataset.tip;
        this.place();
        this.#element.classList.add("visible");
    }

    /**
     * Takes the bubble away, and forgets whatever it was about to say
     * @returns {Void}
     */
    hide() {
        if (this.#timer) {
            window.clearTimeout(this.#timer);
            this.#timer = 0;
        }
        this.#target = null;
        this.#element.classList.remove("visible");
    }

    /**
     * Puts the bubble beside the Element it is about
     * @returns {Void}
     */
    place() {
        const edge   = 8;
        const space  = 13;
        const style  = this.#element.style;
        const bounds = this.#target.getBoundingClientRect();
        const width  = this.#element.offsetWidth;
        const height = this.#element.offsetHeight;
        const onTop  = this.#target.hasAttribute("data-tip-top");

        this.#element.classList.toggle("at-top", onTop);

        // Over the Element, kept inside the window, with the arrow left on the
        // Element however far the edge of the window pushed the bubble along
        if (onTop) {
            const middle = bounds.left + bounds.width / 2;
            const left   = this.between(middle - width / 2, edge, window.innerWidth - width - edge);
            style.setProperty("--tip-top", `${bounds.top - height - space}px`);
            style.setProperty("--tip-left", `${left}px`);
            style.setProperty("--tip-arrow-x", `${middle - left}px`);
            return;
        }

        // Otherwise to its left, the same way up
        const middle = bounds.top + bounds.height / 2;
        const top    = this.between(middle - height / 2, edge, window.innerHeight - height - edge);
        style.setProperty("--tip-top", `${top}px`);
        style.setProperty("--tip-left", `${bounds.left - width - space}px`);
        style.setProperty("--tip-arrow-y", `${middle - top}px`);
    }

    /**
     * Returns the value, without letting it out of the given bounds
     * @param {Number} value
     * @param {Number} from
     * @param {Number} to
     * @returns {Number}
     */
    between(value, from, to) {
        return Math.min(Math.max(value, from), to);
    }
}
