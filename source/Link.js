import Table   from "./Table.js";
import Options from "./Options.js";
import Utils   from "./Utils.js";




/**
 * The Schema Link
 */
export default class Link {

    /**
     * Link constructor
     * @param {String} fromTableName
     * @param {String} fromFieldName
     * @param {String} toTableName
     * @param {String} toFieldName
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
        this.element.setAttribute("width", "100%");
        this.element.setAttribute("height", "100%");

        this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.from = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this.to   = document.createElementNS("http://www.w3.org/2000/svg", "circle");

        this.from.classList.add("link-from");
        this.from.setAttribute("r", "3");
        this.to.classList.add("link-to");
        this.to.setAttribute("r", "3.5");

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
     * Connects the Tables
     * @returns {Void}
     */
    connect() {
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
        this.setEnds(startX, startY, endX, endY, true);
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
        this.setEnds(startX, startY, endX, endY, toEnd);
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
        this.setEnds(startX, startY, endX, endY, toEnd);
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
        this.setEnds(startX, startY, endX, endY, toEnd);
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
        if (this.left === left && this.top === top && this.width === width && this.height === height) {
            return;
        }

        this.left   = left;
        this.top    = top;
        this.width  = width;
        this.height = height;

        this.element.style.transform = `translate(${this.left}px, ${this.top}px)`;
        this.element.style.width     = `${this.width}px`;
        this.element.style.height    = `${this.height}px`;
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
        const path = `M${startX},${startY} L${BX},${BY} C${CX},${CY} ${DX},${DY} ${EX},${EY} L${endX},${endY}`;
        this.path.setAttribute("d", path);
    }

    /**
     * Sets the Ends of the Link: a dot where it starts and a ring where it
     * lands, which is the mark the design uses instead of an arrow
     * @param {Number}  startX
     * @param {Number}  startY
     * @param {Number}  endX
     * @param {Number}  endY
     * @param {Boolean} toEnd
     * @returns {Void}
     */
    setEnds(startX, startY, endX, endY, toEnd) {
        const from = toEnd ? { x : startX, y : startY } : { x : endX,   y : endY   };
        const to   = toEnd ? { x : endX,   y : endY   } : { x : startX, y : startY };

        this.from.setAttribute("cx", String(from.x));
        this.from.setAttribute("cy", String(from.y));
        this.to.setAttribute("cx", String(to.x));
        this.to.setAttribute("cy", String(to.y));
    }
}
