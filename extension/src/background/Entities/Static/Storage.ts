import Browser from "webextension-polyfill";

export class BrowserStorage {
	private constructor() {}

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

	static getWorkspaceHistory(): Promise<
		Record<string, Pick<Ext.Workspace, "icon" | "name">>
	> {
		return Browser.storage.local.get("workspaceHistory");
	}

	static setWorkspaceHistory(
		workspaceHistory: Record<string, Pick<Ext.Workspace, "icon" | "name">>
	): Promise<void> {
		return Browser.storage.local.set({ workspaceHistory });
	}

	static getKeepPinnedTabs(): Promise<Record<"keepPinnedTabs", boolean>> {
		return Browser.storage.local.get("keepPinnedTabs");
	}

	static setKeepPinnedTabs(keepPinnedTabs: boolean): Promise<void> {
		return Browser.storage.local.set({ keepPinnedTabs });
	}

	static getTheme(): Promise<Record<"theme", "" | "browser">> {
		return Browser.storage.local.get("theme");
	}

	static setTheme(theme: "" | "browser"): Promise<void> {
		return Browser.storage.local.set({ theme });
	}

	static getForceDefaultThemeIfDarkMode(): Promise<
		Record<"forceDefaultThemeIfDarkMode", boolean>
	> {
		return Browser.storage.local.get("forceDefaultThemeIfDarkMode");
	}

	static setForceDefaultThemeIfDarkMode(bool: boolean) {
		return Browser.storage.local.set({ forceDefaultThemeIfDarkMode: bool });
	}
}
