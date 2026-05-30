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
                        version: r.tag_name,
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
        console.error(error.messasge)
    }

    return [];
}

export async function createReleasesTable(container) {
    container.appendChild(createTable({
        class: "w-full leading-6",
        header: ["Name", "Size", "Date", "Downloads"],
        headerclass: "text-left",
        rows: await fetchReleases(),

        delegate: row => {
            return /*html*/`
                <td>
                    <div class="flex mr-2 gap-x-2">
                        <a href="${row.url}">${row.name}</a>
                        <div class="flex-1"></div>

                        ${row.prerelease ? /*html*/
                    `<span class="mx-1 border-t border-b border-background px-1 
                                  bg-warning text-background uppercase
                                  font-bold">prerelease</span>` : ""}
                    </div>
                </td>
                <td>${row.size}</td>
                <td>${row.created}</td>
                <td>${row.downloads}</td>
            `;
        }
    }));
}
