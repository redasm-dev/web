// Layouts: every page in the pages folder is merged into a layout from the layouts folder.
// A page picks its layout with <html data-layout="name"> (layouts/name.html);
// without it, layouts/default.html is used.
//
// A page is a plain, self-describing HTML document:
//
//   <html>
//     <head>...</head>   tags with a key (<title>, <meta name>, <meta property>,
//                        <link rel="canonical">) replace the layout's tag with the same key;
//                        everything else is appended to the layout's <head>, in order.
//     <body>...</body>   copied as is into the layout's <main>.
//   </html>
//
// Anything outside <head>/<body> is ignored. parse5 is only used to find where
// things are: content is always cut from the original source, never re-serialized,
// so pages arrive exactly as written.
//
// Pages are real files that Vite builds and serves as usual; the merge happens
// in transformIndexHtml, before Vite processes their scripts and styles.

import fs from "fs/promises";
import path from "path";
import { parse } from "parse5";

// ---- PARSING ----------------------------------------------------------------
function findChild(node, name) {
    return node.childNodes?.find(x => x.nodeName === name);
}

function findDeep(node, name) {
    if (node.nodeName === name) return node;

    for (const c of node.childNodes ?? []) {
        const found = findDeep(c, name);
        if (found) return found;
    }

    return null;
}

// Offsets of an element's content, between its start and end tags.
function innerRange(el, file) {
    const loc = el?.sourceCodeLocation;

    if (!loc?.startTag || !loc?.endTag)
        throw new Error(`${file}: <${el?.nodeName ?? "?"}> must have explicit opening and closing tags`);

    return { start: loc.startTag.endOffset, end: loc.endTag.startOffset };
}

function getAttr(el, name) {
    return el.attrs.find(x => x.name === name)?.value;
}

// Tags that may only appear once: the page's version replaces the layout's.
function getKey(el) {
    switch (el.nodeName) {
        case "title": return "title";
        case "meta": {
            const name = getAttr(el, "name");
            if (name) return `meta[name=${name.toLowerCase()}]`;
            const property = getAttr(el, "property");
            if (property) return `meta[property=${property.toLowerCase()}]`;
            return null;
        }
        case "link": {
            const rel = getAttr(el, "rel")?.toLowerCase();
            return rel === "canonical" ? "link[rel=canonical]" : null;
        }
        default: return null;
    }
}

export function parseDocument(source) {
    const doc = parse(source, { sourceCodeLocationInfo: true });
    const html = findChild(doc, "html");
    const head = findChild(html, "head");
    const body = findChild(html, "body");

    const headtags = head.childNodes
        .filter(x => x.tagName) // elements only: skip whitespace and comments
        .map(x => ({
            key: getKey(x),
            start: x.sourceCodeLocation.startOffset,
            end: x.sourceCodeLocation.endOffset,
            source: source.slice(x.sourceCodeLocation.startOffset, x.sourceCodeLocation.endOffset),
        }));

    return { source, html, head, body, headtags };
}

// ---- MERGING ----------------------------------------------------------------
// layout and page are parsed documents (parseDocument), so each file is parsed once.
export function mergePage(layout, page, pagefile, layoutfile = "layout") {
    const main = findDeep(layout.body, "main");
    if (!main) throw new Error(`${layoutfile}: <main> not found`);

    const mainrange = innerRange(main, layoutfile);
    const headrange = innerRange(layout.head, layoutfile);
    const pagebody = innerRange(page.body, pagefile);
    innerRange(page.head, pagefile); // validate only

    const layoutkeys = new Map(layout.headtags.filter(x => x.key).map(x => [x.key, x]));
    const edits = []; // { start, end, text } on the layout source
    const appended = [];

    for (const tag of page.headtags) {
        const replaced = tag.key && layoutkeys.get(tag.key);

        if (replaced)
            edits.push({ start: replaced.start, end: replaced.end, text: tag.source });
        else
            appended.push(tag.source);
    }

    if (appended.length) {
        const indent = "    ";
        edits.push({ start: headrange.end, end: headrange.end, text: appended.map(x => indent + x + "\n").join("") });
    }

    edits.push({ start: mainrange.start, end: mainrange.end, text: page.source.slice(pagebody.start, pagebody.end) });

    // apply from the end, so earlier offsets stay valid
    let result = layout.source;

    for (const e of edits.sort((a, b) => b.start - a.start))
        result = result.slice(0, e.start) + e.text + result.slice(e.end);

    return result;
}

