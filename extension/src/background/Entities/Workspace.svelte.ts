import * as API from "@root/browserAPI";
import { promisedDebounceFunc } from "@root/utils";
import { unstate } from "svelte";
import Browser from "webextension-polyfill";
import { BrowserStorage } from "./Static/Storage";
import { createTab } from "../browserAPIWrapper/tabCreation";
import Processes from "./Singletons/Processes";

// type EnhancedTab = Browser.Tabs.Tab & { workspaceUUID?: string };

export class Workspace {
	constructor() {}
}
