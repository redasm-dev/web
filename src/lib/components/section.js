import { AppComponent } from "$app";

class SectionTitle extends AppComponent {
    static get tag() { return "section-title"; }

    static get template() {
        return /*html*/`
          <div class="text-primary mr-1">#</div>
          <h2 class="uppercase" data-slot></h2>
          <div class="flex-1 h-px bg-muted ml-2"></div>
        `;
    }

    onCreated() {
        this.classList.add("flex", "items-center", "pt-8", "pb-4", "gap-x-1", "text-sm",
            "font-bold", "tracking-[0.18em]", "whitespace-nowrap");
    }
}

SectionTitle.register();
