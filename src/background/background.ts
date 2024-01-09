import { promisedDebounceFunc } from "@root/utils";
import browser from "webextension-polyfill";
import { TabMenu } from "./TabMenu";
import { WorkspaceStorage } from "./WorkspaceStorage";
import { Processes } from "./Processes";
import * as API from "@root/browserAPI";
import { unstate } from "svelte";

let workspaceStorage: WorkspaceStorage;
let tabMenu: TabMenu;
let manualTabCreationHandling = false;

console.info("MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN");

async function initExtension() {
	console.info("initExtension 0");
	// await Processes.ExtensionInitialization;
	if (Processes.ExtensionInitialization.state === "pending") return;
	console.info("initExtension 1");
	Processes.ExtensionInitialization.start();
	console.info("initExtension 2");

	// await browser.storage.local.clear();
	if (!workspaceStorage && !tabMenu) {
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
		workspaceStorage.windows.get(workspaceStorage.focusedWindowId)!.workspaces
	);
}

async function initWorkspaceStorage() {
	workspaceStorage = new WorkspaceStorage();
	await workspaceStorage.init();
}

browser.runtime.onInstalled.addListener(async (details) => {
	console.info("onInstalled");
	await browser.storage.local.clear();
	if (!workspaceStorage) await initExtension();

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
	if (!workspaceStorage) await initExtension();
});

browser.runtime.onConnect.addListener(async (port) => {
	Processes.ExtensionInitialization.then(() => {
		port.postMessage({ msg: "connected" });
	});
});

async function informViews(
	windowId: number,
	message: string,
	props: Record<string | symbol, any> = {}
) {
	console.info("bg - informViews -> " + message, props);
	// const popups = browser.extension.getViews({ type: "popup", windowId });
	// const sidebar = browser.extension.getViews({ type: "sidebar", windowId });

	// console.info({ popups, sidebar });

	// [...popups, ...sidebar].forEach((view) => {
	// console.info({ view, window: view.window });
	// view.postMessage({ msg: message, ...props });
	browser.runtime.sendMessage({ windowId, msg: message, ...props });
	// });
}

