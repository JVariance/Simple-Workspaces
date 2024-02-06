import type Browser from "webextension-polyfill";
import { Processes, WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";

export function storageOnChanged(
	changes: Browser.Storage.StorageAreaOnChangedChangesType
) {
	console.info({ changes });
	for (let key in changes) {
		const item = changes[key];
		switch (key) {
			case "homeWorkspace":
				WorkspaceStorage.windows.forEach((window) => {
					informViews(window.windowId, "updatedHomeWorkspace", {
						homeWorkspace: item.newValue,
					});
				});
				break;
			case "defaultWorkspaces":
				WorkspaceStorage.windows.forEach((window) => {
					informViews(window.windowId, "updatedDefaultWorkspaces", {
						defaultWorkspaces: item.newValue,
					});
				});
				break;
			case "theme":
				WorkspaceStorage.windows.forEach((window) => {
					informViews(window.windowId, "updatedTheme", {
						theme: item.newValue,
					});
				});
				break;
			case "forceDefaultThemeIfDarkMode":
				WorkspaceStorage.windows.forEach((window) => {
					informViews(window.windowId, "forceDefaultThemeIfDarkModeChanged", {
						bool: item.newValue,
					});
				});
				break;
			case "keepPinnedTabs":
				Processes.keepPinnedTabs = item.newValue;
				if (typeof item.newValue === "boolean") {
					const activeWindow = WorkspaceStorage.activeWindow;
					if (item.newValue) {
						activeWindow?.workspaces.forEach((workspace) => {
							API.updateTabs(
								workspace.pinnedTabIds.map((tabId) => ({
									id: tabId,
									props: {
										pinned: true,
									},
								}))
							);
						});
					} else {
						const activeWorkspace = activeWindow.activeWorkspace;
						const nonActiveWorkspacePinnedTabIds = activeWindow.workspaces
							.filter((workspace) => workspace.UUID !== activeWorkspace?.UUID)
							.flatMap((workspace) => workspace.pinnedTabIds);
						API.updateTabs(
							nonActiveWorkspacePinnedTabIds.map((tabId) => ({
								id: tabId,
								props: {
									pinned: false,
								},
							}))
						);
						API.hideTabs(nonActiveWorkspacePinnedTabIds);
					}
				}
				break;
			default:
				break;
		}
	}
}
