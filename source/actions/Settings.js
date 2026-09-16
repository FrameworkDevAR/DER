import * as App from "../App.js";



/**
 * Saves what the Settings Dialog was left at, and draws the board again
 * @returns {Void}
 */
export function saveSettings() {
    const data = App.settings.update();
    if (!data) {
        return;
    }

    App.configs.set(data);
    redrawBoard();
}

/**
 * Takes the map of the board away, which is the Setting that asks for it and
 * not only the map that is on screen
 * @returns {Void}
 */
export function hideMinimap() {
    App.configs.set({ showMinimap : false });
    App.canvas.minimap.draw();
    App.toast.show("The map is off in the Settings");
}

/**
 * Takes the Mode that was last picked, of the three there are
 * @returns {Void}
 */
export function restoreTheme() {
    App.mode.restore(App.storage.getMode());
}

/**
 * Takes the given Mode and keeps it for the next time
 * @param {String} mode
 * @returns {Void}
 */
export function setMode(mode) {
    App.storage.setMode(mode);
    App.mode.restore(mode);
}

/**
 * Draws every Table of the board again, since what the Settings change is how
 * much of one is shown, and a Table of another height moves its Links
 * @returns {Void}
 */
export function redrawBoard() {
    if (!App.schema) {
        return;
    }

    for (const table of Object.values(App.schema.tables)) {
        table.setFieldsShown(App.configs.values);
    }

    // The colors of what is picked are drawn on the rows, which are new ones
    App.canvas.picker.markSelection();
    App.canvas.reconnectAll();
    for (const group of Object.values(App.schema.groups)) {
        if (group.onCanvas) {
            group.position();
        }
    }

    // The map is drawn from the cards, which are of another height now, and
    // it is where the Setting that asks for it at all is answered
    App.canvas.minimap.draw();
}
