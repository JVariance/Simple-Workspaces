import { WorkspaceStorage, Processes, BrowserStorage } from "../../Entities";
import { informViews } from "../../informViews";
import Browser, { i18n } from "webextension-polyfill";
import * as API from "@root/browserAPI";
import { exportData } from "@root/background/helper/exportData";
import {
	importData,
	type ImportData,
} from "@root/background/helper/importData";
import {
	convertDaysToMinutes,
	convertHoursToMinutes,
} from "@root/background/helper/Time";
import { immediateDebounceFunc } from "@root/utils";
import type {
	BackupProvider,
	BackupProviderInstance,
	BackupProviderStatusProps,
} from "@root/background/Entities/Singletons/BackupProviders";
import BackupProviders from "@root/background/Entities/Singletons/BackupProviders";
import { backupData } from "@root/background/helper/backupData";
import { StorageProviderError } from "@root/background/helper/Authorization/IBackupProvider";

function switchWorkspaceCommand({
	workspaceUUID,
	pageType,
}: {
	workspaceUUID: string;
	pageType: string;
}) {
	console.info("switchWorkspaceCommand", workspaceUUID);

	if (workspaceUUID === WorkspaceStorage.activeWindow.activeWorkspace.UUID)
		return;

	Processes.WorkspaceSwitch.start();
	const nextWorkspace = WorkspaceStorage.windows
		.get(WorkspaceStorage.focusedWindowId)!
		.workspaces.get(workspaceUUID)!;

	(async () => {
		await WorkspaceStorage.activeWindow.switchWorkspace(nextWorkspace);
		informViews(
			WorkspaceStorage.activeWindow.windowId,
			"updatedActiveWorkspace",
			{ UUID: nextWorkspace.UUID, sourcePage: pageType }
		);
	})();
	Processes.WorkspaceSwitch.finish();
	console.info("switchWorkspaceCommand Ende");
}

function switchWorkspaceAndFocusTab({
	workspaceUUID,
	tabId,
}: {
	workspaceUUID: string;
	tabId: number;
}) {
	const window = WorkspaceStorage.activeWindow;
	const workspace = window.workspaces.get(workspaceUUID);

	if (workspace) {
		workspace.activeTabId = tabId;
		window.switchWorkspace(workspace);
		informViews(window.windowId!, "updatedActiveWorkspace", {
			UUID: workspaceUUID,
		});
	}
}

const processAuthTokens = immediateDebounceFunc(_processAuthTokens, 1000);

async function _processAuthTokens({
	tokens = "",
	provider,
}: {
	tokens: string;
	provider: "Google Drive";
}) {
	const [access_token = undefined, refresh_token = undefined] =
		tokens.split(":");
	console.info({ access_token, refresh_token });
	if (access_token && refresh_token) {
		(await BackupProviders.getProvider(provider))?.authorize({
			access_token,
			refresh_token,
		});
	} else {
		informViews(WorkspaceStorage.activeWindow.windowId, "showToast", {
			type: "error",
			duration: 8000,
			message: i18n.getMessage("auth_tokens_couldnt_be_fetched_error"),
		});
	}
}

async function getFilesList(
	provider: BackupProviderInstance
): Promise<{ id: string; name: string }[]> {
	let attempts = 0;
	while (attempts < 3) {
		try {
			const filesList = await provider.filesList();
			return filesList;
		} catch (error) {
			attempts++;
			if (error instanceof StorageProviderError) {
				if (error.message === "invalid or expired access token") {
					try {
						await provider.refreshAccessToken();
					} catch (error2) {
						throw error2;
					}
				} else {
					throw error;
				}
			} else {
				throw error;
			}
		}
	}
	return [];
}

