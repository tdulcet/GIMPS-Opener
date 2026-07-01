/**
 * Specifies the default settings of the add-on.
 *
 * @module data/DefaultSettings
 */

/**
 * An object of all default settings.
 *
 * @private
 * @constant
 * @type {object}
 */
const defaultSettings = {
	settings: {
		single: true,
		disposition: "2",
		background: true,
		lazy: false,
		livePreview: true,
		delay: 0, // Seconds
		send: true
	}
};

// freeze the inner objects, this is strongly recommend
Object.values(defaultSettings).map(Object.freeze);

/**
 * Export the default settings to be used.
 *
 * @public
 * @constant
 * @type {object}
 */
export const DEFAULT_SETTINGS = Object.freeze(defaultSettings);
