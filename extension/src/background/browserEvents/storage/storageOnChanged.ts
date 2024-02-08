import type Browser from "webextension-polyfill";
import { Processes, WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";
import { pinTabs, unpinTabs } from "@root/background/helper/tabsPinning";

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
					if (item.newValue) {
						for (let [_, window] of WorkspaceStorage.windows) {
							for (let workspace of window.workspaces) {
								pinTabs(workspace.pinnedTabIds);
							}
						}
					} else {
						for (let [_, window] of WorkspaceStorage.windows) {
							const activeWorkspace = window.activeWorkspace;
							const nonActiveWorkspacePinnedTabIds = window.workspaces
								.filter((workspace) => workspace.UUID !== activeWorkspace.UUID)
								.flatMap((workspace) => workspace.pinnedTabIds);
							unpinTabs(nonActiveWorkspacePinnedTabIds);
							API.hideTabs(nonActiveWorkspacePinnedTabIds);
						}
					}
				}
				break;
			default:
				break;
		}
	}
}
