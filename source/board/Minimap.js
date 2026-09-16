import Canvas from "./Canvas.js";
import Table  from "./Table.js";



// How much room the board is given inside the map, and how far a Table is
// ever shrunk: a board of two cards drawn to fill the map says no more than
// one drawn small, and says it about a board that is not there
const MAP_PADDING = 8;
const MAX_SCALE   = 0.16;

// How much of the map what is on screen is allowed to take up: the map is
// drawn twice the window, so the rectangle is half of it and there is always
// as much board around it as there is board
const VIEW_PART   = 2;



/**
 * The Minimap
 */
export default class Minimap {

    // What the Settings say about the map being drawn at all
    static isShown = false;


    /** @type {Canvas} */
    #canvas;

    /** @type {HTMLElement} */
    #element;
    /** @type {HTMLElement} */
    #board;
    /** @type {HTMLElement} */
    #view;

    /** @type {Object.<String, HTMLElement>} */
    #cards = {};

    /** @type {Object} */
    #shown = { scale : 0, top : 0, left : 0 };

    /** @type {Object?} */
    #box = null;



    /**
     * Minimap constructor
     * @param {Canvas} canvas
     */
    constructor(canvas) {
        this.#canvas  = canvas;
        this.#element = document.querySelector(".minimap");
        this.#board   = this.#element.querySelector(".minimap-board");
        this.#view    = this.#element.querySelector(".minimap-view");

        this.isMoving = false;
    }

    /**
     * Draws the board small, which is every card where it sits inside what the
     * whole of it takes up, and says where nothing is drawn at all
     * @returns {Void}
     */
    draw() {
        const board = this.#canvas.boardBounds;
        document.body.classList.toggle("has-minimap", Minimap.isShown && Boolean(board));
        if (!Minimap.isShown || !board) {
            this.#board.innerHTML = "";
            this.#cards = {};
            this.#box   = null;
            return;
        }

        // A card of the map is one Table and stays that Table, so only a board
        // that gains or loses one is drawn again, and the rest is a placing
        this.#board.innerHTML = "";
        this.#cards = {};
        this.#box   = { width : this.#board.offsetWidth, height : this.#board.offsetHeight };

        for (const table of Object.values(this.#canvas.tables)) {
            const card = document.createElement("i");
            card.className = "minimap-card";
            this.#board.appendChild(card);
            this.#cards[table.name] = card;
        }
        this.setView();
    }

    /**
     * Puts the card of the given Table where the Table is, which is what a
     * drag asks for over and over while the rest of the map stands still
     * @param {Table} table
     * @returns {Void}
     */
    place(table) {
        const card = this.#cards[table.name];
        if (!card) {
            return;
        }

        const scale = this.#shown.scale;
        card.style.width     = `${Math.max(table.width  * scale, 2)}px`;
        card.style.height    = `${Math.max(table.height * scale, 2)}px`;
        card.style.transform = `translate(${this.#shown.left + table.left * scale}px, ${this.#shown.top + table.top * scale}px)`;
    }

    /**
     * Draws the rectangle of what is on screen, which is what the map is for:
     * a board larger than the window is mostly somewhere else
     * @returns {Void}
     */
    setView() {
        const board = this.#canvas.boardBounds;
        if (!Minimap.isShown || !board || !this.#box) {
            return;
        }

        // Every scroll works the whole map out again, so a window leaving the
        // board takes the map with it a pixel at a time and brings it back the
        // same way, rather than the map jumping once it has been left behind
        const view   = this.viewBounds;
        const bounds = this.stretch(board, view);
        const width  = this.#box.width  - MAP_PADDING * 2;
        const height = this.#box.height - MAP_PADDING * 2;
        const scale  = Math.min(width / bounds.width, height / bounds.height, MAX_SCALE);

        // What is drawn is put in the middle of whatever room it does not fill
        this.#shown = {
            scale,
            left : MAP_PADDING + (width  - bounds.width  * scale) / 2 - bounds.left * scale,
            top  : MAP_PADDING + (height - bounds.height * scale) / 2 - bounds.top  * scale,
        };

        for (const table of Object.values(this.#canvas.tables)) {
            this.place(table);
        }

        this.#view.style.width     = `${view.width  * scale}px`;
        this.#view.style.height    = `${view.height * scale}px`;
        this.#view.style.transform = `translate(${this.#shown.left + view.left * scale}px, ${this.#shown.top + view.top * scale}px)`;
    }

    /**
     * Returns what is on screen, in the coordinates the Tables sit in. The
     * panel covers the left of the board, so what it hides is not on screen
     * @returns {Object}
     */
    get viewBounds() {
        const zoom      = this.#canvas.zoom.scale;
        const container = this.#canvas.container;
        const aside     = this.#canvas.asideWidth;

        return {
            top    : container.scrollTop / zoom,
            left   : (container.scrollLeft + aside) / zoom,
            width  : (container.clientWidth - aside) / zoom,
            height : container.clientHeight / zoom,
        };
    }

    /**
     * Returns the box the map is drawn for: the board and the window that is
     * looking at it, with as much room around them as the window takes, so
     * the rectangle of what is on screen is never more than half of the map
     * and there is always board to go to around it
     * @param {Object} board
     * @param {Object} view
     * @returns {Object}
     */
    stretch(board, view) {
        const bounds = this.join(board, view);
        const width  = Math.max(bounds.width,  view.width  * VIEW_PART);
        const height = Math.max(bounds.height, view.height * VIEW_PART);

        return {
            top    : bounds.top  + bounds.height / 2 - height / 2,
            left   : bounds.left + bounds.width  / 2 - width  / 2,
            width,
            height,
        };
    }

    /**
     * Returns the box that holds both of the given ones
     * @param {Object} one
     * @param {Object} other
     * @returns {Object}
     */
    join(one, other) {
        const top    = Math.min(one.top,  other.top);
        const left   = Math.min(one.left, other.left);
        const bottom = Math.max(one.top  + one.height, other.top  + other.height);
        const right  = Math.max(one.left + one.width,  other.left + other.width);

        return { top, left, width : right - left, height : bottom - top };
    }

    /**
     * Takes the board to where the map was pressed
     * @param {MouseEvent} event
     * @returns {Void}
     */
    pick(event) {
        this.isMoving = true;
        this.drag(event);
    }

    /**
     * Keeps the board following the pointer while it is held down
     * @param {MouseEvent} event
     * @returns {Boolean}
     */
    drag(event) {
        if (!this.isMoving) {
            return false;
        }

        const box   = this.#board.getBoundingClientRect();
        const scale = this.#shown.scale;
        const view  = this.viewBounds;
        const zoom  = this.#canvas.zoom.scale;

        // Where it is pressed is where the middle of the window goes
        const left = (event.clientX - box.left - this.#shown.left) / scale;
        const top  = (event.clientY - box.top  - this.#shown.top)  / scale;

        this.#canvas.container.scrollTo(
            (left - view.width  / 2) * zoom - this.#canvas.asideWidth,
            (top  - view.height / 2) * zoom,
        );
        return true;
    }

    /**
     * Lets the map go
     * @returns {Boolean}
     */
    drop() {
        if (!this.isMoving) {
            return false;
        }
        this.isMoving = false;
        return true;
    }
}
