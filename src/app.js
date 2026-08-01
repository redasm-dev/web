const ROUTE_PARAMETER_REGEXP = /\[(\w+)\]/g;
const URL_FRAGMENT_REGEXP = "([^\\/]+)";

// ---- UTILITIES ------------------------------------------------------------
function updateAppTitle(newtitle) {
    let title = document.head.querySelector("title");
    if (!title) title = document.head.appendChild(document.createElement("title"));

    if (App.instance.options.name) {
        if (newtitle)
            newtitle = `${newtitle} - ${App.instance.options.name}`;
        else
            newtitle = App.instance.options.name;
    }

    title.textContent = newtitle;
}

export function navigate(path) {
    window.history.pushState(null, null, path);
    App.instance.resolveRoute();
}

export function safe(v) {
    const e = document.createElement("div");
    e.textContent = v;
    return e.innerHTML;
}

export function createTable(params) {
    params = params || {};
    const table = document.createElement("table");
    if (params.class) table.className = params.class;

    if (params.caption) {
        const caption = table.createCaption();
        if (params.captionclass) caption.className = params.captionclass;
        if (params.caption) caption.textContent = params.caption;
    }

    if (Array.isArray(params.header) && params.header.length > 0) {
        const colgroup = table.appendChild(document.createElement("colgroup"));
        const thead = table.createTHead().insertRow();
        if (params.headerclass) thead.className = params.headerclass;

        params.header.forEach((x, i) => {
            const col = document.createElement("col");
            const th = document.createElement("th");
            if (x !== null) th.textContent = x;

            if (typeof (params.headerdelegate) === "function")
                params.headerdelegate(x, { col, th }, i);

            colgroup.appendChild(col);
            thead.appendChild(th);
        });
    }

    if (Array.isArray(params.rows) && params.rows.length > 0 && typeof (params.rowDelegate) === "function") {
        const fragment = document.createDocumentFragment();
        let tbody = fragment.appendChild(document.createElement("tbody"))
        if (params.bodyclass) tbody.className = params.bodyclass;

        let currcategory = "";

        params.rows.forEach((x, i) => {
            if (typeof (params.categoryDelegate) === "function") {
                const newcategory = params.categoryDelegate(x, i);

                if (newcategory !== currcategory) {
                    if (i > 0) { // reuse first body for the first category
                        tbody = fragment.appendChild(document.createElement("tbody"))
                        if (params.bodyclass) tbody.className = params.bodyclass;
                    }

                    const row = tbody.insertRow();
                    const cell = row.insertCell();
                    cell.colSpan = params.header.length;
                    cell.innerHTML = newcategory;

                    currcategory = newcategory;
                }
            }

            const row = tbody.insertRow();
            row.innerHTML = params.rowDelegate(x, row, i);
        });

        table.appendChild(fragment);
    }

    return table;
}

export function parseHTML(html, wrappertag) {
    if (!html) return null;

    const eltemplate = document.createElement("template");
    eltemplate.innerHTML = html.trim();

    if (eltemplate.content.children.length === 1)
        return eltemplate.content.firstElementChild;

    if (wrappertag) {
        const wrapper = document.createElement(wrappertag);
        while (eltemplate.content.firstChild)
            wrapper.appendChild(eltemplate.content.firstChild);

        return wrapper;
    }

    const fragment = document.createDocumentFragment();
    while (eltemplate.content.firstChild)
        fragment.appendChild(eltemplate.content.firstChild);

    return fragment;
}

// ---- COMPONENTS -----------------------------------------------------------
export class AppComponent extends HTMLElement {
    static get observedAttributes() { return Object.keys(this.properties); }
    static get template() { return null; }
    static get properties() { return {}; }
    static get tag() { return null; }

    static register() {
        if (!this.tag) throw new Error(`${this.name} has no tag`);

        const existing = customElements.get(this.tag);
        if (existing) {
            if (existing !== this)
                console.warn(`${this.name}: tag "${this.tag}" already registered by ${existing.name}, skipping`);
            return;
        }

        if (this.template) {
            const elt = document.createElement("template");
            elt.innerHTML = this.template;
            this._template = elt;
        }

        customElements.define(this.tag, this);
    }

    constructor() {
        super();
        this._domready = false;
        this._pendingattributes = {};
    }

