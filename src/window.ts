import Browser from "webextension-polyfill";

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
			console.log({ storageKey: this.#storageKey });
			// Browser.storage.local.remove(this.#storageKey);
			const { [this.#storageKey]: localWindow } = lookInStorage
				? ((await Browser.storage.local.get(this.#storageKey)) as Ext.Window)
				: {};

			console.log({ localWindow });

			if (localWindow) {
				console.info("localWindowFound");
				// {id ,this.#workspaces} = localWindow;
				this.#id = localWindow.id;
				this.#workspaces = localWindow.workspaces;
			} else {
				const currentTabIds = (
					await Browser.tabs.query({
						windowId: this.#id,
					})
				).map((tab) => tab.id!);
				const newWorkspace = await this.#getNewWorkspace();
				newWorkspace.tabIds = currentTabIds || [];
				newWorkspace.activeTabId = currentTabIds?.at(0);

				if (!currentTabIds.length) {
					const newTab = await Browser.tabs.create({
						active: true,
						windowId: this.#id,
					});
					await Browser.tabs.remove(currentTabIds[0]);

					newWorkspace.tabIds.push(newTab.id!);
					newWorkspace.activeTabId = newTab.id!;
				}

				this.#workspaces = [newWorkspace];

				console.log({ workspaces: this.#workspaces, id: this.#id });
				await this.#persist();
			}

			this.#activeWorkspace =
				this.#workspaces.find(({ active }) => active) || this.#workspaces[0];

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
		console.info("setActiveTab()", { tabId });

		if (!this.#activeWorkspace || this.#switchingWorkspace) return;

		this.#activeWorkspace.activeTabId = tabId;
	}

	addTab(tabId: number) {
		if (
			!this.activeWorkspace ||
			this.#addingWorkspace ||
			this.#switchingWorkspace ||
			this.#movingTabs
		)
			return;

		this.activeWorkspace.activeTabId = tabId;
		this.activeWorkspace.tabIds.push(tabId);
	}

	removeTab(tabId: number) {
		(async () => {
			console.info("removeTab", { tabId });
			if (!this.activeWorkspace || this.#removingWorkspace) return;

			this.activeWorkspace.tabIds = this.activeWorkspace.tabIds.filter(
				(id) => id !== tabId
			);

			console.log({
				activeWorkspace: structuredClone(this.activeWorkspace),
				workspaces: structuredClone(this.workspaces),
			});

			if (this.activeWorkspace.tabIds.length) {
				// this.#activeWorkspace.activeTabId = this.activeWorkspace.tabIds.at(-1);
				this.#activeWorkspace.activeTabId = (
					await Browser.tabs.query({
						windowId: this.id,
						active: true,
					})
				).at(0)!.id!;
			} else {
				this.#activeWorkspace.activeTabId = undefined;
				await this.switchToPreviousWorkspace();
			}
		})();
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

			const workspaceIndex = this.#workspaces.findIndex(
				({ id }) => id === this.activeWorkspace.id
			);

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

			console.log({
				activeWorkspace: this.activeWorkspace,
				workspaceIndex,
			});

			if (!this.activeWorkspace.tabIds.length) {
				if (workspaceIndex <= 0) {
					console.log({ activeWorkspace: this.activeWorkspace });
					await this.switchToNextWorkspace();
				} else {
					await this.switchWorkspace(targetWorkspace);
				}
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
			this.#removeFromStorage();
			return resolve(true);
		});
	}

	#getNewWorkspace(): Promise<Ext.Workspace> {
		return new Promise(async (resolve) => {
			return resolve({
				id: crypto.randomUUID(),
				icon: "🐠",
				name: `Workspace ${this.#workspaces.length + 1}`,
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

	addWorkspace(): Promise<Ext.Workspace> {
		console.info("addWorkspace()");
		return new Promise(async (resolve) => {
			this.#addingWorkspace = true;
			const newWorkspace = await this.#getNewWorkspace();

			const tabId: number = (await Browser.tabs.create({ active: false })).id!;
			newWorkspace.tabIds = [tabId!];

			await this.switchWorkspace(newWorkspace);

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

	switchWorkspace(workspace: Ext.Workspace) {
		return new Promise(async (resolve) => {
			this.#switchingWorkspace = true;

			const currentTabIds = this.#activeWorkspace.tabIds;
			const nextTabIds = workspace.tabIds;

			if (!nextTabIds.length) {
				const newTab = await Browser.tabs.create({
					active: false,
					windowId: workspace.windowId,
				});

				workspace.tabIds.push(newTab.id!);
				workspace.activeTabId = newTab.id!;
				await this.#persist();
			}

			this.#activeWorkspace.active = false;
			workspace.active = true;

			const activeTabId = workspace?.activeTabId || nextTabIds[0];

			console.log({ workspace, nextTabIds, currentTabIds, activeTabId });

			await Browser.tabs.show(nextTabIds);
			await Browser.tabs.update(activeTabId, { active: true });
			if (currentTabIds.length) await Browser.tabs.hide(currentTabIds);

			this.#activeWorkspace = workspace;
			this.#switchingWorkspace = false;
			return resolve(true);
		});
	}

	switchToNextWorkspace() {
		return new Promise(async (resolve) => {
			const index =
				this.workspaces.findIndex(({ id }) => id === this.#activeWorkspace.id) +
				1;

			if (index > this.#workspaces.length - 1) return;

			const nextWorkspace = this.#workspaces.at(index)!;

			console.log({ nextWorkspace });

			await this.switchWorkspace(nextWorkspace);
			resolve(true);
		});
	}

	switchToPreviousWorkspace() {
		return new Promise(async (resolve) => {
			const index =
				this.workspaces.findIndex(({ id }) => id === this.#activeWorkspace.id) -
				1;
			if (index < 0) return;

			const previousWorkspace = this.#workspaces.at(index)!;
			await this.switchWorkspace(previousWorkspace);
			resolve(true);
		});
	}

	editWorkspace({
		workspace,
		name,
		icon,
	}: {
		workspace: Ext.Workspace;
		name: string;
		icon: string;
	}): Promise<boolean> {
		return new Promise(async (resolve) => {
			let _workspace = this.#workspaces.find(
				(worksp) => worksp.id === workspace.id
			)!;

			_workspace.name = name;
			_workspace.icon = icon;

			await this.#persist();

			resolve(true);
		});
	}

	#persist() {
		console.info("persist window", {
			storageKey: this.#storageKey,
			workspaces: this.#workspaces,
		});
		return new Promise(async (resolve) => {
			await Browser.storage.local.set({
				[this.#storageKey]: { id: this.#id, workspaces: this.#workspaces },
			});
			return resolve(true);
		});
	}

	#removeFromStorage() {
		return new Promise(async (resolve) => {
			await Browser.storage.local.remove(this.#storageKey);
			return resolve(true);
		});
	}
}
