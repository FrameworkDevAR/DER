import Dialog from "./Dialog.js";



/**
 * The Views
 */
export default class Views {

    /** @type {HTMLElement} */
    #container;
    /** @type {HTMLElement} */
    #list;

    /** @type {Dialog} */
    #viewDialog;
    /** @type {HTMLElement} */
    #copyField;
    /** @type {HTMLElement} */
    #removeBtn;

    /** @type {Dialog} */
    #removeDialog;


    /**
     * Views constructor
     */
    constructor() {
        this.#container    = document.querySelector(".views");
        this.#list         = this.#container.querySelector("ol");

        this.#viewDialog   = new Dialog("view");
        this.#copyField    = this.#viewDialog.getElement(".view-copy");
        this.#removeBtn    = this.#viewDialog.getElement(".view-remove");

        this.#removeDialog = new Dialog("remove-view");
        this.viewID        = 0;
    }

    /**
     * Draws the strip, which is only there once a Schema is
     * @param {Object[]} views
     * @returns {Void}
     */
    create(views) {
        this.#container.style.display = views.length ? "flex" : "none";
        this.#list.innerHTML = "";

        for (const view of views) {
            const li = document.createElement("li");
            li.title          = "Double click to edit the View";
            li.className      = view.isSelected ? "selected" : "";
            li.dataset.action = "select-view";
            li.dataset.view   = String(view.id);

            const name = document.createElement("span");
            name.className = "views-name";
            name.innerHTML = view.name;
            li.appendChild(name);

            const count = document.createElement("span");
            count.className = "views-count";
            count.innerHTML = String(view.count);
            li.appendChild(count);

            // Only the View being looked at can be edited, so only that one
            // carries the button that says so
            if (view.isSelected) {
                const edit = document.createElement("a");
                edit.href           = "#";
                edit.className      = "views-edit";
                edit.title          = "Edit the View";
                edit.dataset.action = "edit-view";
                edit.dataset.view   = String(view.id);
                li.appendChild(edit);
            }

            this.#list.appendChild(li);
        }
    }

    /**
     * Shows how much of the Schema the board of the given View holds
     * @param {Number} viewID
     * @param {Number} count
     * @returns {Void}
     */
    setCount(viewID, count) {
        const elem = this.#list.querySelector(`[data-view="${viewID}"] .views-count`);
        if (elem) {
            elem.innerHTML = String(count);
        }
    }



    /**
     * Opens the View Dialog
     * @param {Object?} view
     * @returns {Void}
     */
    openDialog(view) {
        this.viewID = view ? view.id : 0;

        this.#viewDialog.setInput("name", view ? view.name : "");
        this.#viewDialog.setInput("copy", false);

        // There is nothing to copy until the View exists
        this.#copyField.style.display = view ? "flex" : "none";
        this.setCopy(false);
        this.#viewDialog.open();
    }

    /**
     * Sets what the Dialog does, since a copy leaves the View it comes from
     * alone and takes the name that is typed for itself
     * @param {Boolean} isCopy
     * @returns {Void}
     */
    setCopy(isCopy) {
        let title  = "Create a View";
        let button = "Create view";

        if (this.viewID && isCopy) {
            title  = "Copy the View";
            button = "Copy view";
        } else if (this.viewID) {
            title  = "Edit the View";
            button = "Edit view";
        }

        this.#viewDialog.setTitle(title);
        this.#viewDialog.setButton(button);

        // The last View cannot go, since a Schema always has a board to show,
        // and the one being copied is not going anywhere either
        this.#removeBtn.style.display = !isCopy && this.canRemove ? "block" : "none";
    }

    /**
     * Returns true if the View being edited is one that can be removed
     * @returns {Boolean}
     */
    get canRemove() {
        return Boolean(this.viewID) && this.#list.children.length > 1;
    }

    /**
     * Returns the View of the Dialog, or null when the name is missing
     * @returns {Object?}
     */
    updateView() {
        if (!this.#viewDialog.isOpen) {
            return null;
        }

        const name = this.#viewDialog.getInput("name");
        this.#viewDialog.hideErrors();
        if (!name) {
            this.#viewDialog.showError("name");
            return null;
        }

        const isCopy = Boolean(this.viewID) && Boolean(this.#viewDialog.getInput("copy"));
        this.#viewDialog.close();
        return { id : this.viewID, name, isCopy };
    }

    /**
     * Closes the View Dialog
     * @returns {Void}
     */
    closeDialog() {
        this.viewID = 0;
        this.#viewDialog.close();
    }



    /**
     * Opens the Remove Dialog
     * @returns {Void}
     */
    openRemove() {
        this.#viewDialog.close();
        this.#removeDialog.open();
    }

    /**
     * Closes the Remove Dialog
     * @returns {Void}
     */
    closeRemove() {
        this.viewID = 0;
        this.#removeDialog.close();
    }
}
