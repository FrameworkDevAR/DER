import Table from "../board/Table.js";
import Group from "../board/Group.js";




/**
 * The Schema
 */
export default class Schema {

    /** @type {HTMLInputElement} */
    #input;
    /** @type {HTMLElement} */
    #clear;
    /** @type {HTMLElement} */
    #total;
    /** @type {HTMLElement} */
    #list;

    /** @type {Object.<String, Table>} */
    tables = {};
    /** @type {Object.<Number, Group>} */
    groups = {};


    /**
     * The Schema constructor
     * @param {Object} data
     */
    constructor(data) {
        this.schemaID = data.schemaID;
        this.data     = data.schema;
        this.tables   = {};
        this.groups   = {};

        this.#input   = document.querySelector(".schema-filter input");
        this.#clear   = document.querySelector(".schema-filter .close");
        this.#total   = document.querySelector(".schema-total");
        this.#list    = document.querySelector(".schema-list ol");

        const title = document.querySelector(".aside-title");
        title.innerHTML = data.name;

        this.createTables();
    }

    /**
     * Creates the Table
     * @returns {Void}
     */
    createTables() {
        for (const [ name, data ] of Object.entries(this.data)) {
            this.tables[name] = new Table(name, data);
        }
    }

    /**
     * Creates the Groups
     * @param {Object[]} data
     * @returns {Group[]}
     */
    createGroups(data) {
        const groups = [];
        for (const groupData of data) {
            const tables = this.getTables(groupData.tables);
            const group  = new Group(groupData.id, groupData.name, tables, groupData.isExpanded);
            if (!group.isEmpty) {
                this.groups[group.id] = group;
            }
            groups.push(group);
        }
        return groups;
    }

    /**
     * Gathers the Tables no Group holds yet by the first part of their name,
     * which is what tells a credential_device from a log_device. A prefix only
     * one Table answers to is no grouping at all, so it is left out
     * @returns {Object[]}
     */
    getPrefixGroups() {
        const prefixes = {};
        for (const table of Object.values(this.tables)) {
            if (table.group) {
                continue;
            }
            const prefix = table.name.split("_")[0];
            if (!prefixes[prefix]) {
                prefixes[prefix] = [];
            }
            prefixes[prefix].push(table.name);
        }

        const result = [];
        for (const [ name, tables ] of Object.entries(prefixes)) {
            if (tables.length > 1) {
                result.push({ name, tables });
            }
        }
        return result;
    }

    /**
     * Returns the amount of Tables of the Schema
     * @returns {Number}
     */
    get tableCount() {
        return Object.keys(this.tables).length;
    }

