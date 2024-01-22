import type Browser from "webextension-polyfill";
import WorkspaceStorage from "../../WorkspaceStorage";
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
			default:
				break;
		}
	}
}
