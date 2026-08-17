import Selection from "./Selection.js";
import Storage   from "./Storage.js";
import Aside     from "./Aside.js";
import Canvas    from "./Canvas.js";
import Mode      from "./Mode.js";
import Grouper   from "./Grouper.js";
import Group     from "./Group.js";
import Schema    from "./Schema.js";
import Table     from "./Table.js";
import Views     from "./Views.js";
import Welcome   from "./Welcome.js";
import Utils     from "./Utils.js";


// The Schema of the Framework, to try the app without one of your own
const testSchema = {
    name : "Framework",
    url  : "https://frameworkphp.com.ar/assets/schema.json",
};

// The Variables
let timer     = null;
let selection = new Selection();
let storage   = new Storage();
let canvas    = new Canvas();
let mode      = new Mode();
let grouper   = new Grouper();
let welcome   = new Welcome();
let aside     = new Aside();
let views     = new Views();

/** @type {?Schema} */
let schema    = null;



/**
 * The main Function
 * @returns {Promise}
 */
async function main() {
    if (storage.hasSchema) {
        const data = await storage.getSchema();
        setSchema(data);
    } else if (storage.hasSchemas) {
        selection.open(storage.getSchemas());
    } else {
        welcome.open();
    }
    mode.restore(storage.getMode());
    updateBoard();
}

/**
 * Adds the Schema of the Framework, to see the app work without one at hand
 * @returns {Promise}
 */
async function addTestSchema() {
    const data = {
        name     : testSchema.name,
        useUrl   : true,
        url      : testSchema.url,
        position : storage.getSchemas().length + 1,
    };

    await storage.setSchema(data);
    welcome.close();
    selectSchema(data.schemaID);
}

/**
 * Creates the Schema and restores the Tables
 * @param {Object} data
 * @returns {Void}
 */
function setSchema(data) {
    canvas.zoom.setInitialValue(100);
    schema = new Schema(data);

    const groups = schema.createGroups(storage.getGroups());
    storage.updateGroups(groups);

    schema.createList();
    canvas.setSchemaTables(schema.tables);
    schema.setInitialFilter(storage.getFilter());
    aside.setInitialWidth(storage.getWidth());
    aside.setInitialCollapsed(storage.isCollapsed);

    for (const table of Object.values(schema.tables)) {
        const data = storage.getTable(table);
        if (data) {
            table.restore(data);
        }
        if (table.onCanvas) {
            canvas.addTable(table);
        }
    }

    canvas.zoom.setInitialValue(storage.getZoom());
    canvas.setInitialScroll(storage.getScroll());
    views.create(storage.getViews());
    updateBoard();
}

/**
 * Shows the given View of the current Schema, which is a board of its own
 * @param {Number} viewID
 * @returns {Promise}
 */
async function selectView(viewID) {
    if (!schema || !viewID || viewID === storage.viewID) {
        return;
    }

    // The Tables are the same, so only what the board is made of is read
    // again: where each one sits, the Groups around them and the scroll
    const data = await storage.getSchema(storage.schemaID, false);
    schema.destroy();
    canvas.destroy();
    storage.selectView(viewID);
    setSchema(data);
}

/**
 * Opens the Dialog of the given View
 * @param {Number} viewID
 * @returns {Void}
 */
function openViewDialog(viewID) {
    const view = storage.getViews().find((one) => one.id === viewID);
    if (view) {
        views.openDialog(view);
    }
}

/**
 * Adds or edits a View
 * @returns {Promise}
 */
async function editView() {
    const data = views.updateView();
    if (!data) {
        return;
    }

    // A copy is a new View with the board of the one it is made from, so it
    // takes the name that was typed and the other one is left as it was
    const viewID = data.isCopy ? storage.copyView(data.id, data.name) : storage.setView(data);
    if (!data.id || data.isCopy) {
        await selectView(viewID);
    }
    views.create(storage.getViews());
}

/**
 * Removes the View being edited, falling back to the first one left
 * @returns {Promise}
 */
