import * as App     from "../App.js";
import * as History from "./History.js";
import * as Groups  from "./Groups.js";
import Group        from "../board/Group.js";
import Dialog       from "../dialogs/Dialog.js";
import Table        from "../board/Table.js";
import Utils        from "../core/Utils.js";



// The one that asks before a board is thrown away
const clearDialog = new Dialog("clear-board");

// What the tidy leaves between two Tables of one Group, sideways and down. The
// Links run across rather than down, which is what the wider one is for
const TABLE_GAP_X = 100;
const TABLE_GAP_Y = 40;

// And between two blocks, which stand further apart than the Tables of one do,
// so a Group reads as a thing of its own. A Group draws its border a padding
// out from its Tables, so stacked ones leave that much again between the cards.
// Then how long the sliding takes
const BLOCK_GAP_X = 100;
const BLOCK_GAP_Y = 60;
const TIDY_TIME   = 350;



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
 * Opens the whole List, or closes it when anything in it is open
 * @returns {Void}
 */
export function toggleList() {
    if (!App.schema) {
        return;
    }

    const isOpen = Object.values(App.schema.groups).some((group) => group.isExpanded)
        || Object.values(App.schema.tables).some((table) => table.isExpanded);
    if (isOpen) {
        collapseList();
    } else {
        expandList();
    }
}

/**
 * Opens every Group of the List at once
 * @returns {Void}
 */
export function expandList() {
    if (!App.schema) {
        return;
    }

    // Only the Groups, since opening every Table would put a few hundred
    // fields in a list that is read to find one of them
    for (const group of Object.values(App.schema.groups)) {
        if (!group.isExpanded) {
            Groups.toggleGroup(group);
        }
    }
}

/**
 * Closes every Table and Group the List has open
 * @returns {Void}
 */
