import Options from "./Options.js";



/**
 * The Aside
 */
export default class Aside {

    /** @type {HTMLElement} */
    #aside;
    /** @type {HTMLElement} */
    #status;
    /** @type {HTMLButtonElement} */
    #addAll;
    /** @type {HTMLButtonElement} */
    #clear;


    /**
     * Aside constructor
     */
    constructor() {
        this.#aside   = document.querySelector(".aside");
        this.#status  = document.querySelector(".aside-status");
        this.#addAll  = document.querySelector("[data-action='add-all-tables'].btn-tiny");
        this.#clear   = document.querySelector("[data-action='clear-board']");
        this.width    = Options.INITIAL_WIDTH;

        this.isCollapsed = false;
        this.isResizing  = false;
        this.startLeft  = 0;
        this.startWidth = 0;
    }

    /**
     * Sets the initial Width
     * @param {Number} width
     * @returns {Void}
     */
    setInitialWidth(width) {
        this.setWidth(width || Options.INITIAL_WIDTH);
    }

    /**
     * Sets the initial collapsed state
     * @param {Boolean} isCollapsed
     * @returns {Void}
     */
    setInitialCollapsed(isCollapsed) {
        this.setCollapsed(isCollapsed);
    }

    /**
     * Toggles the collapse of the Aside
     * @returns {Void}
     */
    toggleCollapse() {
        this.setCollapsed(!this.isCollapsed);
    }

    /**
     * Collapses or expands the Aside
     * @param {Boolean} isCollapsed
     * @returns {Void}
     */
    setCollapsed(isCollapsed) {
        this.isCollapsed = isCollapsed;
        this.#aside.classList.toggle("aside-collapsed", isCollapsed);
        this.setCenter();
    }

    /**
     * Takes the Aside back to the width it starts at
     * @returns {Void}
     */
    resetWidth() {
        this.setWidth(Options.INITIAL_WIDTH);
    }

    /**
     * Sets the Aside width
     * @param {Number} width
     * @returns {Void}
     */
    setWidth(width) {
        this.width = Math.max(width, Options.MIN_WIDTH);

        this.#aside.style.width = `${this.width}px`;
        this.setCenter();
    }

    /**
     * Tells the rest of the app how much of the window the Aside is taking,
     * so the empty board can center itself on what is left
     * @returns {Void}
     */
    setCenter() {
        const width = this.isCollapsed ? 0 : this.width;
        document.body.style.setProperty("--aside-current", `${width}px`);
    }

    /**
     * Shows how much of the Schema is on the Canvas
     * @param {Number} amount
     * @param {Number} total
     * @returns {Void}
     */
    setStatus(amount, total) {
        this.#status.innerHTML = total ? `${amount} of ${total} on board` : "";

        // Both buttons are always there, and the one with nothing to do says
        // so rather than disappearing
        this.#addAll.style.display = total ? "block" : "none";
        this.#clear.style.display  = total ? "block" : "none";
        this.#addAll.disabled      = amount === total;
        this.#clear.disabled       = amount === 0;
    }



    /**
     * Picks the Resizer
     * @param {MouseEvent} event
     * @returns {Void}
     */
    pickResizer(event) {
        this.isResizing = true;
        this.startLeft  = event.pageX;
        this.startWidth = this.width;
        this.#aside.classList.add("aside-dragging");
    }

    /**
     * Drags the Resizer
     * @param {MouseEvent} event
     * @returns {Boolean}
     */
    dragResizer(event) {
        if (!this.isResizing) {
            return false;
        }
        this.setWidth(this.startWidth + (event.pageX - this.startLeft));
        return true;
    }

    /**
     * Drops the Resizer
     * @returns {Boolean}
     */
    dropResizer() {
        if (!this.isResizing) {
            return false;
        }
        this.isResizing = false;
        window.setTimeout(() => {
            this.#aside.classList.remove("aside-dragging");
        }, 50);
        return true;
    }
}
