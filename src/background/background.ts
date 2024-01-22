import browser from "webextension-polyfill";
import { storageOnChanged } from "./browserEvents/storageOnChanged";
import { tabsOnDetached } from "./browserEvents/tabsDetached";
import { tabsOnAttached } from "./browserEvents/tabsAttached";
import { tabsOnRemoved } from "./browserEvents/tabsRemoved";
import { tabsOnCreated } from "./browserEvents/tabsCreated";
import { windowsOnCreated } from "./browserEvents/windowsOnCreated";
import { windowsOnRemoved } from "./browserEvents/windowsOnRemoved";
import { windowsOnFocusChanged } from "./browserEvents/windowsOnFocusChanged";
import { menusOnClicked } from "./browserEvents/menusOnClicked";
import { menusOnShown } from "./browserEvents/menusOnShown";
import { runtimeOnInstalled } from "./browserEvents/runtimeOnInstalled";
import { runtimeOnStartup } from "./browserEvents/runtimeOnStartup";
import { runtimeOnMessage } from "./browserEvents/runtimeOnMessage";
import { commandsOnCommand } from "./browserEvents/commandsOnCommand";

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
