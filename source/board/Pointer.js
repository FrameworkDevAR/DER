import Canvas  from "./Canvas.js";
import Picker  from "./Picker.js";
import Table   from "./Table.js";
import Group   from "./Group.js";
import Utils   from "../core/Utils.js";



/**
 * What the mouse does over the board: scrolling it, drawing a box over it and
 * dragging what is picked. Only one of the three runs at a time
 */
export default class Pointer {

    /** @type {Canvas} */
    #canvas;

    /** @type {Picker} */
    #picker;

    /** @type {HTMLElement} */
    #selector;


    /**
     * Pointer constructor
     * @param {Canvas} canvas
     * @param {Picker} picker
     */
    constructor(canvas, picker) {
        this.#canvas   = canvas;
        this.#picker   = picker;
        this.#selector = document.querySelector(".selector");

        this.isScrolling = false;
        this.isSelecting = false;
        this.isDragging  = false;
        this.isMoving    = false;
        this.startMouse  = null;
        this.startPos    = {};
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
        const top       = this.#canvas.scroll.top  - (currMouse.top  - this.startMouse.top);
        const left      = this.#canvas.scroll.left - (currMouse.left - this.startMouse.left);
        this.startMouse = Utils.getMousePos(event);
        this.#canvas.container.scrollTo(left, top);
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

        this.#picker.unselect();
        for (const table of Object.values(this.#canvas.tables)) {
            if (Utils.intersectsBounds(bounds, table.bounds)) {
                this.#picker.add(table);
            }
        }
        if (this.#picker.hasSelection) {
            this.#picker.stopUnselect();
            this.#picker.trySelectGroup();
            this.#picker.markSelection();
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
        if (addToSelection && this.#picker.isSelected(table)) {
            this.#picker.unselectTable(table);
            return;
        }
        // One that is already picked keeps the selection it is part of, so
        // dragging it drags the rest along, its whole Group included
        if (!this.#picker.isSelected(table)) {
            this.#canvas.scrollToList(table);
            this.#picker.selectTable(table, addToSelection);
        }
        this.startDrag(event);
    }

    /**
     * Picks a Group
     * @param {MouseEvent} event
     * @param {Group}      group
     * @param {Boolean=}   addToSelection
     * @returns {Void}
     */
    pickGroup(event, group, addToSelection = false) {
        if (this.isScrolling || this.isSelecting || this.isDragging) {
            return;
        }
        // A Group that is already picked keeps the others picked with it, so
        // several of them drag at once
        if (!this.#picker.isGroupSelected(group)) {
            this.#picker.selectGroup(group, addToSelection);
        }
        this.#canvas.scrollToList(group);
        this.startDrag(event);
    }

    /**
     * Starts the Drag
     * @param {MouseEvent} event
     * @returns {Void}
     */
    startDrag(event) {
        this.#picker.stopUnselect();
        this.isDragging = true;
        this.startMouse = Utils.getMousePos(event);
        this.startPos   = {};
        for (const selectedTable of this.#picker.selectedTables) {
            this.startPos[selectedTable.name] = selectedTable.pos;
            selectedTable.pick();
        }
        for (const group of this.#picker.selectedGroups) {
            group.pick();
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

        const scale     = this.#canvas.zoom.scale;
        const currMouse = Utils.getMousePos(event);

        for (const selectedTable of this.#picker.selectedTables) {
            const startPos = this.startPos[selectedTable.name];
            selectedTable.translate({
                top  : startPos.top  + (currMouse.top  - this.startMouse.top)  / scale,
                left : startPos.left + (currMouse.left - this.startMouse.left) / scale,
            });
            this.#canvas.reconnect(selectedTable);
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
        for (const selectedTable of this.#picker.selectedTables) {
            selectedTable.drop();
            this.#canvas.reconnect(selectedTable);
        }
        for (const group of this.#picker.selectedGroups) {
            group.drop();
        }
        this.isDragging = false;
        return true;
    }
}
