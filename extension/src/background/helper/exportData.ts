import { WorkspaceStorage } from "../Entities";
import * as API from "@root/browserAPI";

export async function exportData() {
	const fullExportData = new Map<
		Ext.Window["UUID"],
		Map<
			Ext.Workspace["UUID"],
			{
				icon: string;
				name: string;
				tabs: { url: string; active: boolean; pinned: boolean }[];
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
						icon: workspace.icon,
						name: workspace.name,
						tabs: [],
					});
				}

				fullExportData.get(window.UUID)?.get(workspaceUUID)?.tabs.push({
					url: tab.url!,
					active: tab.active,
					pinned: tab.pinned,
				});
			}
		}
	}

	const fullExportDataArray = {} as {
		[key: string]: {
			workspaces: [
				string,
				{
					icon: string;
					name: string;
					tabs: { url: string; active: boolean }[];
				}
			][];
		};
	};

	for (let [windowUUID, window] of fullExportData) {
		fullExportDataArray[windowUUID] = { workspaces: Array.from(window) };
	}

	return fullExportDataArray;
}
