'use strict';

const ROLES = [
    'accent', 'selection', 'muted',
    'background', 'dark_background', 'darker_background', 'lighter_background',
    'foreground', 'dark_foreground', 'light_foreground', 'bright_foreground',
    'red', 'yellow', 'orange', 'green', 'cyan', 'blue', 'magenta', 'brown',
    'bright_red', 'bright_yellow', 'bright_green', 'bright_cyan', 'bright_blue', 'bright_magenta',
    'selection_background', 'selection_foreground',
];

// Tie-break for duplicate reference colours (accent == yellow): UI follows the
// accent, syntax the plain hues.
const UI_ORDER = [
    'accent', 'background', 'foreground', 'selection', 'muted',
    'lighter_background', 'dark_background', 'darker_background',
    'light_foreground', 'dark_foreground', 'bright_foreground',
    'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'magenta', 'brown',
    'bright_red', 'bright_yellow', 'bright_green', 'bright_cyan', 'bright_blue', 'bright_magenta',
    'selection_background', 'selection_foreground',
];
const SYNTAX_ORDER = [
    'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'magenta',
    'foreground', 'light_foreground', 'dark_foreground', 'muted', 'brown',
    'bright_red', 'bright_yellow', 'bright_green', 'bright_cyan', 'bright_blue', 'bright_magenta',
    'bright_foreground', 'accent', 'selection', 'selection_background', 'selection_foreground',
    'background', 'lighter_background', 'dark_background', 'darker_background',
];

// Lightness offsets from these flip for a light target, to keep contrast.
const NEUTRAL = new Set([
    'background', 'dark_background', 'darker_background', 'lighter_background',
    'foreground', 'dark_foreground', 'light_foreground', 'bright_foreground',
    'muted', 'selection', 'selection_background', 'selection_foreground',
]);

const FALLBACKS = {
    orange: p => mix(p.red, p.yellow, 0.5),
    brown: p => mix(p.orange, p.background, 0.5),
    selection_background: p => p.selection,
    selection_foreground: p => p.foreground,
};

function stripJsonc(text) {
    let out = '';
    let inString = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inString) {
            out += c;
            if (c === '\\') out += text[++i];
            else if (c === '"') inString = false;
        } else if (c === '"') {
            inString = true;
            out += c;
        } else if (c === '/' && text[i + 1] === '/') {
            while (i < text.length && text[i] !== '\n') i++;
            out += '\n';
        } else if (c === '/' && text[i + 1] === '*') {
            i = text.indexOf('*/', i + 2) + 1;
        } else {
            out += c;
        }
    }
    return out.replace(/,(\s*[}\]])/g, '$1');
}

function parseJsonc(text) {
    return JSON.parse(stripJsonc(text));
}

function parsePalette(text) {
    const palette = {};
    for (const line of text.split('\n')) {
        const m = line.match(/^\s*([a-z0-9_]+)\s*=\s*"([^"]*)"/);
        if (m) palette[m[1]] = m[2];
    }
    const colors = { mode: palette.mode === 'light' ? 'light' : 'dark' };
    for (const role of ROLES) {
        if (palette[role] && parseHex(palette[role])) colors[role] = palette[role].toLowerCase();
    }
    for (const [role, derive] of Object.entries(FALLBACKS)) {
        if (!colors[role]) colors[role] = derive(colors);
    }
    return colors;
}

function parseHex(value) {
    if (typeof value !== 'string') return null;
    const m = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (!m) return null;
    let hex = m[1];
    if (hex.length <= 4) hex = [...hex].map(c => c + c).join('');
    return {
        rgb: [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)),
        alpha: hex.length === 8 ? hex.slice(6) : '',
    };
}

function toHex(rgb, alpha = '') {
    return '#' + rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('') + alpha;
}

// Match on hue before lightness, so a grey anchors to a grey role.
const HUE_WEIGHT = 16;

