import Browser from "webextension-polyfill";
import { WorkspaceStorage, Processes } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";

export async function tabsOnCreated(tab: Browser.Tabs.Tab) {
	await Processes.TabRemoval;
	const manualTabAddition = Processes.manualTabAddition;
	const window = await Browser.windows.get(tab.windowId!);
	console.info({ manualTabAddition });

	const tabSessionWorkspaceUUID = await API.getTabValue(
		tab.id!,
		"workspaceUUID"
	);

	if (manualTabAddition && !tabSessionWorkspaceUUID) {
		console.info("Processes.manualTabAddition = true");
		Processes.manualTabAddition = false;
		return;
	}

	tabSessionWorkspaceUUID &&
		(await WorkspaceStorage.getWindow(tab.windowId!).restoredTab(
			tab.id!,
			tabSessionWorkspaceUUID
		));

	if (window?.type !== "normal" || Processes.WindowCreation.state === "pending")
		return;

	await Processes.WindowCreation;
	Processes.TabCreation.start();
	const windowIsNew = !WorkspaceStorage.windows.has(tab.windowId!);

	console.info("createdTab", { tab: structuredClone(tab) });
	console.info({ windowIsNew });
	if (!windowIsNew) {
		console.info({ tabSessionWorkspaceUUID });

		!tabSessionWorkspaceUUID &&
			(await WorkspaceStorage.getWindow(tab.windowId!).addTab(tab.id!));

		informViews(tab.windowId!, "createdTab", { tabId: tab.id });
	}

	Processes.TabCreation.finish();
}
