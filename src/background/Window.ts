import { debounceFunc, promisedDebounceFunc } from "@root/utils";
import Browser from "webextension-polyfill";

type EnhancedTab = Browser.Tabs.Tab & { workspaceUUID?: string };

// TODO: Svelte 5: define workspaces as state and persist on changes

export class Window {
	#activeWorkspace!: Ext.Workspace;
	#initializing = false;
	#addingWorkspace = false;
	#removingWorkspace = false;
	#movingTabs = false;
	#storageKey!: string;
	#switchingWorkspace = false;
	#UUID: string;
	#windowId!: number;
	#workspaces: Ext.Workspace[] = [];
	// #self!: Ext.Window;

	constructor(
		UUID: string | undefined = undefined,
		windowId: Browser.Windows.Window["id"] = undefined
	) {
		// this.#self = { id, workspaces: [] };
		// this.#windowId = windowId;
		console.info("construct new window -> " + UUID);
		this.#UUID = UUID || crypto.randomUUID();
		if (windowId) this.#windowId = windowId;
		this.#storageKey = `window_${this.#UUID}`;
	}

	async init({ lookInStorage = true } = {}) {
		console.info("start initializing window");
		this.#initializing = true;
		// Browser.storage.local.remove(this.#storageKey);
		// @ts-ignore
		const { [this.#storageKey]: localWindow }: Record<string, Ext.Window> =
			await Browser.storage.local.get(this.#storageKey);

		const tabs = (await Browser.tabs.query({
			windowId: this.#windowId,
		})) as EnhancedTab[];

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
				const workspaceSessionUUID: string = await Browser.sessions.getTabValue(
					tab.id!,
					"workspaceUUID"
				);
				tab.workspaceUUID = workspaceSessionUUID || "HOME";
				if (!workspaceSessionUUID)
					await Browser.sessions.setTabValue(tab.id!, "workspaceUUID", "HOME");

				sortedTabsInWorkspaces.has(workspaceSessionUUID)
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

			// hide tabs?
		} else {
			this.#addingWorkspace = true;
			let tabIds = tabs.map((tab) => tab.id!);

			const { defaultWorkspaces: _defaultWorkspaces } =
				(await Browser.storage.local.get("defaultWorkspaces")) as {
					defaultWorkspaces: Ext.Workspace[] & { id: string };
				};

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
			this.#workspaces.push(homeWorkspace);

			const blankTab = (
				await Browser.tabs.query({
					windowId: this.windowId,
					index: 0,
				})
			)[0];

			if (blankTab.url === "about:blank") {
				const newTab = await Browser.tabs.create({
					active: true,
					windowId: this.#windowId,
				});

				await Browser.tabs.remove(blankTab.id!);
				tabIds = tabIds.filter((id) => id !== blankTab.id!);
				homeWorkspace.tabIds = homeWorkspace.tabIds.filter(
					(id) => id !== blankTab.id!
				);

				homeWorkspace.tabIds.push(newTab.id!);
				homeWorkspace.activeTabId = newTab.id!;
				await Browser.sessions.setTabValue(
					newTab.id!,
					"workspaceUUID",
					homeWorkspace.UUID
				);
			}

			for (let _defaultWorkspace of _defaultWorkspaces || []) {
				const { id, ...defaultWorkspace } = _defaultWorkspace;

				const newTab = await Browser.tabs.create({
					active: false,
					windowId: this.#windowId,
				});
				await Browser.tabs.hide(newTab.id!);

				const newWorkspaceData = this.#getNewWorkspace();

				this.#workspaces.push({
					...newWorkspaceData,
					...defaultWorkspace,
					active: false,
					activeTabId: newTab.id!,
					tabIds: [newTab.id!],
				});

				await Browser.sessions.setTabValue(
					newTab.id!,
					"workspaceUUID",
					newWorkspaceData.UUID
				);
			}

			console.info("nach defaultworkspaces loop");

			for (let tabId of tabIds) {
				try {
					await Browser.sessions.setTabValue(
						tabId!,
						"workspaceUUID",
						homeWorkspace.UUID
					);
				} catch (err) {
					// if (err instanceof Error) {
					// 	const errTabId = err.message.match("[0-9]+$")?.at(0);
					// 	const tabId = errTabId ? +errTabId : undefined;
					// }
					console.error({ err });
				}
			}

			this.#addingWorkspace = false;
		}

		this.#activeWorkspace =
			this.#workspaces.find(({ active }) => active) || this.#workspaces[0];

		console.info("before persist");
		await this.#persist();
		console.info("after persist");

		this.#initializing = false;
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
		if (!this.#activeWorkspace || this.#switchingWorkspace) return;

		this.#activeWorkspace.activeTabId = tabId;

		this.#persist();
	}

	async restoredTab(tabId: number, workspaceUUID: string) {
		console.info("restoredTab", { tabId, workspaceUUID });

		const workspace = this.#workspaces.find(
			({ UUID }) => UUID === workspaceUUID
		);

		if (workspace) {
			workspace.tabIds.push(tabId);

			if (workspace !== this.#activeWorkspace) {
				await Browser.tabs.update(this.#activeWorkspace.tabIds.at(-1), {
					active: true,
				});
				await Browser.tabs.hide(tabId);
			}
		}

