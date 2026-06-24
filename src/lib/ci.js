const CI_LIST = [
    { name: "ci", url: "https://raw.githubusercontent.com/redasm-dev/redasm.dev/refs/heads/data/ci.json" },
    { name: "nightly", url: "https://raw.githubusercontent.com/redasm-dev/redasm.dev/refs/heads/data/nightly.json" },
]

export async function updateCIStatus() {
    for (const ci of CI_LIST) {
        const badge = document.querySelector(`#x-badge-${ci.name}`);
        badge.value = "fetching...";

        const response = await fetch(ci.url, { cache: "no-store" });

        try {
            if (response.ok) {
                const data = await response.json();

                if (data.workflow_runs.length) {
                    const run = data.workflow_runs.find(r =>
                        r.status === "completed" && r.conclusion !== "skipped" && r.conclusion !== "cancelled"
                    );

                    if (run.status !== "completed") {
                        badge.value = "running";
                        badge.color = "warning";
                    }
                    else if (run.conclusion === "success") {
                        badge.value = "passing";
                        badge.color = "success";
                    }
                    else if (run.conclusion === "failure") {
                        badge.value = "failure";
                        badge.color = "error";
                    }
                    else
                        badge.value = "unknown";
                }
                else
                    badge.value = "empty";
            }
            else {
                badge.value = "fetch error";
                badge.color = "error";
            }
        }
        catch {
            badge.value = "fetch error";
            badge.color = "error";
        }
    }
}
