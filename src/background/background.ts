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
/* Event Order:
Creation:
1. browser.tabs.onCreated
2. browser.windows.onCreated

=> create new WorkspaceStorage-window inside tabs.onCreated

Removal:
1. browser.tabs.onRemoved
2. browser.windows.onRemoved
*/

browser.runtime.onInstalled.addListener(runtimeOnInstalled);
browser.runtime.onStartup.addListener(runtimeOnStartup);

browser.menus.onClicked.addListener(menusOnClicked);
browser.menus.onShown.addListener(menusOnShown);

browser.windows.onCreated.addListener(windowsOnCreated);
browser.windows.onRemoved.addListener(windowsOnRemoved);
browser.windows.onFocusChanged.addListener(windowsOnFocusChanged);

browser.tabs.onCreated.addListener(tabsOnCreated);
browser.tabs.onRemoved.addListener(tabsOnRemoved);
browser.tabs.onAttached.addListener(tabsOnAttached);
browser.tabs.onDetached.addListener(tabsOnDetached);

browser.storage.local.onChanged.addListener(storageOnChanged);

browser.commands.onCommand.addListener(commandsOnCommand);

browser.runtime.onMessage.addListener(runtimeOnMessage);

browser.theme.onUpdated.addListener(themeOnUpdated);