export function collapseList() {
    if (!App.schema) {
        return;
    }

    for (const table of Object.values(App.schema.tables)) {
        if (table.isExpanded) {
            table.toggleExpand();
            App.storage.setTable(table);
        }
    }
    for (const group of Object.values(App.schema.groups)) {
        if (group.isExpanded) {
            Groups.toggleGroup(group);
        }
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

    History.remember();

    App.canvas.picker.unselect();
    const added = [];
    for (const table of Object.values(App.schema.tables)) {
        if (!table.onCanvas) {
            App.canvas.addTable(table);
            added.push(table);
        }
    }

    // With nothing to add there is nothing to arrange, and the board is only
    // shown whole
    if (!added.length) {
        fitBoard();
        return;
    }

    layoutBlocks(added);
    for (const table of added) {
        App.storage.setTable(table);
    }
    App.updateBoard();

    // A board filled in one go is nobody's arrangement, so the Groups are
    // gathered and the blocks pushed apart whatever the Settings say about
    // tidying what arrives, and it is shown whole once it stops moving
    pushApart(fitBoard);
}

/**
 * Asks first, since a board is an arrangement and there is no way back to one
 * @returns {Void}
 */
export function openClearBoard() {
    if (App.canvas.tableCount) {
        clearDialog.open();
    }
}

/**
 * Closes the Dialog that asks, leaving the board as it is
 * @returns {Void}
 */
export function closeClearBoard() {
    clearDialog.close();
}

/**
 * Takes every Table off the board
 * @returns {Void}
 */
export function clearBoard() {
    History.remember();
    if (!App.schema) {
        return;
    }

    clearDialog.close();

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
 * Lays the given Tables out a Group at a time, each Group a cluster of its own
 * and everything with no Group one more, and the clusters in as square a grid
 * as their amount allows. A board filled in one go then reads the way one
 * filled a Group at a time does
 * @param {Table[]} tables
 * @returns {Void}
 */
function layoutBlocks(tables) {
    const blocks = [];
    const loose  = [];

    for (const table of tables) {
        if (!table.group) {
            loose.push(table);
            continue;
        }
        const block = blocks.find((one) => one.group.isEqual(table.group));
        if (block) {
            block.tables.push(table);
        } else {
            blocks.push({ group : table.group, tables : [ table ] });
        }
    }
    if (loose.length) {
        blocks.push({ group : null, tables : loose });
    }
    if (blocks.length < 2) {
        layoutTables(tables);
        centerTables(tables);
        return;
    }

    // A cluster is laid out where it stands, and only then does it know how
    // much room it takes and can be moved as one to the place it is given
    const gap = 60;
    for (const block of blocks) {
        layoutTables(block.tables, block.group ? 100 : 40);
        block.bounds = App.canvas.getBounds(block.tables);
    }

    const columns = Math.ceil(Math.sqrt(blocks.length));
    const width   = Math.max(...blocks.map((block) => block.bounds.width)) + gap;
    const bottoms = new Array(columns).fill(0);

    for (const [ index, block ] of blocks.entries()) {
        const column = index % columns;
        const toTop  = bottoms[column] - block.bounds.top;
        const toLeft = column * width  - block.bounds.left;

        for (const table of block.tables) {
            table.translate({ top : table.top + toTop, left : table.left + toLeft });
        }
        bottoms[column] += block.bounds.height + gap;
    }

    centerTables(tables);
    for (const block of blocks) {
        if (block.group) {
            block.group.position();
        }
    }

    // The links were drawn where the Tables were dropped, before the layout
    App.canvas.reconnectAll();
}

/**
 * Moves the given Tables as one, so what they take up ends up around the
 * middle of the board, wherever the board is scrolled to at the time
 * @param {Table[]} tables
 * @returns {Void}
 */
function centerTables(tables) {
    const bounds = App.canvas.getBounds(tables);
    const middle = App.canvas.middle;
    const top    = middle.top  - bounds.height / 2 - bounds.top;
    const left   = middle.left - bounds.width  / 2 - bounds.left;

    for (const table of tables) {
        table.translate({ top : table.top + top, left : table.left + left });
    }
}

/**
 * Picks the given Table from the list, on the board or not
 * @param {Table}   table
 * @param {Boolean} specialKey
 * @returns {Void}
 */
export function selectFromList(table, specialKey) {
    // With no card to look at, the click that finds one already picked is the
    // one that opens it, the way a Group does
    if (!specialKey && !table.onCanvas && App.canvas.picker.isSelected(table)) {
        expandTable(table);
        return;
    }
    App.canvas.picker.selectTableFromList(table, specialKey);
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
    }
}

/**
 * Puts the given Table on the board
 * @param {Table} table
 * @returns {Void}
 */
export function addTable(table) {
    History.remember();
    App.canvas.addTable(table);

    // One that was picked from the list keeps its place in the selection,
    // rather than taking it over now that it has a card of its own
    if (App.canvas.picker.isSelected(table)) {
        App.canvas.picker.markSelection();
    } else {
        App.canvas.picker.selectTableFromList(table);
    }
    App.storage.setTable(table);
    App.updateBoard();
    tidyOnAdd();
}

/**
 * Takes the given Table off the board
 * @param {Table} table
 * @returns {Void}
 */
export function removeTable(table) {
    History.remember();
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
    History.remember();
    table.toggleFields();
    App.canvas.resizeTable(table);
    App.canvas.picker.selectTableFromCanvas(table, specialKey);
    App.storage.setTable(table);
}

/**
 * Shows the whole board at once, and says when there is none to show
 * @returns {Void}
 */
export function fitBoard() {
    if (!App.canvas.tableCount) {
        App.toast.show("The board is empty");
        return;
    }

    // The scroll of the board is written by the handler that watches it, once
    // it has finished sliding, so writing it here would write where it was
    App.storage.setZoom(App.canvas.fitBoard(App.canvas.boardBounds));
}

/**
 * Zooms the board so that what is picked is all of what is on screen
 * @returns {Void}
 */
export function fitPicked() {
    const bounds = App.canvas.pickedBounds;
    if (!bounds) {
        App.toast.show("Nothing is selected");
        return;
    }
    App.storage.setZoom(App.canvas.fitBoard(bounds));
}

/**
 * Zooms the board in, out or back to where it started
 * @param {"in"|"out"|"reset"} action
 * @returns {Void}
 */
export function setZoom(action) {
    const value = App.canvas.setZoom(action);

    // Back at where it started there is nothing to remember
    if (action === "reset") {
        App.storage.removeZoom();
    } else {
        App.storage.setZoom(value);
    }
    Utils.unselect();
}

/**
 * Moves what is picked by the given amount, which is what an arrow does
 * @param {Number} top
 * @param {Number} left
 * @returns {Void}
 */
export function nudgeTables(top, left) {
    const tables = App.canvas.picker.canvasTables;
    if (!tables.length) {
        return;
    }

    // An arrow held down is one move, not one for every step it takes
    History.remember("nudge");

    for (const table of tables) {
        table.translate({ top : table.top + top, left : table.left + left });
        App.canvas.reconnect(table);
        if (table.group) {
            table.group.position();
        }
        App.storage.setTable(table);
    }
}

/**
 * Takes every Table that is picked off the board
 * @returns {Void}
 */
export function removePicked() {
    const tables = App.canvas.picker.canvasTables;
    if (!tables.length) {
        return;
    }

    History.remember();

    App.canvas.picker.unselect();
    for (const table of tables) {
        removeTable(table);
    }
}

/**
 * Tidies the board and says what came of it. Only what is asked for tells,
 * since a tidy after adding is not worth a word
 * @returns {Void}
 */
export function tidyBoard() {
    History.remember();
    const moved = pushApart();
    if (!moved) {
        App.toast.show("The board is already tidy");
        return;
    }
    App.toast.show(moved === 1 ? "One table moved" : `${moved} tables moved`);
}

/**
 * Pushes the board apart after something was added, unless the Settings say
 * that a board is arranged by whoever arranged it
 * @returns {Void}
 */
export function tidyOnAdd() {
    if (App.configs.get("tidyOnAdd")) {
        pushApart();
    }
}

/**
 * Pulls the board apart until nothing overlaps, moving each Table as little as
 * it can rather than laying the whole thing out again, so a board stays the
 * one that was arranged. The Groups move whole, and what they hold with them
 * @param {Function=} onSettle
 * @returns {Number}
 */
export function pushApart(onSettle = null) {
    const tables = Object.values(App.canvas.tables);
    if (!tables.length) {
        if (onSettle) {
            onSettle();
        }
        return 0;
    }

    // Every Table starts where it is, and the spots are what gets pushed
    const spots = new Map();
    for (const table of tables) {
        spots.set(table, { top : table.top, left : table.left, width : table.width, height : table.height });
    }

    const groups = [];
    for (const table of tables) {
        if (table.group && !groups.some((one) => one.isEqual(table.group))) {
            groups.push(table.group);
        }
    }

    // A Group is a cluster rather than an arrangement someone made, so what it
    // holds is laid out afresh in as square a grid as its amount allows
    for (const group of groups) {
        gridTables(group.canvasTables.map((table) => spots.get(table)));
    }

    // The blocks are what is only pushed apart, a Group being one and every
    // Table in none another. A block moves whole, with what it holds
    const blocks = groups.map((group) => ({
        boxes   : group.canvasTables.map((table) => spots.get(table)),
        padding : group.padding,
    }));
    for (const table of tables) {
        if (!table.group) {
            blocks.push({ boxes : [ spots.get(table) ], padding : 0 });
        }
    }

    const rects = blocks.map((block) => blockBounds(block));
    const start = rects.map((rect) => ({ top : rect.top, left : rect.left }));
    separate(rects, BLOCK_GAP_X, BLOCK_GAP_Y);

    for (const [ index, block ] of blocks.entries()) {
        const top  = rects[index].top  - start[index].top;
        const left = rects[index].left - start[index].left;
        for (const box of block.boxes) {
            box.top  += top;
            box.left += left;
        }
    }

    anchor(tables, spots);
    return slideTables(spots, groups, onSettle);
}

/**
 * Returns what a block takes up, which is what its Tables do and the room a
 * Group needs around them for its border
 * @param {Object} block
 * @returns {Object}
 */
function blockBounds(block) {
    const top    = Math.min(...block.boxes.map((box) => box.top));
    const left   = Math.min(...block.boxes.map((box) => box.left));
    const bottom = Math.max(...block.boxes.map((box) => box.top  + box.height));
    const right  = Math.max(...block.boxes.map((box) => box.left + box.width));

    return {
        top    : top  - block.padding,
        left   : left - block.padding,
        width  : right  - left + block.padding * 2,
        height : bottom - top  + block.padding * 2,
    };
}

/**
 * Lays the given rectangles out in as square a grid as their amount allows,
 * each one under the last of its column, starting where they already are
 * @param {Object[]} boxes
 * @returns {Void}
 */
function gridTables(boxes) {
    const columns = Math.ceil(Math.sqrt(boxes.length));
    const width   = Math.max(...boxes.map((box) => box.width)) + TABLE_GAP_X;
    const bottoms = new Array(columns).fill(0);
    const top     = Math.min(...boxes.map((box) => box.top));
    const left    = Math.min(...boxes.map((box) => box.left));

    for (const [ index, box ] of boxes.entries()) {
        const column = index % columns;
        box.top  = top  + bottoms[column];
        box.left = left + column * width;
        bottoms[column] += box.height + TABLE_GAP_Y;
    }
}

/**
 * Pushes the given rectangles apart until each one is the gap away from the
 * rest, taking the shortest of the four ways out every time. The size of what
 * two of them share is not that distance: a Table that falls inside the span
 * of a taller one shares its whole height and still has further to go
 * @param {Object[]} rects
 * @param {Number}   gapX
 * @param {Number}   gapY
 * @returns {Void}
 */
function separate(rects, gapX, gapY) {
    for (let round = 0; round < 100; round += 1) {
        let moved = false;

        for (let i = 0; i < rects.length; i += 1) {
            for (let j = i + 1; j < rects.length; j += 1) {
                const a = rects[i];
                const b = rects[j];

                // How far one has to go for the other to be clear of it, each
                // way round. A way out that is already taken is zero or less
                const left  = a.left + a.width  + gapX - b.left;
                const right = b.left + b.width  + gapX - a.left;
                const up    = a.top  + a.height + gapY - b.top;
                const down  = b.top  + b.height + gapY - a.top;
                if (left <= 0 || right <= 0 || up <= 0 || down <= 0) {
                    continue;
                }

                moved = true;
                const push = Math.min(left, right, up, down) / 2;
                if (push === left / 2) {
                    a.left -= push;
                    b.left += push;
                } else if (push === right / 2) {
                    a.left += push;
                    b.left -= push;
                } else if (push === up / 2) {
                    a.top -= push;
                    b.top += push;
                } else {
                    a.top += push;
                    b.top -= push;
                }
            }
        }

        if (!moved) {
            return;
        }
    }
}

/**
 * Shifts every spot so the board keeps its corner: whatever was at the top left
 * is still there, rather than the whole thing walking up and to the left as the
 * pushing spreads it out
 * @param {Table[]} tables
 * @param {Map}     spots
 * @returns {Void}
 */
function anchor(tables, spots) {
    const boxes = [ ...spots.values() ];
    const top   = Math.min(...tables.map((table) => table.top))  - Math.min(...boxes.map((box) => box.top));
    const left  = Math.min(...tables.map((table) => table.left)) - Math.min(...boxes.map((box) => box.left));

    for (const box of boxes) {
        box.top  += top;
        box.left += left;
    }
}

/**
 * Slides the Tables from where they are to the spots they were given, drawing
 * the Groups and the Links along the way so nothing lags behind. A tab that is
 * not being painted gets no frames, so the board is put in place on a timer
 * whatever happens
 * @param {Map}       spots
 * @param {Group[]}   groups
 * @param {Function=} onSettle
 * @returns {Number}
 */
function slideTables(spots, groups, onSettle = null) {
    const from  = new Map();
    let   moved = 0;

    for (const [ table, spot ] of spots) {
        from.set(table, { top : table.top, left : table.left });
        if (Math.abs(spot.top - table.top) >= 1 || Math.abs(spot.left - table.left) >= 1) {
            moved += 1;
        }
    }
    if (!moved) {
        if (onSettle) {
            onSettle();
        }
        return 0;
    }

    let isDone = false;
    const settle = () => {
        if (isDone) {
            return;
        }
        isDone = true;

        for (const [ table, spot ] of spots) {
            table.translate(spot);
        }
        draw(groups);
        for (const [ table ] of spots) {
            App.storage.setTable(table);
        }
        App.updateBoard();

        // Whatever waits on the board standing still waits until here
        if (onSettle) {
            onSettle();
        }
    };

    const started = performance.now();
    const step    = (now) => {
        if (isDone) {
            return;
        }
        const part = Math.min(1, (now - started) / TIDY_TIME);
        if (part >= 1) {
            settle();
            return;
        }

        const ease = 1 - Math.pow(1 - part, 3);
        for (const [ table, spot ] of spots) {
            const start = from.get(table);
            table.translate({
                top  : start.top  + (spot.top  - start.top)  * ease,
                left : start.left + (spot.left - start.left) * ease,
            });
        }
        draw(groups);
        window.requestAnimationFrame(step);
    };

    window.requestAnimationFrame(step);
    window.setTimeout(settle, TIDY_TIME + 100);
    return moved;
}

/**
 * Redraws what the Tables moving changes, the Groups around them and the Links
 * between them
 * @param {Group[]} groups
 * @returns {Void}
 */
function draw(groups) {
    for (const group of groups) {
        group.position();
    }
    App.canvas.reconnectAll();
}