async function removeView() {
    const viewID = views.viewID;
    views.closeRemove();
    if (!viewID) {
        return;
    }

    const wasCurrent = viewID === storage.viewID;
    storage.removeView(viewID);
    if (wasCurrent) {
        storage.selectView(0);
        await selectView(storage.getViewIDs()[0]);
    }
    views.create(storage.getViews());
}

/**
 * Opens or closes the given Table in the List, leaving the others as they are
 * @param {Table} table
 * @returns {Void}
 */
function expandTable(table) {
    table.toggleExpand();
    storage.setTable(table);

    // A Table inside a Group is only on screen once the Group is open
    if (table.isExpanded) {
        openGroupOf(table);
    }
}

/**
 * Opens or closes the given Group in the List
 * @param {Group} group
 * @returns {Void}
 */
function toggleGroup(group) {
    group.toggleExpand();
    storage.setGroup(group);
}

/**
 * Opens the given Group in the List, leaving an open one alone
 * @param {Group} group
 * @returns {Void}
 */
function expandGroup(group) {
    if (!group.isExpanded) {
        toggleGroup(group);
    }
}

/**
 * Opens the Group of the given Table, so the row the List marks as selected
 * is one that can be seen. It is the only thing selecting opens on its own
 * @param {Table} table
 * @returns {Void}
 */
function openGroupOf(table) {
    if (table.group) {
        expandGroup(table.group);
    }
}

/**
 * Shows how much of the Schema is on the board, in the Aside and the Canvas
 * @returns {Void}
 */
function updateBoard() {
    aside.setStatus(canvas.tableCount, schema ? schema.tableCount : 0);
    views.setCount(storage.viewID, canvas.tableCount);
    canvas.setEmpty(Boolean(schema));
}

/**
 * Puts every Table of the Schema on the board
 * @returns {Void}
 */
function addAllTables() {
    if (!schema) {
        return;
    }

    canvas.unselect();
    const added = [];
    for (const table of Object.values(schema.tables)) {
        if (!table.onCanvas) {
            canvas.addTable(table);
            added.push(table);
        }
    }

    layoutTables(added);
    for (const table of added) {
        storage.setTable(table);
    }
    updateBoard();
}

/**
 * Puts every Table of the given Group on the board
 * @param {Group} group
 * @returns {Void}
 */
function addGroupTables(group) {
    const isPlaced = group.onCanvas;
    const top      = isPlaced ? group.bottom + 40 : 0;
    const left     = isPlaced ? group.left + group.width / 2 : 0;
    const added    = [];

    for (const table of group.tables) {
        if (!table.onCanvas) {
            canvas.addTable(table);
            added.push(table);
        }
    }
    if (!added.length) {
        return;
    }

    // The Tables already on the board keep their place, so the layout of the
    // ones arriving starts under the Group instead of on top of them
    if (isPlaced) {
        added[0].translate({ top, left });
    }

    // The Links inside a Group need more room between the columns than the
    // ones spread over the whole board do
    layoutTables(added, 100);
    group.position();

    for (const table of added) {
        storage.setTable(table);
    }
    expandGroup(group);
    canvas.showGroup(group);
    updateBoard();
}

/**
 * Takes every Table of the given Group off the board
 * @param {Group} group
 * @returns {Void}
 */
function removeGroupTables(group) {
    canvas.unselect();
    for (const table of group.tables) {
        if (table.onCanvas) {
            canvas.removeTable(table);
            storage.setTable(table);
        }
    }
    updateBoard();
}

/**
 * Takes every Table off the board
 * @returns {Void}
 */
function clearBoard() {
    if (!schema) {
        return;
    }

    canvas.unselect();
    for (const table of Object.values(schema.tables)) {
        if (table.onCanvas) {
            canvas.removeTable(table);
            storage.setTable(table);
        }
    }
    updateBoard();
}

/**
 * Lays the given Tables out in as square a grid as their amount allows, each
 * one under the last of its column, so a tall Table does not land on another
 * @param {Table[]} tables
 * @param {Number=} columnGap
 * @returns {Void}
 */
function layoutTables(tables, columnGap = 40) {
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
    canvas.reconnectAll();
}

/**
 * Selects the given Schema
 * @param {Number} schemaID
 * @returns {Promise}
 */
