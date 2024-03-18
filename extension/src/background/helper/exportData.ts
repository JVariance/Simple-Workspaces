import { Window, WorkspaceStorage } from "../Entities";
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

export type ExportData = { windows: _ExportData; codes?: [string, string][] };

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

	return { windows: finalFullExportData };
	// return finalFullExportData;
}
