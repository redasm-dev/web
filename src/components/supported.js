import { AppComponent } from "$framework/component.js";
import Features from "$lib/features.js";

// The desktop matrix and the legend are static HTML, rendered at build time by
// features.build.js. In the browser, this only adds the mobile tabs.
class Supported extends AppComponent {
    static get tag() { return "x-supported"; }

    onCreated() {
        this._createMatrixMobile();
    }

    _createMatrixMobile() {
        const s_matrix = this.querySelector(".supported-matrix-mobile");
        if (!s_matrix) return;

        const ul = s_matrix.appendChild(document.createElement("ul"));
        ul.classList.add("flex", "flex-col", "gap-y-1");

        for (const [i, mi] of Features.matrix.entries()) {
            const li = ul.appendChild(document.createElement("li"));
            const button = li.appendChild(document.createElement("button"));
            button.classList.add("cursor-pointer", "w-full", "px-2", "py-1", "uppercase", "border", "border-muted", "text-muted", "bg-background-alt", "matrix-container-button");
            button.type = "button";
            button.textContent = mi.title;

            const item_container = s_matrix.appendChild(document.createElement("div"));
            item_container.classList.add("p-2", "hidden", "bg-background-alt", "border", "border-muted", "matrix-container");

            this._createMatrixItems(item_container, mi.items);

            button.addEventListener("click", () => {
                const buttons = s_matrix.querySelectorAll(".matrix-container-button");
                const containers = s_matrix.querySelectorAll(".matrix-container");

                buttons.forEach(x => {
                    x.classList.remove("bg-primary");
                    x.classList.add("border", "border-muted", "bg-background-alt", "text-muted");
                });

                buttons[i].classList.add("bg-primary");
                buttons[i].classList.remove("border", "border-muted", "bg-background-alt", "text-muted");

                containers.forEach(x => x.classList.add("hidden"));
                containers[i].classList.remove("hidden");
            });

            // select first item
            if (!i) button.click();
        }
    }

    _createTierIcon(tier) {
        const icon_el = document.createElement("div");
        icon_el.classList.add("w-[24px]", "h-[24px]", "flex", "justify-center",
            "items-center", "p-1", "border",
            Features.tier_details[tier].border, Features.tier_details[tier].text);
        icon_el.textContent = tier;
        return icon_el;
    }

    _createMatrixItems(container, items) {
        for (const item of items) {
            const item_container = container.appendChild(document.createElement("div"));
            item_container.classList.add("grid", "grid-cols-3", "md:grid-cols-4", "py-1", "gap-x-3");

            const item_text = item_container.appendChild(document.createElement("div"));
            item_text.classList.add("col-span-2", "md:col-span-3");
            item_text.textContent = item.text;

            item_container.appendChild(this._createTierIcon(item.tier));
        }
    }
}

Supported.register();

