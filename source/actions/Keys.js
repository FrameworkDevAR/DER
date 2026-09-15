import * as App     from "../App.js";
import * as Aside   from "./Aside.js";
import * as Groups  from "./Groups.js";
import * as Tables  from "./Tables.js";
import * as Views   from "./Views.js";
import * as History from "./History.js";



// How far an arrow moves what is picked, and how far with the shift held
const NUDGE_STEP = 1;
const NUDGE_JUMP = 10;

// What each arrow adds to where a Table sits
const ARROWS = {
    arrowup    : { top : -1, left :  0 },
    arrowdown  : { top :  1, left :  0 },
    arrowleft  : { top :  0, left : -1 },
    arrowright : { top :  0, left :  1 },
};

// What the keys held with another are called, which is not the same everywhere
const IS_MAC    = navigator.platform.startsWith("Mac");
const MOD_KEY   = IS_MAC ? "\u2318" : "Ctrl";
const SHIFT_KEY = IS_MAC ? "\u21E7" : "Shift";

// Whether the Space that turns a drag into one that moves the board is held
let isSpaceHeld = false;

// Every key the board answers to, said once: the handler reads it, the
// Settings list it, and the tooltip of a button says which key does the same.
// A name of "Mod" is the key that is held, whichever this machine calls it
const SHORTCUTS = [
    {
        names  : [ "Esc" ],
        keys   : [ "escape" ],
        always : true,
        text   : "<b>Close</b> the menu or a dialog, <b>empty</b> the filter, <b>drop</b> the selection",
        run    : closeSomething,
    },
    {
        names     : [ "Mod", "Z" ],
        keys      : [ "z" ],
        withKey   : true,
        notTyping : true,
        action    : "undo",
        text      : "<b>Undo</b> the last change",
        run       : History.undo,
    },
    {
        names     : [ "Mod", "Shift", "Z" ],
        keys      : [ "z" ],
        withKey   : true,
        withShift : true,
        notTyping : true,
        action    : "redo",
        text      : "<b>Redo</b> the last change",
        run       : History.redo,
    },
    {
        names   : [ "Mod", "F" ],
        keys    : [ "f" ],
        withKey : true,
        text   : "<b>Filter</b> the Tables of the panel",
        run    : Aside.focusFilter,
    },
    {
        names    : [ "\u2191", "\u2193" ],
        keys     : [ "arrowup", "arrowdown" ],
        always   : true,
        anyShift : true,
        text   : "<b>Walk</b> the rows of the panel",
        run    : moveUpDown,
    },
    {
        names    : [ "\u2190", "\u2192" ],
        keys     : [ "arrowleft", "arrowright" ],
        always   : true,
        anyShift : true,
        text   : "<b>Open</b> or <b>close</b> the row the arrows are on",
        run    : moveLeftRight,
    },
    {
        names  : [ "Enter" ],
        keys   : [ "enter" ],
        always : true,
        text   : "<b>Select</b> the row the arrows are on, or let go of it",
        run    : pickHighlighted,
    },
    {
        names   : [ "Mod", "B" ],
        keys    : [ "b" ],
        withKey : true,
        action : "toggle-aside",
        text   : "<b>Collapse</b> the panel, or open it again",
        run    : Aside.toggleCollapse,
    },
    {
        names   : [ "Mod", "E" ],
        keys    : [ "e" ],
        withKey : true,
        action  : "fit-board",
        text   : "Show the <b>whole board</b> at once",
        run    : Tables.fitBoard,
    },
    {
        names     : [ "Mod", "Shift", "E" ],
        keys      : [ "e" ],
        withKey   : true,
        withShift : true,
        text      : "<b>Zoom in</b> on what is selected",
        run       : Tables.fitPicked,
    },
    {
        names   : [ "Mod", "D" ],
        keys    : [ "d" ],
        withKey : true,
        action  : "tidy-board",
        text   : "<b>Tidy</b> the board",
        run    : Tables.tidyBoard,
    },
    {
        names   : [ "Mod", "G" ],
        keys    : [ "g" ],
        withKey : true,
        action : "open-group",
        text   : "<b>Create a Group</b> with the selected Tables",
        run    : Groups.openGroup,
    },
    {
        names   : [ "Mod", "\u232B" ],
        keys    : [ "delete", "backspace" ],
        withKey : true,
        text    : "<b>Remove</b> the selected Table or Group from the board",
        run  : Tables.removePicked,
    },
    {
        names  : [ "Mod", "+" ],
        keys     : [ "+", "=" ],
        anyKey   : true,
        anyShift : true,
        action : "zoom-in",
        text   : "<b>Zoom in</b>",
        run    : () => Tables.setZoom("in"),
    },
    {
        names  : [ "Mod", "\u2212" ],
        keys     : [ "-", "_" ],
        anyKey   : true,
        anyShift : true,
        action : "zoom-out",
        text   : "<b>Zoom out</b>",
        run    : () => Tables.setZoom("out"),
    },
    {
        names  : [ "Mod", "0" ],
        keys   : [ "0" ],
        anyKey : true,
        action : "reset-zoom",
        text   : "<b>Reset the zoom</b>",
        run    : () => Tables.setZoom("reset"),
    },
    {
        names  : [ "Mod", "1 \u2013 9" ],
        keys   : [ "1", "2", "3", "4", "5", "6", "7", "8", "9" ],
        anyKey : true,
        text   : "Show the <b>View</b> with that number",
        run    : (event) => Views.selectByPosition(Number(event.key)),
    },
    {
        names   : [ "Mod", "," ],
        keys    : [ "," ],
        withKey : true,
        action  : "open-settings",
        text    : "Open the <b>Settings</b>",
        run     : () => App.settings.open(),
    },
    {
        names    : [ "?" ],
        keys     : [ "?" ],
        anyShift : true,
        text     : "Show this list of <b>shortcuts</b>",
        run      : () => App.settings.open("keys"),
    },
    {
        // The Space is held rather than pressed, and is answered where the
        // drag it belongs to begins, so it runs nothing of its own
        names : [ "Space" ],
        keys  : [],
        text  : "Hold to <b>drag the board</b> from anywhere",
    },
    {
        // Every arrow is answered by the two above, which walk the panel while
        // the filter has the caret and move the board when it does not. This
        // one is here to be read, and answers no key of its own
        names : [ "\u2190", "\u2191", "\u2193", "\u2192" ],
        keys  : [],
        text  : "<b>Move</b> what is selected. Hold <b>Shift</b> to move by 10 px",
    },
];



