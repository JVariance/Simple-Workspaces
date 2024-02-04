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
	const currentActiveWorkspace = WorkspaceStorage.activeWindow.activeWorkspace;

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
	const removedTabsWorkspace = window.workspaces.find((workspace) =>
		workspace.tabIds.includes(tabId)
	)!;

	const tabWasPinned = removedTabsWorkspace.pinnedTabIds.includes(tabId);

	if (tabWasPinned) {
		removedTabsWorkspace.pinnedTabIds =
			removedTabsWorkspace.pinnedTabIds.filter((id) => id !== tabId);
	}

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
		removedTabsWorkspace,
		newActiveWorkspace,
	});

	const removedTabsWorkspaceHasNoTabs =
		removedTabsWorkspace.UUID !== newActiveWorkspace?.UUID &&
		!removedTabsWorkspace.tabIds.length;

	if (removedTabsWorkspaceHasNoTabs) {
		console.info("| activeWorkspace has no tabs");
		const newTab = (await createTab(
			{
				active: false,
				windowId: window.windowId,
			},
			removedTabsWorkspace
		))!;

		await API.setTabValue(
			newTab.id!,
			"workspaceUUID",
			removedTabsWorkspace.UUID
		);

		await window.switchWorkspace(newActiveWorkspace);

		const tabWasPinnedAndClosedFromOutsideWorkspace =
			tabWasPinned && currentActiveWorkspace.UUID === newActiveWorkspace.UUID;

		tabWasPinnedAndClosedFromOutsideWorkspace &&
			(await API.hideTab(newTab.id!));

		if (removedTabsWorkspace.UUID === "HOME" && !info.isWindowClosing) {
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
