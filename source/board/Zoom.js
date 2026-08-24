import Options from "../core/Options.js";



/**
 * The Zoom
 */
export default class Zoom {

    #value = 100;

    /** @type {HTMLElement} */
    #canvas;

    /** @type {HTMLElement} */
    #text;
    /** @type {HTMLElement} */
    #inBtn;
    /** @type {HTMLElement} */
    #outBtn;


    /**
     * Zoom constructor
     * @param {HTMLElement} canvas
     */
    constructor(canvas) {
        this.#canvas = canvas;
        this.#text   = document.querySelector(".zoom-percent");
        this.#inBtn  = document.querySelector(".zoom-in");
        this.#outBtn = document.querySelector(".zoom-out");
    }

    /**
     * Returns the Zoom scale
     * @returns {Number}
     */
    get scale() {
        return this.#value / Options.DEFAULT_ZOOM;
    }

    /**
     * Returns the Zoom percent
     * @returns {Number}
     */
    get percent() {
        return this.#value / 100;
    }

    /**
     * Sets the initial Zoom
     * @param {Number} value
     * @returns {Void}
     */
    setInitialValue(value) {
        this.#value = value;
        this.#setValue();
    }

    /**
     * Increases the Canvas Zoom
     * @returns {Number}
     */
    increase() {
        if (this.#value >= Options.MAX_ZOOM) {
            return this.#value;
        }
        this.#value = this.#inBounds(this.#value + Options.ZOOM_INTERVAL);
        this.#setValue();
        return this.#value;
    }

    /**
     * Decreases the Canvas Zoom
     * @returns {Number}
     */
    decrease() {
        if (this.#value <= Options.MIN_ZOOM) {
            return this.#value;
        }
        this.#value = this.#inBounds(this.#value - Options.ZOOM_INTERVAL);
        this.#setValue();
        return this.#value;
    }

    /**
     * Takes the given Zoom, on a step of its own and inside its bounds
     * @param {Number} value
     * @returns {Number}
     */
    setValue(value) {
        // Whole percents rather than the steps the buttons take, or a board
        // that fits at 39 would be shown at 30 and a quarter of the room lost
        this.#value = this.#inBounds(Math.floor(value));
        this.#setValue();
        return this.#value;
    }

    /**
     * Resets the Canvas Zoom
     * @returns {Number}
     */
    reset() {
        this.#value = Options.DEFAULT_ZOOM;
        this.#setValue();
        return this.#value;
    }

    /**
     * Returns the given Zoom, kept between the least and the most there is
     * @param {Number} value
     * @returns {Number}
     */
    #inBounds(value) {
        return Math.min(Math.max(value, Options.MIN_ZOOM), Options.MAX_ZOOM);
    }

    /**
     * Sets the Canvas Zoom
     * @returns {Void}
     */
    #setValue() {
        this.#text.innerHTML     = `${this.#value}%`;
        this.#canvas.style.scale = String(this.scale);
        this.#canvas.style.setProperty("--zoom", String(this.scale));

        this.#inBtn.classList.toggle("zoom-disabled",  this.#value === Options.MAX_ZOOM);
        this.#outBtn.classList.toggle("zoom-disabled", this.#value === Options.MIN_ZOOM);
    }
}