export function runtimeOnMessage(message: any) {
	const { msg } = message;

	switch (msg) {
		case "clearDB":
			WorkspaceStorage.clearDB();
			break;
		case "logWindows":
			console.info(WorkspaceStorage.windows);
			break;
		case "awaitBackgroundInit":
			return new Promise<void>(async (resolve) => {
				await Processes.ExtensionInitialization;
				resolve();
			});
		case "addWorkspace":
			(async () => {
				informViews(WorkspaceStorage.activeWindow.windowId, "addedWorkspace", {
					workspace:
						await WorkspaceStorage.activeWindow.addWorkspaceAndSwitch(),
				});
			})();
			break;
		case "editWorkspace":
			console.info("editWorkspace", { message });
			WorkspaceStorage.getWindow(message.windowId).editWorkspace(message);
			informViews(message.windowId, "updatedWorkspaces");
			break;
		case "getWorkspaces":
			console.info("bg - getWorkspaces");
			return new Promise(async (resolve) => {
				await Promise.all([
					Processes.ExtensionInitialization,
					Processes.WindowCreation,
					Processes.TabCreation,
					Processes.TabDetachment,
					Processes.TabAttachment,
					Processes.DataImport,
				]);

				const workspaces = WorkspaceStorage.getWindow(
					message.windowId
				).workspaces;

				const workspacesArray = Array.from(workspaces.values());

				console.info("background workspaces for window " + message.windowId, {
					workspacesArray,
				});

				return resolve(workspacesArray);
			});
		case "removeWorkspace":
			(async () => {
				const previousWorkspace = await WorkspaceStorage.getWindow(
					message.windowId
				).removeWorkspace(message.workspaceUUID);

				console.info("bg - removeWorkspace, previousWorkspace", {
					previousWorkspace,
				});

				if (previousWorkspace) {
					await informViews(
						WorkspaceStorage.activeWindow.windowId,
						"updatedWorkspaces"
					);
					informViews(
						WorkspaceStorage.activeWindow.windowId,
						"updatedActiveWorkspace",
						{ UUID: previousWorkspace.UUID }
					);
				}
			})();
			break;
		case "editedWorkspaces":
			(async () => {
				const { workspaces, windowId } = message as {
					workspaces: {
						workspaceUUID: string;
						name: string;
						icon: string;
					}[];
					windowId: number;
				};

				await Promise.all(
					workspaces?.map((workspace) =>
						WorkspaceStorage.getWindow(windowId).editWorkspace(workspace)
					) ?? []
				);

				informViews(windowId, "updatedWorkspaces");
			})();
			break;
		case "reorderedWorkspaces":
			(async () => {
				const { sortedWorkspacesIds, windowId } = message as {
					sortedWorkspacesIds: Ext.Workspace["UUID"][];
					windowId: number;
				};

				console.log({ sortedWorkspacesIds });

				await WorkspaceStorage.getWindow(windowId).reorderWorkspaces(
					sortedWorkspacesIds
				);

				informViews(windowId, "updatedWorkspaces");
			})();
			break;
		case "reloadAllTabs":
			(async () => {
				const tabIds = (
					await API.queryTabs({
						windowId: (await Browser.windows.getCurrent()).id,
					})
				).tabs?.map((tab) => tab.id!);

				tabIds?.forEach((tabId) => Browser.tabs.reload(tabId));
			})();
			break;
		case "showAllTabs":
			(async () => {
				const tabIds = (
					await API.queryTabs({
						windowId: (await Browser.windows.getCurrent()).id,
					})
				).tabs?.map((tab) => tab.id!);

				tabIds && Browser.tabs.show(tabIds);
			})();
			break;
		case "getCurrentTabIds":
			return new Promise(async (resolve) => {
				const tabIds =
					(
						await API.queryTabs({
							windowId: (await Browser.windows.getCurrent()).id,
						})
					).tabs?.map((tab) => tab.id!) || [];
				return resolve(tabIds);
			});
		case "switchWorkspace":
			switchWorkspaceCommand(message);
			break;
		case "switchWorkspaceAndFocusTab":
			switchWorkspaceAndFocusTab(message);
			break;
		case "setCurrentWorkspaces":
			return new Promise<void>(async (resolve) => {
				const { currentWorkspaces } = message as {
					currentWorkspaces: Ext.Workspace[];
				};

				await Promise.all(
					currentWorkspaces?.map(
						(workspace) =>
							WorkspaceStorage.activeWindow.editWorkspace({
								workspaceUUID: workspace.UUID,
								icon: workspace.icon,
								name: workspace.name,
							}) ?? []
					)
				);

				informViews(
					WorkspaceStorage.activeWindow.windowId,
					"updatedWorkspaces"
				);

				return resolve();
			});
		case "setHomeWorkspace":
			return new Promise<void>(async (resolve) => {
				console.info("setHomeWorkspace to " + message.homeWorkspace);
				WorkspaceStorage.windows.forEach((window) => {
					window.workspaces.get("HOME")!.name = message.homeWorkspace.name;
					window.workspaces.get("HOME")!.icon = message.homeWorkspace.icon;
				});
				await BrowserStorage.setHomeWorkspace(message.homeWorkspace);
				return resolve();
			});
		case "setDefaultWorkspaces":
			return new Promise<void>(async (resolve) => {
				await BrowserStorage.setDefaultWorkspaces(message.defaultWorkspaces);
				if (
					WorkspaceStorage.windows.size < 2 &&
					WorkspaceStorage.activeWindow.workspaces.size < 2
				) {
					await WorkspaceStorage.activeWindow.addDefaultWorkspaces();
					console.info("added default workspaces and now informviews");
					informViews(
						WorkspaceStorage.activeWindow.windowId,
						"updatedWorkspaces"
					);
				}

				return resolve();
			});
		case "getDefaultWorkspaces":
			return new Promise(async (resolve) => {
				const { defaultWorkspaces } =
					await BrowserStorage.getDefaultWorkspaces();
				return resolve(defaultWorkspaces);
			});
		case "getExistingWindowsWorkspaces":
			return new Promise(async (resolve) => {
				const existingWindowsWorkspaces = Array.from(
					WorkspaceStorage.windows.values()
				).map((window, i) => [
					i,
					Array.from(window.workspaces.values())
						.slice(1)
						.map(({ name, icon }) => ({ name, icon })),
				]);
				return resolve(existingWindowsWorkspaces);
			});
		case "forceApplyDefaultWorkspacesOnCurrentWindow":
			return new Promise<void>(async (resolve) => {
				await WorkspaceStorage.activeWindow.forceApplyDefaultWorkspaces();
				informViews(
					WorkspaceStorage.activeWindow.windowId,
					"updatedWorkspaces"
				);
				return resolve();
			});
		case "forceApplyDefaultWorkspacesOnAllWindows":
			return new Promise<void>(async (resolve) => {
				await WorkspaceStorage.forceApplyDefaultWorkspacesOnAllWindows();
				for (let windowId of WorkspaceStorage.windows.keys()) {
					console.info({ windowId });
					informViews(windowId, "updatedWorkspaces");
				}
				return resolve();
			});
		case "clearExtensionData":
			return new Promise<void>(async (resolve) => {
				await Browser.storage.local.clear();
				Browser.runtime.reload();
				return resolve();
			});
		case "getSystemTheme":
			return new Promise<"light" | "dark">(async (resolve) => {
				return resolve(
					window.matchMedia("(prefers-color-scheme: dark)").matches
						? "dark"
						: "light"
				);
			});
		case "authTokens":
			return new Promise<void>((resolve) => {
				resolve();
				processAuthTokens(message);
			});
		case "applyBackupDeviceName":
			return new Promise<void>(async (resolve) => {
				await BrowserStorage.setBackupDeviceName(message.deviceName);
				for (let windowId of WorkspaceStorage.windows.keys()) {
					console.info({ windowId });
					informViews(windowId, "backupDeviceNameChanged", {
						deviceName: message.deviceName,
					});
				}
				return resolve();
			});
		case "changedBackupInterval":
			return new Promise<void>(async (resolve) => {
				const { val, unit } = message;
				let intervalInMinutes =
					unit === "minutes"
						? val
						: unit === "hours"
						? convertHoursToMinutes(val)
						: unit === "days"
						? convertDaysToMinutes(val)
						: null;

				console.info({ intervalInMinutes });

				intervalInMinutes &&
					(await BrowserStorage.setBackupIntervalInMinutes(intervalInMinutes));
				return resolve();
			});
		case "importData":
			return new Promise<void>(async (resolve) => {
				await importData(message);
				return resolve();
			});
		case "getFullExportData":
			return new Promise(async (resolve) => {
				const fullExportDataArray = await exportData();
				return resolve(fullExportDataArray);
			});
		case "getAllBackupDeviceNames":
			return new Promise<string[]>(async (resolve) => {
				const { provider } = message as { provider: BackupProvider };

				const _provider = await BackupProviders.getProvider(provider);

				try {
					const filesList = await getFilesList(_provider);
					console.info({ filesList });
					const deviceNames = filesList?.map((file) => file.name) ?? [];
					console.info({ deviceNames });
					return resolve(deviceNames);
				} catch (e) {
					return resolve([]);
				}
			});
		case "disconnectFromProvider":
			return new Promise<void>(async (resolve) => {
				const { provider } = message as { provider: BackupProvider };
				await (await BackupProviders.getProvider(provider)).deauthorize();
			});
		case "openBackupProviderAuthPage":
			return new Promise<void>(async (resolve) => {
				const { provider } = message as { provider: BackupProvider };
				(await BackupProviders.getProvider(provider)).openAuthPage();
				return resolve();
			});
		case "getBackupProviderStatus":
			return new Promise<BackupProviderStatusProps>(async (resolve) => {
				const { provider } = message as { provider: BackupProvider };
				const status = (await BackupProviders.getProvider(provider)).status;
				return resolve(status);
			});
		case "backupData":
			return new Promise<void>(async (resolve) => {
				await backupData(message);
				return resolve();
			});
		case "getBackupData":
			return new Promise<ImportData | null>(async (resolve) => {
				const { provider, deviceName } = message as {
					provider: BackupProvider;
					deviceName: string;
				};

				const _provider = await BackupProviders.getProvider(provider);

				const fileList = await getFilesList(_provider);

				const deviceFile = fileList.find((file) => file.name === deviceName);

				if (deviceFile) {
					const file = await _provider.fileDownload({
						id: deviceFile.id,
						name: deviceFile.name,
					});

					return resolve(file.contents);
				} else {
					return resolve(null);
				}
			});
		default:
			break;
	}
}
