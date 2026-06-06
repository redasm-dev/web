import { library, dom } from "@fortawesome/fontawesome-svg-core";

import {
    faStar,
    faSitemap,
    faHeart,
    faCaretRight,
    faDownload,
    faHand,
    faHandPointRight
} from "@fortawesome/free-solid-svg-icons";

import {
    faXTwitter,
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
        faDownload,
        faHand,
        faHandPointRight,

        faXTwitter,
        faYoutube,
        faGithub,
        faWindows,
        faLinux,
    );

    dom.watch();
}
