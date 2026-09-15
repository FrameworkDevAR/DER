/**
 * The History
 */
export default class History {

    // How many steps back a board keeps, which is more than anyone walks back
    // in a row and few enough to hold on to
    static MAX_STEPS = 50;

    // How long a change of the same kind goes on being the same change, so an
    // arrow held down is one step and not one per pixel
    static SAME_TIME = 600;


    /** @type {Object[]} */
    #undos = [];
    /** @type {Object[]} */
    #redos = [];

    /** @type {String} */
    #label = "";
    /** @type {Number} */
    #time  = 0;
    /** @type {Boolean} */
    #isTaken = false;


    /**
     * Returns true if there is a step to walk back
     * @returns {Boolean}
     */
    get canUndo() {
        return this.#undos.length > 0;
    }

    /**
     * Returns true if there is a step that was walked back
     * @returns {Boolean}
     */
    get canRedo() {
        return this.#redos.length > 0;
    }

    /**
     * Takes the board as it is, before whatever is about to change it. One
     * thing that is done takes one step however many calls it is made of, and
     * so does the same thing done again while it is still being done
     * @param {Object}  board
     * @param {String=} label
     * @returns {Void}
     */
    push(board, label = "") {
        const now = Date.now();
        if (this.#isTaken || (label && label === this.#label && now - this.#time < History.SAME_TIME)) {
            this.#time = now;
            return;
        }

        // Everything the same turn of the loop does belongs to the same step,
        // since it is all one thing as far as anyone pressing anything knows
        this.#isTaken = true;
        window.setTimeout(() => {
            this.#isTaken = false;
        }, 0);

        this.#label = label;
        this.#time  = now;
        this.#redos = [];
        this.#undos.push(board);
        if (this.#undos.length > History.MAX_STEPS) {
            this.#undos.shift();
        }
    }

    /**
     * Returns the board as it was before the last change, and keeps the one
     * given to walk forward to
     * @param {Object} board
     * @returns {Object?}
     */
    undo(board) {
        return this.#walk(this.#undos, this.#redos, board);
    }

    /**
     * Returns the board as it was before the last step back
     * @param {Object} board
     * @returns {Object?}
     */
    redo(board) {
        return this.#walk(this.#redos, this.#undos, board);
    }

    /**
     * Takes the last board off one pile and puts the one given on the other.
     * A step that leaves the board as it already is is no step at all, which
     * is what a click that picked something up and put it back leaves behind
     * @param {Object[]} from
     * @param {Object[]} to
     * @param {Object}   board
     * @returns {Object?}
     */
    #walk(from, to, board) {
        while (from.length) {
            const step = from.pop();
            if (!this.#isSame(step, board)) {
                to.push(board);
                this.#label = "";
                return step;
            }
        }
        return null;
    }

    /**
     * Returns true if both boards hold the same, whatever order they hold it in
     * @param {Object} one
     * @param {Object} other
     * @returns {Boolean}
     */
    #isSame(one, other) {
        const keys = Object.keys(one).sort();
        if (keys.length !== Object.keys(other).length) {
            return false;
        }
        return keys.every((key) => one[key] === other[key]);
    }

    /**
     * Forgets every step, which is what moving to another board asks for
     * @returns {Void}
     */
    clear() {
        this.#undos = [];
        this.#redos = [];
        this.#label = "";
    }
}
