**Today**
[] if refresh_token/access_token null -> unauthorize GDrive
### Features
[x] Backup to Cloud Services
[] support bookmarks?
[] support history?
### Styles
### Content
[x] Options: impl select import settings (homeWorkspace, defaultWorkspaces, theme, ...)
### Translations
### Logic
[] Options: Notification auth - success, ...
[] outsource refreshAccessToken-while-loop (pass function that gets called repeatedly)
[] highlight workspace which received new tabs (after send action)

### Bugs
[] closing pinned tabs does not necessarily remove it from workspace
### Other
[] cookies permission still required?
- https://www.npmjs.com/package/p-maps
---
[] getWorkspaces -> if extension isn't initialized, try again periodically a limited number of times before returning undefined(*1)

(*1) I experienced, that the extension didn't successfully initialized on browser restart/startup
---
[] create action-state diagram (e.g. state = 'one window, one tab' & action = 'close tab')