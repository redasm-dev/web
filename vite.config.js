import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs/promises";
import path from "path";
import pkg from "./package.json";

const APP_TMPDIR = ".app";
const srcdir = path.resolve(__dirname, "src");

async function getRoutes() {
    const routes = (await fs.readdir(path.resolve(srcdir, "routes"), { withFileTypes: true }))
        .filter(x => x.isFile() && path.extname(x.name).toLowerCase() === ".js")
        .map(x => path.basename(x.name, ".js"));

    return routes;
}

function escapeParam(r) {
    return r.replace(/[\[\]]/g, '_');
}

function generateApp() {
    let config;

    return {
        name: "generate-app",

        configResolved(resolvedconfig) {
            config = resolvedconfig;
        },

        async buildStart() {
            try { await fs.access(APP_TMPDIR); }
            catch { await fs.mkdir(APP_TMPDIR, { recursive: true }); }

            const routes = await getRoutes();

            const routesimports = routes.reduce((acc, x) => {
                config.logger.info(`Found route /${x}`);
                acc.push(`import ${escapeParam(x)}_page from "$src/routes/${x}.js";`);
                return acc;
            }, []);

            const routesmap = routes.map(x => {
                return `       "/${x === "index" ? "" : x}": ${escapeParam(x)}_page,`

            });

            const APP_TEMPLATE =
                `import { App } from "$src/app.js"\n` +
                `${routesimports.join("\n")}\n` +
                `\n` +
                `export * from "$src/app.js";\n` +
                `\n` +
                `export function initApp(options) {\n` +
                `   new App({\n` +
                `${routesmap.join("\n")}\n` +
                `    }, options);\n` +
                `}\n`;

            await fs.writeFile(path.join(APP_TMPDIR, "index.js"), APP_TEMPLATE);
        },
    }
}

function generateSiteMap() {
    let config;

    return {
        name: "generate-sitemap",
        apply: "build",

        configResolved(resolvedconfig) {
            config = resolvedconfig;
        },

        async closeBundle() {
            if (!pkg.homepage) {
                config.logger.warn("Homepage not set, skipping sitemap generation");
                return;
            }

            const homepage = pkg.homepage.replace(/\/+$/, "") + "/";
            const routes = await getRoutes();

            if (!routes.length) {
                config.logger.warn("No routes found, skipping sitemap generation");
                return;
            }

            const urlset = routes.map(x => {
                return "" +
                    `    <url>\n` +
                    `        <loc>${homepage}${x === "index" ? "" : x}</loc>\n` +
                    `    </url>`;
            });

            const SITEMAP_TEMPLATE =
                `<?xml version="1.0" encoding="UTF-8"?>\n` +
                `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
                urlset.join("\n") + "\n" +
                `</urlset>`;

            config.logger.info("Generating sitemap.xml");
            try { await fs.access(config.build.outDir); }
            catch { await fs.mkdir(config.build.outDir, { recursive: true }); }
            await fs.writeFile(path.join(config.build.outDir, "sitemap.xml"), SITEMAP_TEMPLATE);
        }
    }
}

export default defineConfig({
    plugins: [tailwindcss(), generateApp(), generateSiteMap()],
    root: "src",
    publicDir: path.resolve(__dirname, "public"),

    resolve: {
        alias: {
            "$src": srcdir,
            "$lib": path.resolve(srcdir, "lib"),
            "$app": path.resolve(__dirname, APP_TMPDIR),
        }
    },

    build: {
        outDir: path.resolve(__dirname, "dist"),
        emptyOutDir: true,

        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        { name: "routes", test: /\/src\/routes\// },
                        { name: "lib", test: /\/src\/lib\// },
                        { name: "vendor", test: /\/node_modules\// },
                    ]
                }
            },
        },
    },
});
