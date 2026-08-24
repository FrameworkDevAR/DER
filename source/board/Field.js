/**
 * The Table Field
 */
export default class Field {

    #color = 0;

    /** @type {HTMLElement} */
    #canvasElem;
    /** @type {HTMLElement} */
    #listElem;


    /**
     * Table Field constructor
     * @param {Number}   index
     * @param {String}   name
     * @param {String}   type
     * @param {Number=}  length
     * @param {Boolean=} isPrimary
     * @param {Boolean=} isKey
     */
    constructor(index, name, type, length = 0, isPrimary = false, isKey = false) {
        this.index     = index;
        this.name      = name;
        this.type      = type;
        this.length    = length;
        this.isPrimary = isPrimary;
        this.isKey     = isKey;
        this.hasLink   = false;
    }



    /**
     * Returns the Element Tag depending on the Properties
     * @returns {String}
     */
    get elementTag() {
        return this.isPrimary ? "b" : (this.hasLink ? "i" : "span");
    }

    /**
     * Returns the class of the Element depending on the Properties
     * @returns {String}
     */
    get elementClass() {
        if (this.isPrimary) {
            return "field-primary";
        }
        return this.isKey ? "field-foreign" : "";
    }

    /**
     * Creates the Elements of a Field: the badge that names a key, the name
     * and the type. The badge is always there, so the names line up
     * @returns {HTMLElement[]}
     */
    createElems() {
        const badge = document.createElement("em");
        const name  = document.createElement(this.elementTag);
        const type  = document.createElement("span");

        badge.className = "field-badge";
        badge.innerHTML = this.isPrimary ? "PK" : (this.isKey ? "FK" : "·");

        name.className  = "field-name";
        name.innerHTML  = this.name;
        type.innerHTML  = this.type;

        return [ badge, name, type ];
    }

    /**
     * Creates the List Element
     * @param {Boolean} isHidden
     * @returns {HTMLElement}
     */
    createListElem(isHidden) {
        this.#listElem = document.createElement("li");
        this.#listElem.className = this.elementClass;

        for (const elem of this.createElems()) {
            this.#listElem.appendChild(elem);
        }

        this.#listElem.classList.toggle("schema-hide", isHidden);
        this.isListHidden = isHidden;

        return this.#listElem;
    }

    /**
     * Toggles the visibility of the Field in the List
     * @param {Boolean} isHidden
     * @returns {Void}
     */
    toggleListVisibility(isHidden) {
        this.isListHidden = isHidden;
        this.#listElem.classList.toggle("schema-hide", isHidden);
    }

    /**
     * Creates the Canvas Element
     * @param {HTMLElement} container
     * @param {Boolean}     isHidden
     * @returns {Void}
     */
    createCanvasElem(container, isHidden) {
        this.#canvasElem = document.createElement("li");
        this.#canvasElem.className = this.elementClass;

        for (const elem of this.createElems()) {
            this.#canvasElem.appendChild(elem);
        }

        this.#canvasElem.classList.toggle("schema-hide", isHidden);
        this.isHidden = isHidden;

        container.appendChild(this.#canvasElem);
    }

    /**
     * Toggles the visibility of the Field
     * @param {Boolean} isHidden
     * @returns {Void}
     */
    toggleVisibility(isHidden) {
        this.isHidden = isHidden;
        this.#canvasElem.classList.toggle("schema-hide", this.isHidden);
    }

    /**
     * Sets the Field Color
     * @param {Number} color
     * @returns {Void}
     */
    setColor(color) {
        if (this.#color) {
            return;
        }
        this.#color = color;
        this.#canvasElem.classList.add("colored", `color${color}`);
    }

    /**
     * Removes the Field Color
     * @returns {Void}
     */
    removeColor() {
        this.#canvasElem.classList.remove("colored", `color${this.#color}`);
        this.#color = 0;
    }
}
