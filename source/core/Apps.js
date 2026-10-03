// The tools there are, each with what it is for and the port it runs on
// when it is this machine that serves it
const APPS = [
    { id : "der", name : "DER", text : "Draw a database as a diagram", port : 2001 },
    { id : "diff", name : "Diff", text : "Compare two files, line by line", port : 2002 },
    { id : "json", name : "JSON", text : "Edit, query and compare JSON", port : 2003 },
];

// Where the tools live, each under its own name, and the documentation
// of the Framework they come with at the top of it
const DOMAIN = "frameworkphp.com.ar";
const DOCS   = { id : "", name : "Framework", text : "Read the documentation", port : 2000 };



/**
 * The Apps, which is the menu under the logo that goes from this tool to
 * the others. It is the same in each of them, and draws itself, so a tool
 * only has to say which one it is and where its logo is
 */
export default class Apps {

    /** @type {HTMLElement} */
    #logo;
    /** @type {HTMLElement} */
    #menu;

    #isOpen = false;


    /**
     * Apps constructor
     * @param {String} current
     * @param {String} logo
     */
    constructor(current, logo) {
        this.#logo = document.querySelector(logo);
        this.#menu = document.createElement("nav");
        this.#menu.className = "apps";
        this.#menu.innerHTML = APPS.map((app) => renderApp(app, app.id === current)).join("") + renderDocs();
        document.body.appendChild(this.#menu);

        // The logo opens it, and anything else that is touched closes it
        document.addEventListener("click", (e) => {
            if (!(e.target instanceof Node)) {
                return;
            }
            if (this.#logo.contains(e.target)) {
                this.toggle();
            } else if (!this.#menu.contains(e.target)) {
                this.close();
            }
        });
        document.addEventListener("keydown", (e) => {
            if (this.#isOpen && e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            }
        }, true);
        window.addEventListener("resize", () => this.close());
    }

    /**
     * Returns true if the menu is open
     * @returns {Boolean}
     */
    get isOpen() {
        return this.#isOpen;
    }

    /**
     * Opens the menu under the logo, or closes it
     * @returns {Void}
     */
    toggle() {
        if (this.#isOpen) {
            this.close();
            return;
        }
        const bounds = this.#logo.getBoundingClientRect();
        this.#menu.style.left = `${bounds.left}px`;
        this.#menu.style.top  = `${bounds.bottom + 10}px`;
        this.#menu.classList.add("open");
        this.#isOpen = true;
    }

    /**
     * Closes the menu
     * @returns {Void}
     */
    close() {
        if (this.#isOpen) {
            this.#menu.classList.remove("open");
            this.#isOpen = false;
        }
    }
}



/**
 * Returns where the given tool is: on this machine when this one is
 * served from it, and under its own name otherwise. The documentation
 * has no name of its own, and is at the top of where the tools live
 * @param {{id: String, port: Number}} app
 * @returns {String}
 */
function getAddress(app) {
    const { hostname, protocol } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `http://${hostname}:${app.port}/`;
    }
    return `${protocol === "http:" ? "http:" : "https:"}//${app.id ? `${app.id}.` : ""}${DOMAIN}/`;
}

/**
 * Draws a tool as an item of the menu. The one that is open is told
 * apart, and goes nowhere
 * @param {{id: String, name: String, text: String, port: Number}} app
 * @param {Boolean} isCurrent
 * @returns {String}
 */
function renderApp(app, isCurrent) {
    const logo = `<span class="apps-logo"><i style="mask-image: url('icons/apps/${app.id}.svg')"></i></span>`;
    const text = `<span class="apps-text"><b>${app.name}</b><span>${app.text}</span></span>`;
    if (isCurrent) {
        return `<div class="apps-item selected">${logo}${text}<span class="apps-here">Here</span></div>`;
    }
    return `<a class="apps-item" href="${getAddress(app)}">${logo}${text}</a>`;
}

/**
 * Draws the documentation as the last item of the menu, under a line that
 * sets it apart from the tools. It has a logo of its own colors
 * @returns {String}
 */
function renderDocs() {
    const logo = '<span class="apps-logo is-image" style="background-image: url(\'icons/apps/framework.svg\')"></span>';
    const text = `<span class="apps-text"><b>${DOCS.name}</b><span>${DOCS.text}</span></span>`;
    return `<hr /><a class="apps-item" href="${getAddress(DOCS)}">${logo}${text}</a>`;
}
