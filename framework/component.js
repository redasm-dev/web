// ---- UTILITIES ------------------------------------------------------------
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
