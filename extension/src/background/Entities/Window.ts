import * as API from "@root/browserAPI";
import { promisedDebounceFunc } from "@root/utils";
import { unstate } from "svelte";
import Browser from "webextension-polyfill";
import { BrowserStorage } from "./Static/Storage";
import { createTab } from "../browserAPIWrapper/tabCreation";
import Processes from "./Singletons/Processes";
import { Workspace } from "./Workspace";

type EnhancedTab = Browser.Tabs.Tab & { workspaceUUID?: string };

export class Window {
	#storageKey!: string;
	switchingWorkspace = false;
	#UUID: string;
	#windowId!: number;
	#workspaces: Map<"active" | "HOME" | (string & {}), Workspace> = new Map();
	#activeWorkspace!: Workspace;

	constructor(
		UUID: string | undefined = undefined,
		windowId: Browser.Windows.Window["id"] = undefined
	) {
		console.info("construct new window -> " + UUID);
		this.#UUID = UUID || crypto.randomUUID();
		if (windowId) this.#windowId = windowId;
		this.#storageKey = `window_${this.#UUID}`;
	}

	async init({ lookInStorage = true } = {}) {
		console.info("start initializing window");
		const { [this.#storageKey]: localWindow }: Record<string, Ext.Window> =
			await Browser.storage.local.get(this.#storageKey);

		const tabs = (await API.queryTabs({ windowId: this.#windowId }))
			.tabs! as EnhancedTab[];

		console.info({ localWindow, tabs });

		if (localWindow) {
			const localWorkspaces: Map<string, Ext.Workspace> =
				localWindow.workspaces.reduce((acc, workspace) => {
					acc.set(workspace.UUID, workspace);
					return acc;
				}, new Map());

			console.info({ localWorkspaces });

			const sortedTabsInWorkspaces = new Map<string, EnhancedTab[]>();

			for (let tab of tabs) {
				const workspaceSessionUUID = await API.getTabValue<string>(
					tab.id!,
					"workspaceUUID"
				);

				tab.workspaceUUID = workspaceSessionUUID || "HOME";
				if (!workspaceSessionUUID)
					await API.setTabValue(tab.id!, "workspaceUUID", "HOME");

				workspaceSessionUUID && sortedTabsInWorkspaces.has(workspaceSessionUUID)
					? sortedTabsInWorkspaces.get(workspaceSessionUUID)!.push(tab)
					: sortedTabsInWorkspaces.set(workspaceSessionUUID || "HOME", [tab]);
			}

			for (let [key, workspace] of localWorkspaces) {
				// Array.from(localWorkspaces.entries()).forEach(([key, workspace]) => {
				const tabs = Array.from(sortedTabsInWorkspaces.get(key)!.values());
				const activeTab = tabs.find(({ active }) => active);
				const activeTabId = activeTab?.id!;
				workspace.tabIds = tabs.flatMap(({ id }) => id!) || [];
				workspace.active = activeTab ? true : false;
				workspace.activeTabId = activeTabId;
				workspace.windowId = this.#windowId;
				// this.activeWorkspace = workspace;

				this.#workspaces.set(key, new Workspace(workspace));
			}
			console.info({ localWorkspaces });
			// this.#workspaces = Array.from(localWorkspaces.values());
		} else {
			const tabIds = tabs.map((tab) => tab.id!);
			const pinnedTabIds = tabs
				.filter(({ pinned }) => pinned)
				.map(({ id }) => id!);

			const { homeWorkspace: localHomeWorkspace } =
				await Browser.storage.local.get("homeWorkspace");

			console.info({ localHomeWorkspace });

			const homeWorkspace: Ext.Workspace = {
				...this.#getNewWorkspaceObject(),
				UUID: "HOME",
				icon: localHomeWorkspace?.icon || "🏠",
				name: localHomeWorkspace?.name || "Home",
				active: true,
				activeTabId: tabs.find(({ active }) => active)?.id!,
				tabIds: [...tabIds],
				pinnedTabIds: [...pinnedTabIds],
			};

			const blankTab = (
				await API.queryTabs({ windowId: this.#windowId, index: 0 })
			).tabs?.at(0)!;

			if (blankTab.url === "about:blank") {
				console.info("is blank tab");
				Processes.manualTabAddition = true;
				const newTab = (await API.createTab({
					active: true,
					windowId: this.#windowId,
				}))!;
				Processes.manualTabAddition = false;

				// if (newTab) {
				// 	homeWorkspace.tabIds.push(newTab.id!);
				// 	homeWorkspace.activeTabId = newTab.id!;
				// 	await API.setTabValue(
				// 		newTab.id!,
				// 		"workspaceUUID",
				// 		homeWorkspace.UUID
				// 	);
				// }
				await this.addTabs([newTab.id!], homeWorkspace.UUID);

				console.info("now remove tabs");
				homeWorkspace.tabIds = homeWorkspace.tabIds.filter(
					(id) => id !== blankTab.id
				);

				Processes.manualTabRemoval = true;
				await API.removeTab(blankTab.id!);
				Processes.manualTabRemoval = false;
				// await removeTabs([blankTab.id!], homeWorkspace);
			}
			// this.#workspaces.push(homeWorkspace);
			this.#workspaces.set("HOME", new Workspace(homeWorkspace));

			await this.addDefaultWorkspaces();

			console.info("nach defaultworkspaces loop");

			for (let tabId of tabIds) {
				await API.setTabValue(tabId!, "workspaceUUID", homeWorkspace.UUID);
			}
		}

		this.activeWorkspace = this.findWorkspace(({ active }) => active);
		console.info("finished initializing window");
	}

	get UUID() {
		return this.#UUID;
	}

	get windowId() {
		return this.#windowId;
	}

	get activeWorkspace(): Ext.Workspace | undefined {
		// return this.#activeWorkspace;
		// return this.#workspaces.get("active")?.asObject;
		return this.#activeWorkspace;
	}

	set activeWorkspace(workspace: Ext.Workspace | undefined) {
		if (!workspace) return;
		this.#activeWorkspace = workspace;
	}

	setActiveTab(tabId: number) {
		if (!this.activeWorkspace || this.switchingWorkspace) return;

		this.activeWorkspace.activeTabId = tabId;
	}

	async restoredTab(tabId: number, workspaceUUID: string) {
		console.info("restoredTab", { tabId, workspaceUUID });

		const workspace = this.#workspaces.get(workspaceUUID);

		console.info({ tabId, workspace, workspaceUUID });

		if (workspace) {
			workspace.tabIds.push(tabId);

			if (workspace.UUID !== this.activeWorkspace?.UUID) {
				await Browser.tabs.update(this.activeWorkspace!.tabIds.at(-1), {
					active: true,
				});
				await API.hideTab(tabId);
			}
		}
	}

	async addTab(
		tabId: number,
		workspaceUUID: Ext.Workspace["UUID"] | undefined
	) {
		console.info("addTab");
		// await this.#workspaces.get(workspaceUUID)?.addTab(tabId);
		await this.addTabs([tabId], workspaceUUID);
	}

	async addTabs(
		tabIds: number[],
		workspaceUUID: Ext.Workspace["UUID"] | undefined = this.activeWorkspace
			?.UUID
	) {
		if (!workspaceUUID) return;
		const workspace = this.#workspaces.get(workspaceUUID);

		console.info({ workspace });

		if (!workspace) return;

		Processes.manualTabAddition = true;
		console.info(
			!this.activeWorkspace && !workspaceUUID,
			this.switchingWorkspace
		);
		if ((!this.activeWorkspace && !workspaceUUID) || this.switchingWorkspace)
			return;
		console.info("addTabs");
		workspace.addTabs(tabIds);

		Processes.manualTabAddition = false;
	}

	async removeTab(
		tabId: number,
		workspaceUUID?: Ext.Workspace["UUID"] | undefined
	) {
		this.removeTabs([tabId], workspaceUUID);
	}

	async removeTabs(
		tabIds: number[],
		workspaceUUID: Ext.Workspace["UUID"] | undefined = this.activeWorkspace
			?.UUID
	) {
		console.info(!this.activeWorkspace, !workspaceUUID);
		if (!workspaceUUID) return;

		const workspace = this.#workspaces.get(workspaceUUID);

		await workspace?.removeTabs(tabIds);

		//TODO: explain block
		this.#workspaces.forEach((workspace) => {
			if (workspace.activeTabId) {
				if (tabIds.includes(workspace.activeTabId)) {
					workspace.tabIds = workspace.tabIds.filter(
						(id) => !tabIds.includes(id)
					);
					workspace.activeTabId = workspace.tabIds?.at(-1);
				}
			}
		});
	}

	findWorkspace(
		callback: (workspace: Ext.Workspace) => {}
	): Ext.Workspace | undefined {
		for (let [_, workspace] of this.#workspaces) {
			if (callback(workspace)) return workspace;
		}
	}

	async moveTabs({
		targetWorkspaceUUID,
		tabIds,
	}: {
		targetWorkspaceUUID: string;
		tabIds: number[];
	}) {
		// const currentWorkspace = this.activeWorkspace;
		const currentWorkspace = this.findWorkspace((workspace) =>
			workspace.tabIds.includes(tabIds?.at(0)!)
		)!;

		// const targetWorkspace = this.findWorkspace(
		// 	(workspace) => workspace.UUID === targetWorkspaceUUID
		// )!;
		const targetWorkspace = this.#workspaces.get(targetWorkspaceUUID)!;

		if (!targetWorkspace.tabIds.length && tabIds.length)
			targetWorkspace.activeTabId = tabIds.at(-1);
		targetWorkspace.tabIds.push(...tabIds);

		currentWorkspace.tabIds = currentWorkspace.tabIds.filter(
			(tabId) => !tabIds.includes(tabId)
		);

		const activeTabId = currentWorkspace.activeTabId;

		console.info("moveTabs", { tabIds, activeTabId });

		if (tabIds.includes(activeTabId!)) {
			const newActiveTabId = [...currentWorkspace.tabIds].findLast(
				(tabId) => !tabIds.includes(tabId)
			);

			console.info({ newActiveTabId });

			if (newActiveTabId) {
				currentWorkspace.activeTabId = newActiveTabId;
				await Browser.tabs.update(newActiveTabId, { active: true });
			}
		}

		if (currentWorkspace.tabIds.length) {
			await API.hideTabs(tabIds);
		} else {
			await createTab({
				windowId: this.#windowId,
				active: false,
			});

			await this.switchWorkspace(targetWorkspace);
		}

		for (let tabId of tabIds) {
			await API.setTabValue(tabId, "workspaceUUID", targetWorkspace.UUID);
		}
	}

	async remove() {
		await this.#removeFromStorage();
	}

	#getNewWorkspaceObject(): Ext.Workspace {
		return {
			UUID: crypto.randomUUID(),
			icon: "🐠",
			name: `Workspace`,
			tabIds: [],
			pinnedTabIds: [],
			active: true,
			windowId: this.#windowId,
			activeTabId: undefined,
		};
	}

	get workspaces(): Workspace[] {
		return Array.from(this.#workspaces.values());
	}

	/**
	 * If the extension has been newly installed and no workspaces have been added to the window yet, apply the set default workspaces.
	 */
	async addDefaultWorkspaces() {
		// const { homeWorkspace } = await BrowserStorage.getHomeWorkspace();
		const { defaultWorkspaces } = await BrowserStorage.getDefaultWorkspaces();

		console.info({ defaultWorkspaces });

		for (let _defaultWorkspace of defaultWorkspaces || []) {
			const { id, ...defaultWorkspace } = _defaultWorkspace;

			const newWorkspace = {
				...this.#getNewWorkspaceObject(),
				...defaultWorkspace,
				active: false,
			};

			console.info("before:", {
				newWorkspace,
				defaultWorkspace,
				windowId: this.#windowId,
			});

			Processes.manualTabAddition = true;
			const newTab = (await API.createTab({
				active: false,
				windowId: this.#windowId,
			}))!;
			await API.hideTab(newTab.id!);

			newWorkspace.tabIds.push(newTab.id!);
			newWorkspace.activeTabId = newTab.id!;
			await API.setTabValue(newTab.id!, "workspaceUUID", newWorkspace.UUID);
			Processes.manualTabAddition = false;

			console.info("after: ", { newWorkspace });

			this.#workspaces.set(newWorkspace.UUID, new Workspace(newWorkspace));
		}
	}

	async forceApplyDefaultWorkspaces() {
		console.info("Window - forceApplyDefaultWorkspaces");
		const { defaultWorkspaces } = await BrowserStorage.getDefaultWorkspaces();
		if (!defaultWorkspaces?.length) return;

		console.info({ defaultWorkspaces });

		for (let [index, _defaultWorkspace] of defaultWorkspaces.entries() ||
			[].entries()) {
			const { id, ...defaultWorkspace } = _defaultWorkspace;

			let presentWorkspace = Array.from(this.#workspaces.values())
				.filter(({ UUID }) => UUID !== "HOME")
				?.at(index)?.asObject;

			if (presentWorkspace) {
				console.info({ presentWorkspace, defaultWorkspace });
				presentWorkspace = { ...presentWorkspace, ...defaultWorkspace };
				console.info({ presentWorkspace });

				this.workspaces[index + 1] = presentWorkspace;
			} else {
				const newWorkspace = {
					...this.#getNewWorkspaceObject(),
					...defaultWorkspace,
					active: false,
				};

				this.#workspaces.set(newWorkspace.UUID, new Workspace(newWorkspace));

				const tab = await createTab(
					{
						active: false,
						windowId: this.#windowId,
					},
					newWorkspace
				);

				await API.hideTab(tab?.id!);

				console.info("lollilollo");
			}
		}

		// this.#persist();
		console.info("forceApply end");
	}

	async addWorkspaceAndSwitch() {
		const newWorkspace = await this.addWorkspace();
		await this.switchWorkspace(newWorkspace);
		return newWorkspace;
	}

	async addWorkspace(tabIds: number[] | undefined = undefined) {
		const newWorkspace = new Workspace(this.#getNewWorkspaceObject());
		this.#workspaces.set(newWorkspace.UUID, newWorkspace);

		if (tabIds) {
			newWorkspace.tabIds = tabIds;
			newWorkspace.activeTabId = tabIds.at(-1);
		} else {
			Processes.manualTabAddition = true;
			await createTab({ active: false }, newWorkspace);
			Processes.manualTabAddition = false;
		}

		console.info("addWorkspace", {
			newWorkspace,
			workspaces: this.#workspaces,
		});

		return newWorkspace;
	}

	async removeWorkspace(
		UUID: Ext.Workspace["UUID"]
	): Promise<Ext.Workspace | undefined> {
		Processes.manualTabRemoval = true;
		const workspace = this.#workspaces.get(UUID)!;
		let previousWorkspace = undefined;

		if (this.#workspaces.size <= 1) return previousWorkspace;

		if (workspace.active)
			previousWorkspace = await this.switchToPreviousWorkspace();
		await API.removeTabs(workspace.tabIds);

		this.#workspaces.delete(UUID);

		return previousWorkspace;
	}

	async switchWorkspace(workspace: Ext.Workspace) {
		console.info("switchWorkspace()");
		// Processes.WorkspaceSwitch.start();
		this.switchingWorkspace = true;
		const previousActiveWorkspace = this.activeWorkspace!;
		const previousActiveWorkspaceUUID = previousActiveWorkspace.UUID;

		const currentTabIds = previousActiveWorkspace.tabIds;
		const nextTabIds = workspace.tabIds;

		this.activeWorkspace!.active = false;
		workspace.active = true;
		this.activeWorkspace = workspace;

		await API.showTabs(nextTabIds);
		if (!Processes.keepPinnedTabs) {
			await API.updateTabs(
				workspace.pinnedTabIds.map((id) => ({
					id,
					props: { pinned: true },
				}))
			);
		}
		if (Processes.searchWasUsed) {
			workspace.activeTabId = (
				await API.queryTabs({
					windowId: this.windowId,
					active: true,
				})
			).tabs?.at(0)?.id!;
		} else {
			const activeTabId = workspace?.activeTabId || nextTabIds[0];
			await API.updateTab(activeTabId, { active: true });
		}
		// if (currentTabIds.length) await API.hideTabs(currentTabIds);
		if (
			currentTabIds.length &&
			previousActiveWorkspaceUUID !== workspace.UUID
		) {
			if (!Processes.keepPinnedTabs) {
				await API.updateTabs(
					previousActiveWorkspace.pinnedTabIds.map((id) => ({
						id,
						props: { pinned: false },
					}))
				);
			}
			API.hideTabs(currentTabIds).then(
				({ hiddenIds, errorIds, ignoredIds }) => {
					if (!errorIds?.length) {
					}
					// this.switchingWorkspace = false;
				}
			);
		}
		this.switchingWorkspace = false;
		// Processes.WorkspaceSwitch.finish();
	}

	getNextWorkspace(currentWorkspaceUUID: string): Ext.Workspace | undefined {
		let found = false;
		for (let [UUID, workspace] of Array.from(this.#workspaces)) {
			if (found) return workspace.asObject;
			found = UUID === currentWorkspaceUUID;
		}
	}

	getPreviousWorkspace(
		currentWorkspaceUUID: string
	): Ext.Workspace | undefined {
		let found = false;
		for (let [UUID, workspace] of Array.from(this.#workspaces).reverse()) {
			if (found) return workspace.asObject;
			found = UUID === currentWorkspaceUUID;
		}
	}

	async switchToNextWorkspace() {
		const nextWorkspace = this.getNextWorkspace(this.activeWorkspace!.UUID)!;
		if (!nextWorkspace || nextWorkspace.UUID === this.#activeWorkspace.UUID)
			return;

		await this.switchWorkspace(nextWorkspace);
		return nextWorkspace;
	}

	async switchToPreviousWorkspace() {
		const previousWorkspace = this.getPreviousWorkspace(
			this.activeWorkspace!.UUID
		)!;

		if (
			!previousWorkspace ||
			previousWorkspace.UUID === this.#activeWorkspace.UUID
		)
			return;

		await this.switchWorkspace(previousWorkspace);
		return previousWorkspace;
	}

	async editWorkspace({
		workspaceUUID,
		name,
		icon,
	}: {
		workspaceUUID: Ext.Workspace["UUID"];
		name: string;
		icon: string;
	}) {
		const workspace = this.#workspaces.get(workspaceUUID)!;
		workspace.name = name;
		workspace.icon = icon;
	}

	updateWorkspaces(newWorkspaces: Ext.Workspace[]) {
		// this.#workspaces = newWorkspaces;
		this.#workspaces = newWorkspaces.reduce((workspaces, workspace) => {
			workspaces.set(workspace.UUID, new Workspace(workspace));
			return workspaces;
		}, new Map<Ext.Workspace["UUID"], Workspace>());
	}

	async reorderWorkspaces(orderedIds: Ext.Workspace["UUID"][]) {
		this.workspaces.sort(
			(a, b) => orderedIds.indexOf(a.UUID) - orderedIds.indexOf(b.UUID)
		);
	}

	#persist = promisedDebounceFunc<void>(this.#_persist, 500);

	#_persist() {
		console.info("_persist");
		try {
			return Browser.storage.local.set({
				[this.#storageKey]: {
					id: this.#UUID,
					workspaces: unstate(Array.from(this.#workspaces.values())),
				},
			});
		} catch (e) {
			console.info({ e });
		}
	}

	async #removeFromStorage() {
		await Browser.storage.local.remove(this.#storageKey);
	}
}
