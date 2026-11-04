import { AppComponent } from "$app";

class GitHubStats extends AppComponent {
    static get gh_repo() { return "https://github.com/redasm-dev/redasm"; }
    static get gh_url() { return "https://raw.githubusercontent.com/redasm-dev/web/refs/heads/data/repository.json"; }
    static get tag() { return "github-stats"; }

    static get template() {
        return /*html*/`
            <ul class="flex text-xs font-bold whitespace-nowrap">
                <li class="border border-[#3d444d] py-1 px-3 rounded-l-sm bg-[#1f262e]">
                    <a href="${GitHubStats.gh_repo}" target="_blank" data-default>
                        <i class="fas fa-star fa-lg"></i>
                        Star
                    </a>
                </li>
                <li id="ghstats__count" class="border border-[#3d444d] py-1 px-2 rounded-r-sm bg-[#0d1117]"></li>
            </ul>
        `;
    }

    async onCreated() {
        const count = this.querySelector("#ghstats__count");
        const response = await fetch(GitHubStats.gh_url);

        if (response.ok) {
            const repository = await response.json();
            count.textContent = repository.stargazers_count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        else
            count.textContent = "N/A";
    }
}

GitHubStats.register();
