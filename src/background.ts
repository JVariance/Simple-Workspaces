import browser from "webextension-polyfill";
import { TabMenu } from "./TabMenu";
import { WorkspaceStorage } from "./WorkspaceStorage";

let workspaceStorage: WorkspaceStorage;
let tabMenu: TabMenu;

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
		console.info("bg - initWorkspaceStorage");
		workspaceStorage = new WorkspaceStorage();
		await workspaceStorage.init();
		return resolve(true);
	});
	// console.log({
	// 	workspaceStorage,
	// 	workspaces: workspaceStorage.workspaces,
	// 	activeWorkspace: workspaceStorage.activeWorkspace,
	// });
}

browser.runtime.onStartup.addListener(async () => {
	console.log("onStartup");
	if (!workspaceStorage) await initExtension();
});

let backgroundListenerPorts: {
	port: browser.Runtime.Port;
	windowId: number;
}[] = [];

browser.runtime.onConnect.addListener(async (port) => {
	console.log("onConnect - port:", port);
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
	const workspaces = workspaceStorage.windows
		.get(tab.windowId!)!
		.workspaces.filter((workspace) => workspace.windowId === tab!.windowId!);

	console.log({ workspaces, info, tab });

	tabMenu.update({
		workspaces,
	});
});

browser.menus.onClicked.addListener(async (info, tab) => {
	const { menuItemId: _menuItemId } = info;
	const menuItemId = _menuItemId.toString();
	if (menuItemId.toString().startsWith("workspace-menu")) {
		const targetWorkspaceId = menuItemId.split("_").at(1)!;

		// const activeTab = await browser.tabs.getCurrent();
		const highlightedTabIds = (
			await browser.tabs.query({
				windowId: tab!.windowId!,
				highlighted: true,
			})
		).map((tab) => tab.id!);

		const tabIds =
			highlightedTabIds.length > 1 ? highlightedTabIds : [tab!.id!];

		await workspaceStorage.getWindow(tab!.windowId!).moveTabs({
			tabIds,
			targetWorkspaceId,
		});

		informPorts();
	}
});

browser.runtime.onInstalled.addListener(async (details) => {
	if (!workspaceStorage) await initExtension();
});

browser.windows.onCreated.addListener((window) => {
	(async () => {
		workspaceStorage.addWindow(window.id!);
	})();
});

browser.windows.onFocusChanged.addListener((windowId) => {
	console.log("onFocusChanged", windowId);
	if (windowId !== browser.windows.WINDOW_ID_NONE) {
		workspaceStorage.focusedWindowId = windowId;
	}
});

browser.windows.onRemoved.addListener((windowId) => {
	workspaceStorage.removeWindow(windowId);
	// workspaceStorage.removeWorkspaces({ windowId });
});

browser.tabs.onCreated.addListener((tab) => {
	console.info("tabs.onCreated: ", { tab });
	workspaceStorage.getWindow(tab.windowId!).addTab(tab.id!);
	informPorts();
});

browser.tabs.onRemoved.addListener((tabId, info) => {
	workspaceStorage.getWindow(info.windowId).removeTab(tabId);
	informPorts();
});

browser.tabs.onActivated.addListener((activeInfo) => {
	workspaceStorage
		.getWindow(activeInfo.windowId)
		.setActiveTab(activeInfo.tabId);
});

function getCurrentWindow() {
	return browser.windows.getCurrent();
}

browser.commands.onCommand.addListener((command) => {
	switch (command) {
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
				await workspaceStorage.activeWindow.addWorkspace();
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
				return resolve(workspaceStorage.activeWindow.addWorkspace());
			});
		case "editWorkspace":
			return new Promise((resolve) => {
				return resolve(
					workspaceStorage.getWindow(message.windowId).editWorkspace(message)
				);
			});
		case "getWorkspaces":
			console.info("bg - getWorkspaces", { message });
			console.log(workspaceStorage.getWindow(message.windowId).workspaces);
			console.log("moini");
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

			console.log({
				workspaceId,
				nextWorkspace,
				windows: workspaceStorage.windows,
			});

			workspaceStorage.activeWindow.switchWorkspace(nextWorkspace);
			break;
		default:
			break;
	}
});