// OKLab, because in RGB a blue-grey is closer to Nord's magenta than to grey.
function toOklab(rgb) {
    const [r, g, b] = rgb.map(v => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

function fromOklab([L, A, B]) {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map(v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055));
}

function mix(a, b, t) {
    const x = parseHex(a).rgb;
    const y = parseHex(b).rgb;
    return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

function samePalette(a, b) {
    return a.mode === b.mode && ROLES.every(role => a[role] === b[role]);
}

// Each colour keeps its offset from its nearest reference role, moved onto
// the target's colour for that role.
function recolor(theme, reference, target) {
    if (samePalette(reference, target)) return theme;

    const flip = reference.mode !== target.mode;
    const cache = new Map();
    const refLab = {};
    const targetLab = {};
    for (const role of ROLES) {
        refLab[role] = toOklab(parseHex(reference[role]).rgb);
        targetLab[role] = toOklab(parseHex(target[role]).rgb);
    }

    const map = (value, order) => {
        const parsed = parseHex(value);
        if (!parsed) return value;
        const key = order === UI_ORDER ? 'ui' + value : 'sx' + value;
        if (cache.has(key)) return cache.get(key);

        const lab = toOklab(parsed.rgb);
        let best = null;
        let bestDistance = Infinity;
        for (const role of order) {
            const ref = refLab[role];
            const distance = ref.reduce((sum, v, i) => sum + (i === 0 ? 1 : HUE_WEIGHT) * (v - lab[i]) ** 2, 0);
            if (distance < bestDistance) {
                best = role;
                bestDistance = distance;
            }
        }

        const sign = flip && NEUTRAL.has(best) ? -1 : 1;
        const shifted = targetLab[best].map((v, i) => v + (i === 0 ? sign : 1) * (lab[i] - refLab[best][i]));
        const result = toHex(fromOklab(shifted), parsed.alpha);
        cache.set(key, result);
        return result;
    };

    const mapSettings = settings => {
        const out = { ...settings };
        if (out.foreground) out.foreground = map(out.foreground, SYNTAX_ORDER);
        if (out.background) out.background = map(out.background, SYNTAX_ORDER);
        return out;
    };

    // ANSI and diagnostic colours follow hues like syntax. Status bar items are
    // exempt: their warning/error colours are the accent on purpose.
    const semantic = id => /ansi/i.test(id) || (/warning|error|info|hint/i.test(id) && !id.startsWith('statusBarItem.'));
    const colors = {};
    for (const [id, value] of Object.entries(theme.colors || {})) {
        colors[id] = map(value, semantic(id) ? SYNTAX_ORDER : UI_ORDER);
    }

    const semanticTokenColors = {};
    for (const [id, value] of Object.entries(theme.semanticTokenColors || {})) {
        semanticTokenColors[id] = typeof value === 'string' ? map(value, SYNTAX_ORDER) : mapSettings(value);
    }

    return {
        ...theme,
        type: target.mode,
        colors,
        semanticTokenColors,
        tokenColors: (theme.tokenColors || []).map(rule => ({ ...rule, settings: mapSettings(rule.settings || {}) })),
    };
}

// tokenColorMap swaps syntax hues across every base rule, so language-specific
// rules follow too instead of each needing its own override.
function merge(base, overrides, name) {
    const swap = Object.fromEntries(Object.entries(overrides.tokenColorMap || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const remap = value => swap[String(value).toLowerCase()] || value;
    const remapSettings = settings => (settings.foreground ? { ...settings, foreground: remap(settings.foreground) } : settings);

    const semanticTokenColors = {};
    for (const [id, value] of Object.entries(base.semanticTokenColors || {})) {
        semanticTokenColors[id] = typeof value === 'string' ? remap(value) : remapSettings(value);
    }

    return {
        name,
        type: base.type,
        semanticHighlighting: base.semanticHighlighting,
        semanticTokenColors: { ...semanticTokenColors, ...overrides.semanticTokenColors },
        colors: { ...base.colors, ...overrides.colors },
        tokenColors: [
            ...(base.tokenColors || []).map(rule => ({ ...rule, settings: remapSettings(rule.settings || {}) })),
            ...(overrides.tokenColors || []),
        ],
    };
}

module.exports = { parseJsonc, parsePalette, samePalette, recolor, merge };
