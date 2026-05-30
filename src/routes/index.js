import "$lib/components/badge.js";
import "$lib/components/snippet.js";
import "$lib/components/section.js";
import "$lib/components/featuregrid.js";
import "$lib/components/notice.js";
import { createReleasesTable } from "$lib/downloads.js";
import { AppPage } from "$app";

export default class HomePage extends AppPage {
    static get tag() { return "home-page"; }

    static get template() {
        return /*html*/`
<article class="py-6 gap-y-3">
    <div class="border-b border-muted">
        <div class="flex px-7 md:px-14 gap-y-3 pb-10">
            <div class="flex-1 flex flex-col gap-y-8">
                <div class="leading-[1.15]">
                    <h1 class="text-[1.9rem] mb-1 font-bold tracking-[-0.02em]"><span class="text-primary">RE</span>Dasm</h1>
                    <h5 class="text-muted tracking-[0.08em]">The OpenSource Disassembler</h5>
                </div>
                <p class="leading-[1.75]">
                    For hobbyists and professional reverse engineers.<br>
                    Free forever<span class="cursor"></span>
                </p>
                <div>
                    <x-badge class="my-1" color="foreground" label="language" value="C/C++"></x-badge>
                    <x-badge class="my-1" color="success" label="license" value="GPL3"></x-badge>
                </div>
            </div>
            <div class="flex flex-col gap-y-3 text-right">
                <div>
                    <a data-default class="tracking-[0.08em] inline-flex items-center gap-x-2 bg-primary hover:bg-highlight hover:text-background text-foreground uppercase text-sm px-4 py-2" href="#download">
                        <i class="fas fa-download"></i>
                        <span>download</span>
                    </a>
                </div>
                <div>
                    <div class="inline-flex items-end gap-x-2 text-muted">
                        <i class="fab fa-windows fa-lg"></i>
                        <i class="fab fa-linux fa-lg"></i>
                    </div>
                </div>
            </div>
        </div>
        <x-snippet></x-snippet>
    </div>
    <div class="px-14">
        <section>
            <section-title>Overview</section-title>
            <feature-grid class="grid-cols-1 md:grid-cols-2">
                <feature-item heading="Interactive listing">
                    Navigate code and data with cross-references, 
                    symbol renaming, comments and control flow graph.
                </feature-item>
                <feature-item heading="Plugin architecture">
                    Core written in C++, API in C for broad language compatibility. 
                    Loaders and Processors can be written in C or C++.<br>
                    C API allows integration from other programming languages.
                </feature-item>
                <feature-item heading="Architecture support">
                    x86, MIPS, ARM, AARCH64 and Dalvik.
                </feature-item>
                <feature-item heading="Format support">
                    PE, ELF, DEX, PS1, N64, DEX and XBE. 
                </feature-item>
            </feature-grid>
        </section>
        <section id="download" class="flex flex-col gap-y-3">
            <section-title>Download</section-title>
            <x-notice color="primary" icon="fa-triangle-exclamation" class="p-3 text-xs">
                <h5 class="uppercase font-bold pb-3">these are legacy builds</h5>
                <p>
                    3.0 BETA5 is the most recent release but never officially announced, it carries 
                    limitations inherited from previous versions and a full rewrite was necessary.
                </p>
                <p>
                    Version 4.0 is under active development. Follow progress on <a href="https://github.com/redasm-dev">GitHub</a>.
                </p>
            </x-notice>
            <div id="home__downloads" class="overflow-auto text-sm"></div>
        </section>
    </div>
</article>
`;
    }

    get styles() {
        return `
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50%      { opacity: 0; }
            }
            .cursor {
                display: inline-block;
                width: 0.55em;
                height: 3px;
                background: var(--color-foreground);
                animation: blink 1.1s step-end infinite;
                vertical-align: text-bottom;
                margin-bottom: 0;
                margin-left: 3px;
                border-radius: 1px;
            }
        `;
    }

    onCreated() {
        createReleasesTable(this.querySelector("#home__downloads"));
    }
}
