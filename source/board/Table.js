import Field   from "./Field.js";
import Link    from "./Link.js";
import Group   from "./Group.js";
import Options from "../core/Options.js";
import Utils   from "../core/Utils.js";



/**
 * The Schema Table
 */
export default class Table {

    /** @type {Field[]} */
    #fields = [];

    /** @type {Link[]} */
    links = [];

    /** @type {Group} */
    group = null;

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
    /** @type {HTMLElement} */
    #listButton;

    /** @type {HTMLElement} */
    #canvasElem;
    /** @type {HTMLElement} */
    #canvasList;
    /** @type {HTMLElement} */
    #hiddenElem;
    /** @type {HTMLElement} */
    #listHiddenElem;
    /** @type {Number} */
    #hiddenFields;



    /**
     * Schema Table constructor
     * @param {String} name
     * @param {Object} data
     */
    constructor(name, data) {
        this.name        = name;
        this.data        = data;
        this.description = data.description || "";

        this.#onList    = false;
        this.showOnList = false;
        this.isExpanded = false;

        this.onCanvas   = false;
        this.top        = 0;
        this.left       = 0;
        this.maxFields   = 15;
        this.showAll     = false;
        this.showAllList = false;
        this.fieldsTop   = Options.HEADER_HEIGHT;

        this.setFields();
        this.setLinks();
    }

    /**
     * Destroys the Table
     * @returns {Void}
     */
    destroy() {
        this.removeFromCanvas();
        this.removeFromList();
        this.reset();
    }

    /**
     * Rests the Table data
     * @returns {Void}
     */
    reset() {
        this.onCanvas  = false;
        this.top       = 0;
        this.left      = 0;
        this.maxFields   = 15;
        this.showAll     = false;
        this.showAllList = false;
        this.fieldsTop   = Options.HEADER_HEIGHT;
    }

    /**
     * Restores the Table data
     * @param {Object} data
     * @returns {Void}
     */
    restore(data) {
        this.onCanvas = data.onCanvas;
        this.top      = data.top;
        this.left     = data.left;
        this.showAll  = data.showAll;
    }



    /**
     * Returns the Table Position
     * @returns {{top: Number, left: Number}}
     */
    get pos() {
        return { top : this.top, left : this.left };
    }

    /**
     * Returns the Table Bounds
     * @returns {{top: Number, left: Number, bottom: Number, right: Number}}
     */
    get bounds() {
        return this.#canvasElem.getBoundingClientRect();
    }

    /**
     * Returns the Field with the given Name
     * @param {String} name
     * @returns {Field}
     */
    getField(name) {
        return this.#fields.find((field) => field.name === name);
    }

    /**
     * Returns the Field index with the given Name
     * @param {String} name
     * @returns {Number}
     */
    getFieldIndex(name) {
        const index = this.#fields.findIndex((field) => field.name === name);
        return (index > this.maxFields && !this.showAll) ? this.maxFields : index;
    }



    /**
     * Sets the Fields
     * @returns {Void}
     */
    setFields() {
        if (!this.data.fields) {
            return;
        }

        // The Schema writes every column, the timestamps and the deletion
        // among them, so there is nothing left to add here
        let index = 0;
        for (const { name, type, length, isPrimary, isKey } of this.data.fields) {
            this.#fields.push(new Field(index, name, type, length, isPrimary, isKey));
            index++;
        }
    }

    /**
     * Sets the Links using the Foreigns data, which is every relation the
     * Schema has, the ones to the user that created a row included
     * @returns {Void}
     */
    setLinks() {
        for (const { fromField, toTable, toField } of this.data.foreigns || []) {
            this.links.push(new Link(this.name, fromField, toTable, toField));
        }

        for (const link of this.links) {
            for (const field of this.#fields) {
                if (link.fromFieldName === field.name) {
                    field.hasLink = true;
                }
            }
        }
    }



