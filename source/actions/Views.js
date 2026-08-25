import * as App     from "../App.js";
import * as Schemas from "./Schemas.js";



/**
 * Shows the given View of the current Schema, which is a board of its own
 * @param {Number} viewID
 * @returns {Promise}
 */
export async function selectView(viewID) {
    if (!App.schema || !viewID || viewID === App.storage.viewID) {
        return;
    }

    // The Tables are the same, so only what the board is made of is read
    // again: where each one sits, the Groups around them and the scroll
    const data = await App.storage.getSchema(App.storage.schemaID, false);
    App.schema.destroy();
    App.canvas.destroy();
    App.storage.selectView(viewID);
    Schemas.setSchema(data);
}

/**
 * Shows the View in the given place of the strip, if there is one there
 * @param {Number} position
 * @returns {Promise}
 */
export async function selectByPosition(position) {
    const viewID = App.storage.getViewIDs()[position - 1];
    if (viewID) {
        await selectView(viewID);
    }
}

/**
 * Opens the Dialog of the given View
 * @param {Number} viewID
 * @returns {Void}
 */
export function openViewDialog(viewID) {
    const view = App.storage.getViews().find((one) => one.id === viewID);
    if (view) {
        App.views.openDialog(view);
    }
}

/**
 * Adds or edits a View
 * @returns {Promise}
 */
export async function editView() {
    const data = App.views.updateView();
    if (!data) {
        return;
    }

    // A copy is a new View with the board of the one it is made from, so it
    // takes the name that was typed and the other one is left as it was
    const viewID = data.isCopy ? App.storage.copyView(data.id, data.name) : App.storage.setView(data);
    if (!data.id || data.isCopy) {
        await selectView(viewID);
    }
    App.views.create(App.storage.getViews());
}

/**
 * Removes the View being edited, falling back to the first one left
 * @returns {Promise}
 */
export async function removeView() {
    const viewID = App.views.viewID;
    App.views.closeRemove();
    if (!viewID) {
        return;
    }

    const wasCurrent = viewID === App.storage.viewID;
    App.storage.removeView(viewID);
    if (wasCurrent) {
        App.storage.selectView(0);
        await selectView(App.storage.getViewIDs()[0]);
    }
    App.views.create(App.storage.getViews());
}
