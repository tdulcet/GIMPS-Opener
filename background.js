"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";

const TITLE = "🌐 GIMPS Opener";

const formatter1 = new Intl.ListFormat([], { style: "short" });

const TYPE = Object.freeze({
	M: "mersenne",
	ORG: "mersenne.org",
	CA: "mersenne.ca"
});
const menuStructure = Object.freeze([TYPE.ORG, TYPE.CA]);

// Mersenne exponent regular expression
const reMExp = /\bM?(\d{4,}|\d{1,3}(?:[,\s]\d{3})*)\b/gu;
// Remove commas and spaces
const re = /[,\s]/gu;

const PRIMES = Object.freeze([2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n]);

// https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test#Testing_against_small_sets_of_bases
// https://oeis.org/A006945
const PRIME_BASES = Object.freeze([
	[1, 2047n],
	[2, 1373653n],
	[3, 25326001n],
	[4, 3215031751n],
	[5, 2152302898747n],
	[6, 3474749660383n],
	[7, 341550071728321n],
	[9, 3825123056546413051n],
	[12, 318665857834031151167461n],
	[13, 3317044064679887385961981n]
	// Propositions only
	// https://www.ams.org/journals/mcom/2007-76-260/S0025-5718-07-01977-1/S0025-5718-07-01977-1.pdf
	// [14, 600309428967010580031259650n],
	// [15, 59276361075595573263446330101n],
	// [16, 564132928021909221014087501701n],
	// [18, 1543267864443420616877677640751301n]
]);

const MERSENNE_PRIMES = new Set([2n, 3n, 5n, 7n, 13n, 17n, 19n, 31n, 61n, 89n, 107n, 127n, 521n, 607n, 1279n, 2203n, 2281n, 3217n, 4253n, 4423n, 9689n, 9941n, 11213n, 19937n, 21701n, 23209n, 44497n, 86243n, 110503n, 132049n, 216091n, 756839n, 859433n, 1257787n, 1398269n, 2976221n, 3021377n, 6972593n, 13466917n, 20996011n, 24036583n, 25964951n, 30402457n, 32582657n, 37156667n, 42643801n, 43112609n, 57885161n, 74207281n, 77232917n, 82589933n, 136279841n]);

// Thunderbird
// https://bugzilla.mozilla.org/show_bug.cgi?id=1641573
const IS_THUNDERBIRD = Boolean(globalThis.messenger);

// Chrome
const IS_CHROME = Object.getPrototypeOf(browser) !== Object.prototype;

// communication type
const UPDATE_CONTEXT_MENU = "updateContextMenu";
const BACKGROUND = "background";

const menus = browser.menus || browser.contextMenus; // fallback for Thunderbird

const settings = {
	single: null,
	newTab: null,
	newWindow: null,
	private: null,
	background: null,
	lazy: null,
	livePreview: null,
	delay: null, // Seconds
	send: null
};

const notifications = new Map();

let menuIsShown = false;

let isAllowed = null;


/**
 * Create notification.
 *
 * @param {string} title
 * @param {string} message
 * @returns {void}
 */
function notification(title, message) {
	if (settings.send) {
		console.log(title, message);
		browser.notifications.create({
			type: "basic",
			iconUrl: browser.runtime.getURL("icons/icon_128.png"),
			title,
			message
		});
	}
}

browser.notifications.onClicked.addListener((notificationId) => {
	const url = notifications.get(notificationId);

	if (url) {
		browser.tabs.create({ url });
	}
});

browser.notifications.onClosed.addListener((notificationId) => {
	notifications.delete(notificationId);
});

/**
 * Encode XML.
 *
 * @param {string} text
 * @returns {string}
 */
