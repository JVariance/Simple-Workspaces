import type Browser from "webextension-polyfill";
import { WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";

export async function menusOnClicked(
	info: Browser.Menus.OnClickData,
	tab: Browser.Tabs.Tab | undefined
) {
	const { menuItemId: _menuItemId } = info;
	const menuItemId = _menuItemId.toString();
	let targetWorkspaceUUID!: string;

	const newWorkspaceDemanded =
		menuItemId.toString() === "create-workspace-menu";

	if (menuItemId.toString().startsWith("workspace") || newWorkspaceDemanded) {
		const highlightedTabIds = (
			await API.queryTabs({
				windowId: tab!.windowId!,
				highlighted: true,
			})
		).tabs?.map((tab) => tab.id!);

		let newWorkspace;
		const tabIds =
			highlightedTabIds && highlightedTabIds.length > 1
				? highlightedTabIds
				: [tab!.id!];

		if (menuItemId.toString().startsWith("workspace-menu")) {
			targetWorkspaceUUID = menuItemId.split("_").at(1)!;
		} else if (newWorkspaceDemanded) {
			newWorkspace = await WorkspaceStorage.activeWindow.addWorkspace([]);
			newWorkspace.active = false;
			targetWorkspaceUUID = newWorkspace.UUID;
		}

		if (!tab?.windowId) return;

		tabIds &&
			(await WorkspaceStorage.getWindow(tab!.windowId!).moveTabs({
				tabIds,
				targetWorkspaceUUID,
			}));

		if (newWorkspaceDemanded) {
			informViews(tab.windowId, "movedTabsToNewWorkspace", {
				workspace: newWorkspace,
				tabIds,
			});
		} else {
			informViews(tab.windowId!, "movedTabs", { targetWorkspaceUUID, tabIds });
		}

		if (
			targetWorkspaceUUID === WorkspaceStorage.activeWindow.activeWorkspace.UUID
		) {
			informViews(tab.windowId!, "updatedActiveWorkspace", {
				UUID: targetWorkspaceUUID,
			});
		}
	}
}
