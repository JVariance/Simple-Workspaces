import { promisedDebounceFunc } from "@root/utils";
import type Browser from "webextension-polyfill";
import { informViews } from "../informViews";
import Processes from "../Processes";
import WorkspaceStorage from "../WorkspaceStorage";

let collectedAttachedTabs: number[] = [];

async function _handleAttachedTabs(tabIds: number[], targetWindowId: number) {
	console.info("_handleAttachedTabs");
	await Promise.all([Processes.WindowCreation, Processes.TabDetachment]);
	console.info("handleAttachedTabs", { tabIds, targetWindowId });

	Processes.TabAttachment.start();
	const activeWorkspace = await WorkspaceStorage.moveAttachedTabs({
		tabIds,
		targetWindowId,
	});
	collectedAttachedTabs = [];
	Processes.TabAttachment.finish();

	informViews(targetWindowId, "updatedActiveWorkspace", {
		UUID: activeWorkspace.UUID,
	});
}

const handleAttachedTabs = promisedDebounceFunc(_handleAttachedTabs, 200);

export function tabsOnAttached(
	tabId: number,
	attachInfo: Browser.Tabs.OnAttachedAttachInfoType
) {
	const { newWindowId } = attachInfo;
	collectedAttachedTabs.push(tabId);
	handleAttachedTabs(collectedAttachedTabs, newWindowId);
}
