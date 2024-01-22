import type { Tabs } from "webextension-polyfill";
import * as API from "../browserAPI";
import Processes from "./Processes";
import WorkspaceStorage from "./WorkspaceStorage";

export async function createTab(
	props: Tabs.CreateCreatePropertiesType,
	workspace: Ext.Workspace | undefined = undefined,
	updateActiveTabId: boolean = true
) {
	console.info("tabCreation - createTab");
	// console.info({ WindowCreation: Processes.WindowCreation });
	Processes.manualTabAddition = true;
	const newTab = await API.createTab(props);

	if (newTab) {
		// const newWindow = await WorkspaceStorage.getOrCreateWindow(newTab.windowId!);
		const window = WorkspaceStorage.getWindow(newTab.windowId!);
		console.info({ window, workspace });
		await window.addTab(newTab.id!, workspace);
		// await API.setTabValue(
		// 	newTab.id!,
		// 	"workspaceUUID",
		// 	(workspace || window.activeWorkspace).UUID
		// );
	}

	if (updateActiveTabId && workspace) {
		workspace.activeTabId = newTab?.id!;
	}

	console.info({ newTab });

	return newTab;
}
