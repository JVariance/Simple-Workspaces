import { BrowserStorage, Window, WorkspaceStorage } from "../Entities";
import * as API from "@root/browserAPI";

type _ExportData = Record<
	Window["UUID"],
	{
		w: [
			string,
			{
				i: string;
				n: string;
				t: { u: string; a: 0 | 1; p: 0 | 1 }[];
			}
		][];
	}
>;

export type ExportData = {
	settings: {
		theme: "" | "browser";
		forceDefaultThemeIfDarkMode: boolean;
		pinning: {
			keepAllPinnedTabsOpen: boolean;
		};
		workspaces: {
			homeWorkspace: {
				name: string;
				icon: string;
			};
			defaultWorkspaces: Ext.SimpleWorkspace[];
		};
		backupEnabled: boolean;
		backupIntervalInMinutes: number;
	};
	windows: _ExportData;
	codes?: [string, string][];
};

export async function exportData() {
	const fullExportData = new Map<
		Ext.Window["UUID"],
		Map<
			Ext.Workspace["UUID"],
			{
				i: string;
				n: string;
				t: { u: string; a: 0 | 1; p: 0 | 1 }[];
			}
		>
	>();

	for (let [windowId, window] of WorkspaceStorage.windows.entries()) {
		const windowTabs = (await API.queryTabs({ windowId }))?.tabs || [];

		fullExportData.set(window.UUID, new Map());

		for (let tab of windowTabs) {
			const workspaceUUID = await API.getTabValue<string>(
				tab.id,
				"workspaceUUID"
			);

			if (workspaceUUID) {
				if (!fullExportData.get(window.UUID)?.has(workspaceUUID)) {
					const workspace = window.workspaces.get(workspaceUUID)!;
					fullExportData.get(window.UUID)!.set(workspaceUUID, {
						i: workspace.icon,
						n: workspace.name,
						t: [],
					});
				}

				fullExportData
					.get(window.UUID)
					?.get(workspaceUUID)
					?.t.push({
						u: tab.url!,
						a: tab.active ? 1 : 0,
						p: tab.pinned ? 1 : 0,
					});
			}
		}
	}

	const finalFullExportData = {} as _ExportData;

	for (let [windowUUID, window] of fullExportData) {
		finalFullExportData[windowUUID] = { w: Array.from(window) };
	}

	const { theme } = await BrowserStorage.getTheme();
	const { forceDefaultThemeIfDarkMode } =
		await BrowserStorage.getForceDefaultThemeIfDarkMode();
	const { keepPinnedTabs } = await BrowserStorage.getKeepPinnedTabs();
	const { homeWorkspace } = await BrowserStorage.getHomeWorkspace();
	const { defaultWorkspaces } = await BrowserStorage.getDefaultWorkspaces();
	const { backupIntervalInMinutes } =
		await BrowserStorage.getBackupIntervalInMinutes();
	const { backupEnabled } = await BrowserStorage.getBackupEnabled();

	const settings = {
		theme,
		forceDefaultThemeIfDarkMode,
		keepPinnedTabs,
		workspaces: {
			homeWorkspace: {
				name: homeWorkspace?.name || "Home",
				icon: homeWorkspace?.icon || "🏠",
			},
			defaultWorkspaces,
		},
		backupEnabled,
		backupIntervalInMinutes,
	};

	return { settings, windows: finalFullExportData };
	// return finalFullExportData;
}
