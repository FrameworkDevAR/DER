import Canvas  from "./Canvas.js";
import Table   from "./Table.js";
import Group   from "./Group.js";
import Options from "../core/Options.js";
import Utils   from "../core/Utils.js";



/**
 * What the board has picked: the Tables, the Groups they add up to, and the
 * one Table of the list that is looked at without being on the board
 */
export default class Picker {

    /** @type {Canvas} */
    #canvas;

    /** @type {Object.<String, Table>} */
    #schemaTables = {};

    /** @type {Object.<String, Table>} */
    selection;

    /** @type {Group[]} */
    selectedGroups;

    /** @type {?Table} */
    listTable;


    /**
     * Picker constructor
     * @param {Canvas} canvas
     */
    constructor(canvas) {
        this.#canvas = canvas;
        this.reset();
    }

    /**
     * Forgets what was picked, which belongs to the board being thrown away
     * @returns {Void}
     */
    reset() {
        this.selection      = {};
        this.selectedGroups = [];
        this.listTable      = null;
        this.dontUnselect   = false;
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
     * Adds a Table to what is picked, without marking anything yet
     * @param {Table} table
     * @returns {Void}
     */
    add(table) {
        this.selection[table.name] = table;
    }

    /**
     * Forgets a Group that is no longer on the board
     * @param {Group} group
     * @returns {Void}
     */
    forgetGroup(group) {
        this.selectedGroups = this.selectedGroups.filter((one) => !one.isEqual(group));
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
     * Returns the Selected Group, or the Group the selection starts in. The
     * first one picked is the one being edited, and Tables from another Group
     * are ones it is about to gain
     * @returns {?Group}
     */
    get currentGroup() {
        if (this.selectedGroups.length) {
            return this.selectedGroups[0];
        }
        if (this.hasSelection) {
            for (const table of this.selectedTables) {
                if (table.group) {
                    return table.group;
                }
            }
        }
        return null;
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
        return Utils.inBounds(mouse, this.#canvas.bounds);
    }

    /**
     * Selects the given Table from the List
     * @param {Table} table
     * @returns {Void}
     */
    selectTableFromList(table, addToSelection = false) {
        if (addToSelection && this.isSelected(table)) {
            this.unselectTable(table);
            return;
        }
        this.#canvas.scrollToTable(table);
        this.selectTable(table, addToSelection);
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
        return this.selectedGroups.some((one) => one.isEqual(group));
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

        for (const other of Object.values(this.#canvas.tables)) {
            if (!table.isLinkedTo(other)) {
                other.disable();
            }
        }
        table.selectInList();
        this.listTable = table;
        this.markListSelection();
    }

    /**
     * Selects the given Table from the Canvas
     * @param {Table}    table
     * @param {Boolean=} addToSelection
     * @returns {Void}
     */
    selectTableFromCanvas(table, addToSelection = false) {
        if (addToSelection && this.isSelected(table)) {
            this.unselectTable(table);
            return;
        }

        // The Group it belongs to is opened by whoever asked for the selection,
        // so the row is on screen and there is no need to mark the Group instead
        this.#canvas.scrollToList(table);
        this.selectTable(table, addToSelection);
    }

    /**
     * Adds the given Table to what is picked
     * @param {Table}    table
     * @param {Boolean=} addToSelection
     * @returns {Void}
     */
    selectTable(table, addToSelection = false) {
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
    unselectTable(table) {
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
     * Selects the given Group, which is a way of picking every Table it
     * gathers at once, and adds them to the selection when asked
     * @param {Group}    group
     * @param {Boolean=} addToSelection
     * @returns {Void}
     */
    selectGroup(group, addToSelection = false) {
        if (!addToSelection) {
            this.unselect();
        }
        for (const table of group.tables) {
            if (table.onCanvas) {
                this.selection[table.name] = table;
            }
        }

        // This Group, and any other the selection already covered whole
        this.trySelectGroup();
        this.markSelection();
        this.stopUnselect();
    }

    /**
     * Selects every Group the selection covers whole, since a Group is picked
     * by having every one of its Tables on the board picked
     * @returns {Void}
     */
    trySelectGroup() {
        this.unselectGroup();

        // In the order they were picked, so the first one is the one a Dialog
        // takes as the Group being edited
        const groups = [];
        for (const table of this.selectedTables) {
            if (table.group && !groups.some((one) => one.isEqual(table.group))) {
                groups.push(table.group);
            }
        }

        for (const group of groups) {
            if (group.canvasTables.every((table) => this.isSelected(table))) {
                this.selectedGroups.push(group.select());
            }
        }
    }

    /**
     * Marks the selected Tables
     * @returns {Void}
     */
    markSelection() {
        // Disable all the Tables
        for (const otherTable of Object.values(this.#canvas.tables)) {
            otherTable.disable();
            otherTable.removeColors();
        }

        // Disable all the Links
        for (const link of this.#canvas.links) {
            link.disable();
        }

        // Add colors to the Links and Fields
        let   lastColor = 0;
        const colors    = {};
        for (const link of this.#canvas.links) {
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
            for (const table of Object.values(this.#canvas.tables)) {
                table.unselect();
            }
        }
        if (!this.hasSelection) {
            this.markListSelection();
            return;
        }
        for (const table of Object.values(this.#canvas.tables)) {
            table.unselect();
            table.removeColors();
        }
        for (const link of this.#canvas.links) {
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
        for (const group of this.selectedGroups) {
            group.unselect();
        }
        this.selectedGroups = [];
    }
}
