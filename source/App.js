import Selection from "./dialogs/Selection.js";
import Grouper   from "./dialogs/Grouper.js";
import Welcome   from "./dialogs/Welcome.js";
import Aside     from "./panel/Aside.js";
import Views     from "./panel/Views.js";
import Summary   from "./panel/Summary.js";
import Schema    from "./panel/Schema.js";
import Canvas    from "./board/Canvas.js";
import Storage   from "./core/Storage.js";
import Mode      from "./core/Mode.js";
import Toast     from "./core/Toast.js";
import Tooltip   from "./core/Tooltip.js";
import Context   from "./core/Context.js";



// The one of each the app is made of, which every action reaches for
export const selection = new Selection();
export const storage   = new Storage();
export const canvas    = new Canvas();
export const mode      = new Mode();
export const grouper   = new Grouper();
export const welcome   = new Welcome();
export const aside     = new Aside();
export const views     = new Views();
export const toast     = new Toast();
export const tooltip   = new Tooltip();
export const context   = new Context();
export const summary   = new Summary();

// What the board picks is said in the Summary, from the one place every way of
// picking and letting go passes through
canvas.picker.onChange = () => summary.update(
    canvas.picker.selectedTables,
    canvas.picker.selectedGroups,
    canvas.picker.currentGroup,
    canvas.picker.pickedInList,
);

// The Schema being looked at, which changes as one is picked. It is exported
// as a binding rather than a value, so whoever imports it sees the new one
/** @type {?Schema} */
export let schema = null;



/**
 * Takes the given Schema as the one being looked at
 * @param {?Schema} value
 * @returns {Void}
 */
export function useSchema(value) {
    schema = value;
}

/**
 * Shows how much of the Schema is on the board, in the Aside and the Canvas
 * @returns {Void}
 */
export function updateBoard() {
    aside.setStatus(canvas.tableCount, schema ? schema.tableCount : 0);
    views.setCount(storage.viewID, canvas.tableCount);
    canvas.setEmpty(Boolean(schema));
}
