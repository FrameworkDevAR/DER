/**
 * The Dialog
 */
export default class Dialog {

    #isOpen   = false;
    #hasError = false;
    #timer    = 0;

    /** @type {HTMLElement} */
    #container;


    /**
     * The Dialog constructor
     * @param {String} name
     */
    constructor(name) {
        this.#container = document.querySelector(`[data-dialog="${name}"]`);
    }

    /**
     * Returns true if the Dialog is Open
     * @returns {Boolean}
     */
    get isOpen() {
        return this.#isOpen;
    }

    /**
     * Returns true if the Dialog has Error
     * @returns {Boolean}
     */
    get hasError() {
        return this.#hasError;
    }



    /**
     * Opens the Dialog
     * @returns {Void}
     */
    open() {
        this.#isOpen = true;
        this.#stopClosing();
        this.#container.style.display = "block";
        this.hideErrors();

        /** @type {HTMLInputElement} */
        const input = this.#container.querySelector("[data-field=name] input");
        if (input) {
            input.focus();
        }
    }

    /**
     * Closes the Dialog
     * @returns {Void}
     */
    close() {
        this.#isOpen = false;
        this.hideErrors();

        // A field of a Dialog that is gone keeps whatever is typed from
        // reaching the board
        if (this.#container.contains(document.activeElement) &&
            document.activeElement instanceof HTMLElement
        ) {
            document.activeElement.blur();
        }

        // Nothing to take away from a Dialog that is not on screen, and one
        // already on its way out is left to finish
        if (getComputedStyle(this.#container).display === "none") {
            this.#stopClosing();
            return;
        }
        if (this.#timer) {
            return;
        }

        // It only goes once it has finished leaving, for as long as the
        // stylesheet animates it
        const time = parseFloat(getComputedStyle(document.body).getPropertyValue("--dialog-close")) || 0;
        this.#container.classList.add("closing");
        this.#timer = window.setTimeout(() => {
            this.#stopClosing();
            this.#container.style.display = "none";
        }, time * 1000);
    }

    /**
     * Stops the Dialog from leaving, for when it is opened again on the way out
     * @returns {Void}
     */
    #stopClosing() {
        if (this.#timer) {
            window.clearTimeout(this.#timer);
            this.#timer = 0;
        }
        this.#container.classList.remove("closing");
    }



    /**
     * Returns an Element in the Dialog
     * @param {String} selector
     * @returns {HTMLElement}
     */
    getElement(selector) {
        return this.#container.querySelector(selector);
    }

    /**
     * Set the Dialog title
     * @returns {Void}
     */
    setTitle(text) {
        const element = this.getElement("h2");
        if (element) {
            element.innerHTML = text;
        }
    }

    /**
     * Set the Dialog button
     * @returns {Void}
     */
    setButton(text) {
        const element = this.getElement(".dialog-btn");
        if (element) {
            element.innerHTML = text;
        }
    }

    /**
     * Returns the Input value
     * @param {String} name
     * @returns {(Boolean|String)}
     */
    getInput(name) {
        /** @type {HTMLInputElement} */
        const input = this.#container.querySelector(`[data-field=${name}] input`);
        if (input.type === "checkbox") {
            return input.checked;
        }
        return input.value;
    }

    /**
     * Sets the Input value
     * @param {String} name
     * @param {*}      value
     * @returns {Void}
     */
    setInput(name, value) {
        const element = this.getElement(`[data-field=${name}]`);
        if (!element) {
            return;
        }
        if (element.classList.contains("file-input")) {
            const name = element.querySelector(".file-name");
            name.innerHTML = value;
            return;
        }
        const input = element.querySelector("input");
        if (input.type === "checkbox") {
            input.checked = Boolean(value);
            return;
        }
        input.value = value;
    }

    /**
     * Selects a File in the Dialog
     * @param {String}   name
     * @param {Function} onSelect
     * @returns {Void}
     */
    selectFile(name, onSelect) {
        const input    = document.createElement("input");
        input.type     = "file";
        input.accept   = ".json";
        input.onchange = () => {
            const file = input.files[0];
            this.setInput(name, file.name);
            onSelect(file);
        };
        input.click();
    }

    /**
     * Hides the Errors
     * @param {String}  error
     * @param {String=} message
     * @returns {Void}
     */
    showError(error, message = null) {
        this.#hasError = true;

        /** @type {HTMLElement} */
        const element = this.getElement(`[data-error=${error}]`);
        if (element) {
            element.style.display = "block";
            if (message) {
                element.innerText = message;
            }
        }
    }

    /**
     * Hides the Errors
     * @returns {Void}
     */
    hideErrors() {
        this.#hasError = false;
        const errors = this.#container.querySelectorAll(".error");
        for (const error of errors) {
            // @ts-ignore
            error.style.display = "none";
        }
    }
}
