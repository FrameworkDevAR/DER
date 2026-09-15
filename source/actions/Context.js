import * as App from "../App.js";
import Table    from "../board/Table.js";
import Group    from "../board/Group.js";



/**
 * Opens the menu of whatever was right clicked, and says whether there was one
 * @param {MouseEvent} event
 * @returns {Boolean}
 */
export function openMenu(event) {
    if (!(event.target instanceof HTMLElement)) {
        return false;
    }

    /** @type {HTMLElement} */
    const element = event.target.closest("[data-table], [data-group], [data-view]");
    if (!element) {
        return false;
    }

    const view = App.storage.getViews().find((one) => one.id === Number(element.dataset.view));
    if (view) {
        App.context.open(event, view.name, viewItems(view));
        return true;
    }

    const table = App.schema ? App.schema.getTable(element) : null;
    const group = App.schema ? App.schema.getGroup(element) : null;
    if (!table && !group) {
        return false;
    }

    // A row of the panel and a card of the board are the same Table, and only
    // the panel has a row to open and fields to show under it
    const inList = Boolean(element.closest(".aside"));
    if (table) {
        App.context.open(event, table.name, tableItems(table, inList));
    } else {
        App.context.open(event, group.name, groupItems(group, inList));
    }
    return true;
}

/**
 * Returns what can be done with the given Table
 * @param {Table}   table
 * @param {Boolean} inList
 * @returns {Object[]}
 */
function tableItems(table, inList) {
    const name  = table.name;
    const items = [];

    if (inList) {
        items.push({
            action : "expand-table",
            icon   : "unfold",
            table  : name,
            text   : table.isExpanded ? "Close the table" : "Open the table",
        });
    }
    if (table.hasHiddenFields && (inList || table.onCanvas)) {
        const isShowing = inList ? table.showAllList : table.showAll;
        items.push({
            action : inList ? "toggle-list-fields" : "toggle-fields",
            icon   : "fields",
            table  : name,
            text   : isShowing ? "Show fewer fields" : "Show every field",
        });
    }

    if (table.onCanvas) {
        items.push({
            action   : "remove-table",
            icon     : "remove",
            table    : name,
            isRemove : true,
            text     : "Remove from the board",
        });
    } else {
        items.push({
            action : "add-table",
            icon   : "add",
            table  : name,
            text   : "Add to the board",
        });
    }

    // The Group of a Table is one thing to reach from here, and gathering a
    // Group is another, which is only worth offering when something is picked
    if (table.group) {
        items.push(null);
        items.push({
            action : "edit-group",
            icon   : "edit",
            group  : String(table.group.id),
            text   : "Edit the group",
        });
    } else if (App.canvas.picker.hasSelection) {
        items.push(null);
        items.push({
            action : "open-group",
            icon   : "group",
            text   : "Group the selected Tables",
        });
    }

    return items;
}

/**
 * Returns what can be done with the given Group
 * @param {Group}   group
 * @param {Boolean} inList
 * @returns {Object[]}
 */
function groupItems(group, inList) {
    const id    = String(group.id);
    const items = [];

    if (inList) {
        items.push({
            action : "expand-group",
            icon   : "unfold",
            group  : id,
            text   : group.isExpanded ? "Close the group" : "Open the group",
        });
    }

    if (group.isFullInCanvas) {
        items.push({
            action : "remove-group-tables",
            icon   : "remove",
            group  : id,
            text   : "Remove from the board",
        });
    } else {
        items.push({
            action : "add-group-tables",
            icon   : "add",
            group  : id,
            text   : "Add to the board",
        });
    }
    items.push({
        action : "edit-group",
        icon   : "edit",
        group  : id,
        text   : "Edit the group",
    });

    items.push({
        action   : "open-remove",
        icon     : "delete",
        group    : id,
        isRemove : true,
        text     : "Delete the group",
    });

    return items;
}

/**
 * Returns what can be done with the given View
 * @param {Object} view
 * @returns {Object[]}
 */
function viewItems(view) {
    const id    = String(view.id);
    const items = [];

    if (!view.isSelected) {
        items.push({
            action : "select-view",
            icon   : "view",
            view   : id,
            text   : "Show this view",
        });
    }
    items.push({
        action : "edit-view",
        icon   : "edit",
        view   : id,
        text   : "Edit the view",
    });

    // The last View cannot go, since a Schema always has a board to show
    if (App.storage.getViews().length > 1) {
        items.push({
            action   : "open-remove-view",
            icon     : "delete",
            view     : id,
            isRemove : true,
            text     : "Delete the view",
        });
    }
    return items;
}
