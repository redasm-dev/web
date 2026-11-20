// Build time (Node): renders the feature matrix from features.js into static HTML,
// so the supported formats and architectures are in the page for every crawler.
// Used by <fw-buildtime script="$lib/features.build.js" do="renderMatrix"> in pages/index.html.
//
// The tabs are radio buttons + labels, styled in global.css (x-supported): no JavaScript,
// each item appears once, and they work on mobile (stacked) and desktop (in a row).
import { html } from "$framework/html.js";
import Features from "$lib/features.js";

function tierIcon(tier) {
    const d = Features.tier_details[tier];
    return html`<div class="w-[24px] h-[24px] flex justify-center items-center p-1 border ${d.border} ${d.text}">${tier}</div>`;
}

export function renderMatrix() {
    return html`<div class="supported-matrix">${Features.matrix.map((m, i) => html`
    <input type="radio" name="supported-matrix" id="supported-${m.title}"${i === 0 && html` checked`}>
    <label for="supported-${m.title}"><i class="fas fa-fw ${m.icon}"></i>${m.title}</label>
    <ul class="supported-panel">${m.items.map(x => html`
        <li><span>${x.text}</span>${tierIcon(x.tier)}</li>`)}
    </ul>`)}
</div>
<div class="supported-legend">${Features.tiers.map(t => html`
    <div>${tierIcon(t)}<span>${Features.tier_details[t].description}</span></div>`)}
</div>`;
}