/**
 * Does what the given key asks of the board, and says whether it asked for
 * anything: a key that is not bound is left to the browser
 * @param {KeyboardEvent} event
 * @returns {Boolean}
 */
export function handleKey(event) {
    if (event.altKey) {
        return false;
    }

    // The Space is held rather than pressed, and only says that the drag that
    // may follow moves the board, so nothing else reads it
    if (event.key === " ") {
        if (event.ctrlKey || event.metaKey || getOpenDialog() || isTyping()) {
            return false;
        }
        setPanning(true);
        return true;
    }

    // A key held is part of what is pressed, so one that asks for it is not
    // the same shortcut as the letter on its own
    const withKey  = event.ctrlKey || event.metaKey;
    const key      = event.key.toLowerCase();
    const shortcut = SHORTCUTS.find((one) => one.keys.includes(key) &&
        (one.anyKey || Boolean(one.withKey) === withKey) &&
        (one.anyShift || Boolean(one.withShift) === event.shiftKey));
    if (!shortcut) {
        return false;
    }

    // A Dialog is a question, and the board is not listening until it is
    // answered or taken away. What is typed belongs to the field it is typed
    // in, unless a key is held, which is what tells a command from a letter
    if (!shortcut.always) {
        if (getOpenDialog()) {
            return false;
        }
        // A field takes its own steps back, which are not the board's
        if ((!withKey || shortcut.notTyping) && isTyping()) {
            return false;
        }
    }
    return shortcut.run(event) !== false;
}

/**
 * Lets go of the board when the Space is released, and when the window loses
 * the keys, which is never followed by a keyup
 * @param {KeyboardEvent=} event
 * @returns {Void}
 */
export function handleKeyUp(event = null) {
    if (!event || event.key === " ") {
        setPanning(false);
    }
}

/**
 * Says whether a drag would move the board rather than what it starts on
 * @returns {Boolean}
 */
export function isPanning() {
    return isSpaceHeld;
}

/**
 * Takes hold of the board, or lets go of it
 * @param {Boolean} value
 * @returns {Void}
 */
function setPanning(value) {
    isSpaceHeld = value;
    document.body.classList.toggle("panning", value);
}

/**
 * Says which key does the same as a button, on the button itself
 * @returns {Void}
 */
export function showKeys() {
    for (const shortcut of SHORTCUTS) {
        if (!shortcut.action) {
            continue;
        }
        const name = getNames(shortcut).join(" ");
        for (const element of document.querySelectorAll(`[data-action="${shortcut.action}"][data-tip]`)) {
            if (element instanceof HTMLElement) {
                element.dataset.keys = name;
            }
        }
    }
}

/**
 * Returns the name of the key that is held, as this machine calls it
 * @returns {String}
 */
export function getModKey() {
    return MOD_KEY;
}

/**
 * Returns every shortcut there is, to be listed
 * @returns {Object[]}
 */
export function getShortcuts() {
    return SHORTCUTS.map((shortcut) => ({ names : getNames(shortcut), text : shortcut.text }));
}

/**
 * Returns the keys of the given Shortcut as this machine calls them
 * @param {Object} shortcut
 * @returns {String[]}
 */
