import * as App      from "./App.js";
import * as Schemas  from "./actions/Schemas.js";
import * as Views    from "./actions/Views.js";
import * as Groups   from "./actions/Groups.js";
import * as Tables   from "./actions/Tables.js";
import * as Context  from "./actions/Context.js";
import * as Settings from "./actions/Settings.js";
import Utils         from "./core/Utils.js";



// The timer that holds the scroll back from being written on every pixel
let timer = null;


/**
 * Reads what was left behind, or asks for a Schema when there is none
 * @returns {Promise}
 */
async function start() {
    if (App.storage.hasSchema) {
        const data = await App.storage.getSchema();
        Schemas.setSchema(data);
    } else if (App.storage.hasSchemas) {
        App.selection.open(App.storage.getSchemas());
    } else {
        App.welcome.open();
    }
    App.configs.apply();
    Settings.restoreTheme();
    App.updateBoard();
}



/**
 * The Click Event Handler
 */
document.addEventListener("click", (e) => {
    App.context.close();

    const target     = Utils.getTarget(e);
    const action     = target.dataset.action;
    const schemaID   = Number(target.dataset.schema);
    const table      = App.schema ? App.schema.getTable(target) : null;
    const group      = App.schema ? App.schema.getGroup(target) : null;
    const specialKey = e.ctrlKey || e.metaKey || e.shiftKey;
    let   dontStop   = false;

    // Whoever moved on to the board is done typing in the panel
    if (App.schema && e.target instanceof HTMLElement && e.target.closest(".main")) {
        App.schema.blurFilter();
    }

    switch (action) {
    // Welcome Actions
    case "welcome-add":
        App.selection.openEdit({});
        break;
    case "welcome-test":
        Schemas.addTestSchema();
        break;

    // Selection Actions
    case "open-select":
        App.selection.open(App.storage.getSchemas());
        break;
    case "close-select":
        App.selection.close();
        break;
    case "select-schema":
        Schemas.selectSchema(schemaID);
        App.selection.close();
        break;

    // Schema Actions
    case "open-add":
        App.selection.openEdit({});
        break;
    case "open-edit":
        Schemas.openEdit(schemaID);
        break;
    case "close-schema":
        App.selection.closeEdit();
        break;
    case "upload-file":
        App.selection.selectFile();
        break;
    case "remove-file":
        App.selection.removeFile();
        break;
    case "schema-url":
        // @ts-ignore
        App.selection.toggleUrls(target.checked);
        dontStop = true;
        break;
    case "edit-schema":
        Schemas.editSchema();
        break;
    case "open-remove-schema":
        App.selection.openRemove(schemaID);
        break;
    case "close-remove-schema":
        App.selection.closeRemove();
        break;
    case "remove-schema":
        Schemas.removeSchema(App.selection.schemaID);
        break;

    // View Actions
    case "select-view":
        Views.selectView(Number(target.dataset.view));
        break;
    case "edit-view":
        Views.openViewDialog(Number(target.dataset.view));
        break;
    case "open-view":
        App.views.openDialog(null);
        break;
    case "close-view":
        App.views.closeDialog();
        break;
    case "update-view":
        Views.editView();
        break;
    case "copy-view":
        // @ts-ignore
        App.views.setCopy(target.checked);
        dontStop = true;
        break;
    case "open-remove-view":
        App.views.openRemove(Number(target.dataset.view));
        break;
    case "close-remove-view":
        App.views.closeRemove();
        break;
    case "remove-view":
        Views.removeView();
        break;

    // Group Actions
    case "open-group":
        Groups.openGroup();
        break;
    case "group-by-prefix":
        Groups.groupByPrefix();
        break;
    case "close-group":
        App.grouper.closeDialog();
        break;
    case "update-group":
        Groups.saveGroup();
        break;
    case "open-remove":
        App.grouper.openRemove(group || App.grouper.group);
        break;
    case "close-remove":
        App.grouper.closeRemove();
        break;
    case "remove-group":
        Groups.removeGroup();
        break;

    // Aside Actions. The panel is there before a Schema is, so only the
    // filter, which is a filter of its list, has to ask for one
    case "add-all-tables":
        Tables.addAllTables();
        break;
    case "clear-selection":
        App.canvas.picker.unselect();
        break;
    case "open-settings":
        App.settings.open();
        break;
    case "close-settings":
        App.settings.close();
        break;
    case "save-settings":
        Settings.saveSettings();
        break;
    case "tidy-board":
        Tables.tidyBoard();
        break;
    case "clear-board":
        Tables.clearBoard();
        break;
    case "toggle-aside":
        App.aside.toggleCollapse();
        App.storage.setCollapsed(App.aside.isCollapsed);
        break;
    case "toggle-list":
        Tables.toggleList();
        Utils.unselect();
        break;
    case "clear-filter":
        if (App.schema) {
            App.schema.clearFilter();
            App.storage.removeFilter();
        }
        break;

    // Mode Actions
    case "mode-light":
        Settings.setMode("light");
        break;
    case "mode-system":
        Settings.setMode("system");
        break;
    case "mode-dark":
        Settings.setMode("dark");
        break;

    // Zoom Actions
    case "zoom-in":
        App.storage.setZoom(App.canvas.setZoom("in"));
        Utils.unselect();
        break;
    case "zoom-out":
        App.storage.setZoom(App.canvas.setZoom("out"));
        Utils.unselect();
        break;
    case "reset-zoom":
        App.canvas.setZoom("reset");
        App.storage.removeZoom();
        Utils.unselect();
        break;
    default:
    }

    // Group Actions
    if (group) {
        switch (action) {
        case "expand-group":
            Groups.toggleGroup(group);
            break;
        case "show-group":
            Groups.showGroup(group, specialKey);
            break;
        case "edit-group":
            Groups.openGroupDialog(group);
            break;
        case "add-group-tables":
            Groups.addGroupTables(group);
            break;
        case "remove-group-tables":
            Groups.removeGroupTables(group);
            break;
        default:
        }
    }

    // Table Actions
    if (table) {
        switch (action) {
        case "expand-table":
            Tables.expandTable(table);
            break;
        case "select-list-table":
            Tables.selectFromList(table, specialKey);
            break;
        case "toggle-list-fields":
            table.toggleListFields();
            break;
        case "select-canvas-table":
            Tables.selectFromCanvas(table, specialKey);
            break;
        case "add-table":
            Tables.addTable(table);
            break;
        case "remove-table":
            Tables.removeTable(table);
            break;
        case "toggle-fields":
            Tables.toggleFields(table, specialKey);
            break;
        default:
        }
    }

    if (App.canvas.picker.shouldUnselect(e)) {
        App.canvas.picker.unselect();
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
    const group  = App.schema ? App.schema.getGroup(target) : null;

    switch (action) {
    case "resize-aside":
        App.aside.resetWidth();
        App.storage.setWidth(App.aside.width);
        break;
    case "drag-group":
        Groups.openGroupDialog(group);
        break;
    case "select-view":
        Views.openViewDialog(Number(target.dataset.view));
        break;
    }
});

/**
 * The Filter Event Handler
 */
document.querySelector(".schema-filter input").addEventListener("input", () => {
    if (!App.schema) {
        return;
    }
    const value = App.schema.filterList();
    App.storage.setFilter(value);
});

/**
 * The List Scroll Event Handler
 */
document.querySelector(".schema-list").addEventListener("scroll", () => {
    App.aside.setListFade();
    App.tooltip.hide();
    App.context.close();
});

/**
 * The Scroll Event Handler
 */
document.querySelector("main").addEventListener("scroll", () => {
    App.context.close();
    if (timer) {
        window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
        App.storage.setScroll(App.canvas.scroll);
    }, 500);
});