async function selectSchema(schemaID) {
    const data = await storage.getSchema(schemaID);
    if (!data) {
        return false;
    }

    if (schema) {
        schema.destroy();
        canvas.destroy();
    }
    storage.selectSchema(schemaID);
    setSchema(data);
    return true;
}

/**
 * Edits/Adds a Schema
 * @returns {Promise}
 */
async function editSchema() {
    const data = await selection.editSchema();
    if (!data) {
        return;
    }

    await storage.setSchema(data);
    welcome.close();
    selection.open(storage.getSchemas());
    if (schema && data && schema.schemaID === data.schemaID) {
        selectSchema(data.schemaID);
    }
    selection.closeEdit();
}

/**
 * Removes the given Schema
 * @param {Number} schemaID
 * @returns {Void}
 */
function removeSchema(schemaID) {
    if (schema && schema.schemaID === schemaID) {
        canvas.destroy();
        schema.destroy();
        schema = null;
        updateBoard();
    }
    storage.removeSchema(schemaID);
    views.create(storage.getViews());
    selection.closeRemove();
    selection.open(storage.getSchemas());
}

/**
 * Gathers the Tables that are in no Group by the prefix of their name, one
 * Group each, leaving the ones already gathered where they are
 * @returns {Void}
 */
function groupByPrefix() {
    if (!schema) {
        return;
    }

    for (const data of schema.getPrefixGroups()) {
        const group = schema.setGroup({ id : storage.nextGroup, name : data.name, tables : data.tables });
        storage.setGroup(group);
        storage.addGroup(group);

        // A Group with nothing on the board has no rectangle to draw yet
        if (group.canvasTables.length) {
            canvas.addGroup(group);
        }
    }
    grouper.closeDialog();
}

/**
 * Opens the Group Dialog
 * @param {Group?} group
 * @returns {Void}
 */
function openGroupDialog(group) {
    if (group) {
        canvas.stopUnselect();
        grouper.openDialog(storage.nextGroup, group, canvas.selectedTables);
    }
}



/**
 * The Click Event Handler
 */
