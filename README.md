# Tab Workspaces

This extension was originally inspired by [Workspaces](https://addons.mozilla.org/de/firefox/addon/tab-workspaces/) by @fonse.

## Improvements:

 - Use of Firefox' hideTab-API --> Tabs are no longer closed and completely reloaded when adding or switching workspaces
 - Redesign -> Dark Theme added
 -  Added sidebar (open with Ctrl+Alt+Q)
 - Shortcuts to add and switch workspaces

    - New Workspace: Ctrl+Alt+D
    - Switch to next Workspace: Ctrl+Alt+X
    - Switch to previuos Workspace: Ctrl+Alt+Y

 - NYI: Send multiple (selected) tabs to new/ other workspace
 - NYI: Notification informs which workspace is active when switching (can be unchecked in extension's settings)

_______________________________________
Organize your tabs into workspaces. Switch between workspaces to change which tabs are displayed at the moment.

This extension aims to be an alternative to [Tab Groups](https://addons.mozilla.org/en-US/firefox/addon/tab-groups-panorama/), which is no longer supported as of Firefox 57.

## Development

``` 
npm run dev
```

### Build

```
npm run build
```
