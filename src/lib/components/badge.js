import { AppComponent } from "$app";
import Colors from "$lib/colors.js";

class Badge extends AppComponent {
    static get tag() { return "x-badge"; }

    static get properties() {
        return { color: "", label: "", value: "" };
    }

    static get template() {
        return /*html*/`
<div class="x-badge-label text-background font-bold py-1 px-2 tracking-wider"></div>
<div class="x-badge-value py-1 px-2"></div>
`;
    }

    onCreated() {
        this.classList.add("inline-flex", "text-xs", "border");
        this.ellabel = this.querySelector(".x-badge-label");
        this.elvalue = this.querySelector(".x-badge-value");
    }

    onAttributeChanged(name, value) {
        switch (name) {
            case "color":
                this._unsetColor(value.previous);
                this._setColor(value.current);
                break;

            case "label": this.ellabel.textContent = value.current; break;
            case "value": this.elvalue.textContent = value.current; break;
            default: break;
        }
    }

    _unsetColor(c) {
        if (!c) return;

        this.classList.remove(Colors.getBorder(c));
        if (this.ellabel) this.ellabel.classList.remove(Colors.getBackground(c));
        if (this.elvalue) this.elvalue.classList.remove(Colors.getText(c));
    }

    _setColor(c) {
        if (!c) return;

        this.classList.add(Colors.getBorder(c));
        if (this.ellabel) this.ellabel.classList.add(Colors.getBackground(c));
        if (this.elvalue) this.elvalue.classList.add(Colors.getText(c));
    }
}

Badge.register();