		this.#persist();
	}

	async addTab(tabId: number) {
		console.info("addTab");
		await this.addTabs([tabId]);
	}

	async addTabs(tabIds: number[]) {
		if (
			!this.activeWorkspace ||
			this.#addingWorkspace ||
			this.#switchingWorkspace ||
			this.#initializing ||
			this.#movingTabs ||
			tabIds.some((tabId) => this.activeWorkspace.tabIds.includes(tabId))
		)
			return;

		console.info("addTabs - activeWorkspace v");
		console.info(structuredClone(this.activeWorkspace));

		this.activeWorkspace.activeTabId = tabIds.at(-1);
		this.activeWorkspace.tabIds.push(...tabIds);

		for (let tabId of tabIds) {
			await Browser.sessions.setTabValue(
				tabId,
				"workspaceUUID",
				this.activeWorkspace.UUID
			);
		}

		this.#persist();
	}

	async removeTab(tabId: number) {
		this.removeTabs([tabId]);
	}

	async removeTabs(tabIds: number[]) {
		if (!this.activeWorkspace || this.#removingWorkspace || this.#initializing)
			return;

		console.info("removeTabs");

		this.activeWorkspace.tabIds = this.activeWorkspace.tabIds.filter(
			(id) => !tabIds.includes(id)
		);

		// console.log({ activeWorkspace: structuredClone(this.activeWorkspace), workspaces: structuredClone(this.workspaces),});

		// if (this.activeWorkspace.tabIds.length) {
		// 	this.#activeWorkspace.activeTabId = this.activeWorkspace.tabIds.at(-1);
		// 	// this.#activeWorkspace.activeTabId = (
		// 	// 	await Browser.tabs.query({
		// 	// 		windowId: this.id,
		// 	// 		active: true,
		// 	// 	})
		// 	// ).at(0)!.id!;
		// } else {
		// 	this.#activeWorkspace.activeTabId = undefined;
		// 	await this.switchToPreviousWorkspace();
		// }

		this.#persist();
	}

	async moveTabs({
		targetWorkspaceUUID,
		tabIds,
	}: {
		targetWorkspaceUUID: string;
		tabIds: number[];
	}) {
		this.#movingTabs = true;

		const targetWorkspace = this.#workspaces.find(
			(workspace) => workspace.UUID === targetWorkspaceUUID
		)!;

		// const workspaceIndex = this.#workspaces.findIndex(
		// 	({ id }) => id === this.activeWorkspace.id
		// );

		if (!targetWorkspace.tabIds.length && tabIds.length)
			targetWorkspace.activeTabId = tabIds.at(-1);
		targetWorkspace.tabIds.push(...tabIds);

		this.activeWorkspace.tabIds = this.activeWorkspace.tabIds.filter(
			(tabId) => !tabIds.includes(tabId)
		);

		const activeTabId = this.activeWorkspace.activeTabId;

		if (tabIds.includes(activeTabId!)) {
			const newActiveTabId = [...this.activeWorkspace.tabIds]
				.reverse()
				.find((tabId) => !tabIds.includes(tabId));

			if (newActiveTabId) {
				await Browser.tabs.update(newActiveTabId, { active: true });
			}
		}

		if (!this.activeWorkspace.tabIds.length) {
			const newTab = await Browser.tabs.create({
				windowId: this.#windowId,
				active: false,
			});
			this.activeWorkspace.tabIds.push(newTab.id!);
			this.activeWorkspace.activeTabId = newTab.id!;

			await this.switchWorkspace(targetWorkspace);
		} else {
			await Browser.tabs.hide(tabIds);
		}

		for (let tabId of tabIds) {
			await Browser.sessions.setTabValue(
				tabId,
				"workspaceUUID",
				targetWorkspace.UUID
			);
		}

		this.#persist();
		this.#movingTabs = false;
	}

	async remove() {
		await this.#removeFromStorage();
		this.#persist();
	}

	#getNewWorkspace(): Ext.Workspace {
		return {
			UUID: crypto.randomUUID(),
			icon: "🐠",
			name: `Workspace`,
			tabIds: [],
			active: true,
			// windowId: this.#UUID,
			windowId: this.#windowId,
			activeTabId: undefined,
		};
	}

	get workspaces(): Ext.Workspace[] {
		return this.#workspaces;
	}

	async addWorkspaceAndSwitch() {
		const newWorkspace = await this.addWorkspace();
		await this.switchWorkspace(newWorkspace);
		return newWorkspace;
	}

	async addWorkspace(tabIds: number[] | undefined = undefined) {
		this.#addingWorkspace = true;
		const newWorkspace = this.#getNewWorkspace();

		if (tabIds) {
			newWorkspace.tabIds = tabIds;
			newWorkspace.activeTabId = tabIds.at(-1);
		} else {
			const tabId: number = (await Browser.tabs.create({ active: false })).id!;
			newWorkspace.tabIds = [tabId!];
			newWorkspace.activeTabId = tabId;

			await Browser.sessions.setTabValue(
				tabId,
				"workspaceUUID",
				newWorkspace.UUID
			);
		}

		this.#workspaces = [...this.#workspaces, newWorkspace];
		this.#persist();

		this.#addingWorkspace = false;
		return newWorkspace;
	}

	async removeWorkspace(UUID: Ext.Workspace["UUID"]) {
		this.#removingWorkspace = true;
		const workspace = this.#workspaces.find(
			(workspace) => workspace.UUID === UUID
		)!;

		if (this.#workspaces.length <= 1) return;

		if (workspace.active) {
			await this.switchToPreviousWorkspace();
		}

		await Browser.tabs.remove(workspace.tabIds);

		this.#workspaces = this.#workspaces.filter(
			(workspace) => workspace.UUID !== UUID
		);

		this.#persist();
		this.#removingWorkspace = false;
	}

	async switchWorkspace(workspace: Ext.Workspace) {
		console.info("switchWorkspace()");
		this.#switchingWorkspace = true;

		const currentTabIds = this.#activeWorkspace.tabIds;
		const nextTabIds = workspace.tabIds;

		this.#activeWorkspace.active = false;
		workspace.active = true;

		const activeTabId = workspace?.activeTabId || nextTabIds[0];

		await Browser.tabs.show(nextTabIds);
		await Browser.tabs.update(activeTabId, { active: true });
		if (currentTabIds.length) await Browser.tabs.hide(currentTabIds);

		this.#activeWorkspace = workspace;
		this.#switchingWorkspace = false;
	}

	async switchToNextWorkspace() {
		const index =
			this.workspaces.findIndex(
				({ UUID }) => UUID === this.#activeWorkspace.UUID
			) + 1;

		if (index > this.#workspaces.length - 1) return;

		const nextWorkspace = this.#workspaces.at(index)!;

		await this.switchWorkspace(nextWorkspace);
		return nextWorkspace;
	}

	async switchToPreviousWorkspace() {
		const index =
			this.workspaces.findIndex(
				({ UUID }) => UUID === this.#activeWorkspace.UUID
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

		await this.#persist();
	}

	updateWorkspaces(newWorkspaces: Ext.Workspace[]) {
		this.#workspaces = newWorkspaces;
		this.#persist();
	}

	reorderWorkspaces(orderedIds: Ext.Workspace["UUID"][]) {
		this.workspaces.sort(
			(a, b) => orderedIds.indexOf(a.UUID) - orderedIds.indexOf(b.UUID)
		);

		this.#persist();
	}

	#persist = promisedDebounceFunc<void>(this.#_persist, 500);

	#_persist() {
		// console.info("persist window", { storageKey: this.#storageKey, workspaces: this.#workspaces, });
		return Browser.storage.local.set({
			[this.#storageKey]: { id: this.#UUID, workspaces: this.#workspaces },
		});
	}

	async #removeFromStorage() {
		await Browser.storage.local.remove(this.#storageKey);
	}
}
