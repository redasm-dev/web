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
} from "@fortawesome/free-solid-svg-icons";

import {
    faApple,
    faXTwitter,
    faMastodon,
    faReddit,
    faDiscord,
    faYoutube,
    faGithub,
    faWindows,
    faLinux,
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
