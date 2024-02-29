import browser from "webextension-polyfill";
import {
	storageOnChanged,
	tabsOnDetached,
	tabsOnAttached,
	tabsOnRemoved,
	tabsOnCreated,
	windowsOnCreated,
	windowsOnRemoved,
	windowsOnFocusChanged,
	menusOnClicked,
	menusOnShown,
	runtimeOnInstalled,
	runtimeOnStartup,
	runtimeOnMessage,
	commandsOnCommand,
} from "./browserEvents";
import { themeOnUpdated } from "./browserEvents/theme/themeOnUpdated";
import { WorkspaceStorage } from "./Entities";
import { informViews } from "./informViews";
import { tabsOnActivated } from "./browserEvents/tabs/tabsActivated";
import { tabsOnPinned } from "./browserEvents/tabs/tabsOnPinned";
import { initExtension } from "./initExtension";
import { managementOnEnabled } from "./browserEvents/management/managementOnEnabled";
/* Event Order:
Creation:
1. browser.tabs.onCreated
2. browser.windows.onCreated

=> create new WorkspaceStorage-window inside tabs.onCreated

Removal:
1. browser.tabs.onRemoved
2. browser.windows.onRemoved
*/

// const sidebarPorts = new Map<string, browser.Runtime.Port>();
// const popupPorts = new Map<string, browser.Runtime.Port>();

// browser.runtime.onConnect.addListener((port) => {
// 	console.info({ port });
// 	const [pageType, windowId] = port.name.split("_");
// 	switch (pageType) {
// 		case "sidebar":
// 			sidebarPorts.set(windowId, port);
// 			break;
// 		case "popup":
// 			popupPorts.set(windowId, port);
// 	}
// });

browser.runtime.onInstalled.addListener(runtimeOnInstalled);
browser.runtime.onStartup.addListener(runtimeOnStartup);

browser.management.onEnabled.addListener(managementOnEnabled);

browser.menus.onClicked.addListener(menusOnClicked);
browser.menus.onShown.addListener(menusOnShown);

browser.windows.onCreated.addListener(windowsOnCreated);
browser.windows.onRemoved.addListener(windowsOnRemoved);
browser.windows.onFocusChanged.addListener(windowsOnFocusChanged);

browser.tabs.onCreated.addListener(tabsOnCreated);
browser.tabs.onRemoved.addListener(tabsOnRemoved);
browser.tabs.onAttached.addListener(tabsOnAttached);
browser.tabs.onDetached.addListener(tabsOnDetached);
browser.tabs.onActivated.addListener(tabsOnActivated);
browser.tabs.onUpdated.addListener(tabsOnPinned, { properties: ["pinned"] });

browser.storage.local.onChanged.addListener(storageOnChanged);

browser.commands.onCommand.addListener(commandsOnCommand);

browser.runtime.onMessage.addListener(runtimeOnMessage);

browser.theme.onUpdated.addListener(themeOnUpdated);

const mql = window.matchMedia("(prefers-color-scheme: dark)");
mql.addEventListener("change", (e) => {
	WorkspaceStorage.windows.forEach((window) => {
		informViews(window.windowId, "systemThemeChanged", {
			theme: e?.matches ? "dark" : "light",
		});
	});
});
