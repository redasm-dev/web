import { AppComponent } from "$app";

class FeatureGrid extends AppComponent {
    static get tag() { return "feature-grid"; }

    onCreated() {
        this.role = "tablist";

        this.classList.add("grid", "overflow-hidden",
            "bg-muted", "gap-[1px]", "text-sm", "border", "border-muted");
    }
}

class FeatureItem extends AppComponent {
    static get tag() { return "feature-item"; }

    static get properties() {
        return { heading: "" };
    }

    onCreated() {
        this.role = "tabpanel";
        this.classList.add("bg-background-alt", "p-5");

        const elheading = this.insertBefore(document.createElement("h5"), this.firstChild);
        elheading.classList.add("flex", "items-center", "font-bold", "pb-3", "gap-x-2");

        const i = elheading.appendChild(document.createElement("i"));
        i.classList.add("fas", "fa-caret-right", "fa-xs", "text-primary");
        elheading.appendChild(document.createTextNode(this.heading));
    }
}

FeatureGrid.register();
FeatureItem.register();
