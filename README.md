# <img src="https://github.com/JVariance/Simple-Workspaces/blob/bbd5e2be74091584fc8df4b52ea96f5e3358f24d/public/icon/icon-light.svg" width="64"/><br/> Simple Workspaces

> currently in development - not available via extension store

A Browser Extension for Firefox which lets you organize your tabs into workspaces similar to Opera Ones workspaces. It's an alternative to Firefox' "Multi Account Containers"-Feature, which requires reauthentication on websites inside every single container.

- [activate previous windows and tab opening on startup](about:preferences#browserRestoreSession)

## Features

 - Light/Dark Theme
 - Popup & Sidebar
 - Shortcuts to add and switch workspaces
    - New Workspace: Ctrl+Alt+D
    - Switch to next Workspace: Ctrl+Alt+X
    - Switch to previuos Workspace: Ctrl+Alt+Y
 - Send multiple (selected) tabs to new/other workspace

### Potential implementation in future releases

 - History per window/workspace
 - hybrid approach: option to declare workspace as contextual identity/container
 - option to visually group workspaces
 - Maybe a notification of the new active workspace when switching workspaces via shortcuts and the views are closed
_______________________________________

## Development

``` 
npm run dev
```

### Build

```
npm run build
```
