import { AppComponent } from "$app";
import Colors from "$lib/colors.js";

class Notice extends AppComponent {
    static get tag() { return "x-notice"; }

    static get properties() {
        return { color: "", icon: "" };
    }

    static get template() {
        return /*html*/`
            <div class="x-notice-bg mix-blend-overlay opacity-20 absolute left-0 top-0 right-0 bottom-0"></div>
            <div class="z-10">
                <i class="x-notice-icon fas fa-2xl"></i>
            </div>
            <div class="z-10 flex-1 leading-[1.7]" data-slot></div>
        `;
    }

    onCreated() {
        this.classList.add("flex", "items-center", "gap-x-3", "border", "relative")
        this.elbg = this.querySelector(".x-notice-bg");
        this.elicon = this.querySelector(".x-notice-icon");
    }

    onAttributeChanged(name, value) {
        switch (name) {
            case "color": {
                this.classList.remove(Colors.getBorder(value.previous));
                this.elbg.classList.remove(Colors.getBackground(value.previous));
                this.classList.add(Colors.getBorder(value.current));
                this.elbg.classList.add(Colors.getBackground(value.current));
                break;
            }

            case "icon": {
                this.elicon.classList.remove(value.previous);
                this.elicon.classList.add(value.current);
                break;
            }

            default: break;
        }
    }
}

Notice.register();
