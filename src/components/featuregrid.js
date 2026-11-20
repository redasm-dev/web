import { AppComponent } from "$framework/component.js";

// <feature-grid> and <feature-item> are styled in global.css; the heading is part of
// the content (<feature-item><h3>...</h3>...</feature-item>), so it's in the HTML.
// JavaScript only adds the decorative caret in front of it.
class FeatureItem extends AppComponent {
    static get tag() { return "feature-item"; }

    onCreated() {
        const heading = this.querySelector(":scope > h3");
        if (!heading) return;

        const i = heading.insertBefore(document.createElement("i"), heading.firstChild);
        i.classList.add("fas", "fa-caret-right", "fa-xs", "text-primary");
    }
}

FeatureItem.register();