document.addEventListener("click", (e) => {
    const target     = Utils.getTarget(e);
    const action     = target.dataset.action;
    const schemaID   = Number(target.dataset.schema);
    const table      = schema ? schema.getTable(target) : null;
    const group      = schema ? schema.getGroup(target) : null;
    const specialKey = e.ctrlKey || e.metaKey || e.shiftKey;
    let   dontStop   = false;

    switch (action) {
    // Welcome Actions
    case "welcome-add":
        selection.openEdit({});
        break;
    case "welcome-test":
        addTestSchema();
        break;

    // Selection Actions
    case "open-select":
        selection.open(storage.getSchemas());
        break;
    case "close-select":
        selection.close();
        break;
    case "select-schema":
        selectSchema(schemaID);
        selection.close();
        break;

    // Schema Actions
    case "open-add":
        selection.openEdit({});
        break;
    case "open-edit":
        const schemaData = storage.getSchemaData(schemaID);
        if (schemaData) {
            selection.openEdit(schemaData);
        }
        break;
    case "close-schema":
        selection.closeEdit();
        break;
    case "upload-file":
        selection.selectFile();
        break;
    case "remove-file":
        selection.removeFile();
        break;
    case "schema-url":
        // @ts-ignore
        selection.toggleUrls(target.checked);
        dontStop = true;
        break;
    case "edit-schema":
        editSchema();
        break;
    case "open-remove-schema":
        selection.openRemove(schemaID);
        break;
    case "close-remove-schema":
        selection.closeRemove();
        break;
    case "remove-schema":
        removeSchema(selection.schemaID);
        break;

    // View Actions
    case "select-view":
        selectView(Number(target.dataset.view));
        break;
    case "edit-view":
        openViewDialog(Number(target.dataset.view));
        break;
    case "open-view":
        views.openDialog(null);
        break;
    case "close-view":
        views.closeDialog();
        break;
    case "update-view":
        editView();
        break;
    case "copy-view":
        // @ts-ignore
        views.setCopy(target.checked);
        dontStop = true;
        break;
    case "open-remove-view":
        views.openRemove();
        break;
    case "close-remove-view":
        views.closeRemove();
        break;
    case "remove-view":
        removeView();
        break;

    // Group Actions
    case "open-group":
        canvas.stopUnselect();
        grouper.openDialog(
            storage.nextGroup,
            canvas.currentGroup,
            canvas.selectedTables,
            schema ? schema.getPrefixGroups().length : 0,
        );
        break;
    case "group-by-prefix":
        groupByPrefix();
        break;
    case "close-group":
        grouper.closeDialog();
        break;
    case "update-group":
        const data = grouper.updateGroup(schema.tables);
        if (data) {
            const group = schema.setGroup(data);
            canvas.addGroup(group);
            canvas.selectGroup(group);
            storage.setGroup(group);
            if (!data.isEdit) {
                storage.addGroup(group);
            }
        }
        break;
    case "open-remove":
        grouper.openRemove(group || grouper.group);
        break;
    case "close-remove":
        grouper.closeRemove();
        break;
    case "remove-group":
        if (grouper.group) {
            schema.removeGroup(grouper.group);
            canvas.removeGroup(grouper.group);
            storage.removeGroup(grouper.group.id);
            grouper.closeDialog();
            grouper.closeRemove();
        }
        break;

    // Aside Actions. The panel is there before a Schema is, so only the
    // filter, which is a filter of its list, has to ask for one
    case "add-all-tables":
        addAllTables();
        break;
    case "clear-board":
        clearBoard();
        break;
    case "toggle-aside":
        aside.toggleCollapse();
        storage.setCollapsed(aside.isCollapsed);
        break;
    case "clear-filter":
        if (schema) {
            schema.clearFilter();
            storage.removeFilter();
        }
        break;

    // Mode Actions
    case "mode-light":
        storage.setLightMode();
        mode.setLight();
        break;
    case "mode-dark":
        storage.setDarkMode();
        mode.setDark();
        break;

    // Zoom Actions
    case "zoom-in":
        storage.setZoom(canvas.setZoom("in"));
        Utils.unselect();
        break;
    case "zoom-out":
        storage.setZoom(canvas.setZoom("out"));
        Utils.unselect();
        break;
    case "reset-zoom":
        canvas.setZoom("reset");
        storage.removeZoom();
        Utils.unselect();
        break;
    default:
    }

    // Group Actions
    if (group) {
        switch (action) {
        case "expand-group":
            toggleGroup(group);
            break;
        case "show-group":
            // Picking a Group only shows it on the board, and the click that
            // finds it already picked is the one that opens or closes it
            if (canvas.isGroupSelected(group)) {
                toggleGroup(group);
            }
            canvas.showGroup(group);
            break;
        case "edit-group":
            openGroupDialog(group);
            break;
        case "add-group-tables":
            addGroupTables(group);
            break;
        case "remove-group-tables":
            removeGroupTables(group);
            break;
        default:
        }
    }

    // Table Actions
    if (table) {
        switch (action) {
        case "expand-table":
            expandTable(table);
            break;
        case "select-list-table":
            // A Table that is not on the board has nothing to show there, so
            // picking it only opens it, the way a Group off the board does
            if (!table.onCanvas) {
                expandTable(table);
            } else if (specialKey) {
                canvas.selectTableFromList(table, true);
            } else {
                canvas.selectTableFromList(table);
            }
            break;
        case "toggle-list-fields":
            table.toggleListFields();
            break;
        case "select-canvas-table":
            Utils.unselect();
            canvas.selectTableFromCanvas(table, specialKey);
            if (canvas.isSelected(table)) {
                openGroupOf(table);
                canvas.scrollToList(table);
            }
            break;
        case "add-table":
            canvas.addTable(table);
            canvas.selectTableFromList(table);
            storage.setTable(table);
            updateBoard();
            break;
        case "remove-table":
            canvas.removeTable(table);
            canvas.selectTableOffCanvas(table);
            storage.setTable(table);
            updateBoard();
            break;
        case "toggle-fields":
            table.toggleFields();
            canvas.resizeTable(table);
            canvas.selectTableFromCanvas(table, specialKey);
            storage.setTable(table);
            break;
        default:
        }
    }

    if (canvas.shouldUnselect(e)) {
        canvas.unselect();
    }
    if (action && !dontStop) {
        e.preventDefault();
    }
});

