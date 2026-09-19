'use strict';

const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parsePalette, samePalette, recolor } = require('./lib/theme');

const OMARCHY_PALETTE = path.join(os.homedir(), '.local/state/omarchy/current/theme/colors.toml');

// Foreign palettes are always recoloured from the gold variant: from the red one,
// Nord's reds would anchor to the red accent and errors would take the accent.
const VARIANTS = [
    { name: 'nordic-spal', label: 'Nordic Spal', reference: 'reference.toml' },
    { name: 'nordic-spal-red', label: 'Nordic Spal Red', reference: 'reference-red.toml' },
];

function activate(context) {
    const file = (...parts) => path.join(context.extensionPath, ...parts);

    // Rewrites the theme files (`_watch` in package.json), never settings.json,
    // so nothing host-specific reaches Settings Sync.
    const sync = () => {
        const follow = vscode.workspace.getConfiguration('nordicSpal').get('followOmarchy', true);
        const baked = variant => JSON.parse(fs.readFileSync(file('themes', `${variant.name}.json`), 'utf8'));
        let shared = null;

        if (follow && process.platform === 'linux' && fs.existsSync(OMARCHY_PALETTE)) {
            try {
                const target = parsePalette(fs.readFileSync(OMARCHY_PALETTE, 'utf8'));
                const references = VARIANTS.map(v => parsePalette(fs.readFileSync(file('palette', v.reference), 'utf8')));
                const match = VARIANTS.find((v, i) => samePalette(references[i], target));
                shared = match ? baked(match) : recolor(baked(VARIANTS[0]), references[0], target);
            } catch (error) {
                console.error('[nordic-spal] keeping the baked themes, Omarchy palette unreadable:', error);
            }
        }

        for (const variant of VARIANTS) {
            const active = file('themes', `${variant.name}-color-theme.json`);
            const theme = shared
                ? JSON.stringify({ ...shared, name: variant.label }, null, 4) + '\n'
                : fs.readFileSync(file('themes', `${variant.name}.json`), 'utf8');

            const current = fs.existsSync(active) ? fs.readFileSync(active, 'utf8') : null;
            if (current === theme) continue;

            const tmp = `${active}.${process.pid}.tmp`;
            fs.writeFileSync(tmp, theme);
            fs.renameSync(tmp, active);
        }
    };

    sync();

    // Polling, because Omarchy replaces the whole theme directory on a switch.
    fs.watchFile(OMARCHY_PALETTE, { interval: 2000 }, sync);
    context.subscriptions.push(
        { dispose: () => fs.unwatchFile(OMARCHY_PALETTE, sync) },
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('nordicSpal.followOmarchy')) sync();
        }),
        vscode.commands.registerCommand('nordicSpal.refresh', sync),
    );
}

function deactivate() {}

module.exports = { activate, deactivate };
