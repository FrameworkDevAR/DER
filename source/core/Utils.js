/**
 * Clones an Object
 * @param {Object} object
 * @returns {Object}
 */
function clone(object) {
    return JSON.parse(JSON.stringify(object));
}

/**
 * Extends the first array replacing values from the second array
 * @param {Object} object1
 * @param {Object} object2
 * @return {Object}
 */
function extend(object1, object2) {
    const result = clone(object1);
    for (const [ key, value ] of Object.entries(object2)) {
        if (Object.keys(value).length && result[key] && Object.keys(result[key]).length) {
            result[key] = extend(value, result[key]);
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Returns the distance between pos and other
 * @param {{top: Number, left: Number}} pos
 * @param {{top: Number, left: Number}} other
 * @returns {Number}
 */
function dist(pos, other) {
    return Math.hypot(pos.top - other.top, pos.left - other.left);
}



/**
 * Returns true if the element has any of the classes
 * @param {HTMLElement} element
 * @param  {...String}  className
 * @returns {Boolean}
 */
function hasClass(element, ...className) {
    return className.some(name => element.classList.contains(name));
}

/**
 * Returns an element from the Target with an action
 * @param {MouseEvent} event
 * @returns {HTMLElement}
 */
function getTarget(event) {
    /** @type {HTMLElement} */
    // @ts-ignore
    let element = event.target;
    while (element.parentElement && !element.dataset.action) {
        element = element.parentElement;
    }
    return element;
}

/**
 * Returns an element from the Target with an action
 * @param {MouseEvent} event
 * @param {...String}  className
 * @returns {HTMLElement?}
 */
function getClosest(event, ...className) {
    /** @type {HTMLElement} */
    // @ts-ignore
    let element = event.target;
    while (element.parentElement && !hasClass(element, ...className)) {
        element = element.parentElement;
    }
    if (hasClass(element, ...className)) {
        return element;
    }
    return null;
}

/**
 * Removes the Element from the DOM
 * @param {(HTMLElement|SVGSVGElement)} element
 * @returns {Void}
 */
function removeElement(element) {
    const parent = element.parentNode;
    if (parent) {
        parent.removeChild(element);
    }
}



/**
 * Returns the Bounds using 2 positions
 * @param {{top: Number, left: Number}} pos
 * @param {{top: Number, left: Number}} other
 * @returns {Object}
 */
 function createBounds(pos, other) {
    const top    = Math.min(pos.top,  other.top);
    const left   = Math.min(pos.left, other.left);
    const width  = Math.abs(pos.left - other.left);
    const height = Math.abs(pos.top  - other.top);
    const bottom = top  + height;
    const right  = left + width;
    return { top, left, bottom, right, width, height };
}

/**
 * Returns true if the given Position is in the Bounds
 * @param {{top: Number, left: Number}} pos
 * @param {Object}                      bounds
 * @param {Number=}                     scrollTop
 * @param {Number=}                     scrollLeft
 * @returns {Boolean}
 */
function inBounds(pos, bounds, scrollTop = 0, scrollLeft = 0) {
    const top  = pos.top  - scrollTop;
    const left = pos.left - scrollLeft;
    return (
        top  > bounds.top  && top  < bounds.bottom &&
        left > bounds.left && left < bounds.right
    );
}

/**
 * Returns true if the given Bounds intersect
 * @param {Object} bounds
 * @param {Object} other
 * @returns {Boolean}
 */
function intersectsBounds(bounds, other) {
    // The first rectangle is under the second or vice versa
    if (bounds.top > other.bottom || bounds.bottom < other.top) {
        return false;
    }
    // The first rectangle is to the left of the second or vice versa
    if (bounds.right < other.left || bounds.left > other.right) {
        return false;
    }
    // Rectangles overlap
    return true;
}

/**
 * Returns true if the given Position is in the Element
 * @param {{top: Number, left: Number}} pos
 * @param {HTMLElement}                 element
 * @param {Number=}                     scrollTop
 * @param {Number=}                     scrollLeft
 * @returns {Boolean}
 */
function inElement(pos, element, scrollTop = 0, scrollLeft = 0) {
    const bounds = element.getBoundingClientRect();
    return inBounds(pos, bounds, scrollTop, scrollLeft);
}

/**
 * Returns the Mouse Position
 * @param {MouseEvent} event
 * @param {Boolean=}   withScroll
 * @returns {{top: Number, left: Number}}
 */
function getMousePos(event, withScroll = true) {
    let top  = 0;
    let left = 0;
    if (event.pageX) {
        top  = event.pageY;
        left = event.pageX;
    } else if (event.clientX) {
        top  = event.clientY;
        left = event.clientX;
        if (withScroll) {
            top  += document.documentElement.scrollTop  || document.body.scrollTop;
            left += document.documentElement.scrollLeft || document.body.scrollLeft;
        }
    }
    return { top, left };
}

/**
 * Unselects the elements
 * @returns {Void}
 */
function unselect() {
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    // @ts-ignore
    } else if (document.selection) {
        // @ts-ignore
        document.selection.empty();
    }
}




// The public API
export default {
    clone,
    extend,
    dist,

    hasClass,
    getTarget,
    getClosest,
    removeElement,

    createBounds,
    inBounds,
    intersectsBounds,
    inElement,
    getMousePos,
    unselect,
};
