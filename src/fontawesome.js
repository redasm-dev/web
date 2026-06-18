import { library, dom } from "@fortawesome/fontawesome-svg-core";

import {
    faStar,
    faSitemap,
    faHeart,
    faCaretRight,
    faDownload,
    faChevronRight,
    faHand,
    faHandPointRight,
    faKey,
} from "@fortawesome/free-solid-svg-icons";

import {
    faXTwitter,
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
        faHand,
        faHandPointRight,
        faKey,

        faXTwitter,
        faReddit,
        faDiscord,
        faYoutube,
        faGithub,
        faWindows,
        faLinux,
    );

    dom.watch();
}
