import Browser from "webextension-polyfill";

export class BrowserStorage {
	constructor() {}

	static getHomeWorkspace(): Promise<Record<"homeWorkspace", Ext.Workspace>> {
		return Browser.storage.local.get("homeWorkspace");
	}

	static setHomeWorkspace(homeWorkspace: Ext.Workspace): Promise<void> {
		return Browser.storage.local.set({
			homeWorkspace,
		});
	}

	static getDefaultWorkspaces(): Promise<
		Record<"defaultWorkspaces", Ext.Workspace[]>
	> {
		return Browser.storage.local.get("defaultWorkspaces");
	}

	static setDefaultWorkspaces(
		defaultWorkspaces: Ext.Workspace[]
	): Promise<void> {
		return Browser.storage.local.set({
			defaultWorkspaces,
		});
	}
}
