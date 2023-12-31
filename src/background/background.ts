import {
	DeferredPromise,
	promisedDebounceFunc,
	promisedDebounceFuncWithCollectedArgs,
} from "@root/utils";
import browser, { extension } from "webextension-polyfill";
import { TabMenu } from "./TabMenu";
import { WorkspaceStorage } from "./WorkspaceStorage";

let workspaceStorage: WorkspaceStorage;
let tabMenu: TabMenu;

let extensionIsInitialized = false;
let manualTabCreationHandling = false;

let extensionInitializationProcess = new DeferredPromise<void>();
extensionInitializationProcess.resolve();
let windowCreationProcess = new DeferredPromise<void>();
windowCreationProcess.resolve();
let tabCreationProcess = new DeferredPromise<void>();
tabCreationProcess.resolve();
let tabAttachmentProcess = new DeferredPromise<void>();
tabAttachmentProcess.resolve();
let tabDetachmentProcess = new DeferredPromise<void>();
tabDetachmentProcess.resolve();

console.info("MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN MOINSEN");

async function initExtension() {
	console.info("initExtension 0");
	// await extensionInitializationProcess;
	if (extensionInitializationProcess.state === "pending") return;
	console.info("initExtension 1");
	extensionInitializationProcess = new DeferredPromise();
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
	extensionIsInitialized = true;
	console.info("initExtension 7");
	extensionInitializationProcess.resolve();
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
});

browser.runtime.onStartup.addListener(async () => {
	console.info("onStartup");
	if (!workspaceStorage) await initExtension();
});

// let backgroundListenerPorts: {
// 	port: browser.Runtime.Port;
// 	windowId: number;
// }[] = [];

browser.runtime.onConnect.addListener(async (port) => {
	extensionInitializationProcess.then(() => {
		port.postMessage({ msg: "connected" });
	});
});
// browser.runtime.onConnect.addListener(async (port) => {
// 	console.info("onConnect");
// 	// if (!extensionIsInitialized) {
// 	// 	await initExtension();
// 	// }
// 	// await extensionInitializationProcess;

// 	// const windowId = port.sender?.tab?.windowId!;

// 	console.info("port.sender.tab.windowId");
// 	browser.extension.getViews({ type: "popup" });
// 	// browser.extension.getViews({}).at(0)?.postMessage();
// 	// port.sender.

// 	extensionInitializationProcess.then(() => {
// 		console.info("port connected");
// 		backgroundListenerPorts.push({
// 			port,
// 			windowId,
// 		});

// 		port.postMessage({ msg: "connected" });

// 		port.onDisconnect.addListener((port) => {
// 			backgroundListenerPorts = backgroundListenerPorts.filter(
// 				({ port: _port }) => port !== _port
// 			);
// 		});
// 	});
// });

async function informViews(
	windowId: number,
	message: string,
	props: Record<string | symbol, any> = {}
) {
	// await Promise.all([windowCreationProcess, tabCreationProcess]);
	console.info("bg - informViews");
	const popups = browser.extension.getViews({ type: "popup", windowId });
	const sidebar = browser.extension.getViews({ type: "sidebar", windowId });

	[...popups, ...sidebar].forEach((view) => {
		view.postMessage({ msg: message, ...props });
	});
	// backgroundListenerPorts.forEach(({ port, windowId }) => {
	// 	if (windowId === workspaceStorage.focusedWindowId) {
	// 		port.postMessage({ msg: message, ...props });
	// 	}
	// });
}

browser.menus.onShown.addListener((info, tab) => {
	console.info("browser.menus.onShown");
	const workspaces = workspaceStorage.windows
		.get(tab.windowId!)!
		.workspaces.filter(
			// ({ windowId, active }) => windowId === tab!.windowId! && !active
			({ active }) => !active
		);

	tabMenu.update({
		workspaces,
	});
});