// ---- PAGES ------------------------------------------------------------------
async function walk(dir) {
    const files = [];

    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) files.push(...await walk(p));
        else if (e.isFile() && e.name.endsWith(".html")) files.push(p);
    }

    return files;
}

// index.html -> "/", 404.html -> "/404", a/b.html -> "/a/b"
export async function getPages(pagesdir) {
    return (await walk(pagesdir)).sort().map(file => {
        const name = path.relative(pagesdir, file).split(path.sep).join("/");
        const url = "/" + name.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
        return { file, name, url };
    });
}

// ---- LAYOUTS ----------------------------------------------------------------
const DEFAULT_LAYOUT = "default";

// <html data-layout="article"> -> "article". Attributes of <html> never reach the
// output (only <head> and <body> are merged), so this needs no stripping.
function getLayoutName(page, pagefile) {
    const name = getAttr(page.html, "data-layout")?.trim() || DEFAULT_LAYOUT;

    if (!/^[\w-]+(\/[\w-]+)*$/.test(name)) // plain names only: no "..", no extensions
        throw new Error(`${pagefile}: invalid data-layout "${name}"`);

    return name;
}

async function readLayout(layoutsdir, name, pagefile) {
    const file = path.join(layoutsdir, name + ".html");

    try {
        return { file, source: await fs.readFile(file, "utf8") };
    }
    catch (e) {
        if (e.code === "ENOENT") throw new Error(`${pagefile}: layout "${name}" not found (${file})`);
        throw e;
    }
}

// ---- PLUGIN -----------------------------------------------------------------
// Pages live in a folder inside Vite's root (e.g. src/pages) but are served and built
// at the top level: pages/index.html is "/" in dev and dist/index.html in the build.
// That mapping is the plugin's business; the site's own files don't know about it.
export default function layout({ layouts, pages }) {
    let root, prefix; // prefix: pages folder relative to the root, e.g. "pages"

    const inDir = (dir, file) => file.startsWith(dir + path.sep) && file.endsWith(".html");

    return {
        name: "layout",

        // Every page is a build input (Vite only picks up index.html by itself).
        async config() {
            const input = (await getPages(pages)).map(x => x.file);
            return { appType: "mpa", build: { rolldownOptions: { input } } };
        },

        configResolved(config) {
            root = config.root;
            prefix = path.relative(root, pages).split(path.sep).join("/");
        },

        transformIndexHtml: {
            order: "pre", // before Vite looks at scripts and styles
            async handler(html, ctx) {
                const pagefile = path.relative(root, ctx.filename);
                const page = parseDocument(html);
                const layout = await readLayout(layouts, getLayoutName(page, pagefile), pagefile);
                return mergePage(parseDocument(layout.source), page, pagefile, path.relative(root, layout.file));
            },
        },

        // Build: Vite names each page after its path in the root (pages/index.html);
        // move them to the top level (index.html).
        generateBundle: {
            order: "post",
            handler(_, bundle) {
                for (const [name, file] of Object.entries(bundle)) {
                    if (!name.startsWith(prefix + "/") || !name.endsWith(".html")) continue;

                    delete bundle[name];
                    this.emitFile({ type: "asset", fileName: name.slice(prefix.length + 1), source: file.source });
                }
            },
        },

        // Dev: serve "/" as pages/index.html, "/a/b" as pages/a/b.html, and so on.
        // Only the URL is rewritten; Vite serves the page itself as usual.
        configureServer(server) {
            server.watcher.add(layouts);

            server.middlewares.use(async (req, _, next) => {
                const url = new URL(req.url, "http://localhost");

                if (req.headers.accept?.includes("text/html") && !url.pathname.startsWith("/@")) {
                    const pathname = url.pathname.replace(/\.html$/, "").replace(/(^|\/)index$/, "$1").replace(/(.)\/$/, "$1");
                    const page = (await getPages(pages)).find(x => x.url === pathname);
                    if (page) req.url = `/${prefix}/${page.name}${url.search}`;
                }

                next();
            });
        },

        // Vite's own reload message names the file (/pages/index.html), which doesn't
        // match the URL the browser shows ("/"), so the browser would ignore it.
        // For layouts and pages, reload all open pages instead.
        hotUpdate({ file }) {
            if (this.environment.name !== "client") return;

            if (inDir(layouts, file) || inDir(pages, file)) {
                this.environment.hot.send({ type: "full-reload" });
                return [];
            }
        },
    };
}