    /**
     * Creates the Table List
     * @returns {Void}
     */
    createList() {
        for (const table of Object.values(this.tables)) {
            if (table.group) {
                table.group.removeFromList();
            }
            table.removeFromList();
        }

        // A Group takes its place by its own name, rather than by the first
        // Table it gathers, so the rows read in one order however they are
        // grouped and a Group does not move when it gains a Table
        const rows = [];
        for (const group of Object.values(this.groups)) {
            if (!group.isEmpty) {
                rows.push({ name : group.name, group, table : null });
            }
        }
        for (const table of Object.values(this.tables)) {
            if (!table.group) {
                rows.push({ name : table.name, group : null, table });
            }
        }
        rows.sort((one, other) => one.name.localeCompare(other.name));

        for (const row of rows) {
            if (row.group) {
                row.group.addToList(this.#list);
            } else {
                row.table.addToList(this.#list);
            }
        }
    }

    /**
     * Destroys the Schema
     * @returns {Void}
     */
    destroy() {
        for (const group of Object.values(this.groups)) {
            group.destroy();
        }
        for (const table of Object.values(this.tables)) {
            table.destroy();
        }

        this.tables = {};
        this.groups = {};
        this.data   = null;
    }



    /**
     * Returns a Table
     * @param {HTMLElement} element
     * @returns {Table?}
     */
    getTable(element) {
        const table = element.dataset.table;
        if (table && this.tables[table]) {
            return this.tables[table];
        }
        return null;
    }

    /**
     * Returns all the Tables with the given names
     * @param {String[]} tableNames
     * @returns {Object[]}
     */
    getTables(tableNames) {
        const result = [];
        for (const name of tableNames) {
            if (this.tables[name]) {
                result.push(this.tables[name]);
            }
        }
        return result;
    }



    /**
     * Returns a Group
     * @param {HTMLElement} element
     * @returns {Group?}
     */
    getGroup(element) {
        const groupID = element.dataset.group;
        if (groupID && this.groups[groupID]) {
            return this.groups[groupID];
        }
        return null;
    }

    /**
     * Sets a Group
     * @param {Object} data
     * @returns {Group}
     */
    setGroup(data) {
        let group;
        const tables = this.getTables(data.tables);
        if (data.isEdit) {
            group = this.groups[data.id];
            group.update(data.name, tables);
        } else {
            group = new Group(data.id, data.name, tables, data.isExpanded);
        }
        if (!group.isEmpty) {
            this.groups[group.id] = group;
        }
        this.createList();
        return group;
    }

    /**
     * Removes the Group
     * @param {Group} group
     * @returns {Void}
     */
    removeGroup(group) {
        group.removeFromList();
        group.destroy();
        delete this.groups[group.id];
        this.createList();
    }



    /**
     * Filters the List
     * @returns {String}
     */
    filterList() {
        const value = String(this.#input.value).toLocaleLowerCase();
        let   count = 0;
        for (const table of Object.values(this.tables)) {
            // The name of a Group is worth as much as the name of a Table, so
            // one that is looked for brings the whole of what it gathers
            const inGroup = Boolean(table.group) && table.group.name.toLocaleLowerCase().includes(value);
            if (value && !inGroup && !table.name.toLocaleLowerCase().includes(value)) {
                table.hideInList();
            } else {
                table.showInList();
                count++;
            }
        }
        for (const group of Object.values(this.groups)) {
            group.setListVisibility();
        }

        this.#clear.style.display = value ? "block" : "none";
        this.#total.innerHTML     = `${count}/${this.tableCount}`;

        return value;
    }

    /**
     * Sets the initial Filter
     * @param {String} value
     * @returns {Void}
     */
    setInitialFilter(value) {
        if (value) {
            this.#input.value = value;
        }
        this.filterList();
    }

    /**
     * Clears the Filter
     * @returns {Void}
     */
    clearFilter() {
        this.#input.value = "";
        this.filterList();
    }

    /**
     * Takes the caret out of the Filter, for whoever went on to the board
     * @returns {Void}
     */
    blurFilter() {
        this.#input.blur();
    }

    /**
     * Puts the caret in the Filter, with whatever is in it picked out so that
     * typing replaces it
     * @returns {Void}
     */
    focusFilter() {
        this.#input.focus();
        this.#input.select();
    }

    /**
     * Returns the rows of the List that can be seen, which is what the arrows
     * walk through: a Table inside a Group that is closed is not one of them
     * @returns {HTMLElement[]}
     */
    get shownRows() {
        const result = [];
        for (const element of this.#list.querySelectorAll(".schema-table, .schema-group")) {
            if (element instanceof HTMLElement && element.offsetParent) {
                result.push(element);
            }
        }
        return result;
    }

    /**
     * Walks the highlight down or up the List, from the top when there is
     * none and around the ends
     * @param {Number} step
     * @returns {Void}
     */
    moveHighlight(step) {
        const rows = this.shownRows;
        if (!rows.length) {
            return;
        }

        const current = rows.findIndex((row) => row.classList.contains("highlight"));
        const index   = current < 0 && step < 0 ? rows.length - 1 : (current + step + rows.length) % rows.length;

        // The row stops short of the end of the list, which is faded, by the
        // scroll margin the stylesheet gives it
        this.clearHighlight();
        rows[index].classList.add("highlight");
        rows[index].scrollIntoView({ block : "nearest" });
    }

    /**
     * Returns what the row the arrows landed on is about, if any
     * @returns {{table: Table?, group: Group?}?}
     */
    get highlighted() {
        const row = this.#list.querySelector(".highlight > .schema-item");
        if (!(row instanceof HTMLElement)) {
            return null;
        }
        return { table : this.getTable(row), group : this.getGroup(row) };
    }

    /**
     * Takes the highlight to the row the mouse is over, so that the arrows go
     * on from wherever it was last looked at
     * @param {EventTarget} target
     * @returns {Void}
     */
    highlightHovered(target) {
        if (!(target instanceof HTMLElement) || !this.#list.contains(target)) {
            return;
        }

        const row = target.closest(".schema-table, .schema-group");
        if (!row || row.classList.contains("highlight")) {
            return;
        }
        this.clearHighlight();
        row.classList.add("highlight");
    }

    /**
     * Takes the highlight off whatever has it
     * @returns {Void}
     */
    clearHighlight() {
        for (const row of this.#list.querySelectorAll(".highlight")) {
            row.classList.remove("highlight");
        }
    }
}
