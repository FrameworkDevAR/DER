import Table from "./Table.js";
import Utils from "./Utils.js";



/**
 * The Schema Group
 */
export default class Group {

    /** @type {Boolean} */
    #onList;

    /** @type {HTMLElement} */
    #listElem;
    /** @type {HTMLElement} */
    #listInner;
    /** @type {HTMLAnchorElement} */
    #listArrow;
    /** @type {HTMLElement} */
    #listText;
    /** @type {HTMLElement} */
    #listCount;
    /** @type {HTMLAnchorElement} */
    #listEdit;
    /** @type {HTMLElement} */
    #listButton;
    /** @type {HTMLElement} */
    #listTables;

    /** @type {HTMLElement} */
    #canvasElem;
    /** @type {HTMLElement} */
    #canvasHeader;



    /**
     * Groups constructor
     * @param {Number}   id
     * @param {String}   name
     * @param {Table[]}  tables
     * @param {Boolean=} isExpanded
     */
    constructor(id, name, tables, isExpanded = true) {
        this.id         = id;
        this.name       = name;
        this.tables     = tables;
        this.padding    = 20;

        this.#onList    = false;
        this.isExpanded = isExpanded;
        this.onCanvas   = false;

        this.setGroup(this);
    }

    /**
     * Updates te Group
     * @param {String}  name
     * @param {Table[]} tables
     * @returns {Void}
     */
    update(name, tables) {
        this.setGroup(null);

        this.name   = name;
        this.tables = tables;

        this.setGroup(this);
        this.setListButton();
        this.setListCount();
        if (!this.isEmptyInCanvas) {
            this.#canvasHeader.innerText = this.name;
            this.position();
        }
    }

    /**
     * Destroys the Group
     * @returns {Void}
     */
    destroy() {
        this.setGroup(null);
        this.removeFromCanvas();
        this.removeFromList();
    }

    /**
     * Sets the Group of the Tables
     * @param {Group?} group
     * @returns {Void}
     */
    setGroup(group) {
        for (const table of this.tables) {
            table.group = group;
        }
    }



    /**
     * Returns true if the group is equal to the given one
     * @param {Group} group
     * @return {Boolean}
     */
    isEqual(group) {
        return this.id === group.id;
    }

    /**
     * Returns true if the group is empty
     * @return {Boolean}
     */
    get isEmpty() {
        return this.tables.length === 0;
    }

    /**
     * Returns true if the group is empty in the canvas
     * @return {Boolean}
     */
    get isEmptyInCanvas() {
        return this.canvasTables.length === 0;
    }

    /**
     * Returns true if every table of the group is in the canvas
     * @return {Boolean}
     */
    get isFullInCanvas() {
        return !this.isEmpty && this.canvasTables.length === this.tables.length;
    }

    /**
     * Returns a list of table names
     * @return {String[]}
     */
    get tableNames() {
        return this.tables.map((table) => table.name);
    }

    /**
     * Returns a list of tables
     * @return {Table[]}
     */
    get canvasTables() {
        return this.tables.filter((table) => table.onCanvas);
    }

    /**
     * Returns true if all the given table appear in the group
     * @param {Table} table
     * @returns {Boolean}
     */
    contains(table) {
        return this.tables.findIndex((elem) => elem.name === table.name) > -1;
    }



