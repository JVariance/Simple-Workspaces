import { promisedDebounceFunc } from "@root/utils";
import type Browser from "webextension-polyfill";
import { informViews } from "../../informViews";
import { WorkspaceStorage, Processes } from "../../Entities";
const handleDetachedTabs = promisedDebounceFunc(_handleDetachedTabs, 200);

let collectedDetachedTabs: number[] = [];

async function _handleDetachedTabs(tabIds: number[], currentWindowId: number) {
	await Processes.WindowCreation;
	console.info("handleDetachedTabs", { tabIds, currentWindowId });

	Processes.TabDetachment.start();
	const activeWorkspace = await WorkspaceStorage.moveDetachedTabs({
		tabIds,
		currentWindowId,
	});
	collectedDetachedTabs = [];

	if (!activeWorkspace) {
		Processes.TabDetachment.finish();
		return;
	}

	informViews(currentWindowId, "updatedActiveWorkspace", {
		UUID: activeWorkspace.UUID,
	});
	Processes.TabDetachment.finish();
	Processes.runningTabsOnDetached = false;
}

export function tabsOnDetached(
	tabId: number,
	detachInfo: Browser.Tabs.OnDetachedDetachInfoType
) {
	Processes.runningTabsOnDetached = true;
	const { oldWindowId } = detachInfo;
	collectedDetachedTabs.push(tabId);
	handleDetachedTabs(collectedDetachedTabs, oldWindowId);
}
