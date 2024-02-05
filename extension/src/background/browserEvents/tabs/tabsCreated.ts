import Browser from "webextension-polyfill";
import { WorkspaceStorage, Processes } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";

export async function tabsOnCreated(tab: Browser.Tabs.Tab) {
	console.info("Tachjen");
	console.info(Processes.ManualTabAddition);
	console.info(Processes.ManualTabAddition.state);
	await Promise.all([Processes.TabRemoval, Processes.ManualTabAddition]);
	console.info("tabsOnCreated");
	console.info(Processes.ManualTabAddition.state);
	// const manualTabAddition =
	// 	Processes.ManualTabAddition.state === "pending" ? true : false;
	const window = await Browser.windows.get(tab.windowId!);
	// console.info({ manualTabAddition });

	const tabSessionWorkspaceUUID = await API.getTabValue(
		tab.id!,
		"workspaceUUID"
	);

	console.info({ tabSessionWorkspaceUUID });

	if (tabSessionWorkspaceUUID) {
		await WorkspaceStorage.getWindow(tab.windowId!).restoredTab(
			tab.id!,
			tabSessionWorkspaceUUID
		);
	}

	// if (manualTabAddition) {
	// 	Processes.ManualTabAddition.finish();
	// 	return;
	// }

	if (window?.type !== "normal" || Processes.WindowCreation.state === "pending")
		return;

	await Promise.all([Processes.WindowCreation]);
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
