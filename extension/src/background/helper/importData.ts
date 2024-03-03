import * as API from "@root/browserAPI";
import { Processes, Window, WorkspaceStorage } from "../Entities";
import { Workspace } from "../Entities/Workspace";

export type ImportData = Record<
	"windows",
	Record<
		Ext.Window["UUID"],
		Record<
			"workspaces",
			[
				Ext.Workspace["UUID"],
				{
					icon: string;
					name: string;
					tabs: { url: string; active: boolean; pinned: boolean }[];
				}
			][]
		>
	>
>;

export async function importData({ data }: { data: ImportData }) {
	const { windows } = data;
	Processes.importingData = true;
	Processes.DataImport.start();

	for (let [windowUUID, window] of Object.entries(windows)) {
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

		const { workspaces } = window;
		for (let [workspaceUUID, workspace] of workspaces) {
			const extWorkspace = new Workspace({
				UUID: workspaceUUID === "HOME" ? "HOME" : crypto.randomUUID(),
				active: false,
				name: workspace.name,
				icon: workspace.icon,
				pinnedTabIds: [],
				tabIds: [],
				windowId: extWindow.windowId,
				activeTabId: undefined,
			});

			extWindow.workspaces.set(extWorkspace.UUID, extWorkspace);

			Processes.manualTabAddition = true;
			for (let tab of workspace.tabs) {
				const browserTab = await API.createTab({
					active: tab.active,
					url: tab.url,
					pinned: tab.pinned,
				});

				if (!browserTab) continue;
				await API.setTabValue(
					browserTab.id!,
					"workspaceUUID",
					extWorkspace.UUID
				);

				if (tab.active) {
					extWorkspace.active = true;
					extWorkspace.activeTabId = browserTab.id!;
					extWindow.activeWorkspace = extWorkspace;
				}

				extWorkspace.tabIds.push(browserTab.id!);

				if (tab.pinned) {
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
