import type Browser from "webextension-polyfill";
import Processes from "../../Processes";
import WorkspaceStorage from "../../WorkspaceStorage";
import { createTab } from "@root/browserAPI";
import * as API from "@root/browserAPI";
import { informViews } from "../../informViews";

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
		// Processes.TabRemoval,
	]);

	console.info("tab removed");

	const window = WorkspaceStorage.getWindow(info.windowId);
	// const prevActiveWorkspace = window.activeWorkspace;
	const prevActiveWorkspace = window.workspaces.find((workspace) =>
		workspace.tabIds.includes(tabId)
	)!;

	await window.removeTab(tabId);

	if (!prevActiveWorkspace.tabIds.length) {
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
			window.activeWorkspace.UUID
		);

		const activeTab = (
			await API.queryTabs({
				active: true,
				windowId: window.windowId,
			})
		).tabs?.at(0)!;
		const workspaceUUID = await API.getTabValue(activeTab.id!, "workspaceUUID");
		const targetWorkspace = window.workspaces.find(
			({ UUID }) => UUID === workspaceUUID
		)!;
		await window.switchWorkspace(targetWorkspace);

		if (
			window.workspaces.findIndex(
				(w) => w.UUID === prevActiveWorkspace.UUID
			) === 0
		) {
			console.info("?????");
			// if first tab closed in first workspace hide active tab from different workspace and activate new created tab
			const activeTab = (
				await API.queryTabs({ active: true, windowId: window.windowId })
			).tabs?.at(0);

			await API.updateTab(newTab.id!, { active: true });
			activeTab && (await API.hideTab(activeTab.id!));
		}

		informViews(window.windowId, "updatedActiveWorkspace", {
			UUID: window.activeWorkspace.UUID,
		});
	}

	informViews(window.windowId, "removedTab", { tabId });
	Processes.TabRemoval.finish();
}
