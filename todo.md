**Today**
[] Alt+T: create new tab in tab-island/container if active tab is in one
[] userChrome: style library windows (bookmarks etc.)
[] check: move informViews to effect in Window.svelte.ts?
[] fix popup overflow
[] search improvements
[] emoji picker improvements
[] Avatar nutzen? CSS: --avatar-image-url
[x] fix: tab detachment


# Scenarios
---
[]
## Task: User drags all visible tabs to another window
	| Due to current design, there will never be no tabs
### Current Behavior: 
Firefox focuses tab of other workspace (next? previous?)
### Exp. Behavior:
Create new empty tab/stay in workspace and hide Firefox' auto-focused tab again
---
[]
## Task: User removes last tab of workspace
### Current Behavior: 
Firefox focuses tab of other workspace (next? previous?)
### Exp. Behavior: 
Switch to workspace to which the auto-focused tab belongs and create new tab for closed workspace in background
---
[]
## Task: User drags tab/s to a new window
### Current Behavior
No workspace/window is created in background
### Expected Behavior
The new window is added and a workspace gets created for it

---
# Bugs

- [] send to new workspace: tabs not updated


---
Actions:
 - close window
 - new window
 - new tab
 - move tabs to window
 - send tabs to workspace
 - switch workspace