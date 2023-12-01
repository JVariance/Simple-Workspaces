import browser from "webextension-polyfill";
import { WorkspaceStorage } from "./workspace-storage";

let workspaceStorage: WorkspaceStorage;

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
	if (!workspaceStorage) await initWorkspaceStorage();
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

function informPorts() {
	backgroundListenerPorts.forEach(({ port, windowId }) => {
		if (windowId === workspaceStorage.focusedWindowId) {
			port.postMessage({ msg: "updated" });
		}
	});
}

browser.runtime.onInstalled.addListener((details) => {
	(async () => {
		if (!workspaceStorage) await initWorkspaceStorage();
	})();
});

browser.windows.onFocusChanged.addListener((windowId) => {
	console.log("onFocusChanged", windowId);
	if (windowId !== browser.windows.WINDOW_ID_NONE) {
		workspaceStorage.focusedWindowId = windowId;
	}
});

browser.windows.onRemoved.addListener((windowId) => {
	workspaceStorage.removeWorkspaces({ windowId });
});

browser.tabs.onCreated.addListener((tab) => {
	workspaceStorage.addTab(tab.id!, tab.windowId);
	informPorts();
});

browser.tabs.onRemoved.addListener((tabId, info) => {
	workspaceStorage.removeTab(tabId, info.windowId);
	informPorts();
});

browser.tabs.onActivated.addListener((activeInfo) => {
	workspaceStorage.setActiveTab(activeInfo.tabId, activeInfo.windowId);
});

function getCurrentWindow() {
	return browser.windows.getCurrent();
}

browser.commands.onCommand.addListener((command) => {
	switch (command) {
		case "next-workspace":
			(async () => {
				await workspaceStorage.switchToNextWorkspace({
					windowId: (await getCurrentWindow()).id!,
				});
				informPorts();
			})();
			break;
		case "previous-workspace":
			(async () => {
				await workspaceStorage.switchToPreviousWorkspace({
					windowId: (await getCurrentWindow()).id!,
				});
				informPorts();
			})();
			break;
		case "new-workspace":
			(async () => {
				await workspaceStorage.addWorkspace();
				informPorts();
			})();
			break;
		default:
			break;
	}
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	const { msg } = message;

	switch (msg) {
		case "clearDB":
			workspaceStorage.clearDB();
			break;
		case "getWorkspaces":
			return workspaceStorage.getWorkspaces({ windowId: message.windowId! });
		case "addWorkspace":
			return workspaceStorage.addWorkspace();
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
			const nextWorkspace = workspaceStorage.workspaces.find(
				({ id }) => id === workspaceId
			)!;
			workspaceStorage.switchWorkspace(nextWorkspace);
			break;
		default:
			break;
	}
});
