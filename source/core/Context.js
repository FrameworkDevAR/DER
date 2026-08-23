/**
 * What can be done with whatever was right clicked, listed where it was
 */
export default class Context {

    /** @type {HTMLElement} */
    #element;


    /**
     * Context constructor
     */
    constructor() {
        this.#element = document.querySelector(".context");
    }

    /**
     * Returns true if the menu is showing
     * @returns {Boolean}
     */
    get isOpen() {
        return this.#element.classList.contains("visible");
    }

    /**
     * Returns true if the given Target is part of the menu
     * @param {EventTarget} target
     * @returns {Boolean}
     */
    contains(target) {
        return target instanceof Node && this.#element.contains(target);
    }

    /**
     * Lists the given Items where the mouse was, under the name of whatever
     * they are about
     * @param {MouseEvent} event
     * @param {String}     title
     * @param {Object[]}   items
     * @returns {Void}
     */
    open(event, title, items) {
        this.close();
        this.#element.innerHTML = "";
        this.#element.appendChild(this.createTitle(title));

        for (const item of items) {
            this.#element.appendChild(item ? this.createItem(item) : document.createElement("hr"));
        }

        // It is shown before it is placed, since a menu with nothing to show
        // has no size to put anywhere
        this.#element.classList.add("visible");
        this.place(event.clientX, event.clientY);
    }

    /**
     * Creates the name the menu is about
     * @param {String} title
     * @returns {HTMLElement}
     */
    createTitle(title) {
        const element = document.createElement("div");

        element.className = "context-title";
        element.innerHTML = title;
        return element;
    }

    /**
     * Creates one line of the menu, which the click handler reads as any other
     * @param {Object} item
     * @returns {HTMLElement}
     */
    createItem(item) {
        const element = document.createElement("a");
        const icon    = document.createElement("i");

        element.href           = "#";
        element.className      = item.isRemove ? "context-item context-remove" : "context-item";
        element.dataset.action = item.action;

        icon.className = "svg-icon";
        icon.style.setProperty("--icon-image", `var(--${item.icon}-icon)`);
        element.appendChild(icon);
        element.appendChild(document.createTextNode(item.text));

        if (item.table) {
            element.dataset.table = item.table;
        }
        if (item.group) {
            element.dataset.group = item.group;
        }
        if (item.view) {
            element.dataset.view = item.view;
        }
        return element;
    }

    /**
     * Puts the menu at the pointer
     * @param {Number} x
     * @param {Number} y
     * @returns {Void}
     */
    place(x, y) {
        const edge   = 8;
        const width  = this.#element.offsetWidth;
        const height = this.#element.offsetHeight;

        // It falls down and to the right of the pointer, and back over it at
        // the ends of the window, the way a menu does
        const left = x + width  + edge > window.innerWidth  ? x - width  : x;
        const top  = y + height + edge > window.innerHeight ? y - height : y;

        this.#element.style.setProperty("--context-left", `${Math.max(left, edge)}px`);
        this.#element.style.setProperty("--context-top", `${Math.max(top, edge)}px`);
    }

    /**
     * Takes the menu away
     * @returns {Void}
     */
    close() {
        this.#element.classList.remove("visible");
    }
}
