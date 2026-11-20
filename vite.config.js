import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs/promises";
import path from "path";
import pkg from "./package.json" with {type: "json"};
import layout, { getPages } from "./framework/vite.js";

const DIR_NAME = import.meta.dirname;
const SRC_DIR = path.resolve(DIR_NAME, "src");
const PAGES_DIR = path.resolve(SRC_DIR, "pages");

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

            const homepage = pkg.homepage.replace(/\/+$/, "");
            const urls = (await getPages(PAGES_DIR)).map(x => x.url).filter(x => x !== "/404");

            const urlset = urls.map(x => {
                return "" +
                    `    <url>\n` +
                    `        <loc>${homepage}${x}</loc>\n` +
                    `    </url>`;
            });

            const SITEMAP_TEMPLATE =
                `<?xml version="1.0" encoding="UTF-8"?>\n` +
                `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
                urlset.join("\n") + "\n" +
                `</urlset>`;

            config.logger.info("Generating sitemap.xml");
            await fs.writeFile(path.join(config.build.outDir, "sitemap.xml"), SITEMAP_TEMPLATE);
        }
    }
}

export default defineConfig({
    plugins: [
        tailwindcss(),
        layout({ layouts: path.resolve(SRC_DIR, "layouts"), pages: PAGES_DIR }),
        generateSiteMap(),
    ],

    root: SRC_DIR,
    publicDir: path.resolve(DIR_NAME, "public"),

    resolve: {
        alias: {
            "$framework": path.resolve(DIR_NAME, "framework"),
            "$src": SRC_DIR,
            "$lib": path.resolve(SRC_DIR, "lib"),
        }
    },

    build: {
        outDir: path.resolve(DIR_NAME, "dist"),
        emptyOutDir: true,

        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        { name: "lib", test: /\/src\/(lib|components)\// },
                        { name: "vendor", test: /\/node_modules\// },
                    ]
                }
            },
        },
    },
});