function encodeXML(text) {
	const map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&apos;"
	};
	return text.replaceAll(/[&<>"']/gu, (m) => map[m]);
}

/**
 * Multiply mod.
 *
 * @param {bigint} a
 * @param {bigint} b
 * @param {bigint} mod
 * @returns {bigint}
 */
function mulm(a, b, mod) {
	let res = 0n;

	for (; b; b >>= 1n) {
		if (b & 1n) {
			res = (res + a) % mod;
		}

		a = (a << 1n) % mod;
	}

	return res;
}

/**
 * Power mod.
 *
 * @param {bigint} base
 * @param {bigint} exp
 * @param {bigint} mod
 * @returns {bigint}
 */
function powm(base, exp, mod) {
	let res = 1n;

	for (; exp; exp >>= 1n) {
		if (exp & 1n) {
			// res = (res * base) % mod;
			res = mulm(res, base, mod);
		}

		// base = (base * base) % mod;
		base = mulm(base, base, mod);
	}

	return res;
}

/**
 * Miller Rabin.
 *
 * @param {bigint} n
 * @param {bigint} nm1
 * @param {bigint} a
 * @param {bigint} d
 * @param {number} s
 * @returns {boolean}
 */
function miller_rabin(n, nm1, a, d, s) {
	let x = powm(a, d, n);

	if (x === 1n || x === nm1) {
		return false;
	}

	for (let i = 1; i < s; ++i) {
		x = mulm(x, x, n);

		if (x === nm1) {
			return false;
		}
		if (x === 1n) {
			return true;
		}
	}

	return true;
}

/**
 * Check if number is prime.
 *
 * @param {bigint} n
 * @returns {boolean}
 */
function isPrime(n) {
	if (n < 2n) {
		return false;
	}
	for (const p of PRIMES) {
		if (n === p) {
			return true;
		}
		if (!(n % p)) {
			return false;
		}
	}

	const nm1 = n - 1n;

	let r = 0;
	let d = nm1;
	while (!(d & 1n)) {
		d >>= 1n;
		++r;
	}

	let idx;
	for (const [i, num] of PRIME_BASES) {
		if (n < num) {
			idx = i;
			break;
		}
	}
	if (idx == null) {
		throw `Number too large: ${n}`;
	}

	for (let i = 0; i < idx; ++i) {
		if (miller_rabin(n, nm1, PRIMES[i], d, r)) {
			return false;
		}
	}

	return true;
}

/**
 * Check if number is a known Mersenne prime.
 *
 * @param {bigint} p
 * @returns {boolean}
 */
function isKnownMersennePrime(p) {
	return MERSENNE_PRIMES.has(p);
}

/**
 * Check if number is valid Mersenne exponent.
 *
 * @param {bigint} num
 * @returns {boolean}
 */
function isMersenneExp(num) {
	// mersenne.org limits: 2 - 999,999,937
	// mersenne.ca limits: 2 - 9,999,999,967
	return num >= 2n && num <= Number.MAX_SAFE_INTEGER && isPrime(num);
}

/**
 * Get exponents.
 *
 * @param {string} exampleText
 * @returns {string[]|null}
 */
function exps(exampleText) {
	const expnums = Array.from(exampleText.matchAll(reMExp), (x) => [x[0], BigInt(x[1].replaceAll(re, ""))]);
	if (expnums) {
		const aexpnums = Array.from(new Set(expnums.map((x) => x[1]))).filter((p) => isMersenneExp(p));
		if (aexpnums.length) {
			return aexpnums.map((p) => (isKnownMersennePrime(p) ? "‼️" : "") + expnums.find((x) => x[1] === p)[0]);
		}
	}
	return null;
}

/**
 * Get exponents.
 *
 * @param {string} exampleText
 * @returns {bigint[]}
 */
function exponents(exampleText) {
	const expnums = Array.from(exampleText.matchAll(reMExp), (x) => BigInt(x[1].replaceAll(re, "")));
	if (expnums.length) {
		return Array.from(new Set(expnums)).filter((p) => isMersenneExp(p));
	}
	return [];
}

/**
 * Get mersenne.org URLs.
 *
 * @param {bigint[]} expnums
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getORGURLs(expnums, _omnibox) {
	const url = "https://www.mersenne.org/";
	if (expnums.length) {
		return expnums.map((exp) => `${url}M${exp}`);
	}
	return [];
}

/**
 * Get mersenne.ca URLs.
 *
 * @param {bigint[]} expnums
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getCAURLs(expnums, omnibox) {
	const url = "https://www.mersenne.ca/";
	if (expnums.length) {
		if (settings.single || omnibox) {
			if (expnums.length > 1) {
				return [`${url}exponent.php?${new URLSearchParams({ manyexponentdetails: expnums.join(";") })}`];
			}
		}
		return expnums.map((exp) => `${url}M${exp}`);
	}
	return [];
}

/**
 * Get URLs.
 *
 * @const
 * @type {Object.<string, function(bigint[], boolean): string[]>}
 */
const getURLs = Object.freeze({
	// mersenne.org
	[TYPE.ORG]: getORGURLs,
	// mersenne.ca
	[TYPE.CA]: getCAURLs
});

/**
 * Delay.
 *
 * @param {number} delay
 * @returns {Promise<void>}
 */
function delay(delay) {
	return new Promise((resolve) => {
		setTimeout(resolve, delay);
	});
}

/**
 * Potentially adjust context menu display if it is shown.
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function handleMenuShown(info/* , tab */) {
	console.log(info);
	let text = info.selectionText;

	// do not show menu entry when no text is selected
	if (!text) {
		// await menus.removeAll();
		// menuIsShown = false;
		// menus.refresh();
		return;
	}

	text &&= text.trim().normalize();

	await buildMenu(text);

	menus.refresh();
}

