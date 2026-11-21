// Layouts: every page is merged into a layout from the layouts folder.
// A page picks its layout with <html data-fw-layout="name"> (layouts/name.html);
// without it, layouts/default.html is used. A layout is written like a page and can pick
// a parent layout the same way (article.html -> default.html): the page is merged into
// its layout, that into the parent, and so on. Only the outermost layout's <main> is kept.
//
// Build time: <fw-buildtime script="$lib/x.build.js" do="fn" ...></fw-buildtime> is
// replaced by what fn({ ...other attributes }) returns, computed in Node.
// do defaults to the module's default export.
//
// Everything the framework reads from HTML uses the fw- prefix (tags) or data-fw-
// (attributes), so it can't clash with the site's own tags and attributes.
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
// Pages come from page sources (see getPages): files, or pages made in memory by addons.
// The merge happens in transformIndexHtml, before Vite processes their scripts and styles.

import fs from "fs/promises";
import path from "path";
import { parse } from "parse5";
import { runnerImport } from "vite";
import { listFiles, relativePath } from "./files.js";

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
// unwrapMain: page is itself a layout (nested layouts): its <main> tags are dropped, keeping
// their content, so the result has a single <main> (the outermost layout's).
export function mergePage(layout, page, pagefile, layoutfile = "layout", { unwrapMain = false } = {}) {
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

    let body = page.source.slice(pagebody.start, pagebody.end);

    if (unwrapMain) {
        const inner = findDeep(page.body, "main");
        if (!inner) throw new Error(`${pagefile}: <main> not found`);

        const loc = inner.sourceCodeLocation;
        innerRange(inner, pagefile); // explicit tags required
        body = page.source.slice(pagebody.start, loc.startOffset) + page.source.slice(loc.startTag.endOffset, loc.endTag.startOffset) + page.source.slice(loc.endOffset, pagebody.end);
    }

    edits.push({ start: mainrange.start, end: mainrange.end, text: body });

    // apply from the end, so earlier offsets stay valid
    let result = layout.source;

    for (const e of edits.sort((a, b) => b.start - a.start))
        result = result.slice(0, e.start) + e.text + result.slice(e.end);

    return result;
}

// ---- PAGES ------------------------------------------------------------------
// A page source is where pages come from, served and built under its url:
//
//   { dir, url }         every .html file under dir is a page
//                        { dir: "src/pages", url: "/" }: index.html -> "/", a/b.html -> "/a/b"
//   { dir, url, list }   list({ command }) returns the pages, made in memory (e.g. by an addon):
//                        [{ name: "x.html", file, read: async () => html }]
//                        file is where the page comes from (messages); command is "serve"
//                        or "build", so a source can skip pages (drafts).
//                        dir must be the folder of url in Vite's root ({ dir: "src/docs",
//                        url: "/docs" }), so each page sits where its URL says, next to the
//                        file it comes from: relative URLs in it (./shot.png) just work.
//
// All dirs must be inside Vite's root; names are checked (relative, .html, no ..).
// Each page: { output, url, file, read, source }, where output is its file name in dist.
export async function getPages(sources, { command = "serve" } = {}) {
    const pages = [];

    for (const source of sources) {
        const base = source.url.replace(/^\/+|\/+$/g, ""); // "" for "/", "docs" for "/docs"
        const found = source.list
            ? await source.list({ command })
            : (await listFiles(source.dir, ".html")).map(file => ({ name: relativePath(source.dir, file), file, read: () => fs.readFile(file, "utf8") }));

        for (const { name, file, read } of found) {
            // name comes from the source (an addon, for in-memory pages): a relative path
            // ending in .html, with / separators and no "." or ".." parts
            const parts = typeof name === "string" ? name.split("/") : [];

            if (!name?.endsWith?.(".html") || parts.some(x => !x || x === "." || x === "..") || name.includes("\\"))
                throw new Error(`${file ?? source.dir}: invalid page name ${JSON.stringify(name)} (expected a relative path like "a/b.html")`);

            if (typeof read !== "function")
                throw new Error(`${file ?? source.dir}: page "${name}" has no read() function`);

            const output = base ? `${base}/${name}` : name;
            const url = "/" + output.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
            pages.push({ output, url, file, read, source });
        }
    }

    // two sources can't produce the same file: one page would silently replace the other
    const seen = new Map();

    for (const p of pages) {
        if (seen.has(p.output)) throw new Error(`${p.output} comes from both ${seen.get(p.output)} and ${p.file}`);
        seen.set(p.output, p.file);
    }

    return pages;
}

// ---- LAYOUTS ----------------------------------------------------------------
const DEFAULT_LAYOUT = "default";

const LAYOUT_ATTRIBUTE = "data-fw-layout";