    connectedCallback() {
        // save children before template stamps over them
        const children = [...this.childNodes];

        // prepare getter and setters
        for (const [name, value] of Object.entries(this.constructor.properties)) {
            Object.defineProperty(this, name, {
                get: () => this.getAttribute(name) || value,
                set: v => v != null ? this.setAttribute(name, v) : this.removeAttribute(name),
                configurable: true,
            })
        }

        if (this.constructor._template)
            this.appendChild(this.constructor._template.content.cloneNode(true));

        // reparent saved children into slots
        if (children.length) {
            const defaultslot = this.querySelector("[data-slot]") ||
                this.querySelector("[data-slot='']");

            for (const c of children) {
                const slotname = c.dataset ? c.dataset.slot : null;
                const slot = slotname
                    ? this.querySelector(`[data-slot='${slotname}']`)
                    : defaultslot;

                if (slot)
                    slot.appendChild(c);
            }
        }

        this.onCreated();
        this._domready = true;

        for (const [name, value] of Object.entries(this._pendingattributes))
            this.onAttributeChanged(name, { previous: null, current: value });

        this._pendingattributes = {};
    }

    disconnectedCallback() { this.onDestroyed(); }

    attributeChangedCallback(name, oldvalue, newvalue) {
        if (this._domready) {
            this.onAttributeChanged(name, {
                previous: oldvalue != null ? oldvalue : this.constructor.properties[name],
                current: newvalue,
            });
        }
        else
            this._pendingattributes[name] = newvalue;
    }

    onCreated() { }
    onDestroyed() { }
    onAttributeChanged(name, value) { }
}

export class AppPage extends AppComponent {
    get styles() { return null; }
    get scripts() { return null; }
    get title() { return ""; }
    set title(v) { updateAppTitle(v); }

    connectedCallback() {
        super.connectedCallback(); // calls onCreated

        if (this.styles) {
            const el = document.createElement("style");
            el.id = `${this.constructor.tag}-style`;
            el.textContent = this.styles;
            document.head.appendChild(el);
        }

        if (this.scripts) {
            const el = document.createElement("script");
            el.id = `${this.constructor.tag}-script`;
            el.textContent = this.scripts;
            document.head.appendChild(el);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback(); // calls onDestroyed
        document.getElementById(`${this.constructor.tag}-style`)?.remove();
        document.getElementById(`${this.constructor.tag}-script`)?.remove();
    }
}

class NotFoundPage extends AppPage {
    static get tag() { return "not-found-page"; }

    static get template() {
        return /*html*/`
            <p style="text-align: center">
                <b>404</b>. That's an error.<br><br>
                The requested URL <i class="x-path"></i> was not found on this server.<br>
                That's all we know.
            </p>
        `;
    }

    get title() { return "Not Found"; }
    onCreated() { this.querySelector(".x-path").textContent = window.location.pathname; }
}

NotFoundPage.register();

// ---- ROUTER ---------------------------------------------------------------
export class App {
    static _instance = null;

    static get instance() {
        if (!App._instance) throw new Error("App not created yet");
        return App._instance;
    }

    constructor(routes, options = {}) {
        if (App._instance) throw new Error("App is singleton");
        App._instance = this;

        this.options = options;
        if (!this.options.main) this.options.main = "main";
        if (!this.main) throw new Error(`Main selector "${this.options.main}" not found`);

        this.routes = [];

        if (typeof (routes) == "object") {
            for (const [path, page] of Object.entries(routes))
                this.routes.push(this._createRoute(path, page));
        }

        document.body.addEventListener("click", e => {
            const a = e.target.closest("a"); // handle clicks on children of <a>
            if (!a || a.target === "_blank" || a.hasAttribute("download")) return;

            const href = a.getAttribute("href"); // get unprocessed href
            if (!href || href.includes('#')) return;

            let url;
            try {
                url = new URL(href, window.location.origin)
                if (url.origin !== window.location.origin) return;
            }
            catch { return; }

            e.preventDefault();
            navigate(url.pathname + url.hash);
        });

        this.resolveRoute();
        window.addEventListener("popstate", () => this.resolveRoute());
    }

    get main() { return document.querySelector(this.options.main); }

    _createRoute(path, page) {
        page.register();

        const params = [];

        const parsedpath = path.replace(ROUTE_PARAMETER_REGEXP, (_, param) => {
            params.push(param);
            return URL_FRAGMENT_REGEXP;
        }).replace(/\//g, '\\/');

        const regex = new RegExp(`^${parsedpath}$`);

        return {
            tag: page.tag,
            test: path => regex.test(path),
            getParams: path => {
                const p = path.match(regex);
                if (p) return Object.fromEntries(p.slice(1).map((v, i) => [params[i], v])) || {};
                return {};
            }
        };
    }

    resolveRoute() {
        const path = window.location.pathname;
        if (this.lastpath === path) return;

        this.lastpath = path;

        const r = this.routes.find(x => x.test(path)) ||
            this._createRoute(path, this.options.errorpage || NotFoundPage);

        const page = document.createElement(r.tag);
        const params = r.getParams(path);

        for (const [name, value] of Object.entries(params))
            page.setAttribute(name, value);

        if (this.main.firstChild)
            this.main.replaceChild(page, this.main.firstChild);
        else
            this.main.appendChild(page);

        updateAppTitle(page.title);
    }
}
