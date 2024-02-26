**Today**
### Features
[] multiple workspace-edit mode in MainView
[] support bookmarks?
[] support history?
[] import/export
### Styles
[] style emoji-picker on special pages
### Content
### Translations
### Logic
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


---

<!-- Options -->
<!--
	<div class="flex flex-wrap gap-2 justify-stretch items-stretch">
		<div class="bg-red-50 flex-grow p-2 rounded-md min-w-20">
			<h1>Moin</h1>
		</div>
		<div class="bg-green-50 w-[-moz-available] max-w-[500px] p-2 rounded-md min-w-20">
			<h1>Moin</h1>
		</div>
		<div class="bg-blue-50 flex-grow p-2 rounded-md min-w-20">
			<h1>Moin</h1>
		</div>
	</div>
-->