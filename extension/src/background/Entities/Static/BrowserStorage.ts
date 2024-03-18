import Browser from "webextension-polyfill";

type WorkspaceHistoryType = [
	string,
	Record<Ext.Window["UUID"], Pick<Ext.Workspace, "icon" | "name">>
][];

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
		Record<"workspaceHistory", WorkspaceHistoryType>
	> {
		return Browser.storage.local.get("workspaceHistory");
	}

	static setWorkspaceHistory(
		workspaceHistory: WorkspaceHistoryType
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

	static getBackupDeviceName(): Promise<Record<"backupDeviceName", string>> {
		return Browser.storage.local.get("backupDeviceName");
	}

	static setBackupDeviceName(deviceName: string): Promise<void> {
		return Browser.storage.local.set({ backupDeviceName: deviceName });
	}

	static getBackupEnabled(): Promise<Record<"backupEnabled", boolean>> {
		return Browser.storage.local.get("backupEnabled");
	}

	static setBackupEnabled(backupEnabled: boolean): Promise<void> {
		return Browser.storage.local.set({ backupEnabled });
	}

	static getBackupIntervalInMinutes(): Promise<
		Record<"backupIntervalInMinutes", number>
	> {
		return Browser.storage.local.get("backupIntervalInMinutes");
	}

	static setBackupIntervalInMinutes(val: number): Promise<void> {
		return Browser.storage.local.set({ backupIntervalInMinutes: val });
	}
}
