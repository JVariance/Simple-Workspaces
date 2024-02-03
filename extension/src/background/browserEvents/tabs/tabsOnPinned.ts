import type Browser from "webextension-polyfill";
import * as API from "@root/browserAPI";
import { WorkspaceStorage } from "@root/background/Entities";

export async function tabsOnPinned(
	tabId: number,
	pinned: Browser.Tabs.OnUpdatedChangeInfoType["pinned"],
	tab: Browser.Tabs.Tab
) {
	const workspaceUUID = await API.getTabValue(tabId, "workspaceUUID");
	const activeWindow = WorkspaceStorage.activeWindow;
	const workspace = activeWindow.workspaces.find(
		({ UUID }) => UUID === workspaceUUID
	)!;

	console.info("tabsOnPinned", { pinned, activeWindow, workspace });

	if (pinned) {
		workspace.pinnedTabIds.push(tabId);
	} else {
		workspace.pinnedTabIds = workspace.pinnedTabIds.filter(
			(id) => id !== tabId
		);
	}
}
