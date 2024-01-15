import { promisedDebounceFunc } from "@root/utils";
import browser from "webextension-polyfill";
import { TabMenu } from "./TabMenu";
import { WorkspaceStorage } from "./WorkspaceStorage";
import { Processes } from "./Processes";
import * as API from "@root/browserAPI";
import { unstate } from "svelte";
import { BrowserStorage } from "./Storage";
import { createTab } from "./tabCreation";

// let WorkspaceStorage: WorkspaceStorage;
let tabMenu: TabMenu;

console.info("MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN");

async function initExtension() {
	console.info("initExtension 0");
	// await Processes.ExtensionInitialization;
	if (Processes.ExtensionInitialization.state === "pending") return;
	console.info("initExtension 1");
	Processes.ExtensionInitialization.start();
	console.info("initExtension 2");

	// await browser.storage.local.clear();
	if (!WorkspaceStorage.initialized && !tabMenu) {
		console.info("initExtension 3");
		await initWorkspaceStorage();
		console.info("initExtension 4");
		await initTabMenu();
		console.info("initExtension 5");
	}
	// informViews("initialized");
	console.info("initExtension 6");
	Processes.ExtensionInitialization.finish();
}

async function initTabMenu() {
	console.info("initTabMenu");
	tabMenu = new TabMenu();
	await tabMenu.init(
		WorkspaceStorage.windows.get(WorkspaceStorage.focusedWindowId)!.workspaces
	);
}

async function initWorkspaceStorage() {
	// WorkspaceStorage = new WorkspaceStorage();
	await WorkspaceStorage.init();
}

browser.runtime.onInstalled.addListener(async (details) => {
	console.info("onInstalled");
	await browser.storage.local.clear();
	if (!WorkspaceStorage.initialized) await initExtension();

	switch (details.reason) {
		case "install":
			API.createTab({
				url: browser.runtime.getURL("src/pages/Welcome/welcome.html"),
				active: true,
			});
			break;
		case "update":
			break;
		default:
			break;
	}
});

browser.runtime.onStartup.addListener(async () => {
	console.info("onStartup");
	if (!WorkspaceStorage.initialized) await initExtension();
});

async function informViews(
	windowId: number,
	message: string,
	props: Record<string | symbol, any> = {}
) {
	console.info("bg - informViews -> " + message, props);
	browser.runtime.sendMessage({ windowId, msg: message, ...props });
}

browser.menus.onShown.addListener((info, tab) => {
	console.info("browser.menus.onShown");
	const workspaces = WorkspaceStorage.windows
		.get(tab.windowId!)!
		.workspaces.filter(({ active }) => !active);

	tabMenu.update({
		workspaces,
	});
});

browser.menus.onClicked.addListener(async (info, tab) => {
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
});

/* Event Order:
	Creation:
	1. browser.tabs.onCreated
	2. browser.windows.onCreated

	=> create new WorkspaceStorage-window inside tabs.onCreated

	Removal:
	1. browser.tabs.onRemoved
	2. browser.windows.onRemoved
 */

// function updateIcon(scheme: "dark" | "light") {
// 	const paths = {
// 		path: {
// 			16: `icon/icon-${scheme}.svg`,
// 			32: `icon/icon-${scheme}.svg`,
// 			48: `icon/icon-${scheme}.svg`,
// 			96: `icon/icon-${scheme}.svg`,
// 		},
// 	};
// 	browser.browserAction.setIcon(paths);
// 	browser.sidebarAction.setIcon(paths);
// }

// const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
// updateIcon(darkThemeMq.matches ? "dark" : "light");
// darkThemeMq.addEventListener("change", (e) => {
// 	const theme = e.matches ? "dark" : "light";
// 	updateIcon(theme);
// });

// browser.management.onEnabled.addListener(async () => {
// 	await browser.storage.local.clear();
// 	if (!WorkspaceStorage) await initExtension();
// });

browser.windows.onFocusChanged.addListener((windowId) => {
	if (windowId !== browser.windows.WINDOW_ID_NONE) {
		WorkspaceStorage.focusedWindowId = windowId;
	}
});

browser.windows.onRemoved.addListener(async (windowId) => {
	if (WorkspaceStorage.windows.size > 1) {
		await WorkspaceStorage.removeWindow(windowId);
	}
});

browser.windows.onCreated.addListener(async (window) => {
	if (window.type !== "normal") return;
	await Processes.TabCreation;
	Processes.WindowCreation.start();
	console.info("windows.onCreated");

	const newWindow = await WorkspaceStorage.getOrCreateWindow(window.id!);
	const windowId = newWindow.windowId;
	await API.setWindowValue(windowId, "windowUUID", newWindow.UUID);

	Processes.WindowCreation.finish();
});

