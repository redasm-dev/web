// File helpers shared by fw's build plugins (Node only).
import fs from "fs/promises";
import path from "path";

// Every file under dir (recursively) whose name ends with ext, as absolute paths, sorted.
// listFiles("src/pages", ".html"), listFiles("blog", ".md"); ext "" lists every file.
export async function listFiles(dir, ext = "") {
    const files = [];

    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) files.push(...await listFiles(p, ext));
        else if (e.isFile() && e.name.endsWith(ext)) files.push(p);
    }

    return files.sort();
}

// file's path relative to dir, with "/" separators on every OS: "a/b.html".
export function relativePath(dir, file) {
    return path.relative(dir, file).split(path.sep).join("/");
}
