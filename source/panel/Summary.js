import Table from "../board/Table.js";
import Group from "../board/Group.js";



/**
 * The Aside Summary
 */
export default class Summary {

    /** @type {HTMLElement} */
    #element;
    /** @type {HTMLElement} */
    #text;
    /** @type {HTMLElement} */
    #button;


    /** @type {HTMLElement} */
    #views;
    /** @type {HTMLElement} */
    #menu;
    /** @type {HTMLElement} */
    #footer;


    /**
     * Summary constructor
     */
    constructor() {
        this.#element = document.querySelector(".summary");
        this.#text    = this.#element.querySelector(".summary-text");
        this.#button  = this.#element.querySelector("button");
        this.#views   = document.querySelector(".views");
        this.#menu    = document.querySelector(".menu");
        this.#footer  = document.querySelector(".aside-footer");
    }

    /**
     * Says what is picked, when there is more than one Table in it
     * @param {Table[]} tables
     * @param {Group[]} groups
     * @param {?Group}  group
     * @param {Boolean} inList
     * @returns {Void}
     */
    update(tables, groups, group, inList) {
        if (tables.length < 2) {
            this.#element.classList.remove("visible");
            return;
        }

        const inGroups = groups.length === 1 ? " in one group" : groups.length ? ` in ${groups.length} groups` : "";
        this.#text.innerHTML   = `${tables.length} tables${inGroups}`;
        this.#button.innerHTML = group ? "Edit group" : "Create group";
        this.host(inList);
        this.#element.classList.add("visible");
    }

    /**
     * Puts the bar where the picking is being done
     * @param {Boolean} inList
     * @returns {Void}
     */
    host(inList) {
        this.#element.classList.toggle("in-aside", inList);

        // A selection made out of the list is said in the panel it was made
        // in, above the footer, and one made on the board is said over it
        if (inList) {
            this.#footer.before(this.#element);
            return;
        }
        document.body.appendChild(this.#element);
        this.place();
    }

    /**
     * Keeps the bar clear of the strip of Views
     * @returns {Void}
     */
    place() {
        const gap   = 12;
        const style = this.#element.style;
        const width = this.#element.offsetWidth;
        const views = this.#views.offsetWidth ? this.#views.getBoundingClientRect() : null;
        const menu  = this.#menu.getBoundingClientRect();

        style.removeProperty("--summary-left");
        style.removeProperty("--summary-bottom");

        // Centered, since there is no strip to keep clear of
        if (!views) {
            return;
        }

        // Beside the strip, which grows with every View there is. The bar is
        // centered on where it is put, so it is put at its middle
        const beside = views.right + gap;
        if (beside + width < menu.left - gap) {
            style.setProperty("--summary-left", `${beside + width / 2}px`);
            return;
        }

        // And above it once the strip has grown far enough to leave no room
        style.setProperty("--summary-bottom", `${window.innerHeight - views.top + gap}px`);
    }
}