    /**
     * Adds the Group to the List
     * @param {HTMLElement} container
     * @returns {Void}
     */
    addToList(container) {
        if (this.#onList) {
            return;
        }
        this.#onList = true;
        if (!this.#listElem) {
            this.createListElem();
        }
        container.appendChild(this.#listElem);
        for (const table of this.tables) {
            table.addToList(this.#listTables);
        }
        this.#listElem.classList.toggle("expanded", this.isExpanded);
    }

    /**
     * Removes the Group from the List
     * @returns {Void}
     */
    removeFromList() {
        if (!this.#onList) {
            return;
        }
        for (const table of this.tables) {
            table.removeFromList();
        }
        Utils.removeElement(this.#listElem);
        this.#onList   = false;
        this.#listElem = null;
    }

    /**
     * Creates the List Element
     * @returns {Void}
     */
    createListElem() {
        this.#listElem   = document.createElement("li");
        this.#listInner  = document.createElement("div");
        this.#listArrow  = document.createElement("a");
        this.#listText   = document.createElement("span");
        this.#listCount  = document.createElement("span");
        this.#listEdit   = document.createElement("a");
        this.#listButton = document.createElement("button");
        this.#listTables = document.createElement("ol");

        this.#listElem.className        = "schema-group";
        this.#listInner.className       = "schema-item";
        this.#listInner.dataset.group   = String(this.id);

        this.#listArrow.href            = "#";
        this.#listArrow.className       = "arrow";
        this.#listArrow.dataset.action  = "expand-group";
        this.#listArrow.dataset.group   = String(this.id);

        this.#listText.className        = "schema-text";
        this.#listText.innerHTML        = this.name;

        this.#listCount.className       = "schema-count";

        this.#listEdit.href             = "#";
        this.#listEdit.className        = "btn btn-small schema-edit";
        this.#listEdit.title            = "Edit the group";
        this.#listEdit.dataset.action   = "edit-group";
        this.#listEdit.dataset.group    = String(this.id);

        this.#listButton.className      = "btn btn-small";
        this.#listButton.dataset.group  = String(this.id);

        this.setListAction();
        this.setListButton();
        this.setListCount();

        this.#listElem.appendChild(this.#listInner);
        this.#listElem.appendChild(this.#listTables);

        this.#listInner.appendChild(this.#listArrow);
        this.#listInner.appendChild(this.#listText);
        this.#listInner.appendChild(this.#listCount);
        this.#listInner.appendChild(this.#listEdit);
        this.#listInner.appendChild(this.#listButton);
    }

    /**
     * Sets how many Tables the Group gathers
     * @returns {Void}
     */
    setListCount() {
        if (this.#listCount) {
            this.#listCount.innerHTML = String(this.tables.length);
        }
    }

    /**
     * Sets what a click on the row does, since a Group that is not on the
     * board has nothing to show there and just opens to let its Tables be seen
     * @returns {Void}
     */
    setListAction() {
        if (this.#listInner) {
            this.#listInner.dataset.action = this.onCanvas ? "show-group" : "expand-group";
        }
    }

    /**
     * Sets the List button to put the whole Group on the board or take it off
     * @returns {Void}
     */
    setListButton() {
        if (!this.#listButton) {
            return;
        }

        const isPlaced = this.isFullInCanvas;
        const title    = isPlaced ? "Remove the group from the board" : "Add the group to the board";

        this.#listButton.title          = title;
        this.#listButton.ariaLabel      = title;
        this.#listButton.dataset.action = isPlaced ? "remove-group-tables" : "add-group-tables";
        this.#listButton.classList.toggle("btn-placed", isPlaced);
    }

    /**
     * Toggles the List expanded
     * @returns {Void}
     */
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        this.#listElem.classList.toggle("expanded", this.isExpanded);
    }

    /**
     * Sets the List Element visibility
     * @returns {Void}
     */
    setListVisibility() {
        const tables = this.tables.filter((table) => table.showOnList);
        this.#listElem.style.display = !tables.length ? "none" : "block";
    }



    /**
     * Adds the Group to the Canvas
     * @param {HTMLElement} container
     * @returns {Void}
     */
    addToCanvas(container) {
        this.onCanvas = true;
        this.setListAction();

        if (!this.#canvasElem) {
            this.createCanvasElem();
        }
        container.appendChild(this.#canvasElem);
        this.position();
    }

    /**
     * Removes the Group from the Canvas
     * @returns {Void}
     */
    removeFromCanvas() {
        if (!this.onCanvas) {
            return;
        }
        this.onCanvas = false;
        this.setListAction();

        Utils.removeElement(this.#canvasElem);
        this.#canvasElem = null;
    }

    /**
     * Creates the Canvas Element
     * @returns {Void}
     */
    createCanvasElem() {
        this.#canvasElem = document.createElement("div");
        this.#canvasElem.className = "group";

        this.#canvasHeader = document.createElement("header");
        this.#canvasHeader.innerHTML      = this.name;
        this.#canvasHeader.dataset.action = "drag-group";
        this.#canvasHeader.dataset.group  = String(this.id);
        this.#canvasElem.appendChild(this.#canvasHeader);
    }

    /**
     * Positions the HTML element
     * @returns {Void}
     */
    position() {
        this.top    = 0;
        this.left   = 0;
        this.right  = 0;
        this.bottom = 0;

        for (const table of this.canvasTables) {
            if (!this.top || table.top < this.top) {
                this.top = table.top;
            }
            if (!this.left || table.left < this.left) {
                this.left = table.left;
            }
            if (!this.right || table.right > this.right) {
                this.right = table.right;
            }
            if (!this.bottom || table.bottom > this.bottom) {
                this.bottom = table.bottom;
            }
        }

        this.top    -= this.padding;
        this.left   -= this.padding;
        this.right  += this.padding;
        this.bottom += this.padding;
        this.width   = Math.abs(this.right  - this.left);
        this.height  = Math.abs(this.bottom - this.top);

        this.#canvasElem.style.transform = `translate(${this.left}px, ${this.top}px)`;
        this.#canvasElem.style.width     = `${this.width}px`;
        this.#canvasElem.style.height    = `${this.height}px`;
    }



    /**
     * Scrolls the List into view
     * @returns {Void}
     */
    scrollListIntoView() {
        this.#listElem.scrollIntoView({
            behavior : "smooth",
            block    : "center",
            inline   : "nearest",
        });
    }

    /**
     * Scrolls the Canvas into view
     * @returns {Void}
     */
    /**
     * Selects the Canvas Element
     * @returns {Group}
     */
    select() {
        this.#canvasElem.classList.add("selected");
        this.#listElem.classList.add("selected");
        return this;
    }

    /**
     * Unselects the Canvas Element
     * @returns {Null}
     */
    unselect() {
        this.#canvasElem.classList.remove("selected");
        this.#listElem.classList.remove("selected");
        return null;
    }

    /**
     * Picks the Canvas Element
     * @returns {Void}
     */
    pick() {
        this.#canvasElem.classList.add("dragging");
    }

    /**
     * Drops the Canvas Element
     * @returns {Void}
     */
    drop() {
        this.#canvasElem.classList.remove("dragging");
    }
}
