**Today**
[] if extension fresh installed apply default workspaces to current window if set in welcome page
[] handle highlighted tab from Firefox' search tabs feature
[] search improvements
[] emoji picker improvements
[] options page - current workspaces
[] options page - remove single default workspace
[] options page - impl clear functionality


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