/**
 * The Double Click Event Handler
 */
document.addEventListener("dblclick", (e) => {
    const target = Utils.getTarget(e);
    const action = target.dataset.action;
    const group  = schema ? schema.getGroup(target) : null;

    switch (action) {
    case "resize-aside":
        aside.resetWidth();
        storage.setWidth(aside.width);
        break;
    case "drag-group":
        openGroupDialog(group);
        break;
    case "select-view":
        openViewDialog(Number(target.dataset.view));
        break;
    }
});

/**
 * The Filter Event Handler
 */
document.querySelector(".schema-filter input").addEventListener("input", () => {
    if (!schema) {
        return;
    }
    const value = schema.filterList();
    storage.setFilter(value);
});

/**
 * The Scroll Event Handler
 */
document.querySelector("main").addEventListener("scroll", () => {
    if (timer) {
        window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
        storage.setScroll(canvas.scroll);
    }, 500);
});

/**
 * The Pick Event Handler
 */
document.addEventListener("mousedown", (e) => {
    const target     = Utils.getTarget(e);
    const action     = target.dataset.action;
    const specialKey = e.ctrlKey || e.metaKey || e.shiftKey;

    if (e.button !== 0) {
        return;
    }
    switch (action) {
    case "drag-table":
        const table = schema.getTable(target);
        if (table) {
            canvas.pickTable(e, table, specialKey);
            if (canvas.isSelected(table)) {
                openGroupOf(table);
                canvas.scrollToList(table);
            }
            e.preventDefault();
        }
        break;
    case "drag-group":
        const group = schema.getGroup(target);
        if (group) {
            canvas.pickGroup(e, group);
            expandGroup(group);
            e.preventDefault();
        }
        break;
    case "resize-aside":
        aside.pickResizer(e);
        e.preventDefault();
        break;
    default:
        // @ts-ignore
        if (e.target.classList.contains("canvas")) {
            canvas.pickSelector(e);
            e.preventDefault();
        }
    }
});

/**
 * The Context Menu Event Handler
 */
document.addEventListener("contextmenu", (e) => {
    // @ts-ignore
    if (e.target.classList.contains("main")) {
        canvas.pickScroll(e);
        e.preventDefault();
    }
});

/**
 * The Drag Event Handler
 */
document.addEventListener("mousemove", (e) => {
    if (canvas) {
        if (canvas.dragScroll(e)) {
            e.preventDefault();
        } else if (canvas.dragSelector(e)) {
            e.preventDefault();
        } else if (canvas.dragTable(e)) {
            e.preventDefault();
        }
    }
    if (aside.dragResizer(e)) {
        e.preventDefault();
    }
});

/**
 * The Drop Event Handler
 */
document.addEventListener("mouseup", (e) => {
    if (canvas) {
        if (canvas.dropScroll()) {
            e.preventDefault();
        } else if (canvas.dropSelector(e)) {
            e.preventDefault();
        } else if (canvas.dropTable()) {
            for (const selectedTable of canvas.selectedTables) {
                storage.setTable(selectedTable);
            }
            e.preventDefault();
        }
    }
    if (aside.dropResizer()) {
        storage.setWidth(aside.width);
        e.preventDefault();
    }
});

/**
 * Keep the Center of the Canvas when resizing
 */
const element   = document.querySelector("main");
let   oldWidth  = 0;
let   oldHeight = 0;
window.addEventListener("load", () => {
    oldWidth  = element.clientWidth;
    oldHeight = element.clientHeight;
});
window.addEventListener("resize", () => {
    const newWidth   = element.clientWidth;
    const newHeight  = element.clientHeight;
    const diffWidth  = newWidth  - oldWidth;
    const diffHeight = newHeight - oldHeight;
    const newScrollX = element.scrollLeft - diffWidth  / 2;
    const newScrollY = element.scrollTop  - diffHeight / 2;
    element.scrollTo(newScrollX, newScrollY);

    oldWidth  = newWidth;
    oldHeight = newHeight;
});



// Start
main();