/**
 * Handle selection of a context menu item.
 *
 * @param {Object} info
 * @param {Object} tab
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function handleMenuChoosen(info, tab) {
	console.log(info);
	let text = info.selectionText;

	if (!text) {
		return;
	}

	text = text.trim().normalize();

	const urls = [];

	const [menuItemId, id] = info.menuItemId.split("-");

	switch (menuItemId) {
		case TYPE.M: {
			const expnums = exponents(text);
			const aurls = getURLs[id](expnums);
			if (aurls.length) {
				urls.push(...aurls);
			} else {
				const message = "exponents";
				console.error(`Error: No ${message} found`, text);
				notification(`❌ No ${message} found`, `The selected text does not contain any ${message}. This error should only happen in Chrome/Chromium.`);
			}
			break;
		}
	}

	if (urls.length) {
		if (IS_THUNDERBIRD) {
			for (const url of urls) {
				// Only supports HTTP and HTTPS URLs: https://bugzilla.mozilla.org/show_bug.cgi?id=1777183
				await browser.windows.openDefaultBrowser(url);
				if (settings.delay) {
					await delay(settings.delay * 1000);
				}
			}
		} else if (settings.newWindow) {
			browser.windows.create({ url: urls, incognito: settings.private && isAllowed || tab.incognito, focused: !settings.background });
		} else {
			// let aindex = tab.index + 1;
			let aactive = !settings.background;

			if (urls.length > 1) {
				for (const url of urls) {
					const options = { url, active: aactive, /* index: aindex, */ openerTabId: tab.id };
					if (!IS_CHROME) {
						options.discarded = !aactive && settings.lazy;
					}
					await browser.tabs.create(options);
					// aindex += 1;
					aactive = false;
					if (settings.delay) {
						await delay(settings.delay * 1000);
					}
				}
			} else if (settings.newTab) {
				const options = { url: urls[0], active: aactive, /* index: aindex, */ openerTabId: tab.id };
				if (!IS_CHROME) {
					options.discarded = !aactive && settings.lazy;
				}
				browser.tabs.create(options);
			} else {
				browser.tabs.update(tab.id, { url: urls[0] });
			}
		}
	}
}

/**
 * Apply (new) menu item settings by (re)creating or updating/refreshing the context menu.
 *
 * @param {string?} [exampleText=null]
 * @returns {Promise<void>}
 */
async function buildMenu(exampleText) {
	console.log(exampleText);
	const expnums = exampleText && exps(exampleText);

	if (menuIsShown) {
		const text = settings.livePreview && expnums ? ` (${formatter1.format(expnums).replaceAll("&", "&&")})` : "";
		await menus.update(TYPE.M, {
			title: `Open exponents${text}`,
			enabled: Boolean(expnums)
		});
	} else {
		await menus.create({
			id: TYPE.M,
			title: "Open exponents",
			contexts: ["selection"]
		});
	}

	for (const [index, key] of menuStructure.entries()) {
		if (index && !menuIsShown) {
			await menus.create({
				// id: id,
				parentId: TYPE.M,
				type: "separator",
				contexts: ["selection"]
			});
		}

		const aid = `${TYPE.M}-${key}`;
		const menuText = `in ${key}`;
		if (menuIsShown) {
			await menus.update(aid, {
				title: menuText,
				visible: Boolean(expnums)
			});
		} else if (IS_CHROME) {
			await menus.create({
				id: aid,
				parentId: TYPE.M,
				title: menuText,
				contexts: ["selection"]
			});
		} else {
			await menus.create({
				id: aid,
				parentId: TYPE.M,
				title: menuText,
				icons: {
					16: `https://www.${key}/favicon.ico`
				},
				contexts: ["selection"]
			});
		}
	}

	menuIsShown = true;
}

