// Build time (Node): renders the feature matrix from features.js into static HTML,
// so the supported formats and architectures are in the page for every crawler.
// Used by <fw-buildtime script="$lib/features.build.js" do="renderMatrix"> in pages/index.html;
// <x-supported> then only adds the mobile tabs in the browser.
import { html } from "$framework/html.js";
import Features from "$lib/features.js";

function tierIcon(tier) {
    const d = Features.tier_details[tier];
    return html`<div class="w-[24px] h-[24px] flex justify-center items-center p-1 border ${d.border} ${d.text}">${tier}</div>`;
}

export function renderMatrix() {
    return html`<div class="flex flex-col gap-y-3 text-sm">
    <div class="supported-matrix hidden md:grid grid-cols-3 bg-background-alt divide-x divide-muted border border-muted">${Features.matrix.map(m => html`
        <div>
            <div class="flex items-center uppercase pl-3 py-3 gap-x-3 border-b border-muted">
                <i class="text-primary fas fa-fw fa-lg ${m.icon}"></i>
                <h3 class="flex-1 pr-3">${m.title}</h3>
            </div>
            <div class="p-3">${m.items.map(x => html`
                <div class="grid grid-cols-3 md:grid-cols-4 py-1 gap-x-3">
                    <div class="col-span-2 md:col-span-3">${x.text}</div>
                    ${tierIcon(x.tier)}
                </div>`)}
            </div>
        </div>`)}
    </div>
    <div class="supported-matrix-mobile md:hidden flex flex-col gap-y-3"></div>
    <div class="supported-legend bg-background-alt border border-muted">
        <div class="mx-auto grid grid-cols-2 md:flex justify-between gap-2 md:gap-6 p-3">${Features.tiers.map(t => html`
            <div class="flex gap-x-2 items-center">
                ${tierIcon(t)}
                <div class="flex-1">${Features.tier_details[t].description}</div>
            </div>`)}
        </div>
    </div>
</div>`;
}
