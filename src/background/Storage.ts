import Browser from "webextension-polyfill";

export class BrowserStorage {
	constructor() {}

	static getHomeWorkspace(): Promise<
		Record<"homeWorkspace", Ext.SimpleWorkspace>
	> {
		return Browser.storage.local.get("homeWorkspace");
	}

	static setHomeWorkspace(homeWorkspace: Ext.SimpleWorkspace): Promise<void> {
		return Browser.storage.local.set({
			homeWorkspace,
		});
	}

	static getDefaultWorkspaces(): Promise<
		Record<"defaultWorkspaces", Ext.SimpleWorkspace[]>
	> {
		return Browser.storage.local.get("defaultWorkspaces");
	}

	static setDefaultWorkspaces(
		defaultWorkspaces: Ext.SimpleWorkspace[]
	): Promise<void> {
		return Browser.storage.local.set({
			defaultWorkspaces,
		});
	}
}
