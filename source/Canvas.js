import Table   from "./Table.js";
import Link    from "./Link.js";
import Group   from "./Group.js";
import Zoom    from "./Zoom.js";
import Options from "./Options.js";
import Utils   from "./Utils.js";



/**
 * The Canvas
 */
export default class Canvas {

    /** @type {Zoom} */
    zoom;

    /** @type {Object.<String, Table>} */
    #tables = {};

    /** @type {Object.<String, Table>} */
    #schemaTables = {};

    /** @type {Link[]} */
    #links = [];

    /** @type {Object.<Number, Group>} */
    #groups = {};

    /** @type {HTMLElement} */
    #canvas;
    /** @type {HTMLElement} */
    #container;

    /** @type {DOMRect} */
    #bounds;

    /** @type {HTMLElement} */
    #selector;

    /** @type {Object.<String, Table>} */
    selection;


    /**
     * Canvas constructor
     */
    constructor() {
        this.#canvas       = document.querySelector(".canvas");
        this.#container    = this.#canvas.parentElement;
        this.#bounds       = this.#container.getBoundingClientRect();
        this.#selector     = document.querySelector(".selector");

        // Zoom
        this.zoom          = new Zoom(this.#canvas);

        // Scroll
        this.isScrolling   = false;

        // Selection
        this.selection     = {};
        this.selectedGroup = null;
        this.listTable     = null;
        this.isSelecting   = false;
        this.isDragging    = false;
        this.isMoving      = false;
    }

    /**
     * Keeps the Tables of the Schema, to fade in the list the ones the
     * selection does not reach, placed on the board or not
     * @param {Object.<String, Table>} tables
     * @returns {Void}
     */
    setSchemaTables(tables) {
        this.#schemaTables = tables;
    }

    /**
     * Fades in the list every Table that the selection does not touch
     * @returns {Void}
     */
    markListSelection() {
        const selected = this.listTable ? [ this.listTable ] : this.selectedTables;

        for (const table of Object.values(this.#schemaTables)) {
            const isLinked = !selected.length || selected.some((one) => one.isLinkedTo(table));
            table.dimInList(!isLinked);
        }
    }

    /**
     * Returns how much of the window the Aside is taking
     * @returns {Number}
     */
    get asideWidth() {
        return parseFloat(getComputedStyle(document.body).getPropertyValue("--aside-current")) || 0;
    }

    /**
     * Returns true if the Aside is out of the way: it publishes no width when
     * it is collapsed, and then there is no list on screen to scroll
     * @returns {Boolean}
     */
    get isAsideHidden() {
        return this.asideWidth === 0;
    }

    /**
     * Scrolls the List to the given Table or Group, unless the Aside is
     * collapsed, where it would only move a list nobody can see
     * @param {Table|Group} item
     * @returns {Void}
     */
    scrollToList(item) {
        if (!this.isAsideHidden) {
            item.scrollListIntoView();
        }
    }

    /**
     * Returns the amount of Tables on the Canvas
     * @returns {Number}
     */
    get tableCount() {
        return Object.keys(this.#tables).length;
    }

    /**
     * Shows or hides the message of the empty board
     * @param {Boolean} hasSchema
     * @returns {Void}
     */
    setEmpty(hasSchema) {
        document.body.classList.toggle("canvas-is-empty", hasSchema && !this.tableCount);
    }

    /**
     * Destroys the Canvas
     * @returns {Void}
     */
    destroy() {
        for (const link of this.#links) {
            link.destroy();
        }

        this.#tables = {};
        this.#links  = [];
        this.#groups = {};
        this.center();
    }



    /**
     * Returns all the Tables with the given names
     * @param {String[]} tableNames
     * @returns {Object[]}
     */
    getTables(tableNames) {
        const result = [];
        for (const name of tableNames) {
            if (this.#tables[name]) {
                result.push(this.#tables[name]);
            }
        }
        return result;
    }

    /**
     * Adds a Table to the Canvas
     * @param {Table} table
     * @returns {Void}
     */
    addTable(table) {
        this.#tables[table.name] = table;
        table.addToCanvas(this.#canvas, this.#container, this.zoom.percent, this.asideWidth);

        // Adds links to/from the given Table
        for (const toTable of Object.values(this.#tables)) {
            for (const link of toTable.links) {
                if ((toTable.name === table.name && this.#tables[link.toTableName]) || link.toTableName === table.name) {
                    link.create(this.#tables[link.fromTableName], this.#tables[link.toTableName]);
                    this.#links.push(link);
                    this.#canvas.appendChild(link.element);
                }
            }
        }

        // Add the group or position it
        if (table.group) {
            if (!table.group.onCanvas) {
                this.addGroup(table.group);
            } else {
                table.group.position();
            }
        }
    }

    /**
     * Removes a Table from the Canvas
     * @param {Table} table
     * @returns {Void}
     */
    removeTable(table) {
        // Remove the links to/from the table
        for (let i = this.#links.length - 1; i >= 0; i--) {
            const link = this.#links[i];
            if (link.isLinkedTo(table)) {
                link.destroy();
                this.#links.splice(i, 1);
            }
        }

        // Remove the table
        table.removeFromCanvas();
        delete this.#tables[table.name];

        // Remove the group if empty, or position it
        if (table.group) {
            if (table.group.isEmptyInCanvas) {
                this.removeGroup(table.group);
            } else {
                table.group.position();
            }
        }
    }

    /**
     * Adds a Group to the Canvas
     * @param {Group} group
     * @returns {Void}
     */
    addGroup(group) {
        if (!this.#groups[group.id] && !group.isEmpty) {
            this.#groups[group.id] = group;
            group.addToCanvas(this.#canvas);
        }
    }

    /**
     * Removes a Group from the Canvas
     * @param {Group} group
     * @returns {Void}
     */
    removeGroup(group) {
        group.removeFromCanvas();
        delete this.#groups[group.id];
        if (this.selectedGroup && this.selectedGroup.isEqual(group)) {
            this.selectedGroup = null;
        }
    }

    /**
     * Re-connects the Links
     * @param {Table} table
     * @returns {Void}
     */
    reconnect(table) {
        for (const link of this.#links) {
            if (link.isLinkedTo(table)) {
                link.connect();
            }
        }
    }

    /**
     * Re-draws what a Table changes by growing or shrinking: the Links that
     * reach it, and the Group that has to keep holding it
     * @param {Table} table
     * @returns {Void}
     */
    resizeTable(table) {
        this.reconnect(table);
        if (table.group && table.group.onCanvas) {
            table.group.position();
        }
    }

    /**
     * Joins every Link again, after moving a set of Tables at once
     * @returns {Void}
     */
    reconnectAll() {
        for (const link of this.#links) {
            link.connect();
        }
    }



    /**
     * Returns the current scroll
     * @return {{top: Number, left: Number}}
     */
    get scroll() {
        return {
            top  : this.#container.scrollTop,
            left : this.#container.scrollLeft,
        };
    }

    /**
     * Sets the Initial scroll, going back to the middle when there is none
     * @param {?{top: Number, left: Number}} scroll
     * @returns {Void}
     */
    setInitialScroll(scroll) {
        if (scroll && (scroll.top || scroll.left)) {
            this.#container.scrollTo(scroll.left, scroll.top);
        } else {
            this.center();
        }
    }

    /**
     * Scrolls to the middle of the Canvas
     * @returns {Void}
     */
    center() {
        const scale = this.zoom.scale;
        this.#container.scrollTo(
            (this.#canvas.offsetWidth  * scale - this.#container.clientWidth)  / 2,
            (this.#canvas.offsetHeight * scale - this.#container.clientHeight) / 2,
        );
    }

    /**
     * Zooms the Canvas in, out, or back to where it started
     * @param {"in"|"out"|"reset"} action
     * @returns {Number}
     */
    setZoom(action) {
        const oldScale = this.zoom.scale;
        let   value    = 0;

        switch (action) {
        case "in":
            value = this.zoom.increase();
            break;
        case "out":
            value = this.zoom.decrease();
            break;
        default:
            value = this.zoom.reset();
        }

        this.keepCenter(oldScale);
        return value;
    }

    /**
     * Scrolls so that what was at the center of the view is still there. The
     * Canvas grows from its top left corner, so a point of it sits at its own
     * place times the scale, and the scroll has to follow by the same amount
     * @param {Number} oldScale
     * @returns {Void}
     */
    keepCenter(oldScale) {
        const ratio = this.zoom.scale / oldScale;
        if (ratio === 1) {
            return;
        }

        const width  = this.#container.clientWidth;
        const height = this.#container.clientHeight;
        this.#container.scrollTo(
            (this.#container.scrollLeft + width  / 2) * ratio - width  / 2,
            (this.#container.scrollTop  + height / 2) * ratio - height / 2,
        );
    }



    /**
     * Picks the Scroll
     * @param {MouseEvent} event
     * @returns {Void}
     */
    pickScroll(event) {
        if (this.isScrolling || this.isSelecting || this.isDragging) {
            return;
        }
        this.isScrolling = true;
        this.startMouse  = Utils.getMousePos(event);
    }

    /**
     * Drags the Scroll
     * @param {MouseEvent} event
     * @returns {Boolean}
     */
    dragScroll(event) {
        if (!this.isScrolling) {
            return false;
        }
        const currMouse = Utils.getMousePos(event);
        const top       = this.scroll.top  - (currMouse.top  - this.startMouse.top);
        const left      = this.scroll.left - (currMouse.left - this.startMouse.left);
        this.startMouse = Utils.getMousePos(event);
        this.#container.scrollTo(left, top);
        return true;
    }

    /**
     * Drops the Scroll
     * @returns {Boolean}
     */
    dropScroll() {
        if (!this.isScrolling) {
            return false;
        }
        this.isScrolling = false;
        return true;
    }



    /**
     * Returns true if there are Selected Tables
     * @returns {Boolean}
     */
    get hasSelection() {
        return Object.values(this.selection).length > 0;
    }

    /**
     * Returns the Selected Tables
     * @returns {Table[]}
     */
    get selectedTables() {
        return Object.values(this.selection);
    }

    /**
     * Returns the Selected Group or the Group of the selected Tables
     * @returns {?Group}
     */
    get currentGroup() {
        let result = null;
        if (this.selectedGroup) {
            return this.selectedGroup;
        }
        if (this.hasSelection) {
            for (const table of this.selectedTables) {
                if (table.group) {
                    if (!result) {
                        result = table.group;
                    } else if (!result.isEqual(table.group)) {
                        return null;
                    }
                }
            }
        }
        return result;
    }

    /**
     * Stops the unselect
     * @returns {Void}
     */
    stopUnselect() {
        this.dontUnselect = true;
    }

    /**
     * Returns true if the tables should unselect
     * @param {MouseEvent} event
     * @returns {Boolean}
     */
    shouldUnselect(event) {
        if (this.dontUnselect) {
            this.dontUnselect = false;
            return false;
        }

        const target = Utils.getClosest(event, "aside", "backdrop", "zoom");
        if (target) {
            return false;
        }

        const mouse = Utils.getMousePos(event);
        return Utils.inBounds(mouse, this.#bounds);
    }

    /**
     * Selects the given Table from the List
     * @param {Table} table
     * @returns {Void}
     */
    selectTableFromList(table, addToSelection = false) {
        if (addToSelection && this.isSelected(table)) {
            this.#unselectTable(table);
            return;
        }
        this.scrollToTable(table);
        this.#selectTable(table, addToSelection);
    }

    /**
     * Returns true if the given Table is part of the selection
     * @param {Table} table
     * @returns {Boolean}
     */
    isSelected(table) {
        return Boolean(this.selection[table.name]);
    }

    /**
     * Returns true if the given Group is the selected one
     * @param {Group} group
     * @returns {Boolean}
     */
    isGroupSelected(group) {
        return Boolean(this.selectedGroup) && this.selectedGroup.isEqual(group);
    }

    /**
     * Selects a Table that is not on the Canvas: nothing to select there, so
     * the board only dims what the Table does not reach
     * @param {Table} table
     * @returns {Void}
     */
    selectTableOffCanvas(table) {
        this.unselect();
        this.stopUnselect();

        for (const other of Object.values(this.#tables)) {
            if (!table.isLinkedTo(other)) {
                other.disable();
            }
        }
        table.selectInList();
        this.listTable = table;
        this.markListSelection();
    }

    /**
     * Scrolls the Canvas to the given Table, centered on what the Aside
     * leaves free rather than on the whole window
     * @param {Table} table
     * @returns {Void}
     */
    scrollToTable(table) {
        if (this.isAsideHidden) {
            return;
        }

        const scale     = this.zoom.scale;
        const freeWidth = this.#container.clientWidth - this.asideWidth;

        this.#container.scrollTo({
            left     : (table.left + table.width  / 2) * scale - this.asideWidth - freeWidth / 2,
            top      : (table.top  + table.height / 2) * scale - this.#container.clientHeight / 2,
            behavior : "smooth",
        });
    }

    /**
     * Selects the given Table from the Canvas
     * @param {Table}    table
     * @param {Boolean=} addToSelection
     * @returns {Void}
     */
    selectTableFromCanvas(table, addToSelection = false) {
        if (addToSelection && this.isSelected(table)) {
            this.#unselectTable(table);
            return;
        }

        // The Group it belongs to is opened by whoever asked for the selection,
        // so the row is on screen and there is no need to mark the Group instead
        this.scrollToList(table);
        this.#selectTable(table, addToSelection);
    }

    /**
     * Selects the given Table internally
     * @param {Table}    table
     * @param {Boolean=} addToSelection
     * @returns {Void}
     */
    #selectTable(table, addToSelection = false) {
        this.stopUnselect();
        if (!addToSelection) {
            this.unselect();
        }
        this.selection[table.name] = table;
        this.trySelectGroup();
        this.markSelection();
    }

    /**
     * Takes the given Table out of the selection, leaving the rest of it alone
     * @param {Table} table
     * @returns {Void}
     */
    #unselectTable(table) {
        this.stopUnselect();

        // The last one out takes the whole selection with it, so that nothing
        // is left dimmed with no Table selected
        if (this.selectedTables.length <= 1) {
            this.unselect();
            return;
        }

        delete this.selection[table.name];
        table.unselect();
        table.removeColors();
        this.trySelectGroup();
        this.markSelection();
    }

    /**
     * Shows the given Group
     * @param {Group} group
     * @returns {Void}
     */
    showGroup(group) {
        group.scrollCanvasIntoView();
        this.selectGroup(group);
    }

    /**
     * Selects the given Group
     * @param {Group} group
     * @returns {Void}
     */
    selectGroup(group) {
        this.unselect();
        this.selectedGroup = group.select();
        for (const table of group.tables) {
            if (table.onCanvas) {
                this.selection[table.name] = table;
            }
        }
        this.markSelection();
        this.stopUnselect();
    }

    /**
     * Tries to select a group if all the tables are part of it
     * @returns {Void}
     */
    trySelectGroup() {
        this.unselectGroup();
        let group;
        for (const selectedTable of this.selectedTables) {
            if (!selectedTable.group) {
                return;
            }
            if (!group) {
                group = selectedTable.group;
            } else if (!selectedTable.group.isEqual(group)) {
                return;
            }
        }
        if (group.canvasTables.length === this.selectedTables.length) {
            this.selectedGroup = group.select();
        }
    }

    /**
     * Marks the selected Tables
     * @returns {Void}
     */
    markSelection() {
        // Disable all the Tables
        for (const otherTable of Object.values(this.#tables)) {
            otherTable.disable();
            otherTable.removeColors();
        }

        // Disable all the Links
        for (const link of this.#links) {
            link.disable();
        }

        // Add colors to the Links and Fields
        let   lastColor = 0;
        const colors    = {};
        for (const link of this.#links) {
            for (const selectedTable of this.selectedTables) {
                if (link.isLinkedTo(selectedTable)) {
                    const field = link.getFieldName(selectedTable);
                    if (!colors[field]) {
                        colors[field] = lastColor + 1;
                        lastColor     = (lastColor + 1) % Options.COLOR_AMOUNT;
                    }
                    link.toTable.unselect();
                    link.fromTable.unselect();
                    link.fromField.setColor(colors[field]);
                    link.toField.setColor(colors[field]);
                    link.setColor(colors[field]);
                }
            }
        }

        // Select the Table
        for (const selectedTable of this.selectedTables) {
            selectedTable.select();
        }
        this.markListSelection();
    }

    /**
     * Unselects the selected Tables/Group
     * @returns {Void}
     */
    unselect() {
        if (this.listTable) {
            this.listTable.unselect();
            this.listTable = null;
            for (const table of Object.values(this.#tables)) {
                table.unselect();
            }
        }
        if (!this.hasSelection) {
            this.markListSelection();
            return;
        }
        for (const table of Object.values(this.#tables)) {
            table.unselect();
            table.removeColors();
        }
        for (const link of this.#links) {
            link.unselect();
        }
        this.selection = {};
        this.unselectGroup();
        this.markListSelection();
    }

    /**
     * Unselects the selected Group
     * @returns {Void}
     */
    unselectGroup() {
        if (this.selectedGroup) {
            this.selectedGroup = this.selectedGroup.unselect();
        }
    }



    /**
     * Picks the Selector
     * @param {MouseEvent} event
     * @returns {Void}
     */
    pickSelector(event) {
        if (this.isScrolling || this.isSelecting || this.isDragging) {
            return;
        }
        this.isSelecting = true;
        this.isMoving    = false;
        this.startMouse  = Utils.getMousePos(event);
    }

    /**
     * Drags the Selector
     * @param {MouseEvent} event
     * @returns {Boolean}
     */
    dragSelector(event) {
        if (!this.isSelecting) {
            return false;
        }
        const currMouse = Utils.getMousePos(event);
        if (!this.isMoving) {
            if (Utils.dist(this.startMouse, currMouse) < 20) {
                return true;
            }
            this.isMoving = true;
            this.#selector.style.display = "block";
        }
        const bounds = Utils.createBounds(this.startMouse, currMouse);
        this.#selector.style.top    = `${bounds.top}px`;
        this.#selector.style.left   = `${bounds.left}px`;
        this.#selector.style.width  = `${bounds.width}px`;
        this.#selector.style.height = `${bounds.height}px`;
        return true;
    }

    /**
     * Drops the Selector
     * @param {MouseEvent} event
     * @returns {Boolean}
     */
    dropSelector(event) {
        if (!this.isSelecting) {
            return false;
        }
        this.isSelecting = false;
        if (!this.isMoving) {
            return false;
        }

        this.isMoving = false;
        this.#selector.style.display = "none";

        const currMouse = Utils.getMousePos(event);
        const bounds    = Utils.createBounds(this.startMouse, currMouse);

        this.unselect();
        for (const table of Object.values(this.#tables)) {
            if (Utils.intersectsBounds(bounds, table.bounds)) {
                this.selection[table.name] = table;
            }
        }
        if (this.hasSelection) {
            this.stopUnselect();
            this.trySelectGroup();
            this.markSelection();
        }
        return true;
    }



    /**
     * Picks a Table
     * @param {MouseEvent} event
     * @param {Table}      table
     * @param {Boolean=}   addToSelection
     * @returns {Void}
     */
    pickTable(event, table, addToSelection = false) {
        if (this.isScrolling || this.isSelecting || this.isDragging) {
            return;
        }
        if (addToSelection && this.isSelected(table)) {
            this.#unselectTable(table);
            return;
        }
        // Picking one Table of a selected Group narrows the selection down to
        // it, the whole Group being what its own header is there to pick
        if (!this.isSelected(table) || this.selectedGroup) {
            this.scrollToList(table);
            this.#selectTable(table, addToSelection);
        }
        this.startDrag(event);
    }

    /**
     * Picks a Group
     * @param {MouseEvent} event
     * @param {Group}      group
     * @returns {Void}
     */
    pickGroup(event, group) {
        if (this.isScrolling || this.isSelecting || this.isDragging) {
            return;
        }
        group.pick();
        this.scrollToList(group);
        this.selectGroup(group);
        this.startDrag(event);
    }

    /**
     * Starts the Drag
     * @param {MouseEvent} event
     * @returns {Void}
     */
    startDrag(event) {
        this.stopUnselect();
        this.isDragging = true;
        this.startMouse = Utils.getMousePos(event);
        this.startPos   = {};
        for (const selectedTable of this.selectedTables) {
            this.startPos[selectedTable.name] = selectedTable.pos;
            selectedTable.pick();
        }
    }

    /**
     * Drags the Table
     * @param {MouseEvent} event
     * @returns {Boolean}
     */
    dragTable(event) {
        if (!this.isDragging) {
            return false;
        }

        const scale     = this.zoom.scale;
        const currMouse = Utils.getMousePos(event);

        for (const selectedTable of this.selectedTables) {
            const startPos = this.startPos[selectedTable.name];
            selectedTable.translate({
                top  : startPos.top  + (currMouse.top  - this.startMouse.top)  / scale,
                left : startPos.left + (currMouse.left - this.startMouse.left) / scale,
            });
            this.reconnect(selectedTable);
            if (selectedTable.group) {
                selectedTable.group.position();
            }
        }
        return true;
    }

    /**
     * Drops the Table
     * @returns {Boolean}
     */
    dropTable() {
        if (!this.isDragging) {
            return false;
        }
        for (const selectedTable of this.selectedTables) {
            selectedTable.drop();
            this.reconnect(selectedTable);
        }
        if (this.selectedGroup) {
            this.selectedGroup.drop();
        }
        this.isDragging = false;
        return true;
    }
}