// <html data-fw-layout="article"> -> "article"; pages without it use the default layout.
// Layouts can have one too: their parent (article.html -> default.html); without it, a
// layout is the outermost one. Attributes of <html> never reach the output (only <head>
// and <body> are merged, and the outermost layout has none), so this needs no stripping.
function getLayoutName(doc, file, fallback) {
    const name = getAttr(doc.html, LAYOUT_ATTRIBUTE)?.trim() || fallback;

    if (name && !/^[\w-]+(\/[\w-]+)*$/.test(name)) // plain names only: no "..", no extensions
        throw new Error(`${file}: invalid ${LAYOUT_ATTRIBUTE} "${name}"`);

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

// The page merged into its layout, that into its parent layout, and so on.
async function applyLayouts(layoutsdir, html, pagefile, label = x => x) {
    let doc = parseDocument(html), from = pagefile;
    let name = getLayoutName(doc, pagefile, DEFAULT_LAYOUT);
    const chain = [];

    for (;;) {
        if (chain.includes(name)) throw new Error(`${pagefile}: layouts form a loop (${[...chain, name].join(" -> ")})`);
        chain.push(name);

        const layout = await readLayout(layoutsdir, name, pagefile);
        const layoutdoc = parseDocument(layout.source);
        const layoutfile = label(layout.file);
        const merged = mergePage(layoutdoc, doc, from, layoutfile, { unwrapMain: chain.length > 1 });

        name = getLayoutName(layoutdoc, layoutfile);
        if (!name) return merged;

        doc = parseDocument(merged);
        from = layoutfile;
    }
}

// ---- BUILD TIME -------------------------------------------------------------
const BUILDTIME_TAG = "fw-buildtime";
const BUILDTIME_SUFFIX = ".build.js"; // Node-only modules; the browser may never import them

// Every <fw-buildtime>, outermost first (output is never searched again: no recursion).
function findBuildtime(node, found = []) {
    for (const c of node.childNodes ?? []) {
        if (c.nodeName === BUILDTIME_TAG) found.push(c);
        else findBuildtime(c, found);
    }

    return found;
}

async function renderBuildtime(source, pagefile, load) {
    const elements = findBuildtime(parse(source, { sourceCodeLocationInfo: true }));
    const edits = [];

    for (const el of elements) {
        const { script, do: name = "default", ...params } = Object.fromEntries(el.attrs.map(x => [x.name, x.value]));
        const where = `${pagefile}: <${BUILDTIME_TAG} script="${script ?? ""}">`;

        if (!el.sourceCodeLocation?.endTag) throw new Error(`${where} must have a closing tag`);
        if (!script?.endsWith(BUILDTIME_SUFFIX)) throw new Error(`${where}: script must be a *${BUILDTIME_SUFFIX} module`);

        const fn = (await load(script, where))[name];
        if (typeof fn !== "function") throw new Error(`${where}: "${name}" is not an exported function`);

        let output;

        try { output = await fn(params); }
        catch (e) { throw new Error(`${where}: ${e.message}`, { cause: e }); }

        const loc = el.sourceCodeLocation;
        edits.push({ start: loc.startOffset, end: loc.endOffset, text: output == null ? "" : String(output) });
    }

    let result = source;

    for (const e of edits.sort((a, b) => b.start - a.start))
        result = result.slice(0, e.start) + e.text + result.slice(e.end);

    return result;
}

// ---- PLUGIN -----------------------------------------------------------------
// Pages are served and built at their source's URL: pages/index.html is "/" in dev and
// dist/index.html in the build. That mapping is the plugin's business; the site's own
// files don't know about it.
//
// Pages made in memory (e.g. src/docs/x.md -> /docs/x) get the id they'd
// have as files in the root: src/docs/x.html, next to the file they come from.
// Their HTML comes from memory (load); everything else is Vite as usual: relative files
// (./shot.png) resolve from that folder in the build and are served by URL in dev.
export default function layout({ layouts, pages: sources }) {
    let root, command = "serve";
    let aliases = [], server = null, modules = new Map();
    let virtual = new Map(); // id -> page, for pages made in memory

    const idOf = page => page.source.list ? path.join(root, page.output) : page.file;
    const label = file => path.relative(process.cwd(), file);
    const inDir = (dir, file) => file.startsWith(dir + path.sep);
    const isFile = file => fs.stat(file).then(x => x.isFile(), () => false);

    async function listPages() {
        for (const s of sources) {
            if (relativePath(root, s.dir).startsWith(".."))
                throw new Error(`${label(s.dir)}: page folders must be inside Vite's root (${label(root)})`);

            if (s.list && path.resolve(s.dir) !== path.join(root, s.url))
                throw new Error(`${label(s.dir)}: pages made in memory must be in the folder of their URL (${label(path.join(root, s.url))} for "${s.url}")`);
        }

        const pages = await getPages(sources, { command });
        virtual = new Map(pages.filter(x => x.source.list).map(x => [idOf(x), x]));
        return pages;
    }

    // "$lib/x.build.js" or "/lib/x.build.js" -> absolute path
    function resolveSource(src, where) {
        const a = aliases.find(x => typeof x.find === "string" && src.startsWith(x.find + "/"));
        if (a) return path.join(a.replacement, src.slice(a.find.length));
        if (src.startsWith("/")) return path.join(root, src);
        throw new Error(`${where}: script must start with an alias or "/" (the root)`);
    }

    // Dev: Vite's own Node loader, which also tracks changes (see hotUpdate).
    // Build: runnerImport, with the same aliases; each module is loaded once per build.
    async function loadModule(src, where) {
        const file = resolveSource(src, where);
        if (server) return server.ssrLoadModule(file);

        if (!modules.has(file)) {
            modules.set(file, runnerImport(file, { configFile: false, root, resolve: { alias: aliases } })
                .then(x => x.module));
        }

        return modules.get(file);
    }

    return {
        name: "layout",

        // Every page is a build input (Vite only picks up index.html by itself).
        async config(config, env) {
            root = path.resolve(config.root ?? process.cwd());
            command = env.command;

            const pages = await listPages();

            for (const [id, page] of virtual) {
                if (await isFile(id)) throw new Error(`${label(page.file)}: ${label(id)} already exists`);
            }

            return { appType: "mpa", build: { rolldownOptions: { input: pages.map(idOf) } } };
        },

        configResolved(config) {
            root = config.root;
            aliases = config.resolve.alias;
        },

        // Build: pages made in memory
        resolveId(source) {
            return virtual.has(source) ? source : null;
        },

        async load(id) {
            return virtual.get(id)?.read() ?? null;
        },

        transformIndexHtml: {
            order: "pre", // before Vite looks at scripts and styles
            async handler(html, ctx) {
                const pagefile = label(virtual.get(ctx.filename)?.file ?? ctx.filename);
                const merged = await applyLayouts(layouts, html, pagefile, label);
                return renderBuildtime(merged, pagefile, loadModule);
            },
        },

        // *.build.js modules run in Node only: refuse them in browser code. transform sees
        // every module that ends up in the browser, however it was imported or resolved.
        transform(_, id) {
            if (this.environment.name === "client" && id.split("?")[0].endsWith(BUILDTIME_SUFFIX))
                this.error(`${label(id.split("?")[0])} is a build-time module and can't be imported by browser code`);
        },

        buildStart() {
            modules.clear();
        },

        // Build: Vite names each page after its id (pages/index.html);
        // move each one to its output name (index.html).
        generateBundle: {
            order: "post",
            async handler(_, bundle) {
                for (const page of await listPages()) {
                    const name = relativePath(root, idOf(page));
                    if (!bundle[name] || name === page.output) continue;

                    const source = bundle[name].source;
                    delete bundle[name];
                    this.emitFile({ type: "asset", fileName: page.output, source });
                }
            },
        },

        // Dev: serve each page at its URL ("/" -> pages/index.html). File pages are served
        // by Vite as usual (only the URL is rewritten); pages made in memory go through
        // Vite's HTML pipeline here.
        configureServer(devserver) {
            server = devserver;
            server.watcher.add(layouts);

            server.middlewares.use(async (req, res, next) => {
                const url = new URL(req.url, "http://localhost");
                if (url.pathname.startsWith("/@") || !req.headers.accept?.includes("text/html")) return next();

                try {
                    // "/a/b", "/a/b/", "/a/b.html" and "/a/b/index.html" all mean the same page
                    const normalize = u => u.replace(/\.html$/, "").replace(/(^|\/)index$/, "$1").replace(/(.)\/$/, "$1");
                    const pathname = normalize(url.pathname);
                    const page = (await listPages()).find(x => normalize(x.url) === pathname);

                    // Other spellings redirect to the page's URL, like static hosts do
                    // ("/a/b/" -> "/a/b", "/a/" -> "/a/" for a/index.html): relative URLs
                    // in the page (./shot.png) only resolve right from there
                    if (page && url.pathname !== page.url) {
                        res.writeHead(301, { Location: page.url + url.search });
                        return res.end();
                    }

                    if (page?.source.list) {
                        const html = await server.transformIndexHtml("/" + page.output, await page.read(), req.originalUrl);
                        res.setHeader("Content-Type", "text/html");
                        return res.end(html);
                    }

                    if (page) req.url = `/${relativePath(root, page.file)}${url.search}`;
                }
                catch (e) {
                    return next(e);
                }

                next();
            });
        },

        // Vite's own reload message names the file (/pages/index.html), which doesn't
        // match the URL the browser shows ("/"), so the browser would ignore it.
        // For layouts and pages (and anything in a source that makes pages in memory,
        // e.g. a post or its images), reload all open pages instead.
        // A build-time module (or anything it imports) changed: pages using it are stale.
        hotUpdate({ file, modules }) {
            if (this.environment.name === "ssr") {
                if (modules.length) server.environments.client.hot.send({ type: "full-reload" });
                return;
            }

            if (this.environment.name !== "client") return;

            const isPage = inDir(layouts, file) && file.endsWith(".html")
                || sources.some(s => inDir(s.dir, file) && (s.list || file.endsWith(".html")));

            if (isPage) {
                this.environment.hot.send({ type: "full-reload" });
                return [];
            }
        },
    };
}
