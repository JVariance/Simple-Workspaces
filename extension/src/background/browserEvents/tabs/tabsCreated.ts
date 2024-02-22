import Browser from "webextension-polyfill";
import { WorkspaceStorage, Processes } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";

export async function tabsOnCreated(tab: Browser.Tabs.Tab) {
	// console.info("tabsOnCreated bef", Processes.TabCreations);
	console.info("tabsOnCreated 1");
	Processes.runningTabsOnCreated = true;
	const manualTabAddition = Processes.manualTabAddition;
	await Processes.TabCreations;
	console.info("tabsOnCreated 2");
	Processes.TabCreations.start();
	// await Promise.all(Processes.TabCreations);
	// console.info("tabsOnCreated aft", Processes.TabCreations);
	// const newTabCreationProcess = new DeferredPromise<void>();
	// Processes.TabCreations.push(newTabCreationProcess);
	// newTabCreationProcess.start();
	await Processes.TabRemoval;
	const window = await Browser.windows.get(tab.windowId!);
	console.info({ manualTabAddition });

	const tabSessionWorkspaceUUID = await API.getTabValue(
		tab.id!,
		"workspaceUUID"
	);

	if (!manualTabAddition && tabSessionWorkspaceUUID) {
		console.info("please restore this tab");
		await WorkspaceStorage.getWindow(tab.windowId!).restoredTab(
			tab.id!,
			tabSessionWorkspaceUUID
		);
	}

	if (manualTabAddition) {
		Processes.manualTabAddition = false;
		// newTabCreationProcess.finish();
		// Processes.TabCreations.shift();
		Processes.runningTabsOnCreated = false;
		Processes.TabCreations.finish();
		return;
	}

	if (
		window?.type !== "normal" ||
		Processes.WindowCreation.state === "pending"
	) {
		Processes.TabCreations.finish();
		return;
	}

	await Promise.all([Processes.WindowCreation]);
	Processes.TabCreation.start();
	const windowIsNew = !WorkspaceStorage.windows.has(tab.windowId!);

	console.info("createdTab", { tab: structuredClone(tab) });
	console.info({ windowIsNew });
	if (!windowIsNew) {
		// console.info({ tabSessionWorkspaceUUID });

		console.info({ windowIsNew, tabSessionWorkspaceUUID });

		!tabSessionWorkspaceUUID &&
			(await WorkspaceStorage.getWindow(tab.windowId!).addTab(tab.id!));

		informViews(tab.windowId!, "createdTab", { tabId: tab.id });
	}

	// newTabCreationProcess.finish();
	// Processes.TabCreations.shift();
	Processes.TabCreation.finish();
	Processes.TabCreations.finish();
	Processes.runningTabsOnCreated = false;
}
