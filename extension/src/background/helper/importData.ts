import * as API from "@root/browserAPI";
import { Processes, Window, WorkspaceStorage } from "../Entities";
import { Workspace } from "../Entities/Workspace";

// w: workspaces, i: icon, n: name, t: tabs, u:url, a: active, p: pinned
export type ImportData<WindowProps = {}> = {
	settings: {
		theme: "" | "browser";
		forceDefaultThemeIfDarkMode: boolean;
		keepPinnedTabs: boolean;
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
	windows: Record<
		Ext.Window["UUID"],
		Record<
			"w",
			[
				Ext.Workspace["UUID"],
				{
					i: string;
					n: string;
					t: { u: string; a: 0 | 1; p: 0 | 1 }[];
				}
			][]
		> &
			WindowProps
	>;
};

export async function importData({
	data,
}: {
	data: ImportData<{ skip?: boolean }>;
}) {
	const { windows } = data;
	Processes.importingData = true;
	Processes.DataImport.start();

	for (let [windowUUID, window] of Object.entries(windows)) {
		if (window?.skip) continue;

		const browserWindow = (
			await API.createWindows([{ focused: false }])
		).createdWindows?.at(0);

		if (!browserWindow) continue;

		const extWindow = new Window(undefined, browserWindow.id);
		WorkspaceStorage.windows.set(extWindow.windowId, extWindow);
		WorkspaceStorage.persistWindows();

		await API.setWindowValue(extWindow.windowId, "windowUUID", extWindow.UUID);

		const initialCreatedNewTab = (
			await API.queryTabs({
				index: 0,
				windowId: extWindow.windowId,
			})
		).tabs?.at(0);

		const { w: workspaces } = window;
		for (let [workspaceUUID, workspace] of workspaces) {
			const extWorkspace = new Workspace({
				UUID: workspaceUUID === "HOME" ? "HOME" : crypto.randomUUID(),
				active: false,
				name: workspace.n,
				icon: workspace.i,
				pinnedTabIds: [],
				tabIds: [],
				windowId: extWindow.windowId,
				activeTabId: undefined,
			});

			extWindow.workspaces.set(extWorkspace.UUID, extWorkspace);

			Processes.manualTabAddition = true;
			for (let tab of workspace.t) {
				const browserTab = await API.createTab({
					active: tab.a ? true : false,
					url: tab.u,
					pinned: tab.p ? true : false,
				});

				if (!browserTab) continue;
				await API.setTabValue(
					browserTab.id!,
					"workspaceUUID",
					extWorkspace.UUID
				);

				if (tab.a) {
					extWorkspace.active = true;
					extWorkspace.activeTabId = browserTab.id!;
					extWindow.activeWorkspace = extWorkspace;
				}

				extWorkspace.tabIds.push(browserTab.id!);

				if (tab.p) {
					extWorkspace.pinnedTabIds.push(browserTab.id!);
				}
			}

			if (!extWorkspace.active) {
				extWorkspace.activeTabId = extWorkspace.tabIds.at(-1);
				await API.hideTabs(extWorkspace.tabIds);
			}

			Processes.manualTabAddition = false;
		}

		initialCreatedNewTab?.id && (await API.removeTab(initialCreatedNewTab.id));
	}

	Processes.DataImport.finish();
	Processes.importingData = false;
}
