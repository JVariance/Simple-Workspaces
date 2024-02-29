import * as API from "@root/browserAPI";
import { promisedDebounceFunc } from "@root/utils";
import Browser from "webextension-polyfill";
import { BrowserStorage } from "./Static/Storage";
import { createTab } from "../browserAPIWrapper/tabCreation";
import Processes from "./Singletons/Processes";
import { pinTabs, unpinTabs } from "../helper/tabsPinning";
import { getRandomEmoji } from "@root/emojiList";
import { Workspace } from "./Workspace";

type EnhancedTab = Browser.Tabs.Tab & { workspaceUUID?: string };

export class Window {
	#storageKey!: string;
	switchingWorkspace = false;
	#UUID: string;
	#windowId!: number;
	// TODO: switch to Map when made reactive
	#workspaces: Map<string, Workspace> = new Map();
	#activeWorkspace = $state<Workspace>()!;

	constructor(
		UUID: string | undefined = undefined,
		windowId: Browser.Windows.Window["id"] = undefined
	) {
		console.info("construct new window -> " + UUID);
		this.#UUID = UUID || crypto.randomUUID();
		if (windowId) this.#windowId = windowId;
		this.#storageKey = `window_${this.#UUID}`;
	}

	async init(
		options: {
			lookInStorage?: boolean;
			extensionUpdated?: boolean;
			restored?: boolean;
		} = {}
	) {
		console.info("start initializing window");

		const {
			lookInStorage = true,
			extensionUpdated = false,
			restored = false,
		} = options;

		const { [this.#storageKey]: localWindow }: Record<string, Ext.Window> =
			await Browser.storage.local.get(this.#storageKey);

		const tabs = (await API.queryTabs({ windowId: this.#windowId }))
			.tabs! as EnhancedTab[];

		console.info({ localWindow, tabs });

		if (localWindow) {
			const localWorkspaces: Map<string, Workspace> =
				localWindow.workspaces.reduce((acc, workspace) => {
					acc.set(workspace.UUID, new Workspace(workspace));
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

			console.info({
				entries: [...localWorkspaces.entries()],
				sortedTabsInWorkspaces,
			});

			if (extensionUpdated) {
				await API.updateTab(localWorkspaces.get("HOME")!.tabIds!.at(-1)!, {
					active: true,
				});
			}

			for (let [UUID, workspace] of localWorkspaces.entries()) {
				console.info("moini moinsen");
				let tabs: EnhancedTab[] = Array.from(
					sortedTabsInWorkspaces.get(UUID)?.values() || []
				);

				console.info({ extensionUpdated, UUID, workspace, tabs });

				if (extensionUpdated) {
					const actualTabs = [];

					for (let tab of tabs) {
						const _tab = await API.getTab(tab.id);

						console.info({ _tab });

						_tab && actualTabs.push(tab);
					}

					if (!actualTabs.length) {
						const newTab = (await API.createTab({
							windowId: this.#windowId,
							active: false,
						}))!;

						// workspace.tabIds.push(newTab.id!);
						// workspace.activeTabId = newTab.id!;
						await API.setTabValue(newTab.id!, "workspaceUUID", UUID);
						await API.hideTab(newTab.id!);

						console.info({ newTab });
						actualTabs.push({ ...newTab, workspaceUUID: UUID });
					}

					console.info({ actualTabs });

					tabs = actualTabs;
				}

				const activeTab = tabs.find(({ active }) => active);
				const activeTabId = activeTab?.id!;

				console.info({ activeTab, activeTabId });

				workspace.tabIds = tabs.flatMap(({ id }) => id!) || [];
				workspace.pinnedTabIds = tabs
					.filter(({ pinned }) => pinned)
					.map(({ id }) => id!);
				workspace.active = activeTab ? true : false;
				workspace.activeTabId = activeTabId;
				workspace.windowId = this.#windowId;
				activeTab && (this.#activeWorkspace = workspace);

				console.info("tach auch", { workspace });
			}

			console.info({ localWorkspaces });

			// const localWorkspacesArray = Array.from(localWorkspaces.values());
			// this.#activeWorkspace =
			// 	localWorkspacesArray.find(({ active }) => active)! ||
			// 	localWorkspacesArray?.at(0)!;
			this.#workspaces = localWorkspaces;
		} else {
			if (restored) {
				const tabsPerWorkspace: Map<string, EnhancedTab[]> = new Map();
				let activeWorkspaceUUID = "HOME";
				for (let tab of tabs) {
					const workspaceUUID =
						(await API.getTabValue(tab.id!, "workspaceUUID")) || "HOME";

					if (tabsPerWorkspace.has(workspaceUUID)) {
						tabsPerWorkspace
							.get(workspaceUUID)!
							.push(Object.assign(tab, { workspaceUUID }));
					} else {
						tabsPerWorkspace.set(workspaceUUID!, [
							Object.assign(tab, { workspaceUUID }),
						]);
					}

					if (tab.active) {
						activeWorkspaceUUID = workspaceUUID;
					}
				}

				const { homeWorkspace: localHomeWorkspace } =
					await Browser.storage.local.get("homeWorkspace");

				for (let [UUID, tabs] of tabsPerWorkspace.entries()) {
					const isActiveWorkspace = UUID === activeWorkspaceUUID;

					const tabIds = tabs.map((tab) => tab.id!);
					const pinnedTabIds = tabs
						.filter(({ pinned }) => pinned!)
						.map(({ id }) => id!);

					const workspace = new Workspace({
						...this.#getNewWorkspace(),
						...(UUID === "HOME" && {
							icon: localHomeWorkspace?.icon || "🏠",
							name: localHomeWorkspace?.name || "Home",
						}),
						UUID,
						tabIds,
						pinnedTabIds,
						active: isActiveWorkspace,
						activeTabId:
							tabs.find(({ active }) => active)?.id || tabs?.at(-1)?.id,
					});

					if (isActiveWorkspace) {
						this.#activeWorkspace = workspace;
					} else {
						await API.updateTabs(
							pinnedTabIds.map((id) => ({
								id,
								props: { pinned: false },
							}))
						);
						await API.hideTabs(tabIds);
					}

					this.#workspaces.set(UUID, workspace);
				}
			} else {
				const tabIds = tabs.map((tab) => tab.id!);
				const pinnedTabIds = tabs
					.filter(({ pinned }) => pinned)
					.map(({ id }) => id!);

				const { homeWorkspace: localHomeWorkspace } =
					await Browser.storage.local.get("homeWorkspace");

				console.info({ localHomeWorkspace });

				const homeWorkspace: Workspace = new Workspace({
					...this.#getNewWorkspace(),
					UUID: "HOME",
					icon: localHomeWorkspace?.icon || "🏠",
					name: localHomeWorkspace?.name || "Home",
					active: true,
					activeTabId: tabs.find(({ active }) => active)?.id!,
					tabIds: [...tabIds],
					pinnedTabIds: [...pinnedTabIds],
				});

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
				this.#activeWorkspace = homeWorkspace;
				// this.#workspaces.push(homeWorkspace);
				this.#workspaces.set("HOME", homeWorkspace);

				await this.addDefaultWorkspaces();

				console.info("nach defaultworkspaces loop");

				for (let tabId of tabIds) {
					await API.setTabValue(tabId!, "workspaceUUID", homeWorkspace.UUID);
				}
			}
		}

		console.info("finished initializing window");
		this.#persist();
	}

	get UUID() {
		return this.#UUID;
	}

	get windowId() {
		return this.#windowId;
	}

	get activeWorkspace(): Workspace {
		return this.#activeWorkspace;
	}

	set activeWorkspace(workspace: Workspace) {
		this.#activeWorkspace = workspace;
	}

	setActiveTab(tabId: number) {
		if (!this.#activeWorkspace || this.switchingWorkspace) return;

		this.#activeWorkspace.activeTabId = tabId;
		this.#persist();
	}

	async restoredTab(tabId: number, workspaceUUID: string) {
		console.info("restoredTab", { tabId, workspaceUUID });

		const workspace = this.#workspaces.get(workspaceUUID);

		console.info({ tabId, workspace, workspaceUUID });

		if (workspace) {
			workspace.tabIds.push(tabId);
			const tab = await API.getTab(tabId);
			tab?.pinned && workspace.pinnedTabIds.push(tabId);

			if (workspace !== this.#activeWorkspace) {
				await Browser.tabs.update(this.#activeWorkspace.tabIds.at(-1), {
					active: true,
				});
				await unpinTabs([tabId]);
				await API.hideTab(tabId);
			}
		}

		this.#persist();
	}

	async addTab(tabId: number, workspace?: Workspace) {
		console.info("addTab");
		await this.addTabs([tabId], workspace);
	}

	async addTabs(tabIds: number[], workspace = this.#activeWorkspace) {
		Processes.manualTabAddition = true;
		console.info(
			!this.#activeWorkspace && !workspace,
			this.switchingWorkspace,
			tabIds.some((tabId) => workspace.tabIds.includes(tabId))
		);
		if (
			(!this.#activeWorkspace && !workspace) ||
			this.switchingWorkspace ||
			tabIds.some((tabId) => workspace.tabIds.includes(tabId))
		)
			return;
		console.info("addTabs");

		const activeTab = (
			await API.queryTabs({
				active: true,
				windowId: this.#windowId,
			})
		).tabs?.at(0);

		workspace.activeTabId = activeTab?.id ?? tabIds.at(-1);
		workspace.tabIds.push(...tabIds);

		for (let tabId of tabIds) {
			const tab = await API.getTab(tabId);
			tab && tab.pinned && workspace.pinnedTabIds.push(tabId);
		}

		await Promise.all([
			tabIds.forEach((tabId) =>
				API.setTabValue(tabId, "workspaceUUID", workspace.UUID)
			),
		]);

		Processes.manualTabAddition = false;
		this.#persist();
	}

	async removeTab(tabId: number, workspace?: Workspace) {
		this.removeTabs([tabId], workspace);
	}

	async removeTabs(tabIds: number[], workspace = this.#activeWorkspace) {
		console.info("removeTabs 1");
		console.info(!this.#activeWorkspace, !workspace);
		if (!this.#activeWorkspace && !workspace) return;

		console.info("removeTabs 2");

		workspace.tabIds = workspace.tabIds.filter((id) => !tabIds.includes(id));
		workspace.pinnedTabIds = workspace.pinnedTabIds.filter(
			(id) => !tabIds.includes(id)
		);

		this.#workspaces.forEach((workspace) => {
			if (workspace.activeTabId) {
				if (tabIds.includes(workspace.activeTabId)) {
					workspace.tabIds = workspace.tabIds.filter(
						(id) => !tabIds.includes(id)
					);
					workspace.pinnedTabIds = workspace.pinnedTabIds.filter(
						(id) => !tabIds.includes(id)
					);
					workspace.activeTabId = workspace.tabIds?.at(-1);
				}
			}
		});

		this.#persist();
	}

	async moveTabs({
		targetWorkspaceUUID,
		tabIds,
	}: {
		targetWorkspaceUUID: string;
		tabIds: number[];
	}) {
		const activeWorkspace = this.activeWorkspace;
		const targetWorkspace = this.#workspaces.get(targetWorkspaceUUID);
		if (!targetWorkspace) return;

		const emptyWorkspaces = [];

		for (let tabId of tabIds) {
			const workspaceUUID = (await API.getTabValue(
				tabId,
				"workspaceUUID"
			)) as string;
			const workspace = this.#workspaces.get(workspaceUUID);

			if (workspace) {
				const isPinned = workspace.pinnedTabIds.includes(tabId);

				workspace.tabIds = workspace.tabIds.filter((id) => id !== tabId);
				targetWorkspace.tabIds.push(tabId);

				!workspace.tabIds.length && emptyWorkspaces.push(workspace);

				if (isPinned) {
					workspace.pinnedTabIds = workspace.pinnedTabIds.filter(
						(id) => id !== tabId
					);
					targetWorkspace.pinnedTabIds.push(tabId);
				}

				if (!targetWorkspace.activeTabId) {
					targetWorkspace.activeTabId = targetWorkspace.tabIds?.at(-1);
				}
			}
		}

		if (activeWorkspace.tabIds.length) {
			const lastTabId = activeWorkspace.tabIds.at(-1);
			lastTabId && (activeWorkspace.activeTabId = lastTabId);
			lastTabId && (await API.updateTab(lastTabId, { active: true }));
			if (!Processes.keepPinnedTabs) {
				await unpinTabs(targetWorkspace.pinnedTabIds);
			}
			await API.hideTabs(tabIds);
		} else {
			await this.switchWorkspace(targetWorkspace);
		}

		for (let tabId of tabIds) {
			await API.setTabValue(tabId, "workspaceUUID", targetWorkspace.UUID);
		}

		for (let emptyWorkspace of emptyWorkspaces) {
			const newTab = (await createTab(
				{ windowId: this.#windowId, active: false },
				emptyWorkspace
			))!;

			await API.setTabValue(newTab.id!, "workspaceUUID", emptyWorkspace.UUID);
			await API.hideTab(newTab.id);
		}

		this.#persist();
	}

	async remove() {
		await this.#removeFromStorage();
	}

	#getNewWorkspace(): Ext.Workspace {
		return {
			UUID: crypto.randomUUID(),
			icon: getRandomEmoji(),
			name: `Workspace`,
			tabIds: [],
			pinnedTabIds: [],
			active: true,
			windowId: this.#windowId,
			activeTabId: undefined,
		};
	}

	// get workspaces(): Workspace[] {
	// return Array.from(this.#workspaces.values());
	get workspaces(): Map<"HOME" | (string & {}), Workspace> {
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

			const newWorkspace = new Workspace({
				...this.#getNewWorkspace(),
				...defaultWorkspace,
				active: false,
			});

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

			this.#workspaces.set(newWorkspace.UUID, newWorkspace);
		}

		this.#persist();
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
				?.at(index);

			if (presentWorkspace) {
				console.info({ presentWorkspace, defaultWorkspace });
				// presentWorkspace = { ...presentWorkspace, ...defaultWorkspace };
				presentWorkspace.icon = defaultWorkspace.icon;
				presentWorkspace.name = defaultWorkspace.name;
				console.info({ presentWorkspace });

				// this.#workspaces[index + 1] = presentWorkspace;
				const _workspaces = Array.from(this.#workspaces.entries());
				_workspaces[index + 1] = [presentWorkspace.UUID, presentWorkspace];
				this.#workspaces = new Map(_workspaces);
			} else {
				const newWorkspace = new Workspace({
					...this.#getNewWorkspace(),
					...defaultWorkspace,
					active: false,
				});

				this.#workspaces.set(newWorkspace.UUID, newWorkspace);

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
		this.#persist();
	}

	async addWorkspaceAndSwitch() {
		const newWorkspace = await this.addWorkspace();
		await this.switchWorkspace(newWorkspace);
		return newWorkspace;
	}

	async addWorkspace(
		tabIds: number[] | undefined = undefined,
		props: Partial<Ext.Workspace> = {}
	) {
		Processes.WorkspaceCreation.start();
		const newWorkspace = new Workspace(
			Object.assign(this.#getNewWorkspace(), props)
		);

		if (tabIds) {
			newWorkspace.tabIds = tabIds;
			newWorkspace.activeTabId = tabIds.at(-1);
		} else {
			Processes.manualTabAddition = true;
			await createTab({ active: false }, newWorkspace);
			Processes.manualTabAddition = false;
		}

		this.#workspaces.set(newWorkspace.UUID, newWorkspace);

		Processes.WorkspaceCreation.finish();
		this.#persist();
		return newWorkspace;
	}

	async removeWorkspace(
		UUID: Ext.Workspace["UUID"]
	): Promise<Ext.Workspace | undefined> {
		Processes.manualTabRemoval = true;
		const workspace = this.#workspaces.get(UUID)!;
		// let previousWorkspace = undefined;

		// if (this.#workspaces.size <= 1) return previousWorkspace;

		await API.removeTabs(workspace.tabIds);

		const newActiveTab = (
			await API.queryTabs({
				windowId: this.#windowId,
				active: true,
			})
		)?.tabs?.at(0);

		const newActiveTabsWorkspaceUUID = await API.getTabValue(
			newActiveTab?.id!,
			"workspaceUUID"
		);
		const newActiveTabsWorkspace = this.#workspaces.get(
			newActiveTabsWorkspaceUUID
		);

		console.info({ newActiveTabsWorkspace, workspace });

		// if (newActiveTabsWorkspace?.UUID !== workspace.UUID) {
		await this.switchWorkspace(newActiveTabsWorkspace!);
		// }

		this.#workspaces.delete(UUID);

		this.#persist();
		return newActiveTabsWorkspace;
	}

	async switchWorkspace(workspace: Workspace) {
		console.info("switchWorkspace() in window " + this.#windowId);
		const ongoingTabDetachment = Processes.TabDetachment.state === "pending";
		this.switchingWorkspace = true;
		const previousActiveWorkspace = this.#activeWorkspace;
		const previousActiveWorkspaceUUID = previousActiveWorkspace.UUID;

		const currentTabIds = previousActiveWorkspace.tabIds;
		const nextTabIds = workspace.tabIds;

		console.info(this.#activeWorkspace.UUID);
		console.info(this.#activeWorkspace);
		this.#activeWorkspace.active = false;
		this.#activeWorkspace = workspace;
		workspace.active = true;

		await API.showTabs(nextTabIds);
		if (!Processes.keepPinnedTabs) {
			await pinTabs(workspace.pinnedTabIds);
		}

		if (Processes.searchWasUsed) {
			workspace.activeTabId = (
				await API.queryTabs({
					windowId: this.windowId,
					active: true,
				})
			).tabs?.at(0)?.id!;
		} else {
			console.info("search was not used and workspace is ->", {
				workspace,
				activeTabId: JSON.stringify(workspace.activeTabId),
				nextTabIds: JSON.stringify(nextTabIds),
			});
			const activeTabId = workspace?.activeTabId || nextTabIds[0];
			await API.updateTab(activeTabId, { active: true });
		}

		if (
			!ongoingTabDetachment &&
			currentTabIds.length &&
			previousActiveWorkspaceUUID !== workspace.UUID
		) {
			console.info("moini moinsen");
			if (!Processes.keepPinnedTabs) {
				await unpinTabs(previousActiveWorkspace.pinnedTabIds);
			}
			await API.hideTabs(currentTabIds);
		}

		this.switchingWorkspace = false;
		this.#persist();
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

		this.#persist();
	}

	async reorderWorkspaces(orderedIds: Ext.Workspace["UUID"][]) {
		const _workspaces = Array.from(this.#workspaces.values());
		_workspaces.sort(
			(a, b) => orderedIds.indexOf(a.UUID) - orderedIds.indexOf(b.UUID)
		);
		this.#workspaces = new Map(
			_workspaces.map((workspace) => [workspace.UUID, workspace])
		);

		this.#persist();
	}

	#persist = promisedDebounceFunc<void>(this.#_persist, 500);

	#_persist() {
		console.info("_persist");
		try {
			return Browser.storage.local.set({
				[this.#storageKey]: {
					id: this.#UUID,
					workspaces: Array.from(this.#workspaces.values()),
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
