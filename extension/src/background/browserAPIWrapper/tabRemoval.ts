import * as API from "../../browserAPI";
import Processes from "../Entities/Singletons/Processes";
import WorkspaceStorage from "../Entities/Singletons/WorkspaceStorage";
import type { Workspace } from "../Entities/Workspace";

export async function removeTabs(
	tabIds: number[],
	workspace: Workspace | undefined = undefined
) {
	console.info("tabRemoval - removeTabs");
	Processes.manualTabRemoval = true;
	const { removedIds, errorIds } = await API.removeTabs(tabIds);

	if (removedIds.length) {
		// const workspaceUUID = await API.getTabValue(tabIds.at(0), "workspaceUUID");
		const window = WorkspaceStorage.activeWindow;
		console.info({ window, workspace });
		// await window.addTab(newTab.id!, workspace);
		// await window.removeTabs(removedIds);
		await window.removeTabs(tabIds, workspace);
	}

	Processes.manualTabRemoval = false;
	return removedIds;
}