browser.tabs.onActivated.addListener(async (activeInfo) => {
	await Processes.WorkspaceSwitch;
	const tabId = activeInfo.tabId;
	if (!tabId) return;
	const workspaceUUID = await API.getTabValue<string>(tabId, "workspaceUUID");
	if (workspaceUUID) {
		const workspace = WorkspaceStorage.activeWindow.workspaces.find(
			({ UUID }) => UUID === workspaceUUID
		);

		if (workspace) {
			const isActiveWorkspace =
				workspace.UUID === WorkspaceStorage.activeWindow.activeWorkspace.UUID;

			if (!isActiveWorkspace) {
				await WorkspaceStorage.activeWindow.switchWorkspace(workspace);
				informViews(
					WorkspaceStorage.activeWindow.windowId,
					"updatedActiveWorkspace",
					{ UUID: workspace.UUID }
				);
				await API.updateTab(tabId, { active: true });
			} else {
				WorkspaceStorage.activeWindow.setActiveTab(tabId);
			}
		}
	}
});

browser.tabs.onCreated.addListener(async (tab) => {
	console.info("browser.tabs.onCreated", {
		manualTabAddition: Processes.manualTabAddition,
	});
	const window = await browser.windows.get(tab.windowId!);
	if (Processes.manualTabAddition) {
		Processes.manualTabAddition = false;
		return;
	}

	if (window?.type !== "normal" || Processes.WindowCreation.state === "pending")
		return;
	await Processes.WindowCreation;
	Processes.TabCreation.start();
	const windowIsNew = !WorkspaceStorage.windows.has(tab.windowId!);

	console.info("createdTab", { tab: structuredClone(tab) });
	console.info({ windowIsNew });
	if (!windowIsNew) {
		const tabSessionWorkspaceUUID = await API.getTabValue(
			tab.id!,
			"workspaceUUID"
		);

		console.info({ tabSessionWorkspaceUUID });

		if (tabSessionWorkspaceUUID) {
			await WorkspaceStorage.getWindow(tab.windowId!).restoredTab(
				tab.id!,
				tabSessionWorkspaceUUID
			);
		} else {
			await WorkspaceStorage.getWindow(tab.windowId!).addTab(tab.id!);
		}
		informViews(tab.windowId!, "createdTab", { tabId: tab.id });
	}

	Processes.TabCreation.finish();
});

browser.tabs.onRemoved.addListener(async (tabId, info) => {
	console.info("bg - tabs.onRemoved");
	console.info({ manualTabRemoval: Processes.manualTabRemoval });

	if (Processes.manualTabRemoval) return;

	await Promise.all([
		Processes.TabCreation,
		Processes.TabAttachment,
		Processes.TabDetachment,
	]);

	console.info("tab removed");

	const window = WorkspaceStorage.getWindow(info.windowId);
	const prevActiveWorkspace = window.activeWorkspace;

	await window.removeTab(tabId);

	if (!prevActiveWorkspace.tabIds.length) {
		console.info("| activeWorkspace has no tabs");
		const newTab = (await createTab(
			{
				active: false,
				windowId: window.windowId,
			},
			prevActiveWorkspace
		))!;

		await API.setTabValue(
			newTab.id!,
			"workspaceUUID",
			window.activeWorkspace.UUID
		);

		// prevActiveWorkspace.tabIds.push(newTab.id!);
		// prevActiveWorkspace.activeTabId = newTab.id;
		await window.switchToPreviousWorkspace();

		if (
			window.workspaces.findIndex(
				(w) => w.UUID === prevActiveWorkspace.UUID
			) === 0
		) {
			console.info("?????");
			// if first tab closed in first workspace hide active tab from different workspace and activate new created tab
			const activeTab = (
				await API.queryTabs({ active: true, windowId: window.windowId })
			).tabs?.at(0);

			await API.updateTab(newTab.id!, { active: true });
			activeTab && (await API.hideTab(activeTab.id!));
		}

		informViews(window.windowId, "updatedActiveWorkspace", {
			UUID: window.activeWorkspace.UUID,
		});
	}

	informViews(window.windowId, "removedTab", { tabId });
});

// browser.tabs.onMoved.addListener((tabId, moveInfo) => {
// 	tabId;
// 	moveInfo.windowId;
// });

let collectedAttachedTabs: number[] = [],
	collectedDetachedTabs: number[] = [];

