import Table   from "./Table.js";
import Options from "../core/Options.js";
import Utils   from "../core/Utils.js";




/**
 * The Schema Link
 */
export default class Link {

    /**
     * Link constructor
     * @param {String}  fromTableName
     * @param {String}  fromFieldName
     * @param {String}  toTableName
     * @param {String}  toFieldName
     */
    constructor(fromTableName, fromFieldName, toTableName, toFieldName) {
        this.fromTableName = fromTableName;
        this.fromFieldName = fromFieldName;
        this.toTableName   = toTableName;
        this.toFieldName   = toFieldName;
    }

    /**
     * Creates the SVG element
     * @param {Table} fromTable
     * @param {Table} toTable
     * @returns {Void}
     */
    create(fromTable, toTable) {
        if (this.element) {
            this.connect();
            return;
        }

        this.fromTable = fromTable;
        this.fromField = fromTable.getField(this.fromFieldName);
        this.toTable   = toTable;
        this.toField   = toTable.getField(this.toFieldName);

        this.element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.element.classList.add("schema-link");

        this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.from = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.to   = document.createElementNS("http://www.w3.org/2000/svg", "path");

        this.from.classList.add("link-from");
        this.to.classList.add("link-to");

        this.element.appendChild(this.path);
        this.element.appendChild(this.from);
        this.element.appendChild(this.to);

        this.connect();
    }

    /**
     * Destroys the SVG element
     * @returns {Void}
     */
    destroy() {
        Utils.removeElement(this.element);
        this.element = null;
    }



    /**
     * Returns true if this link is from or the given Table
     * @param {Table} table
     * @returns {Boolean}
     */
    isLinkedTo(table) {
        return this.fromTableName === table.name || this.toTableName === table.name;
    }

    /**
     * Returns the field corresponding to the given Table
     * @param {Table} table
     * @returns {String}
     */
    getFieldName(table) {
        if (this.fromTableName === table.name && this.toTableName === table.name) {
            return this.toFieldName;
        }
        if (this.fromTableName === table.name) {
            return this.fromFieldName;
        }
        return this.toFieldName;
    }



    /**
     * Disables the Link
     * @returns {Void}
     */
    disable() {
        this.removeColor();
        this.element.classList.add("disabled");
    }

    /**
     * Un-selects the Link
     * @returns {Void}
     */
    unselect() {
        this.removeColor();
        this.element.classList.remove("disabled");
    }

    /**
     * Sets the Link color
     * @param {Number} color
     * @returns {Void}
     */
    setColor(color) {
        this.unselect();
        this.colorClass = `color${color}`;
        this.element.classList.add(this.colorClass);
    }

    /**
     * Removes the Link color
     * @returns {Void}
     */
    removeColor() {
        if (this.colorClass) {
            this.element.classList.remove(this.colorClass);
            this.colorClass = "";
        }
    }



    /**
     * Returns true if the Link has a Group at one end that the other is not in
     * @returns {Boolean}
     */
    get isCrossing() {
        const from = this.fromTable.group;
        const to   = this.toTable.group;
        if (!from && !to) {
            return false;
        }
        return !from || !to || !from.isEqual(to);
    }

    /**
     * Connects the Tables
     * @returns {Void}
     */
    connect() {
        // A Link that leaves the Group it starts in is drawn softer, so what
        // holds a Group together reads before what only passes between them
        this.element.classList.toggle("crossing", this.isCrossing);

        const fromFieldIndex = this.fromTable.getFieldIndex(this.fromField.name);
        const toFieldIndex   = this.toTable.getFieldIndex(this.toField.name);

        let topTable      = null;
        let bottomTable   = null;
        let leftTable     = null;
        let rightTable    = null;
        let leftPosition  = null;
        let rightPosition = null;
        let toEnd         = false;

        if (this.fromTable.top >= this.toTable.top) {
            topTable    = this.fromTable;
            bottomTable = this.toTable;
        } else {
            topTable    = this.toTable;
            bottomTable = this.fromTable;
        }

        if (this.fromTable.left <= this.toTable.left) {
            leftTable     = this.fromTable;
            rightTable    = this.toTable;
            leftPosition  = fromFieldIndex;
            rightPosition = toFieldIndex;
            toEnd         = true;
        } else {
            leftTable     = this.toTable;
            rightTable    = this.fromTable;
            leftPosition  = toFieldIndex;
            rightPosition = fromFieldIndex;
            toEnd         = false;
        }

        const top    = Math.min(this.fromTable.top, this.toTable.top);
        const height = Math.max(this.toTable.bottom, this.fromTable.bottom) - top;
        const startY = leftTable.top  - top + leftPosition  * Options.ROW_HEIGHT + leftTable.fieldsTop  + Options.ROW_HEIGHT / 2;
        const endY   = rightTable.top - top + rightPosition * Options.ROW_HEIGHT + rightTable.fieldsTop + Options.ROW_HEIGHT / 2;

        if (this.fromTable.name === this.toTable.name) {
            this.connectToSelf(top, height, startY, endY);
        } else {
            if (leftTable.right + 50 > rightTable.left) {
                if (topTable.left + 10 < bottomTable.left) {
                    this.connectLeftToLeft(leftTable, rightTable, top, height, startY, endY, toEnd);
                } else if (leftTable.right + 50 > rightTable.left) {
                    this.connectRightToRight(leftTable, rightTable, top, height, startY, endY, toEnd);
                }
            } else {
                this.connectLeftToRight(leftTable, rightTable, top, height, startY, endY, toEnd);
            }
        }
    }

