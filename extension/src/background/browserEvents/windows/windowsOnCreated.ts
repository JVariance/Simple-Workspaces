import type Browser from "webextension-polyfill";
import { WorkspaceStorage, Processes } from "../../Entities";
import * as API from "@root/browserAPI";

export async function windowsOnCreated(window: Browser.Windows.Window) {
	if (window.type !== "normal") return;
	await Processes.TabCreation;
	Processes.WindowCreation.start();
	console.info("windows.onCreated");

	const windowUUID = await API.getWindowValue(window.id!, "windowUUID");

	if (windowUUID) {
		// window has been restored

		await WorkspaceStorage.getOrCreateWindow(window.id!, { restored: true });

		// const tabs = (await API.queryTabs({ windowId: window.id! }))?.tabs || [];
		// for (let tab of tabs) {
		// const workspaceUUID = await API.getTabValue(tab.id!, "workspaceUUID");
		// }
	} else {
		const newWindow = await WorkspaceStorage.getOrCreateWindow(window.id!);
		const windowId = newWindow.windowId;
		await API.setWindowValue(windowId, "windowUUID", newWindow.UUID);
	}

	Processes.WindowCreation.finish();
}
