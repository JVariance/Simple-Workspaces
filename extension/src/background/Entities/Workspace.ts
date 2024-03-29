import * as API from "@root/browserAPI";
import Processes from "./Singletons/Processes";

export class Workspace {
	UUID: string;
	icon: string;
	name: string;
	active: boolean;
	windowId: number;
	tabIds: number[];
	pinnedTabIds: number[];
	activeTabId?: number;

	constructor(workspace: Ext.Workspace) {
		this.UUID = workspace.UUID;
		this.icon = workspace.icon;
		this.name = workspace.name;
		this.active = workspace.active;
		this.windowId = workspace.windowId;
		this.tabIds = workspace.tabIds;
		this.pinnedTabIds = workspace.pinnedTabIds;
		this.activeTabId = workspace.activeTabId;
	}

	get asObject(): Ext.Workspace {
		return {
			UUID: this.UUID,
			active: this.active,
			icon: this.icon,
			name: this.name,
			pinnedTabIds: this.pinnedTabIds,
			tabIds: this.tabIds,
			windowId: this.windowId,
			activeTabId: this.activeTabId,
		};
	}

	async addTab(tabId: number) {
		console.info("addTab");
		await this.addTabs([tabId]);
	}

	async addTabs(tabIds: number[]) {
		Processes.manualTabAddition = true;
		if (tabIds.some((tabId) => this.tabIds.includes(tabId))) return;
		console.info("addTabs", { tabIds });

		this.activeTabId = tabIds.at(-1);
		this.tabIds.push(...tabIds);

		await Promise.all([
			tabIds.forEach((tabId) =>
				API.setTabValue(tabId, "workspaceUUID", this.UUID)
			),
		]);

		Processes.manualTabAddition = false;
	}

	async removeTab(tabId: number) {
		this.removeTabs([tabId]);
	}

	async removeTabs(tabIds: number[]) {
		this.tabIds = this.tabIds.filter((id) => !tabIds.includes(id));
	}
}
