import * as App    from "../App.js";
import Schema      from "../panel/Schema.js";
import Utils       from "../core/Utils.js";



// The Schema of the Framework, to try the app without one of your own
const testSchema = {
    name : "Framework",
    url  : "https://frameworkphp.com.ar/assets/schema.json",
};



/**
 * Adds the Schema of the Framework, to see the app work without one at hand
 * @returns {Promise}
 */
export async function addTestSchema() {
    const data = {
        name     : testSchema.name,
        useUrl   : true,
        url      : testSchema.url,
        position : App.storage.getSchemas().length + 1,
    };

    await App.storage.setSchema(data);
    App.welcome.close();
    selectSchema(data.schemaID);
}

/**
 * Creates the Schema and restores the Tables
 * @param {Object} data
 * @returns {Void}
 */
export function setSchema(data) {
    App.canvas.zoom.setInitialValue(100);
    const schema = new Schema(data);
    App.useSchema(schema);

    const groups = schema.createGroups(App.storage.getGroups());
    App.storage.updateGroups(groups);

    schema.createList();
    App.canvas.picker.setSchemaTables(schema.tables);
    schema.setInitialFilter(App.storage.getFilter());
    App.aside.setInitialWidth(App.storage.getWidth());
    App.aside.setInitialCollapsed(App.storage.isCollapsed);

    for (const table of Object.values(schema.tables)) {
        const data = App.storage.getTable(table);
        if (data) {
            table.restore(data);
        }
        if (table.onCanvas) {
            App.canvas.addTable(table);
        }
    }

    App.canvas.zoom.setInitialValue(App.storage.getZoom());
    App.canvas.setInitialScroll(App.storage.getScroll());
    App.views.create(App.storage.getViews());
    App.updateBoard();
}

/**
 * Selects the given Schema
 * @param {Number} schemaID
 * @returns {Promise}
 */
export async function selectSchema(schemaID) {
    const data = await App.storage.getSchema(schemaID);
    if (!data) {
        return false;
    }

    if (App.schema) {
        App.schema.destroy();
        App.canvas.destroy();
    }
    App.storage.selectSchema(schemaID);
    setSchema(data);
    return true;
}

/**
 * Edits/Adds a Schema
 * @returns {Promise}
 */
export async function editSchema() {
    const data = await App.selection.editSchema();
    if (!data) {
        return;
    }

    await App.storage.setSchema(data);
    App.welcome.close();
    App.selection.open(App.storage.getSchemas());
    if (App.schema && data && App.schema.schemaID === data.schemaID) {
        selectSchema(data.schemaID);
    }
    App.selection.closeEdit();
}

/**
 * Removes the given Schema
 * @param {Number} schemaID
 * @returns {Void}
 */
export function removeSchema(schemaID) {
    if (App.schema && App.schema.schemaID === schemaID) {
        App.canvas.destroy();
        App.schema.destroy();
        App.useSchema(null);
        App.updateBoard();
    }
    App.storage.removeSchema(schemaID);
    App.views.create(App.storage.getViews());
    App.selection.closeRemove();
    App.selection.open(App.storage.getSchemas());
}

/**
 * Writes the given Schema out as a file, with the board of every View
 * @param {Number} schemaID
 * @returns {Void}
 */
export function exportSchema(schemaID) {
    const data = App.storage.exportSchema(schemaID);
    if (!data) {
        App.toast.show("There is nothing to export");
        return;
    }

    const name = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    Utils.download(`${name}.der.json`, JSON.stringify(data, null, 4));
    App.toast.show(`Exported "${data.name}"`);
}

/**
 * Takes a Schema in from a file, and shows the board it comes with
 * @returns {Void}
 */
export function importSchema() {
    Utils.selectFile(async (file) => {
        let data = null;
        try {
            data = JSON.parse(await file.text());
        } catch {
            data = null;
        }

        const schemaID = App.storage.importSchema(data);
        if (!schemaID) {
            App.toast.show("That file is not a Schema written out by DER");
            return;
        }

        await selectSchema(schemaID);
        App.welcome.close();

        // The Dialog stays put while there is nothing to go back to, and the
        // Schema that just came in is something to go back to
        App.selection.canClose = true;
        App.selection.close();
        App.toast.show(`Imported "${data.name}"`);
    });
}

/**
 * Opens the Dialog of the given Schema, when there is one under that ID
 * @param {Number} schemaID
 * @returns {Void}
 */
export function openEdit(schemaID) {
    const data = App.storage.getSchemaData(schemaID);
    if (data) {
        App.selection.openEdit(data);
    }
}
