import { promisedDebounceFunc } from "@root/utils";
import type Browser from "webextension-polyfill";
import Processes from "../../Processes";
import { informViews } from "../../informViews";
import WorkspaceStorage from "../../WorkspaceStorage";
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
}

export function tabsOnDetached(
	tabId: number,
	detachInfo: Browser.Tabs.OnDetachedDetachInfoType
) {
	const { oldWindowId } = detachInfo;
	collectedDetachedTabs.push(tabId);
	handleDetachedTabs(collectedDetachedTabs, oldWindowId);
}
