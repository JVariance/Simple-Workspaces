import type Browser from "webextension-polyfill";
import * as API from "@root/browserAPI";
import { Processes, WorkspaceStorage } from "@root/background/Entities";

export async function tabsOnPinned(
	tabId: number,
	changeInfo: Browser.Tabs.OnUpdatedChangeInfoType,
	tab: Browser.Tabs.Tab
) {
	const { pinned } = changeInfo;
	const activeWindow = WorkspaceStorage.activeWindow;
	const activeWorkspace = activeWindow.activeWorkspace;

	const workspaceUUID = await API.getTabValue(tabId, "workspaceUUID");
	const workspace = activeWindow.workspaces.find(
		({ UUID }) => UUID === workspaceUUID
	)!;

	console.info("tabsOnPinned", pinned, tabId, changeInfo, tab);

	if (pinned) {
		!workspace.pinnedTabIds.includes(tabId) &&
			workspace.pinnedTabIds.push(tabId);
	} else {
		const unpinningIsUserInitiated = workspace.UUID === activeWorkspace.UUID;
		unpinningIsUserInitiated &&
			(workspace.pinnedTabIds = workspace.pinnedTabIds.filter(
				(id) => id !== tabId
			));
	}
}