browser.menus.onClicked.addListener(async (info, tab) => {
	const { menuItemId: _menuItemId } = info;
	const menuItemId = _menuItemId.toString();
	let targetWorkspaceId!: string;

	const newWorkspaceDemanded =
		menuItemId.toString() === "create-workspace-menu";

	if (menuItemId.toString().startsWith("workspace") || newWorkspaceDemanded) {
		const highlightedTabIds = (
			await browser.tabs.query({
				windowId: tab!.windowId!,
				highlighted: true,
			})
		).map((tab) => tab.id!);

		let newWorkspace;
		const tabIds =
			highlightedTabIds.length > 1 ? highlightedTabIds : [tab!.id!];

		if (menuItemId.toString().startsWith("workspace-menu")) {
			targetWorkspaceId = menuItemId.split("_").at(1)!;
		} else if (newWorkspaceDemanded) {
			newWorkspace = await workspaceStorage.activeWindow.addWorkspace([]);
			newWorkspace.active = false;
			targetWorkspaceId = newWorkspace.id;
			// informViews("addedWorkspace", {
			// 	workspace: newWorkspace,
			// });
		}

		if (!tab?.windowId) return;

		await workspaceStorage.getWindow(tab!.windowId!).moveTabs({
			tabIds,
			targetWorkspaceId,
		});

		if (newWorkspaceDemanded)
			informViews(tab.windowId, "movedTabsToNewWorkspace", {
				workspace: newWorkspace,
				tabIds,
			});
		else informViews(tab.windowId!, "movedTabs", { targetWorkspaceId, tabIds });

		if (
			targetWorkspaceId === workspaceStorage.activeWindow.activeWorkspace.id
		) {
			informViews(tab.windowId!, "updatedActiveWorkspace", {
				id: targetWorkspaceId,
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
	browser.sidebarAction.setIcon({
		path: {
			16: `icon/icon-${scheme}.svg`,
			32: `icon/icon-${scheme}.svg`,
			48: `icon/icon-${scheme}.svg`,
			96: `icon/icon-${scheme}.svg`,
		},
	});
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

// browser.windows.onRemoved.addListener(async (windowId) => {
// 	if (workspaceStorage.windows.size > 1) {
// 		await workspaceStorage.removeWindow(windowId);
// 	}
// });

browser.windows.onCreated.addListener(async (window) => {
	await tabCreationProcess;
	windowCreationProcess = new DeferredPromise();
	console.info("windows.onCreated");

	const windowId = (await workspaceStorage.getOrCreateWindow(window.id!))
		.windowId;
	//workspaceStorage.addWindow(window.id!);
	await workspaceStorage.initFreshWindow(windowId);

	windowCreationProcess.resolve();
});

browser.tabs.onCreated.addListener(async (tab) => {
	if (manualTabCreationHandling) return;
	await windowCreationProcess;
	tabCreationProcess = new DeferredPromise();
	const windowIsNew = !workspaceStorage.windows.has(tab.windowId!);

	(await workspaceStorage.getOrCreateWindow(tab.windowId!)).addTab(tab.id!);

	if (!windowIsNew) informViews(tab.windowId!, "createdTab", { tabId: tab.id });
	tabCreationProcess.resolve();
});

browser.tabs.onRemoved.addListener(async (tabId, info) => {
	await Promise.all([
		tabCreationProcess,
		tabAttachmentProcess,
		tabDetachmentProcess,
	]);

	console.info("tab removed");
	// if (!this.workspaces.flatMap(({ tabIds }) => tabIds).length) {}

	const window = workspaceStorage.getWindow(info.windowId);
	const prevActiveWorkspace = window.activeWorkspace;

	await window.removeTab(tabId);

	if (!window.activeWorkspace.tabIds.length) {
		manualTabCreationHandling = true;
		const newTab = await browser.tabs.create({
			active: false,
			windowId: window.windowId,
		});
		prevActiveWorkspace.tabIds.push(newTab.id!);
		prevActiveWorkspace.activeTabId = newTab.id;
		await window.switchToPreviousWorkspace();

		informViews(window.windowId, "updatedActiveWorkspace", {
			id: window.activeWorkspace.id,
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
	await Promise.all([windowCreationProcess, tabDetachmentProcess]);
	console.info("handleAttachedTabs", { tabIds, targetWindowId });

	tabAttachmentProcess = new DeferredPromise();
	await workspaceStorage.moveAttachedTabs({ tabIds, targetWindowId });
	collectedAttachedTabs = [];
	tabAttachmentProcess.resolve();
}

async function _handleDetachedTabs(tabIds: number[], currentWindowId: number) {
	await windowCreationProcess;
	console.info("handleDetachedTabs", { tabIds, currentWindowId });

	tabDetachmentProcess = new DeferredPromise();
	const activeWorkspace = await workspaceStorage.moveDetachedTabs({
		tabIds,
		currentWindowId,
	});
	collectedDetachedTabs = [];

	if (!activeWorkspace) {
		tabDetachmentProcess.resolve();
		return;
	}

	// backgroundListenerPorts
	// 	.filter(({ windowId }) => windowId === currentWindowId)
	// 	.forEach(({ port }) => {
	// 		port.postMessage({
	// 			msg: "updatedActiveWorkspace",
	// 			id: activeWorkspace.id,
	// 		});
	// 	});
	informViews(currentWindowId, "updatedActiveWorkspace", {
		id: activeWorkspace.id,
	});

	tabDetachmentProcess.resolve();
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
		case "open-popup":
			browser.browserAction.openPopup({
				windowId: workspaceStorage.activeWindow.windowId,
			});
			break;
		case "toggle-sidebar":
			browser.sidebarAction.toggle();
			break;
		case "next-workspace":
			(async () => {
				const activeWorkspace =
					await workspaceStorage.activeWindow.switchToNextWorkspace();
				if (!activeWorkspace) return;
				informViews(
					workspaceStorage.activeWindow.windowId,
					"updatedActiveWorkspace",
					{
						id: activeWorkspace.id,
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
						id: activeWorkspace.id,
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
			workspaceStorage.getWindow(message.windowId).editWorkspace(message);
			break;
		case "getWorkspaces":
			console.info("bg - getWorkspaces");
			return new Promise(async (resolve) => {
				await Promise.all([
					extensionInitializationProcess,
					windowCreationProcess,
					tabCreationProcess,
					tabDetachmentProcess,
					tabAttachmentProcess,
				]);

				const workspaces = workspaceStorage.getWindow(
					message.windowId
				).workspaces;
				return resolve(workspaces);
			});
		case "removeWorkspace":
			return workspaceStorage
				.getWindow(message.windowId)
				.removeWorkspace(message.workspaceId);
		case "reorderedWorkspaces":
			(() => {
				const { sortedWorkspacesIds, windowId } = message as {
					sortedWorkspacesIds: Ext.Workspace["id"][];
					windowId: Ext.Window["id"];
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
					await browser.tabs.query({
						windowId: (await browser.windows.getCurrent()).id,
					})
				).map((tab) => tab.id!);

				tabIds.forEach((tabId) => browser.tabs.reload(tabId));
			})();
			break;
		case "showAllTabs":
			(async () => {
				const tabIds = (
					await browser.tabs.query({
						windowId: (await browser.windows.getCurrent()).id,
					})
				).map((tab) => tab.id!);

				browser.tabs.show(tabIds);
			})();
			break;
		case "getCurrentTabIds":
			return new Promise(async (resolve) => {
				const tabIds = (
					await browser.tabs.query({
						windowId: (await browser.windows.getCurrent()).id,
					})
				).map((tab) => tab.id);
				return resolve(tabIds);
			});
		case "switchWorkspace":
			const { workspaceId } = message as { workspaceId: string };
			const nextWorkspace = workspaceStorage.windows
				.get(workspaceStorage.focusedWindowId)!
				.workspaces.find(({ id }) => id === workspaceId)!;

			(async () => {
				await workspaceStorage.activeWindow.switchWorkspace(nextWorkspace);
				informViews(
					workspaceStorage.activeWindow.windowId,
					"updatedActiveWorkspace",
					{ id: nextWorkspace.id }
				);
			})();
			break;
		case "setDefaultWorkspaces":
			browser.storage.local.set({
				defaultWorkspaces: message.defaultWorkspaces,
			});
			break;
		case "getDefaultWorkspaces":
			return new Promise(async (resolve) => {
				const { defaultWorkspaces } = await browser.storage.local.get(
					"defaultWorkspaces"
				);
				return resolve(defaultWorkspaces);
			});
		default:
			break;
	}
});