    /**
     * Adds the Table to the List
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
            this.restoreExpanded();
        }
        container.appendChild(this.#listElem);
    }

    /**
     * Removes the Group from the List
     * @returns {Void}
     */
    removeFromList() {
        if (!this.#onList) {
            return;
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
        this.#listButton = document.createElement("button");

        this.#listElem.className        = "schema-table";
        this.#listInner.className       = "schema-item";
        this.#listInner.dataset.table   = this.name;
        this.#listInner.title           = this.description;

        this.#listArrow.href            = "#";
        this.#listArrow.className       = "arrow";
        this.#listArrow.dataset.action  = "expand-table";
        this.#listArrow.dataset.table   = this.name;

        this.#listText.className        = "schema-text";
        this.#listText.innerHTML        = this.name;

        this.#listCount.className       = "schema-count";
        this.#listCount.innerHTML       = String(this.#fields.length);

        this.#listButton.className      = "btn btn-small";
        this.#listButton.dataset.table  = this.name;
        this.#listButton.dataset.tipTop = "";

        // The row tells what the Table is about in a title of its own, which
        // would show through the button on top of the tip the button has
        this.#listButton.title          = "";

        this.#listInner.dataset.action = "select-list-table";
        this.setListButton();

        this.#listElem.appendChild(this.#listInner);
        this.#listInner.appendChild(this.#listArrow);
        this.#listInner.appendChild(this.#listText);
        this.#listInner.appendChild(this.#listCount);
        this.#listInner.appendChild(this.#listButton);
    }

    /**
     * Sets the List button to add the Table or to take it off the Canvas
     * @returns {Void}
     */
    setListButton() {
        const title = this.onCanvas ? "Remove from board" : "Add to board";

        this.#listButton.dataset.tip    = title;
        this.#listButton.ariaLabel      = title;
        this.#listButton.dataset.action = this.onCanvas ? "remove-table" : "add-table";
        this.#listButton.classList.toggle("btn-placed", this.onCanvas);
    }

    /**
     * Shows the List Element
     * @returns {Void}
     */
    showInList() {
        this.showOnList = true;
        this.#listElem.style.display = "block";
    }

    /**
     * Hides the List Element
     * @returns {Void}
     */
    hideInList() {
        this.showOnList = false;
        this.#listElem.style.display = "none";
    }



    /**
     * Toggles the List expanded
     * @returns {Void}
     */
    toggleExpand() {
        if (!this.expandElem) {
            this.createExpandElem();
        }
        this.isExpanded = !this.isExpanded;
        this.#listElem.classList.toggle("expanded", this.isExpanded);
    }

    /**
     * Restores the List expanded
     * @returns {Void}
     */
    restoreExpanded() {
        if (this.isExpanded) {
            this.createExpandElem();
            this.#listElem.classList.add("expanded");
        }
    }

    /**
     * Creates the Expand element
     * @returns {Void}
     */
    createExpandElem() {
        this.expandElem = document.createElement("ol");

        // The list shows as much of the Table as the board does, and hides
        // the rest behind the same line
        for (const [ index, field ] of this.#fields.entries()) {
            const isHidden = !this.showAllList && index >= this.maxFields;
            this.expandElem.appendChild(field.createListElem(isHidden));
        }

        if (this.#fields.length > this.maxFields) {
            this.#listHiddenElem = this.createHiddenButton("toggle-list-fields", this.listHiddenText);
            this.expandElem.appendChild(this.#listHiddenElem.parentElement);
        }

        this.#listElem.appendChild(this.expandElem);
    }

    /**
     * Creates the button that opens and closes the fields the Table hides,
     * inside the row it takes so it keeps the rhythm of the ones above it
     * @param {String} action
     * @param {String} text
     * @returns {HTMLElement}
     */
    createHiddenButton(action, text) {
        const elem = document.createElement("li");
        elem.className = "schema-hidden";

        const button = document.createElement("button");
        button.className      = "btn btn-tiny btn-hidden";
        button.innerHTML      = text;
        button.dataset.action = action;
        button.dataset.table  = this.name;

        elem.appendChild(button);
        return button;
    }


    /**
     * Returns true if the given Field alone tells one row of the Table from
     * another, which is what makes the Table hold one row of what it points at
     * @param {Field} field
     * @returns {Boolean}
     */
    isOneRow(field) {
        return field.isPrimary && this.#fields.filter((one) => one.isPrimary).length === 1;
    }

    /**
     * Returns true if the Table keeps fields back behind its button
     * @returns {Boolean}
     */
    get hasHiddenFields() {
        return this.#fields.length > this.maxFields;
    }

    /**
     * Returns the text of the line that hides the rest of the fields
     * @returns {String}
     */
    get listHiddenText() {
        const amount = this.#fields.length - this.maxFields;
        return this.showAllList ? "Hide fields" : `+${amount} hidden fields`;
    }

    /**
     * Toggles the fields the List hides
     * @returns {Void}
     */
    toggleListFields() {
        this.showAllList = !this.showAllList;

        for (const [ index, field ] of this.#fields.entries()) {
            if (index >= this.maxFields) {
                field.toggleListVisibility(!this.showAllList);
            }
        }
        this.#listHiddenElem.innerHTML = this.listHiddenText;
    }



    /**
     * Adds the Table to the Canvas
     * @param {HTMLElement} canvas
     * @param {HTMLElement} container
     * @param {Number}      mult
     * @param {Number=}     asideWidth
     * @returns {Void}
     */
    addToCanvas(canvas, container, mult, asideWidth = 0) {
        this.onCanvas = true;
        this.setListButton();
        if (this.group) {
            this.group.setListButton();
        }

        if (!this.#canvasElem) {
            this.createCanvasElem();
        }
        canvas.appendChild(this.#canvasElem);
        this.setBounds();

        if (!this.top && !this.left) {
            if (this.group && this.group.onCanvas) {
                this.translate({
                    top  : this.group.top  + this.group.height / 2 - this.height / 2,
                    left : this.group.left + this.group.width  / 2 - this.width  / 2,
                });
                this.scrollCanvasIntoView();
            } else {
                // Centered on what the Aside leaves free, not on the window,
                // or half of the Table lands under the panel
                const canvasBounds = canvas.getBoundingClientRect();
                const contBounds   = container.getBoundingClientRect();
                const freeWidth    = contBounds.width - asideWidth;

                this.translate({
                    top  : (-canvasBounds.top  + contBounds.height / 2 - this.height / 2) / mult,
                    left : (-canvasBounds.left + asideWidth + freeWidth / 2 - this.width / 2) / mult,
                });
            }
        }
    }

    /**
     * Removes the Table from the Canvas
     * @returns {Void}
     */
    removeFromCanvas() {
        if (!this.onCanvas) {
            return;
        }

        this.onCanvas = false;
        this.setListButton();
        if (this.group) {
            this.group.setListButton();
        }

        Utils.removeElement(this.#canvasElem);
        this.#canvasElem = null;
        this.#canvasList = null;
        this.reset();
    }

    /**
     * Creates the Canvas Element
     * @returns {Void}
     */
    createCanvasElem() {
        this.#canvasElem = document.createElement("div");
        this.#canvasElem.className       = "canvas-table";
        this.#canvasElem.dataset.action  = "select-canvas-table";
        this.#canvasElem.dataset.table   = this.name;
        this.#canvasElem.style.transform = `translate(${this.left}px, ${this.top}px)`;

        const header = document.createElement("header");
        header.dataset.action = "drag-table";
        header.dataset.table  = this.name;

        const name = document.createElement("span");
        name.className = "table-name";
        name.innerHTML = this.name;
        header.appendChild(name);

        const count = document.createElement("span");
        count.className = "table-count";
        count.innerHTML = `${this.#fields.length} cols`;
        header.appendChild(count);

        this.#canvasElem.appendChild(header);

        // What the Table is for, which the Schema only gives for some of them
        if (this.description) {
            const description = document.createElement("p");
            description.className = "table-description";
            description.innerText = this.description;
            this.#canvasElem.appendChild(description);
        }

        const list = document.createElement("ol");
        this.#canvasList = list;
        for (const [ index, field ] of this.#fields.entries()) {
            field.createCanvasElem(list, !this.showAll && index >= this.maxFields);
        }

        if (this.#fields.length > this.maxFields) {
            this.#hiddenFields = this.#fields.length - this.maxFields;

            const text = this.showAll ? "Hide fields" : `+${this.#hiddenFields} hidden fields`;
            this.#hiddenElem = this.createHiddenButton("toggle-fields", text);
            list.appendChild(this.#hiddenElem.parentElement);
        }

        this.#canvasElem.appendChild(list);
    }

    /**
     * Toggle the Visible Fields
     * @returns {Void}
     */
    toggleFields() {
        if (!this.showAll) {
            for (const field of this.#fields) {
                field.toggleVisibility(false);
            }
            this.#hiddenElem.innerHTML = "Hide fields";
            this.showAll = true;
        } else {
            for (const [ index, field ] of this.#fields.entries()) {
                if (index >= this.maxFields) {
                    field.toggleVisibility(true);
                }
            }
            this.#hiddenElem.innerHTML = `+${this.#hiddenFields} hidden fields`;
            this.showAll = false;
        }
        this.setBounds();
    }



    /**
     * Scrolls the List into view
     * @returns {Void}
     */
    scrollListIntoView() {
        // The List only scrolls up and down, and centering sideways drags the
        // whole panel along with a Table that is indented into a Group
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
    scrollCanvasIntoView() {
        this.#canvasElem.scrollIntoView({
            behavior : "smooth",
            block    : "center",
            inline   : "center",
        });
    }

    /**
     * Returns true if a link joins this Table with the given one
     * @param {Table} table
     * @returns {Boolean}
     */
    isLinkedTo(table) {
        if (this.name === table.name) {
            return true;
        }
        for (const link of [ ...this.links, ...table.links ]) {
            if (link.isLinkedTo(this) && link.isLinkedTo(table)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Selects the Table
     * @returns {Void}
     */
    select() {
        this.unselect();

        // One picked from the list without being on the board has only its row
        if (this.#canvasElem) {
            this.#canvasElem.classList.add("selected");
        }
        this.#listElem.classList.add("selected");
    }

    /**
     * Marks the Table in the List, for the ones that are not on the board
     * @returns {Void}
     */
    selectInList() {
        this.#listElem.classList.add("selected");
    }

    /**
     * Fades the Table in the List, for the ones the selection does not touch
     * @param {Boolean} isDimmed
     * @returns {Void}
     */
    dimInList(isDimmed) {
        this.#listElem.classList.toggle("faded", isDimmed);
    }

    /**
     * Disables the Table
     * @returns {Void}
     */
    disable() {
        this.unselect();
        if (this.#canvasElem) {
            this.#canvasElem.classList.add("disabled");
        }
    }

    /**
     * Un-selects the Table
     * @returns {Void}
     */
    unselect() {
        if (this.#canvasElem) {
            this.#canvasElem.classList.remove("selected");
            this.#canvasElem.classList.remove("disabled");
        }
        if (this.#listElem) {
            this.#listElem.classList.remove("selected");
        }
    }

    /**
     * Removes the Table field colors
     * @returns {Void}
     */
    removeColors() {
        // Only the fields of a Table on the board are drawn, and colored
        if (!this.onCanvas) {
            return;
        }
        for (const field of this.#fields) {
            field.removeColor();
        }
    }



    /**
     * Picks the Table
     * @returns {Void}
     */
    pick() {
        this.#canvasElem.classList.add("dragging");
    }

    /**
     * Drops the Table
     * @returns {Void}
     */
    drop() {
        this.#canvasElem.classList.remove("dragging");
    }

    /**
     * Sets the Table Width and Height
     * @returns {Void}
     */
    setBounds() {
        this.width  = this.#canvasElem.offsetWidth;
        this.height = this.#canvasElem.offsetHeight;
        this.right  = this.left + this.width;
        this.bottom = this.top  + this.height;

        // A Link meets the row of its Field, and a description pushes the
        // first row further down than the header alone would
        this.fieldsTop = this.#canvasList ? this.#canvasList.offsetTop : Options.HEADER_HEIGHT;
    }

    /**
     * Translates the Table
     * @param {{top: Number, left: Number}} pos
     * @returns {Void}
     */
    translate(pos) {
        this.top    = Math.round(pos.top);
        this.left   = Math.round(pos.left);
        this.right  = this.left + this.width;
        this.bottom = this.top  + this.height;

        this.#canvasElem.style.transform = `translate(${this.left}px, ${this.top}px)`;
    }
}
