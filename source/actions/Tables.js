import * as App    from "../App.js";
import * as Groups from "./Groups.js";
import Table       from "../board/Table.js";
import Utils       from "../core/Utils.js";



/**
 * Opens or closes the given Table in the List, leaving the others as they are
 * @param {Table} table
 * @returns {Void}
 */
export function expandTable(table) {
    table.toggleExpand();
    App.storage.setTable(table);

    // A Table inside a Group is only on screen once the Group is open
    if (table.isExpanded) {
        Groups.openGroupOf(table);
    }
}

/**
 * Puts every Table of the Schema on the board
 * @returns {Void}
 */
export function addAllTables() {
    if (!App.schema) {
        return;
    }

    App.canvas.picker.unselect();
    const added = [];
    for (const table of Object.values(App.schema.tables)) {
        if (!table.onCanvas) {
            App.canvas.addTable(table);
            added.push(table);
        }
    }

    layoutTables(added);
    for (const table of added) {
        App.storage.setTable(table);
    }
    App.updateBoard();
}

/**
 * Takes every Table off the board
 * @returns {Void}
 */
export function clearBoard() {
    if (!App.schema) {
        return;
    }

    App.canvas.picker.unselect();
    for (const table of Object.values(App.schema.tables)) {
        if (table.onCanvas) {
            App.canvas.removeTable(table);
            App.storage.setTable(table);
        }
    }
    App.updateBoard();
}

/**
 * Lays the given Tables out in as square a grid as their amount allows, each
 * one under the last of its column, so a tall Table does not land on another
 * @param {Table[]} tables
 * @param {Number=} columnGap
 * @returns {Void}
 */
export function layoutTables(tables, columnGap = 40) {
    if (!tables.length) {
        return;
    }

    const gap     = 40;
    const columns = Math.ceil(Math.sqrt(tables.length));
    const width   = Math.max(...tables.map((table) => table.width)) + columnGap;
    const bottoms = new Array(columns).fill(0);
    const top     = tables[0].top;
    const left    = tables[0].left - Math.floor(columns / 2) * width;

    for (const [ index, table ] of tables.entries()) {
        const column = index % columns;
        table.translate({
            top  : top  + bottoms[column],
            left : left + column * width,
        });
        bottoms[column] += table.height + gap;
    }

    // The links were drawn where the Tables were dropped, before the layout
    App.canvas.reconnectAll();
}

/**
 * Picks the given Table from the list. One that is not on the board has
 * nothing to show there, so it only opens, the way a Group off the board does
 * @param {Table}   table
 * @param {Boolean} specialKey
 * @returns {Void}
 */
export function selectFromList(table, specialKey) {
    if (!table.onCanvas) {
        expandTable(table);
    } else {
        App.canvas.picker.selectTableFromList(table, specialKey);
    }
}

/**
 * Picks the given Table from the board, opening the Group that holds it so
 * the row the list marks is one that can be seen
 * @param {Table}   table
 * @param {Boolean} specialKey
 * @returns {Void}
 */
export function selectFromCanvas(table, specialKey) {
    Utils.unselect();
    App.canvas.picker.selectTableFromCanvas(table, specialKey);
    if (App.canvas.picker.isSelected(table)) {
        Groups.openGroupOf(table);
        App.canvas.scrollToList(table);
    }
}

/**
 * Puts the given Table on the board
 * @param {Table} table
 * @returns {Void}
 */
export function addTable(table) {
    App.canvas.addTable(table);
    App.canvas.picker.selectTableFromList(table);
    App.storage.setTable(table);
    App.updateBoard();
}

/**
 * Takes the given Table off the board
 * @param {Table} table
 * @returns {Void}
 */
export function removeTable(table) {
    App.canvas.removeTable(table);
    App.canvas.picker.selectTableOffCanvas(table);
    App.storage.setTable(table);
    App.updateBoard();
}

/**
 * Shows or hides the fields the given Table keeps back, and redraws what its
 * new height changes
 * @param {Table}   table
 * @param {Boolean} specialKey
 * @returns {Void}
 */
export function toggleFields(table, specialKey) {
    table.toggleFields();
    App.canvas.resizeTable(table);
    App.canvas.picker.selectTableFromCanvas(table, specialKey);
    App.storage.setTable(table);
}
