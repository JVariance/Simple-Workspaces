import type Browser from "webextension-polyfill";
import { Processes, WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";

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
				break;
			default:
				break;
		}
	}
}
