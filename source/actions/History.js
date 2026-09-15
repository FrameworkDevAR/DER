import * as App     from "../App.js";
import * as Schemas from "./Schemas.js";



/**
 * Takes the board as it is, before whatever is about to change it
 * @param {String=} label
 * @returns {Void}
 */
export function remember(label = "") {
    if (!App.schema) {
        return;
    }
    App.history.push(App.storage.getBoard(), label);
    setButtons();
}

/**
 * Puts the board back the way it was before the last change
 * @returns {Promise}
 */
export async function undo() {
    await walk(App.history.canUndo ? App.history.undo(App.storage.getBoard()) : null, "undo");
}

/**
 * Puts the board back the way it was before the last step back
 * @returns {Promise}
 */
export async function redo() {
    await walk(App.history.canRedo ? App.history.redo(App.storage.getBoard()) : null, "redo");
}

/**
 * Forgets every step, which is what another board asks for
 * @returns {Void}
 */
export function forget() {
    App.history.clear();
    setButtons();
}

/**
 * Puts the given board back and reads it again, the way moving to another
 * View does, since what changed is everything the board is made of
 * @param {Object?} board
 * @param {String}  action
 * @returns {Promise}
 */
async function walk(board, action) {
    if (!App.schema || !board) {
        App.toast.show(action === "undo" ? "There is nothing to undo" : "There is nothing to redo");
        return;
    }

    // The board was already there, so it is not brought in the way a new one
    // is, and it is left where it was being looked at rather than where the
    // scroll was last written down
    const scroll = App.canvas.scroll;

    App.storage.setBoard(board);
    const data = await App.storage.getSchema(App.storage.schemaID, false);
    App.canvas.setQuiet(true);
    App.schema.destroy();
    App.canvas.destroy();
    Schemas.setSchema(data);
    App.canvas.setQuiet(false);
    App.canvas.container.scrollTo(scroll.left, scroll.top);
    setButtons();
}

/**
 * Says on the buttons whether there is a step to take, in either direction
 * @returns {Void}
 */
function setButtons() {
    const undoBtn = document.querySelector(".icon-undo");
    const redoBtn = document.querySelector(".icon-redo");

    undoBtn.classList.toggle("icon-disabled", !App.history.canUndo);
    redoBtn.classList.toggle("icon-disabled", !App.history.canRedo);
}
