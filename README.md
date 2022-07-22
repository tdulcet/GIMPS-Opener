# GIMPS Opener
Open GIMPS exponent numbers

Copyright © 2022 Teal Dulcet

![](icons/icon_128.png)

Firefox, Chromium and Thunderbird add-on/WebExtension to open [Great Internet Mersenne Prime Search](https://www.mersenne.org/) (GIMPS) 2ᴾ-1 exponent numbers.

* Allows opening exponent numbers in:
	* [mersenne.org](https://www.mersenne.org/) (2 - 999,999,937)
	* [mersenne.ca](https://www.mersenne.ca/) (2 - 9,999,999,967)
* Supports opening multiple exponents in single page (mersenne.ca only)
* Type exponent numbers directly in the address bar/omnibox (use the `exp` keyword)
* Shows a live preview of the exponent(s) that would open
* Supports exponents with an optional `M` prefix and optional comma or space digit separators
* Ignores numbers that are not prime
* Supports opening exponents in the current tab, a new tab (default), a new window or a new private/incognito window (Firefox and Chrome only)
* Supports lazy loading tabs (Firefox and Chrome only)
* Supports the light/dark mode of your system automatically
* Settings automatically synced between all browser instances and devices (Firefox and Chrome only)
* Follows the [Firefox](https://design.firefox.com/photon) and [Thunderbird](https://style.thunderbird.net/) Photon Design

To contribute to GIMPS, please see the [Distributed Computing](https://github.com/tdulcet/Distributed-Computing-Scripts#great-internet-mersenne-prime-search-gimps) scripts.

❤️ Please visit [tealdulcet.com](https://www.tealdulcet.com/) to support this extension and my other software development.

🔜 This will soon be published to Addons.mozilla.org (AMO), Addons.thunderbird.net (ATN) and possibly the Chrome Web Store.

Use on Thunderbird requires renaming the [thunderbirdmanifest.json](thunderbirdmanifest.json) file to `manifest.json`.
Use on Chromium/Chrome requires the downloading the [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) and renaming the [chromemanifest.json](chromemanifest.json) file to `manifest.json`.

## Contributing

Pull requests welcome! Ideas for contributions:

* Convert to [Manifest V3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/) (MV3)
* Support more than one top level context menu item (see [bug 1294429](https://bugzilla.mozilla.org/show_bug.cgi?id=1294429))
* Show omnibox suggestions in private windows in Firefox (see [bug 1779400](https://bugzilla.mozilla.org/show_bug.cgi?id=1779400))
* Support changing the omnibox keyword (see [bug 1375453](https://bugzilla.mozilla.org/show_bug.cgi?id=1375453))
* Improve the performance
	* Use [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) to check if the numbers are prime
	* Use a combination of Miller-Rabin for detecting composites and Lucas for detecting primes (see the [factor](https://www.gnu.org/software/coreutils/manual/html_node/factor-invocation.html) command from GNU Coreutils)
* Sync settings in Thunderbird (see [bug 446444](https://bugzilla.mozilla.org/show_bug.cgi?id=446444))
* Support Firefox for Android (see [bug 1595822](https://bugzilla.mozilla.org/show_bug.cgi?id=1595822))
* Localize the add-on

Thanks to Viliam Furík for creating the [GIMPS logo](https://commons.wikimedia.org/wiki/File:GIMPS_logo_2020.png).