if (browser.omnibox) {
	browser.omnibox.onInputChanged.addListener((input, suggest) => {
		console.log(input);
		const result = [];

		if (input) {
			const aexps = exps(input);
			if (aexps) {
				const text = ` (${formatter1.format(aexps)})`;
				const expnums = exponents(input);
				for (const id of menuStructure) {
					const [aurl] = getURLs[id](expnums, true);
					const adescription = `Open exponents in ${id}${text}`;
					result.push({
						content: aurl,
						description: IS_CHROME ? `${encodeXML(adescription)} <url>${aurl}</url>` : adescription
					});
				}
			}
		}

		console.log(result);
		suggest(result);
	});

	browser.omnibox.onInputEntered.addListener((url, disposition) => {
		console.log(url, disposition);
		if (/^(?:https?|ftp):/iu.test(url)) {
			switch (disposition) {
				case "currentTab":
					browser.tabs.update({ url });
					break;
				case "newForegroundTab":
					browser.tabs.create({ url });
					break;
				case "newBackgroundTab":
					browser.tabs.create({ url, active: false });
					break;
			}
		}
	});
}

// feature detection for this feature, as it is not compatible with Chrome/ium.
if (menus.onShown) {
	menus.onShown.addListener(handleMenuShown);
}
menus.onClicked.addListener(handleMenuChoosen);

/**
 * Set settings.
 *
 * @param {Object} asettings
 * @returns {void}
 */
function setSettings(asettings) {
	settings.single = asettings.single;
	settings.newTab = false;
	settings.newWindow = false;
	settings.private = false;
	switch (Number.parseInt(asettings.disposition, 10)) {
		case 1:
			break;
		case 2:
			settings.newTab = true;
			break;
		case 3:
			settings.newWindow = true;
			break;
		case 4:
			settings.newWindow = true;
			settings.private = true;
			break;
	}
	settings.background = asettings.background;
	settings.lazy = asettings.lazy;
	settings.livePreview = asettings.livePreview;
	settings.delay = asettings.delay;
	settings.send = asettings.send;

	if (browser.omnibox) {
		browser.omnibox.setDefaultSuggestion({
			description: `Search for exponents via ${TITLE}. Type exponent numbers.`
		});
	}
}

/**
 * Init.
 *
 * @public
 * @returns {Promise<void>}
 */
async function init() {
	const platformInfo = await browser.runtime.getPlatformInfo();
	// Remove once https://bugzilla.mozilla.org/show_bug.cgi?id=1595822 is fixed
	if (platformInfo.os === "android") {
		return;
	}

	isAllowed = await browser.extension.isAllowedIncognitoAccess();

	const asettings = await AddonSettings.get("settings");

	setSettings(asettings);

	buildMenu();
}

init();

browser.runtime.onMessage.addListener(async (message, _sender) => {
	// console.log(message);
	if (message.type === UPDATE_CONTEXT_MENU) {
		let text = message.selection;

		// do not show menu entry when no text is selected
		if (!text) {
			return;
		}

		text = text.trim().normalize();

		await buildMenu(text);
	} else if (message.type === BACKGROUND) {
		setSettings(message.optionValue);

		await menus.removeAll();
		menuIsShown = false;
		buildMenu();
	}
});

browser.runtime.onInstalled.addListener((details) => {
	console.log(details);

	const manifest = browser.runtime.getManifest();
	switch (details.reason) {
		case "install":
			notification(`🎉 ${manifest.name} installed`, `Thank you for installing the “${TITLE}” add-on!\nVersion: ${manifest.version}\n\nOpen the options/preferences page to configure this extension.`);
			break;
		case "update":
			if (settings.send) {
				browser.notifications.create({
					type: "basic",
					iconUrl: browser.runtime.getURL("icons/icon_128.png"),
					title: `✨ ${manifest.name} updated`,
					message: `The “${TITLE}” add-on has been updated to version ${manifest.version}. Click to see the release notes.\n\n❤️ Huge thanks to the generous donors that have allowed me to continue to work on this extension!`
				}).then(async (notificationId) => {
					let url = "";
					if (browser.runtime.getBrowserInfo) {
						const browserInfo = await browser.runtime.getBrowserInfo();

						url = browserInfo.name === "Thunderbird" ? `https://addons.thunderbird.net/thunderbird/addon/gimps-opener/versions/${manifest.version}` : `https://addons.mozilla.org/firefox/addon/gimps-opener/versions/${manifest.version}`;
					}
					if (url) {
						notifications.set(notificationId, url);
					}
				});
			}
			break;
	}
});

browser.runtime.setUninstallURL("https://forms.gle/QsjrFg2GZALHbkQWA");
