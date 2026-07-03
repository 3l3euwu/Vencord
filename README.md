# DigiCord

A custom distribution of [Vencord](https://vencord.dev) with built-in runtime plugin & theme management, BetterDiscord API compatibility, and a standalone Windows installer.

## Features

- **External Plugin Loader** — Install `.js` plugins from any URL at runtime, with settings UI
- **External Theme Loader** — Install `.css` themes from any URL, toggle on/off
- **BetterDiscord API** — Full BdApi shim (Patcher, Webpack, DOM, Data, UI, ContextMenu, etc.)
- **Plugin Settings** — Edit plugin settings through a modal UI (Boolean, String, Number, Select, Slider)
- **No Node.js Required** — Standalone EXE/PowerShell installer, fully self-contained
- **Catppuccin-inspired UI** — Clean dark theme throughout

## Quick Install

### Option 1: Standalone EXE
Download `DigiCordInst.exe` and run as Administrator. The EXE contains everything needed — no dependencies.

### Option 2: PowerShell (no EXE)
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer.ps1
```

### Option 3: Node.js (for development)
```bash
pnpm install
pnpm build
pnpm dcpinstall   # runs node installer.mjs
```

Or build & inject in one step:
```bash
pnpm build && pnpm dcpinstall
```

## Writing Plugins

### DigiCord-native format
```js
DigiCord.registerPlugin({
    name: 'MyPlugin',
    description: 'Does something cool',
    authors: [{ name: 'You', id: 12345 }],
    start() {
        // called when plugin starts
    },
    stop() {
        // called when plugin stops
    },
    settings: {
        def: {
            mySetting: {
                type: DigiCord.OptionType.BOOLEAN,
                description: 'Enable feature',
                default: true,
            },
        },
    },
});
```

### BetterDiscord format (auto-detected)
```js
module.exports = class MyPlugin {
    getName() { return 'MyPlugin'; }
    getDescription() { return 'Does something cool'; }
    start() { }
    stop() { }
};
```

### Available APIs
| API | Description |
|-----|-------------|
| `DigiCord.Webpack` | `find`, `findByProps`, `findByCode`, `waitFor`, `filters` etc. |
| `DigiCord.FluxDispatcher` | Subscribe to Discord flux events (`MESSAGE_DELETE`, `MESSAGE_UPDATE`, etc.) |
| `DigiCord.Stores` | `UserStore`, `ChannelStore`, `GuildStore`, `MessageStore`, `EmojiStore`, etc. |
| `DigiCord.React` | React library for creating UI elements |
| `DigiCord.UI` | `showToast`, Button, Forms, Switch, Select, Slider, etc. |
| `DigiCord.DataStore` | Persist plugin data (IndexedDB-backed) |
| `DigiCord.MessageEvents` | `addPreSendListener`, `addPreEditListener`, `addClickListener` |
| `DigiCord.ContextMenu` | `addPatch`, `removePatch` |
| `DigiCord.Commands` | `register`, `unregister` custom slash commands |
| `DigiCord.Badges` | `add`, `remove` profile badges |
| `DigiCord.ChatButtons` | `add`, `remove` chat bar buttons |
| `DigiCord.MessagePopover` | `add`, `remove` message hover buttons |
| `DigiCord.MessageAccessories` | `add`, `remove` content below messages |
| `DigiCord.MessageDecorations` | `add`, `remove` decorations next to author name |
| `DigiCord.MemberListDecorators` | `add`, `remove` member list decorations |
| `DigiCord.Styles` | `enable`, `disable` CSS |
| `BdApi(name)` | Full BetterDiscord shim: `Patcher`, `Webpack`, `DOM`, `Data`, `UI`, `ContextMenu`, `Net`, etc. |

## Writing Themes

Any CSS file from a URL can be installed as a theme. Toggle on/off from Settings → External Themes.

## Project Structure

```
├── src/
│   ├── api/
│   │   ├── ExternalPlugins.ts    # Plugin runtime, BdApi shim, settings proxy
│   │   └── ExternalThemes.ts     # CSS theme loader
│   ├── components/settings/tabs/
│   │   ├── externalPlugins/      # Plugin management UI
│   │   ├── externalThemes/       # Theme management UI
│   │   └── about/                # About page
│   ├── plugins/_core/settings.tsx # Tab registration
│   └── Vencord.ts                # Entry point
├── example-plugins/              # Example DigiCord-native plugins
├── installer.mjs                 # Node.js HTTP server installer
├── installer.ps1                 # Standalone PowerShell GUI installer
├── DigiCordInst.exe              # Pre-built standalone installer
└── package.json
```

## Building from Source

```bash
pnpm install
pnpm build          # builds dist/
pnpm dcpbuild       # builds + creates DigiCordInst.exe
```

## Credits

Based on [Vencord](https://vencord.dev) by Vendicated and contributors.
