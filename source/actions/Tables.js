import * as App    from "../App.js";
import * as Groups from "./Groups.js";
import Group       from "../board/Group.js";
import Table       from "../board/Table.js";
import Utils       from "../core/Utils.js";



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
    tidyOnAdd();
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

/**
 * Tidies the board and says what came of it. Only what is asked for tells,
 * since a tidy after adding is not worth a word
 * @returns {Void}
 */
export function tidyBoard() {
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
 * @returns {Number}
 */
export function pushApart() {
    const tables = Object.values(App.canvas.tables);
    if (!tables.length) {
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
    return slideTables(spots, groups);
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
 * @param {Map}     spots
 * @param {Group[]} groups
 * @returns {Number}
 */
function slideTables(spots, groups) {
    const from  = new Map();
    let   moved = 0;

    for (const [ table, spot ] of spots) {
        from.set(table, { top : table.top, left : table.left });
        if (Math.abs(spot.top - table.top) >= 1 || Math.abs(spot.left - table.left) >= 1) {
            moved += 1;
        }
    }
    if (!moved) {
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