/**
 * The Tooltip Event Handler
 */
document.addEventListener("mouseover", (e) => {
    App.tooltip.follow(e);
});

/**
 * The Pick Event Handler
 */
document.addEventListener("mousedown", (e) => {
    App.tooltip.hide();
    if (!App.context.contains(e.target)) {
        App.context.close();
    }

    const target     = Utils.getTarget(e);
    const action     = target.dataset.action;
    const specialKey = e.ctrlKey || e.metaKey || e.shiftKey;

    if (e.button !== 0) {
        return;
    }
    switch (action) {
    case "drag-table":
        const table = App.schema.getTable(target);
        if (table) {
            App.canvas.pointer.pickTable(e, table, specialKey);
            if (App.canvas.picker.isSelected(table)) {
                Groups.openGroupOf(table);
            }
            e.preventDefault();
        }
        break;
    case "drag-group":
        const group = App.schema.getGroup(target);
        if (group) {
            App.canvas.pointer.pickGroup(e, group, specialKey);
            Groups.expandGroup(group);
            e.preventDefault();
        }
        break;
    case "resize-aside":
        App.aside.pickResizer(e);
        e.preventDefault();
        break;
    default:
        // @ts-ignore
        if (e.target.classList.contains("canvas")) {
            App.canvas.pointer.pickSelector(e);
            e.preventDefault();
        }
    }
});

/**
 * The Context Menu Event Handler
 */
document.addEventListener("contextmenu", (e) => {
    if (Context.openMenu(e)) {
        e.preventDefault();
        return;
    }

    // @ts-ignore
    if (e.target.classList.contains("main")) {
        App.canvas.pointer.pickScroll(e);
        e.preventDefault();
    }
});

/**
 * The Key Event Handler
 */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        App.context.close();
    }
});

/**
 * The Drag Event Handler
 */
document.addEventListener("mousemove", (e) => {
    if (App.canvas) {
        if (App.canvas.pointer.dragScroll(e)) {
            e.preventDefault();
        } else if (App.canvas.pointer.dragSelector(e)) {
            e.preventDefault();
        } else if (App.canvas.pointer.dragTable(e)) {
            e.preventDefault();
        }
    }
    if (App.aside.dragResizer(e)) {
        e.preventDefault();
    }
});

/**
 * The Drop Event Handler
 */
document.addEventListener("mouseup", (e) => {
    if (App.canvas) {
        if (App.canvas.pointer.dropScroll()) {
            e.preventDefault();
        } else if (App.canvas.pointer.dropSelector(e)) {
            e.preventDefault();
        } else if (App.canvas.pointer.dropTable()) {
            for (const selectedTable of App.canvas.picker.canvasTables) {
                App.storage.setTable(selectedTable);
            }
            e.preventDefault();
        }
    }
    if (App.aside.dropResizer()) {
        App.storage.setWidth(App.aside.width);
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
start();
