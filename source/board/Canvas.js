import Table   from "./Table.js";
import Link    from "./Link.js";
import Group   from "./Group.js";
import Picker  from "./Picker.js";
import Pointer from "./Pointer.js";
import Zoom    from "./Zoom.js";
import Options from "../core/Options.js";



/**
 * The Canvas
 */
export default class Canvas {

    /** @type {Zoom} */
    zoom;

    /** @type {Picker} */
    picker;

    /** @type {Pointer} */
    pointer;

    /** @type {Object.<String, Table>} */
    #tables = {};

    /** @type {Link[]} */
    #links = [];

    /** @type {Object.<Number, Group>} */
    #groups = {};

    /** @type {HTMLElement} */
    #canvas;
    /** @type {HTMLElement} */
    #linkLayer;
    /** @type {HTMLElement} */
    #container;

    /** @type {DOMRect} */
    #bounds;


    /**
     * Canvas constructor
     */
    constructor() {
        this.#canvas    = document.querySelector(".canvas");
        this.#linkLayer = this.#canvas.querySelector(".canvas-links");
        this.#container = this.#canvas.parentElement;
        this.#bounds    = this.#container.getBoundingClientRect();

        this.zoom       = new Zoom(this.#canvas);
        this.picker     = new Picker(this);
        this.pointer    = new Pointer(this, this.picker);
    }

    /**
     * Returns the Tables on the board, for whoever has to walk them
     * @returns {Object.<String, Table>}
     */
    get tables() {
        return this.#tables;
    }

    /**
     * Returns the Links drawn between them
     * @returns {Link[]}
     */
    get links() {
        return this.#links;
    }

    /**
     * Returns the element the board is scrolled in
     * @returns {HTMLElement}
     */
    get container() {
        return this.#container;
    }

    /**
     * Returns what the board takes up of the window
     * @returns {DOMRect}
     */
    get bounds() {
        return this.#bounds;
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

        this.#tables       = {};
        this.#links        = [];
        this.#groups       = {};

        // What was picked belongs to the board being thrown away, and its
        // Tables are gone from the list by the time anything unselects them
        this.picker.reset();
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
                    this.#linkLayer.appendChild(link.element);
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
        this.picker.forgetGroup(group);
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
        // The Canvas is as wide as it is drawn, so its own size is the whole
        // of what there is to scroll through
        this.#container.scrollTo(
            (this.#canvas.offsetWidth  - this.#container.clientWidth)  / 2,
            (this.#canvas.offsetHeight - this.#container.clientHeight) / 2,
        );
    }

    /**
     * Returns the box every Table and Group of the board sits in, in the
     * coordinates of the Canvas, or null when there is nothing on it
     * @returns {Object?}
     */
    get boardBounds() {
        return this.getBounds([ ...Object.values(this.#tables), ...Object.values(this.#groups) ]);
    }

    /**
     * Returns the box what is picked sits in, or null when nothing is
     * @returns {Object?}
     */
    get pickedBounds() {
        // A Table picked from the list has no card on the board to be shown
        return this.getBounds([ ...this.picker.canvasTables, ...this.picker.selectedGroups ]);
    }

    /**
     * Returns the box the given Tables and Groups sit in
     * @param {(Table|Group)[]} items
     * @returns {Object?}
     */
    getBounds(items) {
        if (!items.length) {
            return null;
        }

        const top    = Math.min(...items.map((item) => item.top));
        const left   = Math.min(...items.map((item) => item.left));
        const bottom = Math.max(...items.map((item) => item.bottom));
        const right  = Math.max(...items.map((item) => item.right));
        return { top, left, width : right - left, height : bottom - top };
    }

    /**
     * Zooms out until the given box is on screen, and puts it in the middle
     * of what the Aside leaves free. It never zooms past its own size, since
     * a board of two Tables blown up says no more than one that is not
     * @param {Object?} bounds
     * @returns {Number}
     */
    fitBoard(bounds) {
        const gap = 60;
        if (!bounds) {
            return this.zoom.percent * Options.DEFAULT_ZOOM;
        }

        const freeWidth = this.#container.clientWidth - this.asideWidth;
        const height    = this.#container.clientHeight;
        const value     = Math.min(
            (freeWidth - gap) / bounds.width,
            (height - gap) / bounds.height,
            1,
        ) * Options.DEFAULT_ZOOM;

        const result = this.zoom.setValue(value);
        const scale  = this.zoom.scale;
        this.#container.scrollTo({
            left     : (bounds.left + bounds.width  / 2) * scale - this.asideWidth - freeWidth / 2,
            top      : (bounds.top  + bounds.height / 2) * scale - height / 2,
            behavior : "smooth",
        });
        return result;
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
     * Shows the given Group
     * @param {Group}    group
     * @param {Boolean=} addToSelection
     * @returns {Void}
     */
    showGroup(group, addToSelection = false) {
        // Adding to the selection leaves the board where it is, and a Group
        // with nothing on the board has nowhere to scroll to
        if (!addToSelection && !group.isEmptyInCanvas) {
            this.scrollToGroup(group);
        }
        this.picker.selectGroup(group, addToSelection);
    }

    /**
     * Scrolls the Canvas to the given Group, centered on what the Aside leaves
     * free, and on its top left corner when it is too big to be centered
     * @param {Group} group
     * @returns {Void}
     */
    scrollToGroup(group) {
        if (this.isAsideHidden) {
            return;
        }

        const gap       = 40;
        const scale     = this.zoom.scale;
        const freeWidth = this.#container.clientWidth - this.asideWidth;
        const height    = this.#container.clientHeight;

        // Centering a Group that does not fit hides both of its ends, and the
        // corner is the one that says which Group it is
        const left = group.width * scale > freeWidth
            ? group.left * scale - this.asideWidth - gap
            : (group.left + group.width / 2) * scale - this.asideWidth - freeWidth / 2;
        const top = group.height * scale > height
            ? group.top * scale - gap
            : (group.top + group.height / 2) * scale - height / 2;

        this.#container.scrollTo({ left, top, behavior : "smooth" });
    }
}
