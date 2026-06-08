// let tailwind detect these classes

const BORDER_COLORS = {
    "background-alt": "border-background-alt",
    foreground: "border-foreground",
    background: "border-background",
    muted: "border-muted",
    primary: "border-primary",
    error: "border-error",
    warning: "border-warning",
    success: "border-success",
};

const BACKGROUND_COLORS = {
    "background-alt": "bg-background-alt",
    foreground: "bg-foreground",
    background: "bg-background",
    muted: "bg-muted",
    primary: "bg-primary",
    error: "bg-error",
    warning: "bg-warning",
    success: "bg-success",
};

const TEXT_COLORS = {
    "foreground-alt": "bg-foreground-alt",
    foreground: "text-foreground",
    background: "text-background",
    muted: "text-muted",
    primary: "text-primary",
    error: "text-error",
    warning: "text-warning",
    success: "text-success",
};

export default {
    getBorder: c => BORDER_COLORS[c],
    getBackground: c => BACKGROUND_COLORS[c],
    getText: c => TEXT_COLORS[c],
};
