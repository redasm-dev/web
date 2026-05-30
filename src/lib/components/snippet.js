import { AppComponent } from "$app";

const CODE_STYLES = {
    c0: "text-[#202020]",
    symbol: "text-[#ff7575]",
    register: "text-[#67bd61]",
    mnemonic: "text-[#ffb22e]",
    address: "text-[#7dafff]",
    number: "text-[#e28ee6]",
    string: "text-[#13c3a0]",
    c7: "text-[#cacaca]",
    c8: "text-[#757575]",
    c9: "text-[#ffa3a3]",
    func: "text-[#96d952]",
    label: "text-[#ffe262]",
    c12: "text-[#90caf9]",
    c13: "text-[#f8c7ff]",
    c14: "text-[#4ce0c5]",
    c15: "text-[#f4f1d6]",
    dim: "text-[#757575]",
};

const CODE_SYMBOLS = [
    "GetModuleHandleA",
    "u32_4020ca",
    "str_4020f4",
    "FindWindowA",
    "loc_40101d",
    "u32_402064",
    "u32_402068",
    "WndProc",
];

const CODE_SNIPPET = `
CODE:00401000  segment CODE (start: 00401000, end: 00402000)
CODE:00401000      exported function win_pe_entry_point_401000()
CODE:00401000          push 0
CODE:00401002          call GetModuleHandleA
CODE:00401007          mov [u32_4020ca], eax
CODE:0040100c          push 0
CODE:0040100e          push str_4020f4        "No need to disasm the code!"
CODE:00401013          call FindWindowA
CODE:00401018          or eax, eax
CODE:0040101a          jz loc_40101d
CODE:0040101c          ret
CODE:0040101d      loc_40101d:
CODE:0040101d          mov [u32_402064], 4003
CODE:00401027          mov [u32_402068], WndProc
`;

class Snippet extends AppComponent {
    static get tag() { return "x-snippet"; }

    onCreated() {
        this.classList.add("block", "bg-background-alt", "px-8", "pb-6", "overflow-x-auto");
        this.style.maskImage = "linear-gradient(to bottom, black 60%, transparent 100%)";

        const inner = this.appendChild(document.createElement("div"));
        inner.classList.add("py-3", "text-sm", "text-muted", "leading-[2]", "whitespace-pre");

        const lines = CODE_SNIPPET.split("\n").filter(x => x);

        for (const l of lines)
            inner.appendChild(Snippet._getStyledLine(l));
    }

    static _getStyledLine(line) {
        let fragment = document.createDocumentFragment();
        const root = fragment.appendChild(document.createElement("div"));

        line = Snippet._replaceStyle(line, /"[^"]+"/g, "string");
        line = Snippet._replaceStyle(line, "loc_40101d:", "label");
        line = Snippet._replaceStyle(line, new RegExp(`\\b(${CODE_SYMBOLS.join("|")})(?!:)`, "g"), "symbol");
        line = Snippet._replaceStyle(line, /\b0[0-9a-f]+\b/g, "address");
        line = Snippet._replaceStyle(line, /\b(0|4003)\b/g, "number");
        line = Snippet._replaceStyle(line, /\b(push|call|or|jz|ret|mov)\b/g, "mnemonic");
        line = Snippet._replaceStyle(line, /\b(eax)\b/g, "register");
        line = Snippet._replaceStyle(line, "win_pe_entry_point_401000", "func");

        root.innerHTML = line;
        return fragment;
    }

    static _replaceStyle(line, pattern, style) {
        return line.replace(pattern, x => {
            return `<span class="${CODE_STYLES[style]}">${x}</span>`;
        });
    }

}

Snippet.register();
