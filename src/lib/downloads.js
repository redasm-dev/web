function getFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) return bytes + " B";

    const units = si ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
        : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

    return bytes.toFixed(dp) + " " + units[u];
}

function parseVersion(tag) {
    let v = tag.split("-")[0];
    if (v.startsWith("v")) v = v.slice(1);
    return v;
}

function getReleaseType(name) {
    if (name.endsWith(".asc")) return "signature";

    const n = name.toLowerCase()
    if (n.indexOf("windows") !== -1) return "windows";
    if (name.endsWith(".AppImage") || n.indexOf("linux") !== -1) return "linux";

    return "";
}

async function fetchReleases() {
    const URL = "https://raw.githubusercontent.com/redasm-dev/redasm.dev/refs/heads/data/releases.json";

    try {
        const response = await fetch(URL);

        if (response.ok) {
            const releases = await response.json();

            return releases.reduce((acc, r) => {
                if (r.draft || !r.assets.length) return acc;

                for (let a of r.assets) {
                    acc.push({
                        version: parseVersion(r.tag_name),
                        type: getReleaseType(a.name),
                        nightly: r.tag_name === "nightly",
                        prerelease: r.prerelease,
                        name: a.name,
                        url: a.browser_download_url,
                        created: new Date(a.created_at).toLocaleDateString(),
                        downloads: a.download_count,
                        size: getFileSize(a.size),
                    });
                }

                return acc;
            }, []);
        }
        else
            console.error(response.statusText);
    }
    catch (error) {
        console.error(error.message)
    }

    return [];
}

export async function createReleasesAccordion(container) {
    const ICONS = {
        "signature": "fas fa-key",
        "windows": "fab fa-windows",
        "linux": "fab fa-linux",
    };

    const fetchedreleases = await fetchReleases();
    const versions = [...new Set(fetchedreleases.map(item => item.version))];

    const byversion = fetchedreleases.reduce((acc, item) => {
        if (!acc[item.version]) acc[item.version] = [];

        acc[item.version].push(item);
        return acc;
    }, {});

    const fragment = document.createDocumentFragment();

    for (const [idx, ver] of versions.entries()) {
        const detail = fragment.appendChild(document.createElement("details"));
        detail.classList.add("group", "border", "border-muted", "bg-background-alt", "my-3", "cursor-pointer")
        detail.open = idx === 0;

        const releases = byversion[ver];

        const summary = detail.appendChild(document.createElement("summary"))
        summary.classList.add("text-xs", "flex", "items-center", "gap-x-3", "p-3", "font-bold", "hover:bg-muted/10");

        summary.innerHTML = /*html*/`
<i class="fa-solid fa-chevron-right text-primary text-xs transition-transform group-open:rotate-90"></i>
<span class="${ver === 'nightly' ? 'bg-warning text-background' : 'bg-primary text-foreground'} p-1">${ver}</span>
<div class="flex-1"></div>
<span class="text-muted">${releases.length} files</span>
`;

        const ul = detail.appendChild(document.createElement("ul"));
        ul.classList.add("flex", "flex-col");

        for (const rel of byversion[ver]) {
            const li = ul.appendChild(document.createElement("li"));
            li.classList.add("border-t", "border-muted");

            li.innerHTML = /*html*/`
<a href="${rel.url}" class="flex text-sm items-center gap-x-3 p-3 hover:bg-warning/5">
    <i class="${ICONS[rel.type]} fa-fw fa-xl text-foreground"></i>
    <div class="flex-1">
        <div class="text-success mb-2 text-base">${rel.name}</div>
        <div class="flex items-center gap-x-3">
            <div class="text-muted ${rel.nightly ? 'hidden' : ''}"><span class="text-foreground">Date: </span>${rel.created}</div>
            <div class="text-muted"><span class="text-foreground">Size: </span>${rel.size}</div>
            <div class="border border-warning text-warning px-1 ${rel.nightly || !rel.prerelease ? 'hidden' : ''}">prerelease</div>
        </div>
    </div>
    <div>
        <div class="text-success text-right">${rel.nightly ? "built" : rel.downloads}</div>
        <div class="text-muted">${rel.nightly ? rel.created : "downloads"}</div>
    </div>
</a >
        `;
        }
    }

    container.appendChild(fragment);
}
