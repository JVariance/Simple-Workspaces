import Browser from "webextension-polyfill";
import { WorkspaceStorage, Processes } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";
import { DeferredPromise } from "@root/utils";

export async function tabsOnCreated(tab: Browser.Tabs.Tab) {
	console.info("tabsOnCreated bef", Processes.TabCreations);
	Processes.runningTabsOnCreated = true;
	const manualTabAddition = Processes.manualTabAddition;
	await Promise.all(Processes.TabCreations);
	console.info("tabsOnCreated aft", Processes.TabCreations);
	const newTabCreationProcess = new DeferredPromise<void>();
	Processes.TabCreations.push(newTabCreationProcess);
	newTabCreationProcess.start();
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
		newTabCreationProcess.finish();
		Processes.TabCreations.shift();
		Processes.runningTabsOnCreated = false;
		return;
	}

	if (window?.type !== "normal" || Processes.WindowCreation.state === "pending")
		return;

	await Promise.all([Processes.WindowCreation]);
	Processes.TabCreation.start();
	const windowIsNew = !WorkspaceStorage.windows.has(tab.windowId!);

	console.info("createdTab", { tab: structuredClone(tab) });
	console.info({ windowIsNew });
	if (!windowIsNew) {
		// console.info({ tabSessionWorkspaceUUID });

		const _window = WorkspaceStorage.getWindow(tab.windowId!);

		!tabSessionWorkspaceUUID &&
			(await _window.addTab(tab.id!, _window.activeWorkspace?.UUID));

		informViews(tab.windowId!, "createdTab", { tabId: tab.id });
	}

	newTabCreationProcess.finish();
	Processes.TabCreations.shift();
	Processes.TabCreation.finish();
	Processes.runningTabsOnCreated = false;
}
