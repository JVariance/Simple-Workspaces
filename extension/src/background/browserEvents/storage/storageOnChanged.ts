import Browser from "webextension-polyfill";
import { Processes, WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";
import { pinTabs, unpinTabs } from "@root/background/helper/tabsPinning";
import {
	clearBackupAlarm,
	createBackupAlarm,
} from "@root/background/helper/backupAlarm";
import type {
	BackupProvider,
	BackupProviderStatusProps,
} from "@root/background/Entities/Singletons/BackupProviders";

function informAboutBackupProviderStatusChange(
	provider: BackupProvider,
	newStatus: BackupProviderStatusProps
) {
	WorkspaceStorage.windows.forEach((window) => {
		informViews(window.windowId, "backupProviderStatusChanged", {
			provider,
			newStatus,
		});
	});
}

export function storageOnChanged(
	changes: Browser.Storage.StorageAreaOnChangedChangesType
) {
	console.info({ changes });
	for (let key in changes) {
		const item = changes[key];
		switch (key) {
			case "GoogleDriveStatus":
				informAboutBackupProviderStatusChange("Google Drive", item.newValue);
				break;
			case "backupEnabled":
				if (item.newValue) {
					createBackupAlarm();
					WorkspaceStorage.windows.forEach((window) => {
						informViews(window.windowId, "backupEnabledChanged", {
							enabled: item.newValue,
						});
					});
				} else {
					clearBackupAlarm();
					WorkspaceStorage.windows.forEach((window) => {
						informViews(window.windowId, "backupEnabledChanged", {
							enabled: item.newValue,
						});
					});
				}
				break;
			case "backupIntervalInMinutes":
				clearBackupAlarm();
				createBackupAlarm();
				break;
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
				(async () => {
					Processes.keepPinnedTabs = item.newValue;
					if (typeof item.newValue === "boolean") {
						if (item.newValue) {
							for (let [_, window] of WorkspaceStorage.windows) {
								pinTabs(
									Array.from(window.workspaces.values()).flatMap(
										({ pinnedTabIds }) => pinnedTabIds
									)
								);
							}
						} else {
							for (let [_, window] of WorkspaceStorage.windows) {
								const activeWorkspace = window.activeWorkspace;
								const nonActiveWorkspacePinnedTabIds = Array.from(
									window.workspaces.values()
								)
									.filter(
										(workspace) => workspace.UUID !== activeWorkspace.UUID
									)
									.flatMap((workspace) => workspace.pinnedTabIds);
								await unpinTabs(nonActiveWorkspacePinnedTabIds);
								API.hideTabs(nonActiveWorkspacePinnedTabIds);
							}
						}
					}
				})();
				break;
			default:
				break;
		}
	}
}
