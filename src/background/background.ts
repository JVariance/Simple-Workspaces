import browser from "webextension-polyfill";
import { TabMenu } from "./TabMenu";
import { WorkspaceStorage } from "./WorkspaceStorage";

let workspaceStorage: WorkspaceStorage;
let tabMenu: TabMenu;
let removingWindow = false;

function initExtension() {
	return new Promise(async (resolve) => {
		// await browser.storage.local.clear();
		await initWorkspaceStorage();
		await initTabMenu();
		informPorts("initialized");
		return resolve(true);
	});
}

function initTabMenu() {
	return new Promise(async (resolve) => {
		tabMenu = new TabMenu();
		await tabMenu.init(
			workspaceStorage.windows.get(workspaceStorage.focusedWindowId)!.workspaces
		);
		return resolve(true);
	});
}

function initWorkspaceStorage() {
	return new Promise(async (resolve) => {
		workspaceStorage = new WorkspaceStorage();
		await workspaceStorage.init();
		return resolve(true);
	});
	// console.log({ workspaceStorage, workspaces: workspaceStorage.workspaces, activeWorkspace: workspaceStorage.activeWorkspace, });
}

browser.runtime.onStartup.addListener(async () => {
	if (!workspaceStorage) await initExtension();
});

let backgroundListenerPorts: {
	port: browser.Runtime.Port;
	windowId: number;
}[] = [];

browser.runtime.onConnect.addListener(async (port) => {
	backgroundListenerPorts.push({
		port,
		windowId: workspaceStorage.focusedWindowId,
	});

	port.onDisconnect.addListener((port) => {
		backgroundListenerPorts = backgroundListenerPorts.filter(
			({ port: _port }) => port !== _port
		);
	});
});

function informPorts(message = "updated") {
	backgroundListenerPorts.forEach(({ port, windowId }) => {
		if (windowId === workspaceStorage.focusedWindowId) {
			port.postMessage({ msg: message });
		}
	});
}

browser.menus.onShown.addListener((info, tab) => {
	console.info("browser.menus.onShown");
	const workspaces = workspaceStorage.windows
		.get(tab.windowId!)!
		.workspaces.filter(
			({ windowId, active }) => windowId === tab!.windowId! && !active
		);

	tabMenu.update({
		workspaces,
	});
});

browser.menus.onClicked.addListener(async (info, tab) => {
	const { menuItemId: _menuItemId } = info;
	const menuItemId = _menuItemId.toString();
	let targetWorkspaceId!: string;
	if (
		menuItemId.toString().startsWith("workspace") ||
		menuItemId.toString() === "create-workspace-menu"
	) {
		const highlightedTabIds = (
			await browser.tabs.query({
				windowId: tab!.windowId!,
				highlighted: true,
			})
		).map((tab) => tab.id!);

		const tabIds =
			highlightedTabIds.length > 1 ? highlightedTabIds : [tab!.id!];

		if (menuItemId.toString().startsWith("workspace-menu")) {
			targetWorkspaceId = menuItemId.split("_").at(1)!;
		} else if (menuItemId.toString() === "create-workspace-menu") {
			const newWorkspace = await workspaceStorage.activeWindow.addWorkspace([]);
			newWorkspace.active = false;
			targetWorkspaceId = newWorkspace.id;
		}

		await workspaceStorage.getWindow(tab!.windowId!).moveTabs({
			tabIds,
			targetWorkspaceId,
		});

		informPorts();
	}
});

/* Event Order:
	Creation:
	1. browser.tabs.onCreated
	2. browser.windows.onCreated

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

browser.runtime.onInstalled.addListener(async (details) => {
	if (!workspaceStorage) await initExtension();
});

browser.windows.onCreated.addListener((window) => {
	(async () => {
		if (!workspaceStorage.windows.has(window.id!)) {
			await workspaceStorage.addWindow(window.id!);
		}
	})();
});

browser.windows.onFocusChanged.addListener((windowId) => {
	if (windowId !== browser.windows.WINDOW_ID_NONE) {
		workspaceStorage.focusedWindowId = windowId;
	}
});

browser.windows.onRemoved.addListener((windowId) => {
	(async () => {
		removingWindow = true;
		await workspaceStorage.removeWindow(windowId);
		removingWindow = false;
	})();
	// workspaceStorage.removeWorkspaces({ windowId });
});

browser.tabs.onCreated.addListener((tab) => {
	const window = workspaceStorage.getWindow(tab.windowId!);
	if (window) {
		window.addTab(tab.id!);
	} else {
		workspaceStorage.addWindow(tab.windowId!);
	}
	informPorts();
});

browser.tabs.onRemoved.addListener((tabId, info) => {
	workspaceStorage.getWindow(info.windowId).removeTab(tabId);
	informPorts();
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
				windowId: workspaceStorage.activeWindow.id,
			});
			break;
		case "toggle-sidebar":
			browser.sidebarAction.toggle();
			break;
		case "next-workspace":
			(async () => {
				await workspaceStorage.activeWindow.switchToNextWorkspace();
				informPorts();
			})();
			break;
		case "previous-workspace":
			(async () => {
				await workspaceStorage.activeWindow.switchToPreviousWorkspace();
				informPorts();
			})();
			break;
		case "new-workspace":
			(async () => {
				await workspaceStorage.activeWindow.addWorkspaceAndSwitch();
				informPorts();
			})();
			break;
		default:
			break;
	}
});

browser.runtime.onMessage.addListener((message) => {
	const { msg } = message;

	switch (msg) {
		case "checkBackgroundInitialized":
			return new Promise(async (resolve) => {
				return resolve(workspaceStorage ? true : false);
			});
		case "clearDB":
			workspaceStorage.clearDB();
			break;
		case "addWorkspace":
			return new Promise((resolve) => {
				return resolve(workspaceStorage.activeWindow.addWorkspaceAndSwitch());
			});
		case "editWorkspace":
			return new Promise((resolve) => {
				return resolve(
					workspaceStorage.getWindow(message.windowId).editWorkspace(message)
				);
			});
		case "getWorkspaces":
			return new Promise((resolve) => {
				return resolve(workspaceStorage.getWindow(message.windowId).workspaces);
			});
		case "removeWorkspace":
			return new Promise((resolve) => {
				return resolve(
					workspaceStorage
						.getWindow(message.windowId)
						.removeWorkspace(message.workspaceId)
				);
			});
		case "reorderedWorkspaces":
			(() => {
				const { workspaces: newWorkspaces, windowId } = message as {
					workspaces: Ext.Workspace[];
					windowId: Ext.Window["id"];
				};
				workspaceStorage.getWindow(windowId).updateWorkspaces(newWorkspaces);
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

			// console.log({workspaceId, nextWorkspace,windows: workspaceStorage.windows,});

			(async () => {
				await workspaceStorage.activeWindow.switchWorkspace(nextWorkspace);
				informPorts();
			})();
			break;
		default:
			break;
	}
});
