# nordic-spal-vscode

My VS Code theme, with the syntax colours of my nvim nordic setup. It follows the active Omarchy theme where Omarchy runs, and looks exactly the same everywhere else.

|                     |                                                 |
| ------------------- | ----------------------------------------------- |
| **Themes**          | Nordic Spal (gold accent) and Nordic Spal Red   |
| **Syntax**          | the colours of my nvim nordic setup             |
| **On Omarchy**      | recoloured live from the active Omarchy palette |
| **Everywhere else** | the baked theme, unchanged                      |
| **Writes to**       | its own extension folder, never `settings.json` |

Settings Sync carries the theme choice between machines and nothing else.

## Contents

- [Quick start](#quick-start)
- [Variants](#variants)
- [Changing the theme](#changing-the-theme)
- [Configuration](#configuration)
- [Commands](#commands)

---

## Quick start

### 1. Install

```bash
bin/install
```

Builds `dist/nordic-spal-vscode-<version>.vsix` and installs it into every VS Code flavour it finds: `code`, `code-insiders`, `codium`, `cursor`, or the app bundle on macOS. It needs `zip`, and `node` to rebake the themes. Without node the committed `themes/*.json` ship as they are.

### 2. Select it

```jsonc
"workbench.colorTheme": "Nordic Spal", // or "Nordic Spal Red"
```

Once, on one machine. Settings Sync carries it to the others.

### 3. Reload

**Developer: Reload Window** in every open window. A window that was already open when the extension arrived does not pick it up.

## Variants

| Theme           | Matches Omarchy theme | Accent         |
| --------------- | --------------------- | -------------- |
| Nordic Spal     | `nordic-darker`       | `#EBCB8B` gold |
| Nordic Spal Red | `nordic-darker-red`   | `#EC483B` red  |

**Red fills use a deeper red.** `#EC483B` is too loud on a bar and dark text on it is hard to read, so every red fill (title bar, status bar, buttons, badges, menu and list selections) is `#A53B31` with white text. Lines and highlights use `#EC483B`.

**The choice only matters off Omarchy.** On an Omarchy host both variants show the active Omarchy theme. Pick gold or red there through Omarchy.

## Changing the theme

| File                         | What                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| `src/overrides.json`         | The theme's own colours and syntax rules. Edit this one.         |
| `src/overrides-red.json`     | Red-only overrides, applied after the Red variant is derived.    |
| `src/base.json`              | The base the theme is built on.                                  |
| `palette/reference.toml`     | The palette the baked theme is designed for. Keep it frozen.     |
| `palette/reference-red.toml` | The `nordic-darker-red` palette the Red variant is derived with. |
| `themes/*.json`              | Build output, committed so a host without node can install.      |

`src/overrides.json` has four keys:

| Key                   | Meaning                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `colors`              | Workbench colours. Same ids as `workbench.colorCustomizations`, and they win over the base. |
| `tokenColors`         | TextMate rules, appended after the base rules. At equal specificity the later rule wins.    |
| `semanticTokenColors` | Colours for language-server tokens. Replace the base entries of the same name.              |
| `tokenColorMap`       | Swaps one hex for another across every base syntax rule, language-specific rules included.  |

Edit, then `bin/install`.

**Put new colours here, not into `settings.json`.** Colour customizations in settings sit on top of every theme, so on an Omarchy host they would pin those colours whatever the palette.

## Configuration

| Key                        | Default | Meaning                                                                                   |
| -------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `nordicSpal.followOmarchy` | `true`  | Recolour from the active Omarchy palette. `false` shows the baked variant. Does not sync. |

## Commands

```bash
bin/install     # build, package, install into every editor found
bin/build       # rebake themes/*.json from src/ and palette/
```

In VS Code, **Nordic Spal: Reload Omarchy Palette** regenerates the theme now instead of within the next two seconds.

---

Inspired by [nordic-vscode](https://github.com/bonchol/nordic-vscode).
