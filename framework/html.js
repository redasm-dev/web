// html`...`: a template tag that escapes every interpolated value, unless it's
// already HTML (the result of another html`...` or raw()). Arrays are joined, and
// null, undefined and false render as nothing, so lists and conditionals read naturally:
//
//   html`<ul>${items.map(x => html`<li>${x.name}</li>`)}</ul>`
//   html`${item.official && html`<b>Official</b>`}`
//
// No DOM and no Node APIs: usable in the browser and in *.build.js modules alike.

class RawHTML {
    constructor(value) { this.value = value; }
    toString() { return this.value; }
}

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export function escape(value) {
    return String(value).replace(/[&<>"']/g, c => ENTITIES[c]);
}

// Trusted HTML that must not be escaped.
export function raw(value) {
    return new RawHTML(String(value));
}

function render(value) {
    if (value == null || value === false) return "";
    if (value instanceof RawHTML) return value.value;
    if (Array.isArray(value)) return value.map(render).join("");
    return escape(value);
}

export function html(strings, ...values) {
    let result = strings[0];

    for (let i = 0; i < values.length; i++)
        result += render(values[i]) + strings[i + 1];

    return raw(result);
}
