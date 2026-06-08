import { createTable } from "$app";

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

export async function createReleasesTable(container) {
    const ICONS = {
        "signature": "fas fa-key",
        "windows": "fab fa-windows",
        "linux": "fab fa-linux",
    };

    container.appendChild(createTable({
        class: "w-full leading-8",
        header: ["Name", "Size", "Date", "Downloads"],
        headerclass: "text-left",
        rows: await fetchReleases(),

        categoryDelegate: (row) => {
            return /*html*/`
                <div class="flex items-center text-right my-2">
                    <span class="border px-1 border-success 
                                  text-success">${row.version}</span>

                    <div class="bg-success h-px flex-1"></div>
                </div>
            `;
        },

        rowDelegate: row => {
            return /*html*/`
                <td>
                    <div class="flex items-center mr-2 gap-x-1">
                        <i class="${ICONS[row.type]} fa-fw mr-1 fa-lg"></i>
                        <a href="${row.url}">${row.name}</a>
                        <div class="flex-1"></div>

                        ${row.prerelease && !row.nightly ? /*html*/
                    `<span class="border-t border-b border-background 
                                  bg-warning text-background uppercase
                                  font-bold leading-none p-1 mr-1">prerelease</span>` : ""}
                    </div>
                </td>
                <td>${row.size}</td>
                <td>${row.created}</td>
                <td>${row.nightly ? "" : row.downloads}</td>
            `;
        }
    }));
}
