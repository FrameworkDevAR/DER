import * as App     from "../App.js";
import * as Tables  from "./Tables.js";
import * as History from "./History.js";
import Group        from "../board/Group.js";
import Table        from "../board/Table.js";



/**
 * Opens or closes the given Group in the List
 * @param {Group} group
 * @returns {Void}
 */
export function toggleGroup(group) {
    group.toggleExpand();
    App.storage.setGroup(group);
}

/**
 * Opens the given Group in the List, leaving an open one alone
 * @param {Group} group
 * @returns {Void}
 */
export function expandGroup(group) {
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
export function openGroupOf(table) {
    if (table.group) {
        expandGroup(table.group);
    }
}

/**
 * Puts every Table of the given Group on the board
 * @param {Group} group
 * @returns {Void}
 */
export function addGroupTables(group) {
    History.remember();
    const isPlaced = group.onCanvas;
    const top      = isPlaced ? group.bottom + 40 : 0;
    const left     = isPlaced ? group.left + group.width / 2 : 0;
    const added    = [];

    for (const table of group.tables) {
        if (!table.onCanvas) {
            App.canvas.addTable(table);
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
    Tables.layoutTables(added, 100);
    group.position();

    for (const table of added) {
        App.storage.setTable(table);
    }
    expandGroup(group);
    App.canvas.showGroup(group);
    App.updateBoard();
    Tables.tidyOnAdd();
}

/**
 * Takes every Table of the given Group off the board
 * @param {Group} group
 * @returns {Void}
 */
export function removeGroupTables(group) {
    History.remember();
    App.canvas.picker.unselect();
    for (const table of group.tables) {
        if (table.onCanvas) {
            App.canvas.removeTable(table);
            App.storage.setTable(table);
        }
    }
    App.updateBoard();
}

/**
 * Gathers the Tables that are in no Group by the prefix of their name, one
 * Group each, leaving the ones already gathered where they are
 * @returns {Void}
 */
export function groupByPrefix() {
    if (!App.schema) {
        return;
    }

    History.remember();

    for (const data of App.schema.getPrefixGroups()) {
        const group = App.schema.setGroup({ id : App.storage.nextGroup, name : data.name, tables : data.tables });
        App.storage.setGroup(group);
        App.storage.addGroup(group);

        // A Group with nothing on the board has no rectangle to draw yet
        if (group.canvasTables.length) {
            App.canvas.addGroup(group);
        }
    }
    App.grouper.closeDialog();
}

/**
 * Adds or edits a Group with the Tables the Dialog gives it
 * @param {Object} data
 * @returns {Void}
 */
export function updateGroup(data) {
    History.remember();

    // A Table can only be in one Group, so the ones it is taking are asked to
    // leave the Group they are in first, since a Group that is left with
    // nothing goes away and the Tables it still holds have to be told
    for (const old of losingGroups(data)) {
        const tables = old.tables.filter((table) => !data.tables.includes(table.name));
        if (tables.length) {
            old.update(old.name, tables);
            App.storage.setGroup(old);
        } else {
            App.schema.removeGroup(old);
            App.canvas.removeGroup(old);
            App.storage.removeGroup(old.id);
        }
    }

    const group = App.schema.setGroup(data);

    // A Group of Tables that are all off the board has no rectangle to draw,
    // and one that is left with none loses the rectangle it had
    if (group.isEmptyInCanvas) {
        App.canvas.removeGroup(group);
    } else {
        App.canvas.addGroup(group);
    }
    App.canvas.picker.selectGroup(group);
    App.storage.setGroup(group);
    if (!data.isEdit) {
        App.storage.addGroup(group);
    }
    App.updateBoard();
}

/**
 * Returns the Groups the given one takes a Table from, each of them once
 * @param {Object} data
 * @returns {Group[]}
 */
export function losingGroups(data) {
    const groups = {};
    for (const name of data.tables) {
        const table = App.schema.tables[name];
        if (table && table.group && table.group.id !== data.id) {
            groups[table.group.id] = table.group;
        }
    }
    return Object.values(groups);
}

/**
 * Opens the Group Dialog
 * @param {Group?} group
 * @returns {Void}
 */
export function openGroupDialog(group) {
    if (group) {
        App.canvas.picker.stopUnselect();
        App.grouper.openDialog(
            App.storage.nextGroup,
            group,
            App.canvas.picker.selectedTables,
        );
    }
}

/**
 * Opens the Group Dialog for whatever is picked, which is a Group to edit, a
 * pile of Tables to gather, or nothing at all
 * @returns {Void}
 */
export function openGroup() {
    App.canvas.picker.stopUnselect();
    App.grouper.openDialog(
        App.storage.nextGroup,
        App.canvas.picker.currentGroup,
        App.canvas.picker.selectedTables,
        App.schema ? App.schema.getPrefixGroups().length : 0,
    );
}

/**
 * Takes what the Group Dialog holds, when it holds enough to make a Group
 * @returns {Void}
 */
export function saveGroup() {
    const data = App.grouper.updateGroup(App.schema.tables);
    if (data) {
        updateGroup(data);
    }
}

/**
 * Removes the Group the Dialog is asking about
 * @returns {Void}
 */
export function removeGroup() {
    if (!App.grouper.group) {
        return;
    }

    History.remember();
    App.schema.removeGroup(App.grouper.group);
    App.canvas.removeGroup(App.grouper.group);
    App.storage.removeGroup(App.grouper.group.id);
    App.grouper.closeDialog();
    App.grouper.closeRemove();
}

/**
 * Shows the given Group on the board. The click that finds it already picked
 * is the one that opens or closes it, and with a key held it joins the
 * selection instead of taking it over
 * @param {Group}   group
 * @param {Boolean} specialKey
 * @returns {Void}
 */
export function showGroup(group, specialKey) {
    if (!specialKey && App.canvas.picker.isGroupSelected(group)) {
        toggleGroup(group);
    }
    App.canvas.picker.pickedInList = true;
    App.canvas.showGroup(group, specialKey);
}