browser.menus.onShown.addListener((info, tab) => {
	console.info("browser.menus.onShown");
	const workspaces = workspaceStorage.windows
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
			newWorkspace = await workspaceStorage.activeWindow.addWorkspace([]);
			newWorkspace.active = false;
			targetWorkspaceUUID = newWorkspace.UUID;
			// informViews("addedWorkspace", {
			// 	workspace: newWorkspace,
			// });
		}

		if (!tab?.windowId) return;

		tabIds &&
			(await workspaceStorage.getWindow(tab!.windowId!).moveTabs({
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
			targetWorkspaceUUID === workspaceStorage.activeWindow.activeWorkspace.UUID
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

	=> create new workspaceStorage-window inside tabs.onCreated

	Removal:
	1. browser.tabs.onRemoved
	2. browser.windows.onRemoved
 */

function updateIcon(scheme: "dark" | "light") {
	const paths = {
		path: {
			16: `icon/icon-${scheme}.svg`,
			32: `icon/icon-${scheme}.svg`,
			48: `icon/icon-${scheme}.svg`,
			96: `icon/icon-${scheme}.svg`,
		},
	};
	browser.browserAction.setIcon(paths);
	browser.sidebarAction.setIcon(paths);
}

const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
updateIcon(darkThemeMq.matches ? "dark" : "light");
darkThemeMq.addEventListener("change", (e) => {
	const theme = e.matches ? "dark" : "light";
	updateIcon(theme);
});

// browser.management.onEnabled.addListener(async () => {
// 	await browser.storage.local.clear();
// 	if (!workspaceStorage) await initExtension();
// });

browser.windows.onFocusChanged.addListener((windowId) => {
	if (windowId !== browser.windows.WINDOW_ID_NONE) {
		workspaceStorage.focusedWindowId = windowId;
	}
});

browser.windows.onRemoved.addListener(async (windowId) => {
	if (workspaceStorage.windows.size > 1) {
		await workspaceStorage.removeWindow(windowId);
	}
});

browser.windows.onCreated.addListener(async (window) => {
	if (window.type !== "normal") return;
	await Processes.TabCreation;
	Processes.WindowCreation.start();
	console.info("windows.onCreated");

	const newWindow = await workspaceStorage.getOrCreateWindow(window.id!);
	const windowId = newWindow.windowId;
	await API.setWindowValue(windowId, "windowUUID", newWindow.UUID);

	Processes.WindowCreation.finish();
});

browser.tabs.onCreated.addListener(async (tab) => {
	console.info("browser.tabs.onCreated", { manualTabCreationHandling });
	const window = await browser.windows.get(tab.windowId!);
	if (window?.type !== "normal" || manualTabCreationHandling) return;
	if (Processes.WindowCreation.state === "pending") return;
	await Processes.WindowCreation;
	Processes.TabCreation.start();
	const windowIsNew = !workspaceStorage.windows.has(tab.windowId!);

	console.info("createdTab", { tab: structuredClone(tab) });
	if (!windowIsNew) {
		const tabSessionWorkspaceUUID = await API.getTabValue(
			tab.id!,
			"workspaceUUID"
		);

		console.info({ tabSessionWorkspaceUUID });

		if (tabSessionWorkspaceUUID) {
			await workspaceStorage
				.getWindow(tab.windowId!)
				.restoredTab(tab.id!, tabSessionWorkspaceUUID);
		} else {
			await workspaceStorage.getWindow(tab.windowId!).addTab(tab.id!);
		}
		informViews(tab.windowId!, "createdTab", { tabId: tab.id });
	}

	Processes.TabCreation.finish();
});

browser.tabs.onRemoved.addListener(async (tabId, info) => {
	await Promise.all([
		Processes.TabCreation,
		Processes.TabAttachment,
		Processes.TabDetachment,
	]);

	console.info("tab removed");

	const window = workspaceStorage.getWindow(info.windowId);
	const prevActiveWorkspace = window.activeWorkspace;

	await window.removeTab(tabId);

	if (!prevActiveWorkspace.tabIds.length) {
		console.info("| activeWorkspace has no tabs");
		manualTabCreationHandling = true;
		const newTab = (await API.createTab({
			active: false,
			windowId: window.windowId,
		}))!;

		await API.setTabValue(
			newTab.id!,
			"workspaceUUID",
			window.activeWorkspace.UUID
		);

		prevActiveWorkspace.tabIds.push(newTab.id!);
		prevActiveWorkspace.activeTabId = newTab.id;
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
		manualTabCreationHandling = false;
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
	const activeWorkspace = await workspaceStorage.moveAttachedTabs({
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
	const activeWorkspace = await workspaceStorage.moveDetachedTabs({
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

browser.tabs.onActivated.addListener((activeInfo) => {
	if (workspaceStorage.windows.has(activeInfo.windowId)) {
		workspaceStorage
			.getWindow(activeInfo.windowId)
			.setActiveTab(activeInfo.tabId);
	}
});

browser.commands.onCommand.addListener((command) => {
	switch (command) {
		case "next-workspace":
			(async () => {
				const activeWorkspace =
					await workspaceStorage.activeWindow.switchToNextWorkspace();
				if (!activeWorkspace) return;
				informViews(
					workspaceStorage.activeWindow.windowId,
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
					await workspaceStorage.activeWindow.switchToPreviousWorkspace();
				if (!activeWorkspace) return;
				informViews(
					workspaceStorage.activeWindow.windowId,
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
					await workspaceStorage.activeWindow.addWorkspaceAndSwitch();
				informViews(workspaceStorage.activeWindow.windowId, "addedWorkspace", {
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
			workspaceStorage.clearDB();
			break;
		case "logWindows":
			console.info(workspaceStorage.windows);
			break;
		case "addWorkspace":
			(async () => {
				informViews(workspaceStorage.activeWindow.windowId, "addedWorkspace", {
					workspace:
						await workspaceStorage.activeWindow.addWorkspaceAndSwitch(),
				});
			})();
			break;
		case "editWorkspace":
			console.info("editWorkspace", { message });
			workspaceStorage.getWindow(message.windowId).editWorkspace(message);
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

				const workspaces = workspaceStorage.getWindow(
					message.windowId
				).workspaces;
				return resolve(unstate(workspaces));
			});
		case "removeWorkspace":
			return workspaceStorage
				.getWindow(message.windowId)
				.removeWorkspace(message.workspaceUUID);
		case "reorderedWorkspaces":
			(() => {
				const { sortedWorkspacesIds, windowId } = message as {
					sortedWorkspacesIds: Ext.Workspace["UUID"][];
					windowId: number;
				};

				console.log({ sortedWorkspacesIds });

				workspaceStorage
					.getWindow(windowId)
					.reorderWorkspaces(sortedWorkspacesIds);

				// workspaceStorage.getWindow(windowId).updateWorkspaces(newWorkspaces);
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
			const { workspaceUUID } = message as { workspaceUUID: string };
			const nextWorkspace = workspaceStorage.windows
				.get(workspaceStorage.focusedWindowId)!
				.workspaces.find(({ UUID }) => UUID === workspaceUUID)!;

			(async () => {
				await workspaceStorage.activeWindow.switchWorkspace(nextWorkspace);
				informViews(
					workspaceStorage.activeWindow.windowId,
					"updatedActiveWorkspace",
					{ UUID: nextWorkspace.UUID }
				);
			})();
			break;
		case "setCurrentWorkspaces":
			return new Promise(async (resolve) => {
				const { currentWorkspaces } = message as {
					currentWorkspaces: Ext.Workspace[];
				};

				await Promise.all(
					currentWorkspaces.map((workspace) =>
						workspaceStorage.activeWindow.editWorkspace({
							workspaceUUID: workspace.UUID,
							icon: workspace.icon,
							name: workspace.name,
						})
					)
				);

				informViews(
					workspaceStorage.activeWindow.windowId,
					"updatedWorkspaces"
				);

				return resolve(true);
			});
		case "setDefaultWorkspaces":
			return new Promise(async (resolve) => {
				await browser.storage.local.set({
					homeWorkspace: message.homeWorkspace,
				});
				await browser.storage.local.set({
					defaultWorkspaces: message.defaultWorkspaces,
				});
				return resolve(true);
			});
		case "getDefaultWorkspaces":
			return new Promise(async (resolve) => {
				const { defaultWorkspaces } = await browser.storage.local.get(
					"defaultWorkspaces"
				);
				return resolve(defaultWorkspaces);
			});
		case "clearExtensionData":
			return new Promise(async (resolve) => {
				await browser.storage.local.clear();
				browser.runtime.reload();
				return resolve(true);
			});
		default:
			break;
	}
});