    /**
     * Connects to the same Table
     * @param {Number} top
     * @param {Number} height
     * @param {Number} startY
     * @param {Number} endY
     * @returns {Void}
     */
    connectToSelf(top, height, startY, endY) {
        const left   = this.fromTable.right;
        const width  = Options.LINK_SIZE;

        const startX = 0;
        const endX   = 0;

        const BX = width * 0.05 + startX;
        const BY = startY;
        const CX = width + startX;
        const CY = startY;
        const DX = width + startX;
        const DY = endY;
        const EX = width * 0.05 + endX;
        const EY = endY;

        this.setBounds(left, top, width, height);
        this.setPath(startX, startY, BX, BY, CX, CY, DX, DY, EX, EY, endX, endY);
        this.setEnds({ x : startX, y : startY, dir : 1 }, { x : endX, y : endY, dir : 1 }, true);
    }

    /**
     * Connects to from the Left side of the left Table to the Left side of the right Table
     * @param {Table}   leftTable
     * @param {Table}   rightTable
     * @param {Number}  top
     * @param {Number}  height
     * @param {Number}  startY
     * @param {Number}  endY
     * @param {Boolean} toEnd
     * @returns {Void}
     */
    connectLeftToLeft(leftTable, rightTable, top, height, startY, endY, toEnd) {
        const left   = leftTable.left - Options.LINK_SIZE;
        const width  = rightTable.left - left;

        const startX = leftTable.left - left;
        const endX   = width;

        const BX = - Options.LINK_SIZE * 0.05 + startX;
        const BY = startY;
        const CX = - Options.LINK_SIZE + startX;
        const CY = startY;
        const DX = - Options.LINK_SIZE + startX;
        const DY = endY;
        const EX = - Options.LINK_SIZE * 0.05 + endX;
        const EY = endY;

        this.setBounds(left, top, width, height);
        this.setPath(startX, startY, BX, BY, CX, CY, DX, DY, EX, EY, endX, endY);
        this.setEnds({ x : startX, y : startY, dir : -1 }, { x : endX, y : endY, dir : -1 }, toEnd);
    }

    /**
     * Connects to from the Right side of the left Table to the Right side of the right Table
     * @param {Table}   leftTable
     * @param {Table}   rightTable
     * @param {Number}  top
     * @param {Number}  height
     * @param {Number}  startY
     * @param {Number}  endY
     * @param {Boolean} toEnd
     * @returns {Void}
     */
    connectRightToRight(leftTable, rightTable, top, height, startY, endY, toEnd) {
        const left   = Math.min(leftTable.right, rightTable.right);
        const width  = Math.abs(leftTable.right - rightTable.right) + Options.LINK_SIZE;

        const startX = leftTable.right - left;
        const endX   = rightTable.right - left;

        const BX = Options.LINK_SIZE * 0.05 + startX;
        const BY = startY;
        const CX = Options.LINK_SIZE + endX;
        const CY = startY;
        const DX = Options.LINK_SIZE + endX;
        const DY = endY;
        const EX = Options.LINK_SIZE * 0.05 + endX;
        const EY = endY;

        this.setBounds(left, top, width, height);
        this.setPath(startX, startY, BX, BY, CX, CY, DX, DY, EX, EY, endX, endY);
        this.setEnds({ x : startX, y : startY, dir : 1 }, { x : endX, y : endY, dir : 1 }, toEnd);
    }

