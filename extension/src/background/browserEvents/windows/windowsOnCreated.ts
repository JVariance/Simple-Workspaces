import type Browser from "webextension-polyfill";
import { WorkspaceStorage, Processes } from "../../Entities";
import * as API from "@root/browserAPI";

export async function windowsOnCreated(window: Browser.Windows.Window) {
	if (
		Processes.importingData ||
		Processes.authorizingProvider ||
		window.type !== "normal"
	)
		return;
	await Processes.TabCreation;
	Processes.WindowCreation.start();
	console.info("windows.onCreated");

	const windowUUID = await API.getWindowValue(window.id!, "windowUUID");

	if (windowUUID) {
		// window has been restored

		await WorkspaceStorage.getOrCreateWindow({
			windowId: window.id!,
			restored: true,
			windowUUID,
		});

		// const tabs = (await API.queryTabs({ windowId: window.id! }))?.tabs || [];
		// for (let tab of tabs) {
		// const workspaceUUID = await API.getTabValue(tab.id!, "workspaceUUID");
		// }
	} else {
		const newWindow = await WorkspaceStorage.getOrCreateWindow({
			windowId: window.id!,
		});
		const windowId = newWindow.windowId;
		await API.setWindowValue(windowId, "windowUUID", newWindow.UUID);
	}

	Processes.WindowCreation.finish();
}
