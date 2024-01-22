import type Browser from "webextension-polyfill";
import Processes from "../../Processes";
import WorkspaceStorage from "../../WorkspaceStorage";
import * as API from "@root/browserAPI";

export async function windowsOnCreated(window: Browser.Windows.Window) {
	if (window.type !== "normal") return;
	await Processes.TabCreation;
	Processes.WindowCreation.start();
	console.info("windows.onCreated");

	const newWindow = await WorkspaceStorage.getOrCreateWindow(window.id!);
	const windowId = newWindow.windowId;
	await API.setWindowValue(windowId, "windowUUID", newWindow.UUID);

	Processes.WindowCreation.finish();
}
