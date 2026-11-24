import { config, library, dom } from "@fortawesome/fontawesome-svg-core";

config.keepOriginalSource = false;

import {
    faStar,
    faSitemap,
    faHeart,
    faCaretRight,
    faDownload,
    faHashtag,
    faFlask,
    faBoxOpen,
    faMoon,
    faSignature,
    faChevronRight,
    faHand,
    faHandPointRight,
    faPenNib,
    faMicrochip,
    faMagnifyingGlass,
    faFolderOpen,
    faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";

import {
    faXTwitter,
    faMastodon,
    faReddit,
    faDiscord,
    faYoutube,
    faGithub,
    faWindows,
    faLinux,
    faApple,
} from "@fortawesome/free-brands-svg-icons";

export default function initFontAwesome() {
    library.add(
        faStar,
        faSitemap,
        faHeart,
        faCaretRight,
        faChevronRight,
        faDownload,
        faHashtag,
        faFlask,
        faBoxOpen,
        faMoon,
        faSignature,
        faHand,
        faHandPointRight,
        faPenNib,
        faMicrochip,
        faMagnifyingGlass,
        faFolderOpen,
        faArrowUpRightFromSquare,

        faApple,
        faXTwitter,
        faMastodon,
        faReddit,
        faDiscord,
        faYoutube,
        faGithub,
        faWindows,
        faLinux,
    );

    dom.watch();
}
