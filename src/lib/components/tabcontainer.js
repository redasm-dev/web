import { AppComponent } from "$app";

class TabPanel extends AppComponent {
    static get tag() { return "tab-panel"; }

    static get properties() {
        return { title: "", selected: false };
    }

}

class TabContainer extends AppComponent {
    static get tag() { return "tab-container"; }

    static get properties() {
        return { index: 0 };
    }

    static get template() {
        return /*html*/`
<div class="bg-background-alt border border-muted">
    <ul role="tablist" class="border-b border-muted flex tab-head mb-[0px]"></ul>
    <div class="px-3 py-5 tab-body"></div>
</div>
`;
    }

    onCreated() {
        this.tabhead = this.querySelector(".tab-head");
        this.tabbody = this.querySelector(".tab-body");

        const panels = this.querySelectorAll("tab-panel");

        panels.forEach((x, index) => {
            const li = document.createElement("li");
            li.role = "presentation";
            li.classList.add("mt-1", "text-muted");

            const btn = li.appendChild(document.createElement("button"));
            btn.role = "tab";
            btn.classList.add("mb-[-1px]", "px-5", "py-2", "cursor-pointer", "border-b-2", "border-b-transparent");
            btn.textContent = x.title;
            btn.addEventListener("click", () => this.index = index);

            this.tabhead.appendChild(li);
            x.classList.add("hidden");
            this.tabbody.appendChild(x); // reparent panels
        });

        if (panels.length)
            this._selectItem(this.index);
    }

    onAttributeChanged(name, value) {
        switch (name) {
            case "index": {
                console.log(value);
                this._unselectItem(value.previous);
                this._selectItem(value.current);
                break;
            }

            default: break;
        }
    }

    _unselectItem(index) {
        if (index === null) return;

        this.tabhead.children[index].firstChild.classList.add("border-b-transparent");
        this.tabhead.children[index].firstChild.classList.remove("text-foreground", "border-b-primary");

        this.tabbody.children[index].classList.add("hidden");

    }

    _selectItem(index) {
        if (index === null) return;

        this.tabhead.children[index].firstChild.classList.remove("border-b-transparent");
        this.tabhead.children[index].firstChild.classList.add("text-foreground", "border-b-primary");

        this.tabbody.children[index].classList.remove("hidden");

    }
}

TabPanel.register();
TabContainer.register();