    /**
     * Connects to from the Right side of the left Table to the Left side of the right Table
     * @param {Table}   leftTable
     * @param {Table}   rightTable
     * @param {Number}  top
     * @param {Number}  height
     * @param {Number}  startY
     * @param {Number}  endY
     * @param {Boolean} toEnd
     * @returns {Void}
     */
    connectLeftToRight(leftTable, rightTable, top, height, startY, endY, toEnd) {
        const left   = leftTable.right;
        const width  = rightTable.left - left;

        const startX = 0;
        const endX   = width;

        const BX = width * 0.05 + startX;
        const BY = startY;
        const CX = width * 0.66 + startX;
        const CY = startY;
        const DX = width * 0.33 + startX;
        const DY = endY;
        const EX = width * -0.05 + endX;
        const EY = endY;

        this.setBounds(left, top, width, height);
        this.setPath(startX, startY, BX, BY, CX, CY, DX, DY, EX, EY, endX, endY);
        this.setEnds({ x : startX, y : startY, dir : 1 }, { x : endX, y : endY, dir : -1 }, toEnd);
    }



    /**
     * Set the Bounds
     * @param {Number} left
     * @param {Number} top
     * @param {Number} width
     * @param {Number} height
     * @returns {Void}
     */
    setBounds(left, top, width, height) {
        // The drawing is never moved or sized: every path is written in the
        // coordinates of the board, so an end that stands still while the
        // other one drags is a mark that is not drawn again
        this.left   = left;
        this.top    = top;
        this.width  = width;
        this.height = height;
    }

    /**
     * Sets the Path
     * @param {Number} startX
     * @param {Number} startY
     * @param {Number} BX
     * @param {Number} BY
     * @param {Number} CX
     * @param {Number} CY
     * @param {Number} DX
     * @param {Number} DY
     * @param {Number} EX
     * @param {Number} EY
     * @param {Number} endX
     * @param {Number} endY
     * @returns {Void}
     */
    setPath(startX, startY, BX, BY, CX, CY, DX, DY, EX, EY, endX, endY) {
        const x = this.left;
        const y = this.top;
        const path = `M${startX + x},${startY + y} L${BX + x},${BY + y} `
            + `C${CX + x},${CY + y} ${DX + x},${DY + y} ${EX + x},${EY + y} L${endX + x},${endY + y}`;
        this.draw(this.path, path);
    }

    /**
     * Writes a path only when it is not the one drawn already, since a path
     * written again is drawn again, still or not
     * @param {SVGElement} element
     * @param {String}     path
     * @returns {Void}
     */
    draw(element, path) {
        if (element.getAttribute("d") !== path) {
            element.setAttribute("d", path);
        }
    }

    /**
     * Sets the Ends of the Link, which say how many rows meet at each of them
     * @param {{x: Number, y: Number, dir: Number}} start
     * @param {{x: Number, y: Number, dir: Number}} end
     * @param {Boolean}                             toEnd
     * @returns {Void}
     */
    setEnds(start, end, toEnd) {
        const from = toEnd ? start : end;
        const to   = toEnd ? end   : start;

        // Any amount of rows may hold the same Key, unless that Key is the one
        // thing that tells a row of its Table from another. The Key names the
        // primary of the other Table, so that end is always the one row
        const isOne = this.fromTable.isOneRow(this.fromField);

        this.draw(this.from, isOne ? this.onePath(from) : this.manyPath(from));
        this.draw(this.to, this.onePath(to));
    }

    /**
     * Returns the mark of an end that one row meets: a bar across the line
     * @param {{x: Number, y: Number, dir: Number}} end
     * @returns {String}
     */
    onePath(end) {
        const at = this.left + end.x + Options.END_SIZE * 0.7 * end.dir;
        const y  = this.top + end.y;
        return `M${at},${y - Options.END_SPREAD} L${at},${y + Options.END_SPREAD}`;
    }

    /**
     * Returns the mark of an end that many rows meet: the foot they spread
     * into, which opens against the Table it belongs to
     * @param {{x: Number, y: Number, dir: Number}} end
     * @returns {String}
     */
    manyPath(end) {
        const x  = this.left + end.x;
        const y  = this.top + end.y;
        const at = x + Options.END_SIZE * end.dir;
        return `M${at},${y} L${x},${y - Options.END_SPREAD} M${at},${y} L${x},${y + Options.END_SPREAD}`;
    }
}
