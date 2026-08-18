import Group  from "./Group.js";
import Dialog from "./Dialog.js";
import Table  from "./Table.js";



/**
 * The Grouper
 */
 export default class Grouper {

    /** @type {HTMLElement} */
    #empty;
    /** @type {HTMLElement} */
    #content;
    /** @type {HTMLElement} */
    #checks;
    /** @type {HTMLElement} */
    #adding;
    /** @type {HTMLElement} */
    #added;
    /** @type {HTMLElement} */
    #remove;
    /** @type {HTMLButtonElement} */
    #prefix;

    /** @type {Dialog} */
    #removeDialog;


    /**
     * Grouper constructor
     */
    constructor() {
        this.group         = null;
        this.groupDialog   = new Dialog("group");

        this.#empty        = this.groupDialog.getElement(".group-empty");
        this.#content      = this.groupDialog.getElement(".group-content");
        this.#checks       = this.groupDialog.getElement(".group-tables");
        this.#adding       = this.groupDialog.getElement(".group-adding");
        this.#added        = this.groupDialog.getElement(".group-added");
        this.#remove       = this.groupDialog.getElement(".group-remove");
        this.#prefix       = this.groupDialog.getElement(".group-prefix");

        // Remove
        this.#removeDialog = new Dialog("remove");
    }

    /**
     * Opens the Dialog
     * @param {Number}  groupID
     * @param {Group?}  group
     * @param {Table[]} selectedTables
     * @param {Number=} prefixAmount
     * @returns {Void}
     */
    openDialog(groupID, group, selectedTables, prefixAmount = 0) {
        this.isEdit  = Boolean(group);
        this.group   = this.isEdit ? group    : null;
        this.groupID = this.isEdit ? group.id : groupID;

        this.groupDialog.setTitle(this.isEdit ? "Edit the Group" : "Create a Group");
        this.groupDialog.setButton(this.isEdit ? "Edit group" : "Create group");
        this.groupDialog.setInput("name", this.isEdit ? group.name : this.getGroupName(selectedTables));

        const showEmpty = !this.isEdit && !selectedTables.length;
        this.#empty.style.display   = showEmpty  ? "flex" : "none";
        this.#content.style.display = !showEmpty ? "flex" : "none";

        // With every Table already in a Group there is nothing left to gather
        this.#prefix.style.display = prefixAmount ? "block" : "none";
        this.#prefix.innerHTML     = `Group by prefix (${prefixAmount})`;

        // There is nothing to remove until the Group exists
        this.#remove.style.display  = this.isEdit ? "block" : "none";

        const tables = {};
        let   adding = 0;
        this.inputs  = [];
        this.#checks.innerHTML = "";
        this.#added.innerHTML  = "";

        const picked = {};
        for (const table of selectedTables) {
            picked[table.name] = true;
        }

        if (this.isEdit) {
            // Letting go of a Table of the Group is how it is dropped, so one
            // left out of the selection comes unticked. With the Group not in
            // the selection at all nothing was let go of, and a Table off the
            // board could not have been
            const isPicked = group.tables.some((table) => picked[table.name]);

            for (const table of group.tables) {
                const isChecked = !isPicked || !table.onCanvas || Boolean(picked[table.name]);
                this.createCheckbox(this.#checks, table, isChecked);
                tables[table.name] = true;
            }
        }

        // The selected Tables the Group does not hold are the ones about to
        // join it, asked for on their own so it is plain what is arriving
        for (const table of selectedTables) {
            if (!tables[table.name]) {
                this.createCheckbox(this.isEdit ? this.#added : this.#checks, table, true);
                adding += 1;
            }
        }
        this.#adding.style.display = this.isEdit && adding ? "flex" : "none";

        this.groupDialog.open();
    }

    /**
     * Gets the Group Name
     * @param {Table[]} selectedTables
     * @returns {String}
     */
    getGroupName(selectedTables) {
        const names = selectedTables.map((table) => table.name);
        const first = names[0];

        // Get the common prefix of all the names
        // Check border cases size 1 array and empty first name
        if (!first || names.length ==  1) {
            return first || "";
        }

        // While all words have the same character at position i, increment i
        let i = 0;
        while (first[i] && names.every((name) => name[i] === first[i])) {
            i += 1;
        }

        // Remove the las underscore if there is one
        if (first[i - 1] === "_") {
            i -= 1;
        }

        // Prefix is the substring from the beginning to the last successfully checked i
        return first.slice(0, i);
    }

    /**
     * Creates a Checkbox Input
     * @param {HTMLElement} container
     * @param {Table}       table
     * @param {Boolean}     isChecked
     * @returns {Void}
     */
    createCheckbox(container, table, isChecked) {
        const check = document.createElement("label");
        check.className = "checkbox-input";

        const input = document.createElement("input");
        input.type    = "checkbox";
        input.name    = table.name;
        input.value   = table.name;
        input.checked = isChecked;
        check.appendChild(input);
        this.inputs.push(input);

        const div = document.createElement("div");
        div.innerText = table.name;
        check.appendChild(div);
        container.appendChild(check);
    }

    /**
     * Updates the Group
     * @param {Object.<String, Table>} tables
     * @returns {Object?}
     */
    updateGroup(tables) {
        if (!this.groupDialog.isOpen) {
            return null;
        }

        const name = this.groupDialog.getInput("name");
        if (!name) {
            this.groupDialog.showError("name");
            return null;
        }

        // A Table that is in another Group is not an error, it leaves that one
        // for this, and the Group it came from is told after
        const tableNames = [];
        for (const input of this.inputs) {
            if (input.checked && tables[input.value]) {
                tableNames.push(input.value);
            }
        }
        if (!tableNames.length) {
            this.groupDialog.showError("table");
            return null;
        }

        this.groupDialog.close();
        return {
            name,
            isEdit : this.isEdit,
            id     : this.groupID,
            tables : tableNames,
        };
    }

    /**
     * Closes the Dialog
     * @returns {Void}
     */
    closeDialog() {
        this.group = null;
        this.groupDialog.close();
    }



    /**
     * Opens the Remove Dialog
     * @param {Group} group
     * @returns {Void}
     */
    openRemove(group) {
        if (group) {
            this.group = group;
            this.#removeDialog.open();
        }
    }

    /**
     * Closes the Remove Dialog
     * @returns {Void}
     */
    closeRemove() {
        this.group = null;
        this.#removeDialog.close();
    }
}
