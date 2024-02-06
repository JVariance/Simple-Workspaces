import type Browser from "webextension-polyfill";
import { WorkspaceStorage, Processes } from "../../Entities";
import * as API from "@root/browserAPI";
import { informViews } from "../../informViews";
import { createTab } from "@root/background/browserAPIWrapper/tabCreation";
export async function tabsOnRemoved(
	tabId: number,
	info: Browser.Tabs.OnRemovedRemoveInfoType
) {
	console.info("bg - tabs.onRemoved");
	console.info({ tabId, info });
	console.info({ manualTabRemoval: Processes.manualTabRemoval });
	Processes.TabRemoval.start();

	if (Processes.manualTabRemoval) {
		Processes.TabRemoval.finish();
		return;
	}
	await Promise.all([
		Processes.TabCreation,
		Processes.TabAttachment,
		Processes.TabDetachment,
	]);
	console.info("tab removed");

	const window = WorkspaceStorage.getWindow(info.windowId);
	const prevActiveWorkspace = window.workspaces.find((workspace) =>
		workspace.tabIds.includes(tabId)
	)!;

	const newActiveTab = (
		await API.queryTabs({
			active: true,
			windowId: info.windowId,
		})
	).tabs?.at(0);
	const newActiveWorkspaceUUID = await API.getTabValue(
		newActiveTab?.id,
		"workspaceUUID"
	);
	const newActiveWorkspace = window.workspaces.find(
		({ UUID }) => UUID === newActiveWorkspaceUUID
	)!;
	await window.removeTab(tabId);
	informViews(window.windowId, "removedTab", { tabId });
	Processes.TabRemoval.finish();

	console.info({
		prevActiveWorkspace,
		newActiveWorkspace,
	});

	if (
		prevActiveWorkspace.UUID !== newActiveWorkspace?.UUID &&
		!prevActiveWorkspace.tabIds.length
	) {
		console.info("| activeWorkspace has no tabs");
		const newTab = (await createTab(
			{
				active: false,
				windowId: window.windowId,
			},
			prevActiveWorkspace
		))!;

		await API.setTabValue(
			newTab.id!,
			"workspaceUUID",
			prevActiveWorkspace.UUID
		);

		await window.switchWorkspace(newActiveWorkspace);

		if (prevActiveWorkspace.UUID === "HOME" && !info.isWindowClosing) {
			console.info("?????");
			// if first and only tab closed in first (home) workspace, hide active tab from other workspace and activate newly created tab
			await API.updateTab(newTab.id!, { active: true });
			newActiveTab && (await API.hideTab(newActiveTab.id!));
		}
		informViews(window.windowId, "updatedActiveWorkspace", {
			UUID: newActiveWorkspace.UUID,
		});
	}
}