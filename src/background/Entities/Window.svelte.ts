import * as API from "@root/browserAPI";
import { promisedDebounceFunc } from "@root/utils";
import { unstate } from "svelte";
import Browser from "webextension-polyfill";
import { BrowserStorage } from "./Static/Storage";
import { createTab } from "../browserAPIWrapper/tabCreation";
import Processes from "./Singletons/Processes";

type EnhancedTab = Browser.Tabs.Tab & { workspaceUUID?: string };

export class Window {
	#storageKey!: string;
	switchingWorkspace = false;
	#UUID: string;
	#windowId!: number;
	#workspaces: Ext.Workspace[] = $state([]);
	#activeWorkspace: Ext.Workspace = $derived(
		(() => {
			this.#persist();
			return (
				this.#workspaces.find(({ active }) => active) || this.#workspaces.at(0)!
			);
		})()
	);

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

			Array.from(localWorkspaces.entries()).forEach(([key, workspace]) => {
				const tabs = Array.from(sortedTabsInWorkspaces.get(key)!.values());
				const activeTab = tabs.find(({ active }) => active);
				const activeTabId = activeTab?.id!;
				workspace.tabIds = tabs.flatMap(({ id }) => id!) || [];
				workspace.active = activeTab ? true : false;
				workspace.activeTabId = activeTabId;
				workspace.windowId = this.#windowId;
			});

			console.info({ localWorkspaces });

			this.#workspaces = Array.from(localWorkspaces.values());
		} else {
			let tabIds = tabs.map((tab) => tab.id!);

			const { homeWorkspace: localHomeWorkspace } =
				await Browser.storage.local.get("homeWorkspace");

			console.info({ localHomeWorkspace });

			const homeWorkspace: Ext.Workspace = {
				...this.#getNewWorkspace(),
				UUID: "HOME",
				icon: localHomeWorkspace?.icon || "🏠",
				name: localHomeWorkspace?.name || "Home",
				active: true,
				activeTabId: tabs.find(({ active }) => active)?.id!,
				tabIds: [...tabIds],
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
				await this.addTabs([newTab.id!], homeWorkspace);

				console.info("now remove tabs");
				homeWorkspace.tabIds = homeWorkspace.tabIds.filter(
					(id) => id !== blankTab.id
				);

				Processes.manualTabRemoval = true;
				await API.removeTab(blankTab.id!);
				Processes.manualTabRemoval = false;
				// await removeTabs([blankTab.id!], homeWorkspace);
			}
			this.#workspaces.push(homeWorkspace);

			await this.addDefaultWorkspaces();

			console.info("nach defaultworkspaces loop");

			for (let tabId of tabIds) {
				await API.setTabValue(tabId!, "workspaceUUID", homeWorkspace.UUID);
			}
		}

		console.info("finished initializing window");
	}

	get UUID() {
		return this.#UUID;
	}

	get windowId() {
		return this.#windowId;
	}

	get activeWorkspace(): Ext.Workspace {
		return this.#activeWorkspace;
	}

	setActiveTab(tabId: number) {
		if (!this.activeWorkspace || this.switchingWorkspace) return;

		this.activeWorkspace.activeTabId = tabId;
	}

	async restoredTab(tabId: number, workspaceUUID: string) {
		console.info("restoredTab", { tabId, workspaceUUID });

		const workspace = this.#workspaces.find(
			({ UUID }) => UUID === workspaceUUID
		);

		if (workspace) {
			workspace.tabIds.push(tabId);

			if (workspace !== this.activeWorkspace) {
				await Browser.tabs.update(this.activeWorkspace.tabIds.at(-1), {
					active: true,
				});
				await API.hideTab(tabId);
			}
		}
	}

	async addTab(tabId: number, workspace = this.activeWorkspace) {
		console.info("addTab");
		await this.addTabs([tabId], workspace);
	}

	async addTabs(tabIds: number[], workspace = this.activeWorkspace) {
		Processes.manualTabAddition = true;
		console.info(
			!this.activeWorkspace && !workspace,
			this.switchingWorkspace,
			tabIds.some((tabId) => workspace.tabIds.includes(tabId))
		);
		if (
			(!this.activeWorkspace && !workspace) ||
			this.switchingWorkspace ||
			tabIds.some((tabId) => workspace.tabIds.includes(tabId))
		)
			return;
		console.info("addTabs");

		workspace.activeTabId = tabIds.at(-1);
		workspace.tabIds.push(...tabIds);

		await Promise.all([
			tabIds.forEach((tabId) =>
				API.setTabValue(tabId, "workspaceUUID", workspace.UUID)
			),
		]);

		if (workspace.UUID !== this.activeWorkspace?.UUID) {
			await API.hideTabs(tabIds);
		}
		Processes.manualTabAddition = false;
	}

	async removeTab(tabId: number) {
		this.removeTabs([tabId]);
	}

	async removeTabs(tabIds: number[], workspace = this.activeWorkspace) {
		console.info("removeTabs 1");
		console.info(!this.activeWorkspace, !workspace);
		if (!this.activeWorkspace && !workspace) return;

		console.info("removeTabs 2");

		workspace.tabIds = workspace.tabIds.filter((id) => !tabIds.includes(id));

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

	async moveTabs({
		targetWorkspaceUUID,
		tabIds,
	}: {
		targetWorkspaceUUID: string;
		tabIds: number[];
	}) {
		// const currentWorkspace = this.activeWorkspace;
		const currentWorkspace = this.#workspaces.find((workspace) =>
			workspace.tabIds.includes(tabIds?.at(0)!)
		)!;

		const targetWorkspace = this.#workspaces.find(
			(workspace) => workspace.UUID === targetWorkspaceUUID
		)!;

		if (!targetWorkspace.tabIds.length && tabIds.length)
			targetWorkspace.activeTabId = tabIds.at(-1);
		targetWorkspace.tabIds.push(...tabIds);

		currentWorkspace.tabIds = currentWorkspace.tabIds.filter(
			(tabId) => !tabIds.includes(tabId)
		);

		const activeTabId = currentWorkspace.activeTabId;

		if (tabIds.includes(activeTabId!)) {
			const newActiveTabId = [...currentWorkspace.tabIds]
				.reverse()
				.find((tabId) => !tabIds.includes(tabId));

			if (newActiveTabId) {
				await Browser.tabs.update(newActiveTabId, { active: true });
			}
		}

		if (!currentWorkspace.tabIds.length) {
			await createTab({
				windowId: this.#windowId,
				active: false,
			});

			await this.switchWorkspace(targetWorkspace);
		} else {
			await API.hideTabs(tabIds);
		}

		for (let tabId of tabIds) {
			await API.setTabValue(tabId, "workspaceUUID", targetWorkspace.UUID);
		}
	}

	async remove() {
		await this.#removeFromStorage();
	}

	#getNewWorkspace(): Ext.Workspace {
		return {
			UUID: crypto.randomUUID(),
			icon: "🐠",
			name: `Workspace`,
			tabIds: [],
			active: true,
			windowId: this.#windowId,
			activeTabId: undefined,
		};
	}

	get workspaces(): Ext.Workspace[] {
		return this.#workspaces;
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
				...this.#getNewWorkspace(),
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

			this.#workspaces.push(newWorkspace);
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

			let presentWorkspace = this.#workspaces
				.filter(({ UUID }) => UUID !== "HOME")
				?.at(index);

			if (presentWorkspace) {
				console.info({ presentWorkspace, defaultWorkspace });
				presentWorkspace = { ...presentWorkspace, ...defaultWorkspace };
				console.info({ presentWorkspace });

				this.workspaces[index + 1] = presentWorkspace;
			} else {
				const newWorkspace = {
					...this.#getNewWorkspace(),
					...defaultWorkspace,
					active: false,
				};
				await createTab(
					{
						active: false,
						windowId: this.#windowId,
					},
					newWorkspace
				);

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
		const newWorkspace = this.#getNewWorkspace();

		if (tabIds) {
			newWorkspace.tabIds = tabIds;
			newWorkspace.activeTabId = tabIds.at(-1);
		} else {
			await createTab({ active: false }, newWorkspace);
		}

		this.#workspaces = [...this.#workspaces, newWorkspace];

		return newWorkspace;
	}

	async removeWorkspace(UUID: Ext.Workspace["UUID"]) {
		Processes.manualTabRemoval = true;
		const workspace = this.#workspaces.find(
			(workspace) => workspace.UUID === UUID
		)!;

		if (this.#workspaces.length <= 1) return;

		if (workspace.active) await this.switchToPreviousWorkspace();
		await API.removeTabs(workspace.tabIds);

		this.#workspaces = this.#workspaces.filter(
			(workspace) => workspace.UUID !== UUID
		);
	}

	async switchWorkspace(workspace: Ext.Workspace) {
		console.info("switchWorkspace()");
		// Processes.WorkspaceSwitch.start();
		this.switchingWorkspace = true;

		const currentTabIds = this.activeWorkspace.tabIds;
		const nextTabIds = workspace.tabIds;

		this.activeWorkspace.active = false;
		workspace.active = true;

		const activeTabId = workspace?.activeTabId || nextTabIds[0];

		await API.showTabs(nextTabIds);
		await API.updateTab(activeTabId, { active: true });
		// if (currentTabIds.length) await API.hideTabs(currentTabIds);
		if (currentTabIds.length)
			API.hideTabs(currentTabIds).then(
				({ hiddenIds, errorIds, ignoredIds }) => {
					if (!errorIds?.length) {
					}
					// this.switchingWorkspace = false;
				}
			);
		this.switchingWorkspace = false;
		// Processes.WorkspaceSwitch.finish();
	}

	async switchToNextWorkspace() {
		const index =
			this.workspaces.findIndex(
				({ UUID }) => UUID === this.activeWorkspace.UUID
			) + 1;

		if (index > this.#workspaces.length - 1) return;

		const nextWorkspace = this.#workspaces.at(index)!;

		await this.switchWorkspace(nextWorkspace);
		return nextWorkspace;
	}

	async switchToPreviousWorkspace() {
		const index =
			this.workspaces.findIndex(
				({ UUID }) => UUID === this.activeWorkspace.UUID
			) - 1;

		if (index < 0) return;

		const previousWorkspace = this.#workspaces.at(index)!;
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
		const workspace = this.#workspaces.find(
			({ UUID }) => UUID === workspaceUUID
		)!;
		workspace.name = name;
		workspace.icon = icon;
	}

	updateWorkspaces(newWorkspaces: Ext.Workspace[]) {
		this.#workspaces = newWorkspaces;
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
					workspaces: unstate(this.#workspaces),
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
