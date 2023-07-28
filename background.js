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

const mersennePrimes = new Set([2, 3, 5, 7, 13, 17, 19, 31, 61, 89, 107, 127, 521, 607, 1279, 2203, 2281, 3217, 4253, 4423, 9689, 9941, 11213, 19937, 21701, 23209, 44497, 86243, 110503, 132049, 216091, 756839, 859433, 1257787, 1398269, 2976221, 3021377, 6972593, 13466917, 20996011, 24036583, 25964951, 30402457, 32582657, 37156667, 42643801, 43112609, 57885161, 74207281, 77232917, 82589933]);

// Thunderbird
// https://bugzilla.mozilla.org/show_bug.cgi?id=1641573
const IS_THUNDERBIRD = typeof messenger !== "undefined";

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
	return text.replace(/[&<>"']/gu, (m) => map[m]);
}

/**
 * Check if number is prime.
 *
 * @param {number} num
 * @returns {boolean}
 */
function isPrime(num) {
	if (num < 2) {
		return false;
	}
	if ([2, 3, 5].includes(num)) {
		return true;
	}
	for (const p of [2, 3, 5]) {
		if (num % p === 0) {
			return false;
		}
	}
	const sqrt = Math.sqrt(num);
	for (let p = 7; p <= sqrt; p += 30) {
		for (const i of [0, 4, 6, 10, 12, 16, 22, 24]) {
			if (num % (p + i) === 0) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Check if number is a known Mersenne prime.
 *
 * @param {number} p
 * @returns {boolean}
 */
function isKnownMersennePrime(p) {
	return mersennePrimes.has(p);
}

/**
 * Check if number is valid Mersenne exponent.
 *
 * @param {number} num
 * @returns {boolean}
 */
function isMersenneExp(num) {
	// mersenne.org limits: 2 - 999,999,937
	// mersenne.ca limits: 2 - 9,999,999,967
	return num >= 2 && num <= Number.MAX_SAFE_INTEGER && isPrime(num);
}

/**
 * Get exponents.
 *
 * @param {string} exampleText
 * @returns {string[]|null}
 */
function exps(exampleText) {
	const expnums = Array.from(exampleText.matchAll(reMExp), (x) => [x[0], Number.parseInt(x[1].replaceAll(re, ""), 10)]);
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
 * @returns {number[]}
 */
function exponents(exampleText) {
	const expnums = Array.from(exampleText.matchAll(reMExp), (x) => Number.parseInt(x[1].replaceAll(re, ""), 10));
	if (expnums.length) {
		return Array.from(new Set(expnums)).filter((p) => isMersenneExp(p));
	}
	return [];
}

/**
 * Get mersenne.org URLs.
 *
 * @param {number[]} expnums
 * @param {boolean} [omnibox]
 * @returns {string[]}
 */
function getORGURLs(expnums/* , omnibox */) {
	const url = "https://www.mersenne.org/";
	if (expnums.length) {
		return expnums.map((exp) => `${url}M${exp}`);
	}
	return [];
}

/**
 * Get mersenne.ca URLs.
 *
 * @param {number[]} expnums
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
 * @type {Object.<string, function(number[], boolean): string[]>}
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
async function handleMenuShown(info, tab) {
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
					await browser.tabs.create({ url, active: aactive, discarded: !aactive && settings.lazy, /* index: aindex, */ openerTabId: tab.id });
					// aindex += 1;
					aactive = false;
					if (settings.delay) {
						await delay(settings.delay * 1000);
					}
				}
			} else if (settings.newTab) {
				browser.tabs.create({ url: urls[0], active: aactive, discarded: !aactive && settings.lazy, /* index: aindex, */ openerTabId: tab.id });
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
		menus.update(TYPE.M, {
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
			menus.update(aid, {
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

if (!IS_THUNDERBIRD) {
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

	if (!IS_THUNDERBIRD) {
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

browser.runtime.onMessage.addListener(async (message, sender) => {
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
