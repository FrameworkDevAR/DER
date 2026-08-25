import * as App from "../App.js";



/**
 * Collapses the panel, or opens it again, and remembers which
 * @returns {Void}
 */
export function toggleCollapse() {
    App.aside.toggleCollapse();
    App.storage.setCollapsed(App.aside.isCollapsed);
}

/**
 * Puts the caret in the filter of the panel, opening it when it is away
 * @returns {Void}
 */
export function focusFilter() {
    if (!App.schema) {
        return;
    }
    if (App.aside.isCollapsed) {
        toggleCollapse();
    }
    App.schema.focusFilter();
}
