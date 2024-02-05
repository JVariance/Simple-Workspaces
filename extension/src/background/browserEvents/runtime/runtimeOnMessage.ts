import { unstate } from "svelte";
import { WorkspaceStorage, Processes, BrowserStorage } from "../../Entities";
import { informViews } from "../../informViews";
import Browser from "webextension-polyfill";
import * as API from "@root/browserAPI";
import { debounceFunc } from "@root/utils";

const runSwitchWorkspaceCommand = debounceFunc(switchWorkspaceCommand, 250);

function switchWorkspaceCommand({ workspaceUUID }: { workspaceUUID: string }) {
	console.info("switchWorkspaceCommand", workspaceUUID);

	if (workspaceUUID === WorkspaceStorage.activeWindow.activeWorkspace.UUID)
		return;

	Processes.WorkspaceSwitch.start();
	const nextWorkspace = WorkspaceStorage.windows
		.get(WorkspaceStorage.focusedWindowId)!
		.workspaces.find(({ UUID }) => UUID === workspaceUUID)!;

	(async () => {
		await WorkspaceStorage.activeWindow.switchWorkspace(nextWorkspace);
		informViews(
			WorkspaceStorage.activeWindow.windowId,
			"updatedActiveWorkspace",
			{ UUID: nextWorkspace.UUID }
		);
	})();
	Processes.WorkspaceSwitch.finish();
}

function switchWorkspaceAndFocusTab({
	workspaceUUID,
	tabId,
}: {
	workspaceUUID: string;
	tabId: number;
}) {
	const window = WorkspaceStorage.activeWindow;
	const workspace = window.workspaces.find(
		({ UUID }) => UUID === workspaceUUID
	);

	if (workspace) {
		workspace.activeTabId = tabId;
		window.switchWorkspace(workspace);
		informViews(window.windowId!, "updatedActiveWorkspace", {
			UUID: workspaceUUID,
		});
	}
}

export async function runtimeOnMessage(
	message: any,
	sender: Browser.Runtime.MessageSender,
	sendResponse: () => void
) {
	const { msg } = message;

	switch (msg) {
		case "clearDB":
			WorkspaceStorage.clearDB();
			break;
		case "logWindows":
			console.info(WorkspaceStorage.windows);
			break;
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
				]);

				const workspaces = WorkspaceStorage.getWindow(
					message.windowId
				).workspaces;
				return resolve(unstate(workspaces));
			});
		case "removeWorkspace":
			(async () => {
				const previousWorkspace = await WorkspaceStorage.getWindow(
					message.windowId
				).removeWorkspace(message.workspaceUUID);

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
				// WorkspaceStorage.getWindow(windowId).updateWorkspaces(newWorkspaces);
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
			message?.instant
				? switchWorkspaceCommand(message)
				: runSwitchWorkspaceCommand(message);
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
					currentWorkspaces.map((workspace) =>
						WorkspaceStorage.activeWindow.editWorkspace({
							workspaceUUID: workspace.UUID,
							icon: workspace.icon,
							name: workspace.name,
						})
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
					window.workspaces[0].name = message.homeWorkspace.name;
					window.workspaces[0].icon = message.homeWorkspace.icon;
				});
				await BrowserStorage.setHomeWorkspace(message.homeWorkspace);
				return resolve();
			});
		case "setDefaultWorkspaces":
			return new Promise<void>(async (resolve) => {
				await BrowserStorage.setDefaultWorkspaces(message.defaultWorkspaces);
				if (
					WorkspaceStorage.windows.size < 2 &&
					WorkspaceStorage.activeWindow.workspaces.length < 2
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
		case "switchWorkspace":
		// return new Promise<void>(async (resolve) => {
		// 	runSwitchWorkspaceCommand();
		// });
		default:
			break;
	}
}