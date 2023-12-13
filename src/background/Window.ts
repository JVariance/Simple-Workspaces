import { debounceFunc, promisedDebounceFunc } from "@root/utils";
import Browser from "webextension-polyfill";

// TODO: Svelte 5: define workspaces as state and persist on changes

export class Window {
	#activeWorkspace!: Ext.Workspace;
	#addingWorkspace = false;
	#removingWorkspace = false;
	#movingTabs = false;
	#storageKey!: string;
	#switchingWorkspace = false;
	#id: Ext.Window["id"];
	#workspaces: Ext.Workspace[] = [];
	// #self!: Ext.Window;

	constructor(id: number) {
		// this.#self = { id, workspaces: [] };
		this.#id = id;
		this.#storageKey = `tw-window_${this.#id}`;
	}

	init({ lookInStorage = true } = {}) {
		return new Promise(async (resolve) => {
			// Browser.storage.local.remove(this.#storageKey);
			// @ts-ignore
			const { [this.#storageKey]: localWindow } = lookInStorage
				? ((await Browser.storage.local.get(this.#storageKey)) as Ext.Window)
				: {};

			if (localWindow) {
				// {id ,this.#workspaces} = localWindow;
				this.#id = localWindow.id;
				this.#workspaces = localWindow.workspaces;
			} else {
				const currentTabIds = (
					await Browser.tabs.query({
						windowId: this.#id,
					})
				).map((tab) => tab.id!);

				const { tw_defaultWorkspaces: defaultWorkspaces } =
					(await Browser.storage.local.get("tw_defaultWorkspaces")) as {
						tw_defaultWorkspaces: Ext.Workspace[];
					};

				let activeWorkspace: Ext.Workspace;

				if (defaultWorkspaces) {
					for (let [i, defaultWorkspace] of defaultWorkspaces.entries()) {
						const newWorkspace = await this.#getNewWorkspace();
						this.workspaces.push({
							...newWorkspace,
							...defaultWorkspace,
							active: i === 0,
						});
					}

					activeWorkspace = this.workspaces.at(0)!;
				} else {
					const newWorkspace = await this.#getNewWorkspace();
					newWorkspace.tabIds = currentTabIds || [];
					newWorkspace.activeTabId = currentTabIds?.at(0);
					this.workspaces.push(newWorkspace);
					activeWorkspace = newWorkspace;
				}

				if (!currentTabIds.length) {
					const newTab = await Browser.tabs.create({
						active: true,
						windowId: this.#id,
					});
					await Browser.tabs.remove(currentTabIds[0]);

					activeWorkspace.tabIds.push(newTab.id!);
					activeWorkspace.activeTabId = newTab.id!;
				}

				// this.#workspaces = [activeWorkspace];

				// await this.#persist();
			}

			this.#activeWorkspace =
				this.#workspaces.find(({ active }) => active) || this.#workspaces[0];

			await this.#persist();
			return resolve(true);
		});
	}

	get id() {
		return this.#id;
	}

	get activeWorkspace(): Ext.Workspace {
		return this.#activeWorkspace;
	}

	setActiveTab(tabId: number) {
		if (!this.#activeWorkspace || this.#switchingWorkspace) return;

		this.#activeWorkspace.activeTabId = tabId;

		this.#persist();
	}

	addTab(tabId: number) {
		this.addTabs([tabId]);
	}

	async addTabs(tabIds: number[]) {
		if (
			!this.activeWorkspace ||
			this.#addingWorkspace ||
			this.#switchingWorkspace ||
			this.#movingTabs
		)
			return;

		this.activeWorkspace.activeTabId = tabIds.at(-1);
		this.activeWorkspace.tabIds.push(...tabIds);

		this.#persist();
	}

	async removeTab(tabId: number) {
		this.removeTabs([tabId]);
	}

	async removeTabs(tabIds: number[]) {
		if (!this.activeWorkspace || this.#removingWorkspace) return;

		this.activeWorkspace.tabIds = this.activeWorkspace.tabIds.filter(
			(id) => !tabIds.includes(id)
		);

		// console.log({ activeWorkspace: structuredClone(this.activeWorkspace), workspaces: structuredClone(this.workspaces),});

		if (this.activeWorkspace.tabIds.length) {
			this.#activeWorkspace.activeTabId = this.activeWorkspace.tabIds.at(-1);
			// this.#activeWorkspace.activeTabId = (
			// 	await Browser.tabs.query({
			// 		windowId: this.id,
			// 		active: true,
			// 	})
			// ).at(0)!.id!;
		} else {
			this.#activeWorkspace.activeTabId = undefined;
			await this.switchToPreviousWorkspace();
		}

		this.#persist();
	}

	moveTabs({
		targetWorkspaceId,
		tabIds,
	}: {
		targetWorkspaceId: string;
		tabIds: number[];
	}) {
		return new Promise(async (resolve) => {
			this.#movingTabs = true;

			const targetWorkspace = this.#workspaces.find(
				(workspace) => workspace.id === targetWorkspaceId
			)!;

			// const workspaceIndex = this.#workspaces.findIndex(
			// 	({ id }) => id === this.activeWorkspace.id
			// );

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
					windowId: this.id,
					active: false,
				});
				this.activeWorkspace.tabIds.push(newTab.id!);
				this.activeWorkspace.activeTabId = newTab.id!;

				await this.switchWorkspace(targetWorkspace);
			} else {
				await Browser.tabs.hide(tabIds);
			}

			this.#persist();

			this.#movingTabs = false;
			return resolve(true);
		});
	}

	remove(): Promise<boolean> {
		return new Promise(async (resolve) => {
			await this.#removeFromStorage();
			this.#persist();
			return resolve(true);
		});
	}

	#getNewWorkspace(): Promise<Ext.Workspace> {
		return new Promise(async (resolve) => {
			return resolve({
				id: crypto.randomUUID(),
				icon: "🐠",
				name: `Workspace`,
				tabIds: [],
				active: true,
				windowId: this.#id,
				activeTabId: undefined,
			});
		});
	}

	get workspaces(): Ext.Workspace[] {
		return this.#workspaces;
	}

	addWorkspaceAndSwitch(): Promise<Ext.Workspace> {
		return new Promise(async (resolve) => {
			const newWorkspace = await this.addWorkspace();
			await this.switchWorkspace(newWorkspace);
			return resolve(newWorkspace);
		});
	}

	addWorkspace(
		tabIds: number[] | undefined = undefined
	): Promise<Ext.Workspace> {
		return new Promise(async (resolve) => {
			this.#addingWorkspace = true;
			const newWorkspace = await this.#getNewWorkspace();

			if (tabIds) {
				newWorkspace.tabIds = tabIds;
			} else {
				const tabId: number = (await Browser.tabs.create({ active: false }))
					.id!;
				newWorkspace.tabIds = [tabId!];
			}

			this.#workspaces = [...this.#workspaces, newWorkspace];
			this.#persist();

			this.#addingWorkspace = false;
			return resolve(newWorkspace);
		});
	}

	removeWorkspace(id: Ext.Workspace["id"]): Promise<boolean> {
		return new Promise(async (resolve) => {
			this.#removingWorkspace = true;
			const workspace = this.#workspaces.find(
				(workspace) => workspace.id === id
			)!;

			if (this.#workspaces.length <= 1) return;

			if (workspace.active) {
				await this.switchToPreviousWorkspace();
			}

			await Browser.tabs.remove(workspace.tabIds);

			this.#workspaces = this.#workspaces.filter(
				(workspace) => workspace.id !== id
			);

			this.#persist();
			this.#removingWorkspace = false;
			resolve(true);
		});
	}

	switchWorkspace(workspace: Ext.Workspace): Promise<boolean> {
		return new Promise(async (resolve) => {
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
			return resolve(true);
		});
	}

	switchToNextWorkspace(): Promise<Ext.Workspace> {
		return new Promise(async (resolve) => {
			const index =
				this.workspaces.findIndex(({ id }) => id === this.#activeWorkspace.id) +
				1;

			if (index > this.#workspaces.length - 1) return;

			const nextWorkspace = this.#workspaces.at(index)!;

			await this.switchWorkspace(nextWorkspace);
			resolve(nextWorkspace);
		});
	}

	switchToPreviousWorkspace(): Promise<Ext.Workspace> {
		return new Promise(async (resolve) => {
			const index =
				this.workspaces.findIndex(({ id }) => id === this.#activeWorkspace.id) -
				1;
			if (index < 0) return;

			const previousWorkspace = this.#workspaces.at(index)!;
			await this.switchWorkspace(previousWorkspace);
			resolve(previousWorkspace);
		});
	}

	editWorkspace({
		workspaceId,
		name,
		icon,
	}: {
		workspaceId: Ext.Workspace["id"];
		name: string;
		icon: string;
	}): Promise<boolean> {
		return new Promise(async (resolve) => {
			const workspace = this.#workspaces.find(({ id }) => id === workspaceId)!;
			workspace.name = name;
			workspace.icon = icon;

			await this.#persist();
			resolve(true);
		});
	}

	updateWorkspaces(newWorkspaces: Ext.Workspace[]) {
		this.#workspaces = newWorkspaces;
		this.#persist();
	}

	reorderWorkspaces(orderedIds: Ext.Workspace["id"][]) {
		this.workspaces.sort(
			(a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
		);

		this.#persist();
	}

	#persist = promisedDebounceFunc<void>(this.#_persist, 500);

	#_persist() {
		// console.info("persist window", { storageKey: this.#storageKey, workspaces: this.#workspaces, });
		return Browser.storage.local.set({
			[this.#storageKey]: { id: this.#id, workspaces: this.#workspaces },
		});
	}

	#removeFromStorage() {
		return new Promise(async (resolve) => {
			await Browser.storage.local.remove(this.#storageKey);
			return resolve(true);
		});
	}
}
