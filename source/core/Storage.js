import Table from "../board/Table.js";
import Group from "../board/Group.js";
import Utils from "./Utils.js";



// What a file written out says it is, so one that is not read as one
const EXPORT_KEY     = "der";
const EXPORT_VERSION = 1;



/**
 * The Storage
 */
export default class Storage {

    #currentID = 0;
    #nextID    = 1;
    #viewID    = 0;

    /** @type {Number[]} */
    #schemas   = [];


    /**
     * Storage constructor
     */
    constructor() {
        this.#currentID = this.getNumber("currentID", 0);
        this.#nextID    = this.getNumber("nextID", 1);
        this.#schemas   = this.getData("schemas") || [];

        if (this.#currentID) {
            this.selectSchema(this.#currentID);
        }
    }

    /**
     * Returns true if there is an item
     * @param {...(String|Number)} keys
     * @returns {Boolean}
     */
    hasItem(...keys) {
        return !!localStorage.getItem(keys.join("-"));
    }

    /**
     * Returns a stored String for the current Schema
     * @param {...(String|Number)} keys
     * @returns {String}
     */
    getString(...keys) {
        return localStorage.getItem(keys.join("-")) || "";
    }

    /**
     * Saves a String to the current Schema
     * @param {...*} items
     * @returns {Void}
     */
    setString(...items) {
        const value = items.pop();
        localStorage.setItem(items.join("-"), value);
    }

    /**
     * Returns a stored Number for the current Schema
     * @param {...*} items
     * @returns {Number}
     */
    getNumber(...items) {
        const defValue = items.pop();
        return Number(localStorage.getItem(items.join("-"))) || defValue;
    }

    /**
     * Saves a Number to the current Schema
     * @param {...*} items
     * @returns {Void}
     */
    setNumber(...items) {
        const value = items.pop();
        localStorage.setItem(items.join("-"), String(value));
    }

    /**
     * Returns a stored Object for the current Schema
     * @param {...(String|Number)} keys
     * @returns {?Object}
     */
    getData(...keys) {
        const data = localStorage.getItem(keys.join("-"));
        return data ? JSON.parse(data) : null;
    }

    /**
     * Saves an Object to the current Schema
     * @param {...*} items
     * @returns {Void}
     */
    setData(...items) {
        const value = items.pop();
        localStorage.setItem(items.join("-"), JSON.stringify(value));
    }

    /**
     * Removes an Item from the current Schema
     * @param {...(String|Number)} keys
     * @returns {Void}
     */
    removeItem(...keys) {
        localStorage.removeItem(keys.join("-"));
    }



    /**
     * Returns true if there is at least one Schema
     * @returns {Boolean}
     */
    get hasSchemas() {
        return this.#schemas.length > 0;
    }

    /**
     * Returns true if there a Schema selected
     * @returns {Boolean}
     */
    get hasSchema() {
        return this.#currentID > 0 && this.hasItem(this.#currentID, "data");
    }

    /**
     * Returns a list of Schemas
     * @returns {Object[]}
     */
    getSchemas() {
        const result = [];
        if (!this.#schemas.length) {
            return result;
        }

        for (const [ index, schemaID ] of this.#schemas.entries()) {
            const data = this.getData(schemaID, "data");
            result.push({
                schemaID,
                name       : data.name,
                position   : index + 1,
                isSelected : schemaID === this.#currentID,
            });
        }
        return result;
    }

    /**
     * Returns the Schema Data
     * @param {Number} schemaID
     * @returns {Object}
     */
    getSchemaData(schemaID) {
        const position = this.#schemas.findIndex((id) => id === schemaID) + 1;
        if (position <= 0) {
            return {};
        }
        const data = this.getData(schemaID, "data");
        data.position = position;
        return data;
    }

    /**
     * Returns the Schema
     * @param {Number=}  schemaID
     * @param {Boolean=} fetchNew
     * @returns {Promise}
     */
    async getSchema(schemaID = this.#currentID, fetchNew = true) {
        const position = this.#schemas.findIndex((id) => id === schemaID) + 1;
        if (position <= 0) {
            return {};
        }

        const data   = this.getSchemaData(schemaID);
        const result = { schemaID, position, name : data.name };

        if (fetchNew) {
            result.schema = await this.fetchSchema(data);
            this.setData(data.schemaID, "data", data);
        } else {
            result.schema = Utils.clone(data.schema);
        }
        return result;
    }



    /**
     * Selects a Schema
     * @param {Number} schemaID
     * @returns {Void}
     */
    selectSchema(schemaID) {
        this.#currentID = schemaID;
        this.setNumber("currentID", this.#currentID);

        this.createViews();
        this.#viewID = this.getNumber(this.#currentID, "viewID", 0) || this.getViewIDs()[0] || 0;
    }

    /**
     * Returns the current Schema ID
     * @returns {Number}
     */
    get schemaID() {
        return this.#currentID;
    }

    /**
     * Saves the Schema
     * @param {Object} data
     * @returns {Promise}
     */
    async setSchema(data) {
        const isEdit = Boolean(data.schemaID);

        // Update the next ID if this is a new Schema
        if (!isEdit) {
            data.schemaID = this.#nextID;
            this.#nextID += 1;
            this.setNumber("nextID", this.#nextID);
        }

        if (data.schemas && isEdit) {
            // Fetch the Schemas
            const newSchema = await this.fetchSchema(data);
            const oldSchema = this.getSchema(data.schemaID, false);

            // Remove the deleted Tables
            for (const oldKey of Object.keys(oldSchema)) {
                let found = false;
                for (const newKey of Object.keys(newSchema)) {
                    if (newKey === oldKey) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.removeItem(data.schemaID, "table", oldKey);
                }
            }
        } else if (!data.schemas) {
            const schemaData = this.getSchemaData(data.schemaID);
            data.schemas = schemaData;
        }

        // Save the Schema data
        this.setData(data.schemaID, "data", data);

        // Save the Schema ID in the correct order, taking the one being edited
        // out first so the position is read against the list it lands in
        if (isEdit) {
            this.#schemas = this.#schemas.filter((id) => id !== data.schemaID);
        }

        // Without a position given, the Schema goes last
        const position = Number(data.position) || this.#schemas.length + 1;
        const index    = Math.min(Math.max(position - 1, 0), this.#schemas.length);
        this.#schemas.splice(index, 0, data.schemaID);
        this.setData("schemas", this.#schemas);
    }

    /**
     * Fetches the Schema
     * @const {Object} data
     * @returns {Promise}
     */
    async fetchSchema(data) {
        // The flag is the one the Schema is saved with, in the singular, or a
        // Schema from a url would never be fetched and would read as undefined
        if (!data.useUrl) {
            return Utils.clone(data.schema);
        }

        await fetch(data.url).then((response) => response.json()).then((response) => {
            data.schema = response;
        });
        return Utils.clone(data.schema);
    }

    /**
     * Removes a Schema
     * @param {Number} schemaID
     * @returns {Void}
     */
    removeSchema(schemaID) {
        // Everything the Schema stored answers to its ID, its Views and the
        // boards they hold among it, so the prefix is what there is to remove
        const prefix = `${schemaID}-`;
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        }

        // Save the order
        this.#schemas = this.#schemas.filter((id) => id !== schemaID);
        this.setData("schemas", this.#schemas);

        // Remove as the current Project
        if (this.#currentID === schemaID) {
            this.selectSchema(0);
        }
    }



    /**
     * Returns what the board of the current View is made of, which is where
     * each Table sits and the Groups around them, and not where it is looked
     * at from
     * @returns {Object}
     */
    getBoard() {
        const prefix = `${this.#currentID}-${this.#viewID}-`;
        const items  = {};

        for (const key of Object.keys(localStorage)) {
            if (this.#isBoardKey(key, prefix)) {
                items[key] = localStorage.getItem(key);
            }
        }
        return items;
    }

    /**
     * Puts the board of the current View back the way it is given
     * @param {Object} items
     * @returns {Void}
     */
    setBoard(items) {
        const prefix = `${this.#currentID}-${this.#viewID}-`;

        // What came after the board was taken is no part of it, so the board
        // is cleared before it is written rather than written over
        for (const key of Object.keys(localStorage)) {
            if (this.#isBoardKey(key, prefix)) {
                localStorage.removeItem(key);
            }
        }
        for (const [ key, value ] of Object.entries(items)) {
            localStorage.setItem(key, value);
        }
    }

    /**
     * Returns true if the key holds part of the board of the given View. The
     * zoom and the scroll are where it is looked at from, which a step back
     * has no business moving
     * @param {String} key
     * @param {String} prefix
     * @returns {Boolean}
     */
    #isBoardKey(key, prefix) {
        return key.startsWith(prefix) && !key.endsWith("-zoom") && !key.endsWith("-scroll");
    }



    /**
     * Returns everything the Schema holds, to be written out as a file
     * @param {Number} schemaID
     * @returns {Object?}
     */
    exportSchema(schemaID) {
        const prefix = `${schemaID}-`;
        const items  = {};

        // Every key of the Schema answers to its ID, from the Schema itself to
        // the boards of its Views, so the prefix is all there is to gather
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix)) {
                items[key.slice(prefix.length)] = this.#readValue(localStorage.getItem(key));
            }
        }
        if (!items.data) {
            return null;
        }
        return { [EXPORT_KEY] : EXPORT_VERSION, name : this.getSchemaData(schemaID).name, items };
    }

    /**
     * Returns what is stored under a key as the value it holds, so a file
     * written out reads as what it is and not as text inside text. Only what
     * was stored as an object or a list is read back, since a string that
     * looks like a number is a string and has to come back as one
     * @param {String} value
     * @returns {*}
     */
    #readValue(value) {
        if (!value.startsWith("{") && !value.startsWith("[")) {
            return value;
        }
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    /**
     * Takes a Schema in from a file as a new one, and returns the ID it took,
     * or nothing when the file is not one that was written out
     * @param {Object} file
     * @returns {Number}
     */
    importSchema(file) {
        if (!file || file[EXPORT_KEY] !== EXPORT_VERSION || !file.items) {
            return 0;
        }

        // What is written out as a value of its own is stored as the text it
        // was, which is what everything that reads it after expects
        const items = {};
        for (const [ key, value ] of Object.entries(file.items)) {
            items[key] = typeof value === "string" ? value : JSON.stringify(value);
        }

        let data = null;
        try {
            data = JSON.parse(items.data);
        } catch {
            return 0;
        }
        if (!data || !data.name) {
            return 0;
        }

        const schemaID = this.#nextID;
        this.#nextID += 1;
        this.setNumber("nextID", this.#nextID);

        for (const [ key, value ] of Object.entries(items)) {
            localStorage.setItem(`${schemaID}-${key}`, value);
        }

        // The Schema names the ID it answers to, and it is not the one it left
        data.schemaID = schemaID;
        this.setData(schemaID, "data", data);

        this.#schemas.push(schemaID);
        this.setData("schemas", this.#schemas);
        return schemaID;
    }



    /**
     * Gives the Schema its first View, since a Schema always has a board
     * @returns {Void}
     */
    createViews() {
        if (!this.#currentID || this.getViewIDs().length) {
            return;
        }
        this.selectView(this.setView({ name : "Main" }));
    }

    /**
     * Returns the IDs of the Views of the current Schema
     * @returns {Number[]}
     */
    getViewIDs() {
        return this.getData(this.#currentID, "views") || [];
    }

    /**
     * Returns the Views of the current Schema
     * @returns {Object[]}
     */
    getViews() {
        const result = [];
        for (const viewID of this.getViewIDs()) {
            const data = this.getData(this.#currentID, "view", viewID);
            if (data) {
                result.push({
                    ...data,
                    count      : this.getViewCount(viewID),
                    isSelected : data.id === this.#viewID,
                });
            }
        }
        return result;
    }

    /**
     * Returns the amount of Tables the board of a View holds. A Table taken
     * off the board is still stored, with where it sat, so only the ones on
     * it are counted
     * @param {Number} viewID
     * @returns {Number}
     */
    getViewCount(viewID) {
        const prefix = `${this.#currentID}-${viewID}-table-`;
        let   count  = 0;

        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix)) {
                const data = this.getData(key);
                if (data && data.onCanvas) {
                    count += 1;
                }
            }
        }
        return count;
    }

    /**
     * Returns the current View ID
     * @returns {Number}
     */
    get viewID() {
        return this.#viewID;
    }

    /**
     * Returns the ID the next View takes
     * @returns {Number}
     */
    get nextView() {
        return this.getNumber(this.#currentID, "nextView", 1);
    }

    /**
     * Selects a View
     * @param {Number} viewID
     * @returns {Void}
     */
    selectView(viewID) {
        this.#viewID = viewID;
        this.setNumber(this.#currentID, "viewID", viewID);
    }

    /**
     * Saves a View, adding it at the end when it is a new one
     * @param {Object} data
     * @returns {Number}
     */
    setView(data) {
        const viewID = data.id || this.nextView;
        this.setData(this.#currentID, "view", viewID, { id : viewID, name : data.name });

        if (!data.id) {
            this.setData(this.#currentID, "views", [ ...this.getViewIDs(), viewID ]);
            this.setNumber(this.#currentID, "nextView", viewID + 1);
        }
        return viewID;
    }

    /**
     * Copies a View, board and all, and returns the one it made
     * @param {Number} viewID
     * @param {String} name
     * @returns {Number}
     */
    copyView(viewID, name) {
        const data = this.getData(this.#currentID, "view", viewID);
        if (!data) {
            return 0;
        }

        // Every key of the board answers to the View it belongs to, so the
        // copy is the same set of keys under the ID of the new one
        const newID  = this.setView({ name });
        const prefix = `${this.#currentID}-${viewID}-`;
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix)) {
                localStorage.setItem(`${this.#currentID}-${newID}-${key.slice(prefix.length)}`, localStorage.getItem(key));
            }
        }
        return newID;
    }

    /**
     * Removes a View and the board it holds
     * @param {Number} viewID
     * @returns {Void}
     */
    removeView(viewID) {
        const prefix = `${this.#currentID}-${viewID}-`;
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        }

        this.removeItem(this.#currentID, "view", viewID);
        this.setData(this.#currentID, "views", this.getViewIDs().filter((id) => id !== viewID));
    }



    /**
     * Returns the stored filter, or empty
     * @returns {String}
     */
    getFilter() {
        return this.getString(this.#currentID, "filter");
    }

    /**
     * Saves the current filter
     * @param {String} value
     * @returns {Void}
     */
    setFilter(value) {
        this.setString(this.#currentID, "filter", value);
    }

    /**
     * Removes the current filter
     * @returns {Void}
     */
    removeFilter() {
        this.removeItem(this.#currentID, "filter");
    }



    /**
     * Returns the stored width, or empty
     * @returns {Number}
     */
    getWidth() {
        return this.getNumber(this.#currentID, "width", 0);
    }

    /**
     * Saves the current width
     * @param {Number} value
     * @returns {Void}
     */
    setWidth(value) {
        this.setNumber(this.#currentID, "width", value);
    }

    /**
     * Removes the current width
     * @returns {Void}
     */
    removeWidth() {
        this.removeItem(this.#currentID, "width");
    }

    /**
     * Returns true if the Aside is collapsed
     * @returns {Boolean}
     */
    get isCollapsed() {
        return this.getNumber(this.#currentID, "collapsed", 0) === 1;
    }

    /**
     * Saves whether the Aside is collapsed
     * @param {Boolean} value
     * @returns {Void}
     */
    setCollapsed(value) {
        this.setNumber(this.#currentID, "collapsed", value ? 1 : 0);
    }



    /**
     * Returns the stored scroll, or empty
     * @returns {Object}
     */
    getScroll() {
        return this.getData(this.#currentID, this.#viewID, "scroll");
    }

    /**
     * Saves the current scroll
     * @param {Object} value
     * @returns {Void}
     */
    setScroll(value) {
        if (value && this.#currentID) {
            this.setData(this.#currentID, this.#viewID, "scroll", value);
        }
    }



    /**
     * Returns the Settings, if any were ever saved
     * @returns {Object?}
     */
    getSettings() {
        return this.getData("settings");
    }

    /**
     * Saves the Settings, which are of the app and not of a Schema
     * @param {Object} settings
     * @returns {Void}
     */
    setSettings(settings) {
        this.setData("settings", settings);
    }

    /**
     * Returns the Mode
     * @returns {String}
     */
    getMode() {
        return this.getString("mode") || "light";
    }

    /**
     * Sets the Mode, which is the light, the dark or the one of the system
     * @param {String} mode
     * @returns {Void}
     */
    setMode(mode) {
        this.setString("mode", mode);
    }



    /**
     * Returns the stored zoom, or empty
     * @returns {Number}
     */
    getZoom() {
        return this.getNumber(this.#currentID, this.#viewID, "zoom", 100);
    }

    /**
     * Saves the current zoom
     * @param {Number} value
     * @returns {Void}
     */
    setZoom(value) {
        this.setNumber(this.#currentID, this.#viewID, "zoom", value);
    }

    /**
     * Removes the current zoom
     * @returns {Void}
     */
    removeZoom() {
        this.removeItem(this.#currentID, this.#viewID, "zoom");
    }



    /**
     * Returns the stored Table data, or null
     * @param {Table} table
     * @returns {(Object|null)}
     */
    getTable(table) {
        return this.getData(this.#currentID, this.#viewID, "table", table.name);
    }

    /**
     * Adds/Edits a Table to the Storage
     * @param {Table} table
     * @returns {Void}
     */
    setTable(table) {
        // The open Table of the list is not stored: only one is open at a
        // time and it is not worth keeping between visits
        this.setData(this.#currentID, this.#viewID, "table", table.name, {
            onCanvas : table.onCanvas,
            top      : table.top,
            left     : table.left,
            showAll  : table.showAll,
        });
    }

    /**
     * Removes a Table from the Storage
     * @param {Table} table
     * @returns {Void}
     */
    removeTable(table) {
        this.removeItem(this.#currentID, this.#viewID, "table", table.name);
    }



    /**
     * Returns the next Group ID
     * @returns {Number}
     */
    get nextGroup() {
        return this.getNumber(this.#currentID, this.#viewID, "nextGroup", 1);
    }

    /**
     * Returns the Group IDs
     * @returns {Number[]}
     */
    get groupIDs() {
        const groups = this.getData(this.#currentID, this.#viewID, "groups");
        return groups || [];
    }

    /**
     * Returns the stored Groups data
     * @returns {Object[]}
     */
    getGroups() {
        const result = [];
        for (const groupID of this.groupIDs) {
            const group = this.getData(this.#currentID, this.#viewID, "group", groupID);
            result.push(group);
        }
        return result;
    }

    /**
     * Stores a Group to the Storage
     * @param {Group} group
     * @returns {Void}
     */
    setGroup(group) {
        this.setData(this.#currentID, this.#viewID, "group", group.id, {
            id         : group.id,
            name       : group.name,
            tables     : group.tableNames,
            isExpanded : group.isExpanded,
        });
    }

    /**
     * Adds a Group to the Storage
     * @param {Group} group
     * @returns {Void}
     */
    addGroup(group) {
        const groups = this.groupIDs;
        groups.push(group.id);
        this.setData(this.#currentID, this.#viewID, "groups", groups);
        this.setNumber(this.#currentID, this.#viewID, "nextGroup", group.id + 1);
    }

    /**
     * Removes a Group from the Storage
     * @param {Number} groupID
     * @returns {Void}
     */
    removeGroup(groupID) {
        const groups = this.groupIDs;
        groups.splice(groups.indexOf(groupID), 1);
        this.setData(this.#currentID, this.#viewID, "groups", groups);
        this.removeItem(this.#currentID, this.#viewID, "group", groupID);
    }

    /**
     * Removes a Group from the Storage
     * @param {Group[]} groups
     * @returns {Void}
     */
    updateGroups(groups) {
        for (const group of groups) {
            if (group.isEmpty) {
                this.removeGroup(group.id);
            } else {
                this.setGroup(group);
            }
        }
    }
}