async function _handleAttachedTabs(tabIds: number[], targetWindowId: number) {
	console.info("_handleAttachedTabs");
	await Promise.all([Processes.WindowCreation, Processes.TabDetachment]);
	console.info("handleAttachedTabs", { tabIds, targetWindowId });

	Processes.TabAttachment.start();
	const activeWorkspace = await WorkspaceStorage.moveAttachedTabs({
		tabIds,
		targetWindowId,
	});
	collectedAttachedTabs = [];
	Processes.TabAttachment.finish();

	informViews(targetWindowId, "updatedActiveWorkspace", {
		UUID: activeWorkspace.UUID,
	});
}

async function _handleDetachedTabs(tabIds: number[], currentWindowId: number) {
	await Processes.WindowCreation;
	console.info("handleDetachedTabs", { tabIds, currentWindowId });

	Processes.TabDetachment.start();
	const activeWorkspace = await WorkspaceStorage.moveDetachedTabs({
		tabIds,
		currentWindowId,
	});
	collectedDetachedTabs = [];

	if (!activeWorkspace) {
		Processes.TabDetachment.finish();
		return;
	}

	informViews(currentWindowId, "updatedActiveWorkspace", {
		UUID: activeWorkspace.UUID,
	});
	Processes.TabDetachment.finish();
}

const handleAttachedTabs = promisedDebounceFunc(_handleAttachedTabs, 200);
const handleDetachedTabs = promisedDebounceFunc(_handleDetachedTabs, 200);

browser.tabs.onAttached.addListener((tabId, attachInfo) => {
	const { newWindowId } = attachInfo;
	collectedAttachedTabs.push(tabId);
	handleAttachedTabs(collectedAttachedTabs, newWindowId);
});

browser.tabs.onDetached.addListener((tabId, detachInfo) => {
	const { oldWindowId } = detachInfo;
	collectedDetachedTabs.push(tabId);
	handleDetachedTabs(collectedDetachedTabs, oldWindowId);
});

// browser.tabs.onActivated.addListener((activeInfo) => {
// 	if (WorkspaceStorage.windows.has(activeInfo.windowId)) {
// 		WorkspaceStorage
// 			.getWindow(activeInfo.windowId)
// 			.setActiveTab(activeInfo.tabId);
// 	}
// });

browser.storage.local.onChanged.addListener((changes) => {
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
});

browser.commands.onCommand.addListener((command) => {
	switch (command) {
		case "next-workspace":
			(async () => {
				const activeWorkspace =
					await WorkspaceStorage.activeWindow.switchToNextWorkspace();
				if (!activeWorkspace) return;
				informViews(
					WorkspaceStorage.activeWindow.windowId,
					"updatedActiveWorkspace",
					{
						UUID: activeWorkspace.UUID,
					}
				);
			})();
			break;
		case "previous-workspace":
			(async () => {
				const activeWorkspace =
					await WorkspaceStorage.activeWindow.switchToPreviousWorkspace();
				if (!activeWorkspace) return;
				informViews(
					WorkspaceStorage.activeWindow.windowId,
					"updatedActiveWorkspace",
					{
						UUID: activeWorkspace.UUID,
					}
				);
			})();
			break;
		case "new-workspace":
			(async () => {
				const newWorkspace =
					await WorkspaceStorage.activeWindow.addWorkspaceAndSwitch();
				informViews(WorkspaceStorage.activeWindow.windowId, "addedWorkspace", {
					workspace: newWorkspace,
				});
			})();
			break;
		default:
			break;
	}
});

browser.runtime.onMessage.addListener((message) => {
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
			return WorkspaceStorage.getWindow(message.windowId).removeWorkspace(
				message.workspaceUUID
			);
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
						windowId: (await browser.windows.getCurrent()).id,
					})
				).tabs?.map((tab) => tab.id!);

				tabIds?.forEach((tabId) => browser.tabs.reload(tabId));
			})();
			break;
		case "showAllTabs":
			(async () => {
				const tabIds = (
					await API.queryTabs({
						windowId: (await browser.windows.getCurrent()).id,
					})
				).tabs?.map((tab) => tab.id!);

				tabIds && browser.tabs.show(tabIds);
			})();
			break;
		case "getCurrentTabIds":
			return new Promise(async (resolve) => {
				const tabIds =
					(
						await API.queryTabs({
							windowId: (await browser.windows.getCurrent()).id,
						})
					).tabs?.map((tab) => tab.id!) || [];
				return resolve(tabIds);
			});
		case "switchWorkspace":
			Processes.WorkspaceSwitch.start();
			const { workspaceUUID } = message as { workspaceUUID: string };
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
				await browser.storage.local.clear();
				browser.runtime.reload();
				return resolve();
			});
		default:
			break;
	}
});
