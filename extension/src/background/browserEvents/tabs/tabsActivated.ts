import { Processes, WorkspaceStorage } from "@root/background/Entities";
import { informViews } from "@root/background/informViews";
import * as API from "@root/browserAPI";
import type { Tabs } from "webextension-polyfill";

export async function tabsOnActivated(
	activeInfo: Tabs.OnActivatedActiveInfoType
) {
	/* 
		if user searched a tab via Firefox' search feature
	*/
	console.info("tabsOnActivated");
	const runningTabsOnCreated = Processes.runningTabsOnCreated;

	const previousTab = await API.getTab(activeInfo.previousTabId);
	const currentTab = await API.getTab(activeInfo.tabId);
	const previousTabWorkspaceUUID = await API.getTabValue<string>(
		previousTab?.id,
		"workspaceUUID"
	);

	const activeTabWorkspaceUUID = await API.getTabValue(
		activeInfo.tabId,
		"workspaceUUID"
	);
	const activeWindow = WorkspaceStorage.getWindow(activeInfo.windowId);

	const firefoxSearchWasUsed =
		// areNullish(activeTabWorkspaceUUID, previousTabWorkspaceUUID) &&
		!runningTabsOnCreated &&
		activeTabWorkspaceUUID !== previousTabWorkspaceUUID &&
		activeTabWorkspaceUUID !== activeWindow.activeWorkspace?.UUID &&
		previousTab?.windowId === currentTab?.windowId;

	console.info({ firefoxSearchWasUsed });

	const activeWorkspace = activeWindow.findWorkspace(
		({ UUID }) => UUID === activeTabWorkspaceUUID
	);

	if (firefoxSearchWasUsed) {
		Processes.searchWasUsed = true;

		if (activeWorkspace) {
			activeWindow.switchWorkspace(activeWorkspace).finally(() => {
				Processes.searchWasUsed = false;
			});
			informViews(activeWindow.windowId, "updatedActiveWorkspace", {
				UUID: activeWorkspace.UUID,
			});
		}
	} else {
		activeWorkspace && (activeWorkspace.activeTabId = activeInfo.tabId);
	}
}
