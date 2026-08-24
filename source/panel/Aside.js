import Options from "../core/Options.js";



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
    /** @type {HTMLElement} */
    #scroll;
    /** @type {HTMLElement} */
    #list;
    /** @type {HTMLElement} */
    #toggle;
    /** @type {HTMLElement} */
    #arrow;

    #fadeAbove = -1;
    #fadeBelow = -1;


    /**
     * Aside constructor
     */
    constructor() {
        this.#aside   = document.querySelector(".aside");
        this.#status  = document.querySelector(".aside-status");
        this.#addAll  = document.querySelector("[data-action='add-all-tables'].btn-tiny");
        this.#clear   = document.querySelector("[data-action='open-clear']");
        this.#scroll  = document.querySelector(".schema-scroll");
        this.#list    = document.querySelector(".schema-list");
        this.#toggle  = document.querySelector(".schema-toggle");
        this.#arrow   = document.querySelector(".aside-arrow");
        this.width    = Options.INITIAL_WIDTH;

        // The fade follows the height of the list as much as the scroll, and
        // the list grows and shrinks with the filter, the Groups and the panel
        const observer = new ResizeObserver(() => this.setListFade());
        observer.observe(this.#list);
        observer.observe(this.#list.querySelector("ol"));

        // What the one button of the filter row would do is the list's own to
        // know, and it changes with a row opening, with the filter, and with
        // the whole list being built again for a Group
        const changes = new MutationObserver(() => this.setListToggle());
        changes.observe(this.#list, { subtree : true, childList : true, attributeFilter : [ "class" ] });

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
        const tip = isCollapsed ? "Open the panel" : "Collapse the panel";

        this.isCollapsed = isCollapsed;
        this.#aside.classList.toggle("aside-collapsed", isCollapsed);
        this.#arrow.dataset.tip = tip;
        this.#arrow.setAttribute("aria-label", tip);
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
     * Tells the rest of the app where the Aside ends, its own offset from the
     * edge included, so whatever sits beside it only adds the gap it wants
     * @returns {Void}
     */
    setCenter() {
        const offset = parseFloat(getComputedStyle(document.body).getPropertyValue("--menu-position")) || 0;
        const edge   = this.isCollapsed ? 0 : offset + this.width;
        document.body.style.setProperty("--aside-current", `${edge}px`);
    }

    /**
     * Says what the one button of the filter row would do to the list
     * @returns {Void}
     */
    setListToggle() {
        // It closes the list while anything in it is open, and opens it once
        // there is nothing left open to close
        const isOpen = Boolean(this.#list.querySelector(".expanded"));
        const tip    = isOpen ? "Close the open rows" : "Open every group";

        this.#toggle.dataset.tip = tip;
        this.#toggle.setAttribute("aria-label", tip);
    }

    /**
     * Fades the end of the list that runs past the panel
     * @returns {Void}
     */
    setListFade() {
        // The rows read as going under the filter and the footer rather than
        // as being cut by them, so each end fades by as much as it hides and
        // never deeper: an end with nothing past it is not faded at all, and a
        // list a few pixels too tall gets those few pixels of it
        const depth  = 20;
        const scroll = Math.max(this.#list.scrollTop, 0);
        const rest   = Math.max(this.#list.scrollHeight - this.#list.clientHeight - scroll, 0);
        const above  = Math.min(scroll, depth);
        const below  = Math.min(rest, depth);

        // The mask is only worth writing when it changes, which is at the ends
        // of the list and not on every frame of a scroll through the middle
        if (above !== this.#fadeAbove) {
            this.#fadeAbove = above;
            this.#scroll.style.setProperty("--fade-above", `${above}px`);
        }
        if (below !== this.#fadeBelow) {
            this.#fadeBelow = below;
            this.#scroll.style.setProperty("--fade-below", `${below}px`);
        }
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
