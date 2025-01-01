[![Actions Status](https://github.com/tdulcet/GIMPS-Opener/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tdulcet/GIMPS-Opener/actions/workflows/ci.yml)

# GIMPS Opener
Open GIMPS exponent numbers

Copyright © 2022 Teal Dulcet

![](icons/icon_128.png)

Firefox, Chromium and Thunderbird add-on/WebExtension to open [Great Internet Mersenne Prime Search](https://www.mersenne.org/) (GIMPS) 2ᴾ-1 exponent numbers.

* Allows opening exponent numbers in:
	* [mersenne.org](https://www.mersenne.org/) (2 - 999,999,937)
	* [mersenne.ca](https://www.mersenne.ca/) (2 - 9,999,999,967)
* Supports opening multiple exponents in single page (mersenne.ca only)
* Type exponent numbers directly in the address bar/omnibox (Firefox and Chrome only, use the `exp` keyword)
* Shows a live preview of the exponent(s) that would open
* Supports exponents with an optional `M` prefix and optional comma or space digit separators
* Ignores numbers that are not prime using the deterministic [Miller–Rabin primality test](https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test#Deterministic_variants)
* Supports opening exponents in the current tab, a new tab (default), a new window or a new private/incognito window (Firefox and Chrome only)
* Supports lazy loading tabs (Firefox and Chrome only)
* Supports the light/dark mode of your system automatically
* Settings automatically synced between all browser instances and devices (Firefox and Chrome only)
* Follows the [Firefox](https://design.firefox.com/photon) and [Thunderbird](https://style.thunderbird.net/) Photon Design

To contribute to GIMPS, please see the [Distributed Computing](https://github.com/tdulcet/Distributed-Computing-Scripts#great-internet-mersenne-prime-search-gimps) scripts.

❤️ Please visit [tealdulcet.com](https://www.tealdulcet.com/) to support this extension and my other software development.

## Download

* [Addons.mozilla.org](https://addons.mozilla.org/firefox/addon/gimps-opener/) (AMO)
* [Addons.thunderbird.net](https://addons.thunderbird.net/thunderbird/addon/gimps-opener/) (ATN)

## Install from source

Clone the repository:
```bash
git clone --recurse-submodules https://github.com/tdulcet/GIMPS-Opener.git
```

### Firefox

Follow [these instructions](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) to install it in Firefox

### Thunderbird

1. Rename the [thunderbirdmanifest.json](thunderbirdmanifest.json) file to `manifest.json`
2. Follow [these instructions](https://developer.thunderbird.net/add-ons/hello-world-add-on#installing) to install it in Thunderbird

### Chromium/Chrome

1. Download the [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) (specifically download the `browser-polyfill.js` file [from here](https://unpkg.com/webextension-polyfill/dist/))
2. Rename the [chromemanifest.json](chromemanifest.json) file to `manifest.json`
3. Follow [these instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world) to install it in Chromium/Chrome

## Contributing

Pull requests welcome! Ideas for contributions:

* Convert to [Manifest V3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/) (MV3)
* Refactor into more modules
* Support more than one top level context menu item (see [bug 1294429](https://bugzilla.mozilla.org/show_bug.cgi?id=1294429))
* Support changing the omnibox keyword (see [bug 1375453](https://bugzilla.mozilla.org/show_bug.cgi?id=1375453))
* Improve the performance
	* Use [WebAssembly](https://developer.mozilla.org/docs/WebAssembly) to check if the numbers are prime
	* Use faster algorithms
* Support opening exponent numbers on mersenne.org greater than 999,999,937
* Support opening exponents for [Fermat numbers](https://en.wikipedia.org/wiki/Fermat_number)
* Sync settings in Thunderbird (see [bug 446444](https://bugzilla.mozilla.org/show_bug.cgi?id=446444))
* Support Firefox for Android (see [bug 1595822](https://bugzilla.mozilla.org/show_bug.cgi?id=1595822) and [bug 1427501](https://bugzilla.mozilla.org/show_bug.cgi?id=1427501))
* Localize the add-on

Thanks to Viliam Furík for creating the [GIMPS logo](https://commons.wikimedia.org/wiki/File:GIMPS_logo_2020.png).