function getNames(shortcut) {
    return shortcut.names.map((name) => {
        switch (name) {
        case "Mod":
            return MOD_KEY;
        case "Shift":
            return SHIFT_KEY;
        default:
            return name;
        }
    });
}

/**
 * Closes whatever is open, from the top: the menu, then a Dialog that can be
 * closed, then what is typed in the filter, and then the selection
 * @returns {Boolean}
 */
function closeSomething() {
    if (App.context.isOpen) {
        App.context.close();
        return true;
    }

    // A Dialog is closed the way its own button closes it
    const dialog = getOpenDialog();
    if (dialog) {
        const close = dialog.querySelector("[data-action^='close-']");
        if (close instanceof HTMLElement) {
            close.click();
            return true;
        }
        return false;
    }

    if (isTyping()) {
        return clearFilter();
    }
    if (App.canvas.picker.hasSelection) {
        App.canvas.picker.unselect();
        return true;
    }
    return false;
}

/**
 * Walks the List while the filter has the caret, and moves what is picked on
 * the board otherwise: the arrows belong to whatever is being looked at
 * @param {KeyboardEvent} event
 * @returns {Boolean}
 */
function moveUpDown(event) {
    if (isTypingInFilter()) {
        App.schema.moveHighlight(event.key === "ArrowUp" ? -1 : 1);
        return true;
    }
    if (isTyping() || getOpenDialog()) {
        return false;
    }
    return nudge(event);
}

/**
 * Opens or closes the row that is walked to, and moves what is picked on the
 * board otherwise. Before a row is walked to, the arrows are the caret of the
 * filter, so what is typed there can still be edited
 * @param {KeyboardEvent} event
 * @returns {Boolean}
 */
function moveLeftRight(event) {
    if (isTypingInFilter()) {
        return App.schema.highlighted ? expandHighlighted(event.key === "ArrowRight") : false;
    }
    if (isTyping() || getOpenDialog()) {
        return false;
    }
    return nudge(event);
}

/**
 * Opens the row the arrows are on, or closes it, whichever was asked for
 * @param {Boolean} isOpen
 * @returns {Boolean}
 */
function expandHighlighted(isOpen) {
    const { table, group } = App.schema.highlighted;
    if (group && group.isExpanded !== isOpen) {
        Groups.toggleGroup(group);
        return true;
    }
    if (table && table.isExpanded !== isOpen) {
        Tables.expandTable(table);
        return true;
    }
    return true;
}

/**
 * Picks the row the arrows landed on, which is what the List is walked for
 * @returns {Boolean}
 */
function pickHighlighted() {
    if (!isTypingInFilter() || !App.schema) {
        return false;
    }

    // Picking with a key adds to what is picked, and picking again lets go,
    // since walking the List is a way of gathering a few rows
    const item = App.schema.highlighted;
    if (!item) {
        return false;
    }
    if (item.group) {
        Groups.showGroup(item.group, true);
    } else if (item.table) {
        Tables.selectFromList(item.table, true);
    }
    return true;
}

/**
 * Returns true if the caret is in the filter of the panel
 * @returns {Boolean}
 */
function isTypingInFilter() {
    const element = document.activeElement;
    return Boolean(App.schema) && element instanceof HTMLInputElement && element.name === "filter";
}

/**
 * Moves what is picked by one point, or by the whole of a grid step
 * @param {KeyboardEvent} event
 * @returns {Boolean}
 */
function nudge(event) {
    const arrow  = ARROWS[event.key.toLowerCase()];
    const amount = event.shiftKey ? NUDGE_JUMP : NUDGE_STEP;
    Tables.nudgeTables(arrow.top * amount, arrow.left * amount);
    return true;
}

/**
 * Empties the filter of the panel, or lets it go when it is empty already
 * @returns {Boolean}
 */
function clearFilter() {
    const element = document.activeElement;
    if (!App.schema || !(element instanceof HTMLInputElement) || element.name !== "filter") {
        return false;
    }

    App.schema.clearHighlight();
    if (element.value) {
        App.schema.clearFilter();
        App.storage.removeFilter();
    } else {
        App.schema.blurFilter();
    }
    return true;
}

/**
 * Returns the Dialog that is open, if any is
 * @returns {HTMLElement?}
 */
function getOpenDialog() {
    for (const element of document.querySelectorAll("[data-dialog]")) {
        // One on its way out is already answered, and a second Escape belongs
        // to whatever is behind it
        if (element instanceof HTMLElement && !element.classList.contains("closing") &&
            getComputedStyle(element).display !== "none"
        ) {
            return element;
        }
    }
    return null;
}

/**
 * Returns true if what is typed belongs to a field rather than to the board
 * @returns {Boolean}
 */
function isTyping() {
    const element = document.activeElement;
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}
