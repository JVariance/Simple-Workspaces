import { promisedDebounceFunc } from "@root/utils";
import type Browser from "webextension-polyfill";
import { informViews } from "../../informViews";
import { WorkspaceStorage, Processes } from "../../Entities";

let collectedAttachedTabs: number[] = [];

async function _handleAttachedTabs(tabIds: number[], targetWindowId: number) {
	await Promise.all([Processes.WindowCreation, Processes.TabDetachment]);
	console.info("handleAttachedTabs", { tabIds, targetWindowId });

	Processes.TabAttachment.start();
	const activeWorkspace = await WorkspaceStorage.moveAttachedTabs({
		tabIds,
		targetWindowId,
	});
	collectedAttachedTabs = [];
	Processes.TabAttachment.finish();
	Processes.runningTabsOnAttached = false;

	informViews(targetWindowId, "updatedActiveWorkspace", {
		UUID: activeWorkspace.UUID,
	});
}

const handleAttachedTabs = promisedDebounceFunc(_handleAttachedTabs, 200);

export function tabsOnAttached(
	tabId: number,
	attachInfo: Browser.Tabs.OnAttachedAttachInfoType
) {
	Processes.runningTabsOnAttached = true;
	const { newWindowId } = attachInfo;
	collectedAttachedTabs.push(tabId);
	handleAttachedTabs(collectedAttachedTabs, newWindowId);
}
