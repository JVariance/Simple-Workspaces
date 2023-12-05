import Browser from "webextension-polyfill";

enum StorageKeys {
	workspaces = "tw_workspaces",
	activeWorkspace = "tw_activeWorkspace",
}

export class WorkspaceStorage {
	#workspaces: Workspace[] = [];
	#focusedWindowId!: number;
	#addingWorkspace = false;
	#switchingWorkspace = false;
	#removingWorkspace = false;
	#movingTabs = false;

	constructor() {}

	init() {
		console.info("init WorkspaceStorage");
		// this.clearDB();
		return new Promise(async (resolve) => {
			let { [StorageKeys.workspaces]: localWorkspaces } =
				(await Browser.storage.local.get(StorageKeys.workspaces)) as {
					[StorageKeys.workspaces]: Workspace[];
				};

			const currentWindows = await Browser.windows.getAll();
			const focusedWindow = (currentWindows.find(({ focused }) => focused) ||
				currentWindows.at(0))!;
			console.log({ focusedWindow, id: focusedWindow.id });
			// console.log({ currentWindows, focusedWindow });
			this.#focusedWindowId = focusedWindow.id!;

			if (!localWorkspaces) {
				for (let window of currentWindows) {
					const currentTabIds = (
						await Browser.tabs.query({
							windowId: window.id,
						})
					).map((tab) => tab.id!);

					const newWorkspace = await this.#getNewWorkspace();

					localWorkspaces = [
						{
							...newWorkspace,
							windowId: window.id!,
							tabIds: currentTabIds || [],
						},
					];
				}
			}

			this.#workspaces = localWorkspaces;

			const someWorkspaceInFocusedWindowExists = this.#workspaces.find(
				({ windowId }) => windowId === this.#focusedWindowId
			);

			if (!someWorkspaceInFocusedWindowExists) {
				const newWorkspace = await this.#getNewWorkspace();
				const tabIds = (
					await Browser.tabs.query({ windowId: this.#focusedWindowId })
				).flatMap(({ id }) => id!);
				this.#workspaces.push({
					...newWorkspace,
					activeTabId: tabIds?.at(0),
					tabIds,
				});
			}

			await Browser.tabs.hide(
				this.#workspaces
					.filter(({ active }) => !active)
					.flatMap(({ tabIds }) => tabIds)
			);

			for (let workspace of this.#workspaces.filter(({ active }) => active)) {
				await Browser.tabs.update(
					workspace.activeTabId || workspace.tabIds[0],
					{ active: true }
				);
			}

			resolve(true);
		});
	}

	get workspaces(): Workspace[] {
		return this.#workspaces;
	}

	set focusedWindowId(id: number) {
		this.#focusedWindowId = id;
	}

	#getActiveWorkspace({ windowId }: { windowId: number }): {
		activeWorkspace: Workspace;
		activeWorkspaceIndex: number;
		windowRelativeWorkspaceIndex: number;
	} {
		let activeWorkspaceIndex!: number;
		const activeWorkspace = this.#workspaces.find((workspace, i) => {
			if (workspace.active && workspace.windowId === windowId) {
				activeWorkspaceIndex = i;
				return workspace;
			}
		})!;

		const windowRelativeWorkspaceIndex = this.#workspaces
			.filter((workspace) => workspace.windowId === windowId)
			.findIndex((_workspace) => _workspace.id === activeWorkspace.id);
		// .length - activeWorkspaceIndex;

		return {
			activeWorkspace,
			windowRelativeWorkspaceIndex,
			activeWorkspaceIndex,
		};
	}

	setActiveTab(tabId: number, windowId: number) {
		console.info("setActiveTab()");
		const { activeWorkspace } = this.#getActiveWorkspace({ windowId });

		if (!activeWorkspace) return;

		activeWorkspace.activeTabId = tabId;
	}

	moveTabs({
		targetWorkspaceId,
		tabIds,
		windowId,
	}: {
		targetWorkspaceId: string;
		tabIds: number[];
		windowId: number;
	}) {
		return new Promise(async (resolve) => {
			this.#movingTabs = true;
			const { activeWorkspace, windowRelativeWorkspaceIndex } =
				this.#getActiveWorkspace({
					windowId,
				});

			const targetWorkspace = this.#workspaces.find(
				(workspace) => workspace.id === targetWorkspaceId
			)!;

			targetWorkspace.tabIds.push(...tabIds);

			activeWorkspace.tabIds = activeWorkspace.tabIds.filter(
				(tabId) => !tabIds.includes(tabId)
			);

			const activeTabId = activeWorkspace.activeTabId;

			if (tabIds.includes(activeTabId!)) {
				const newActiveTabId = [...activeWorkspace.tabIds]
					.reverse()
					.find((tabId) => !tabIds.includes(tabId));

				if (newActiveTabId) {
					await Browser.tabs.update(newActiveTabId, { active: true });
				}
			}

			console.log({
				activeWorkspace,
				windowRelativeWorkspaceIndex,
			});

			if (!activeWorkspace.tabIds.length) {
				if (windowRelativeWorkspaceIndex <= 0) {
					// const newTab = await Browser.tabs.create({ active: true });
					// activeWorkspace.tabIds.push(newTab.id!);
					// await Browser.tabs.hide(tabIds);
					console.log({ activeWorkspace });
					await this.switchToNextWorkspace({ windowId });
				} else {
					// await this.switchToPreviousWorkspace({ windowId });
					await this.switchWorkspace(targetWorkspace);
				}
			} else {
				await Browser.tabs.hide(tabIds);
			}

			this.#persistWorkspace();

			this.#movingTabs = true;
			return resolve(true);
		});
	}

	#getNewWorkspace(): Promise<Workspace> {
		return new Promise(async (resolve) => {
			return resolve({
				id: crypto.randomUUID(),
				icon: "🐠",
				name: `Workspace ${this.#workspaces.length + 1}`,
				tabIds: [],
				active: true,
				windowId: this.#focusedWindowId,
				activeTabId: undefined,
			});
		});
	}

	#persistWorkspace() {
		return Browser.storage.local.set({
			[StorageKeys.workspaces]: this.#workspaces,
		});
	}

	clearDB() {
		Browser.storage.local.remove([
			StorageKeys.workspaces,
			StorageKeys.activeWorkspace,
		]);
		// Browser.storage.local.set({[StorageKeys.workspaces]: []});
		// Browser.storage.local.set({[StorageKeys.activeWorkspace]: });
	}

	getWorkspaces({ windowId }: { windowId: number }): Promise<Workspace[]> {
		return new Promise(async (resolve) => {
			console.info("getWorkspaces()");
			let workspaces = this.#workspaces.filter(
				({ windowId: _windowId }) => _windowId === windowId
			);

			return resolve(workspaces);
		});
	}

	editWorkspace({
		workspace,
		name,
		icon,
	}: {
		workspace: Workspace;
		name: string;
		icon: string;
	}): Promise<boolean> {
		return new Promise(async (resolve) => {
			let _workspace = this.#workspaces.find(
				(worksp) => worksp.id === workspace.id
			)!;

			_workspace.name = name;
			_workspace.icon = icon;

			await this.#persistWorkspace();

			resolve(true);
		});
	}

	removeWorkspace(id: string): Promise<boolean> {
		return new Promise(async (resolve) => {
			this.#removingWorkspace = true;
			const workspace = this.#workspaces.find(
				(workspace) => workspace.id === id
			)!;

			const workspacesInWindow = this.#workspaces.filter(
				(_workspace) => _workspace.windowId === workspace.windowId
			);

			if (workspacesInWindow.length <= 1) return;

			if (workspace.active) {
				await this.switchToPreviousWorkspace({ windowId: workspace.windowId });
			}

			await Browser.tabs.remove(workspace.tabIds);

			this.#workspaces = this.#workspaces.filter(
				(workspace) => workspace.id !== id
			);

			this.#persistWorkspace();
			this.#removingWorkspace = false;
			resolve(true);
		});
	}

	removeWorkspaces({ windowId }: { windowId: number }) {
		return new Promise(async (resolve) => {
			this.#workspaces = this.#workspaces.filter(
				(workspace) => workspace.windowId !== windowId
			);

			resolve(this.#workspaces);
		});
	}

	addTab(tabId: number, windowId: number) {
		if (this.#addingWorkspace || this.#switchingWorkspace || this.#movingTabs)
			return;
		console.info("addTab()", { tabId, windowId });

		let { activeWorkspace, activeWorkspaceIndex } = this.#getActiveWorkspace({
			windowId,
		});

		console.log({ activeWorkspace });

		if (!activeWorkspace) return;

		activeWorkspace.tabIds.push(tabId);

		this.#workspaces[activeWorkspaceIndex] = activeWorkspace;
		this.#persistWorkspace();
	}

	async removeTab(tabId: number, windowId: number) {
		// const { activeWorkspace } = this.#getActiveWorkspace({ windowId });
		// await Promise.all([
		// (() => {
		// return new Promise(async (resolve) => {
		console.info("removeTab()");
		if (this.#removingWorkspace) return;
		const { activeWorkspace } = this.#getActiveWorkspace({ windowId });

		if (!activeWorkspace) return;

		activeWorkspace.tabIds = activeWorkspace.tabIds.filter(
			(id) => id !== tabId
		);

		if (!activeWorkspace.tabIds.length) {
			await this.switchToPreviousWorkspace({ windowId });
		}

		// return resolve(true);
		// });
		// })(),
		// ]);

		// const newTab = await Browser.tabs.create({ active: true });
		// activeWorkspace.tabIds.push(newTab.id!);
		// this.switchToNextWorkspace({ windowId: activeWorkspace.windowId });

		this.#persistWorkspace();
	}

	addWindow(windowId: number) {
		console.info("<addWindow>");
		return new Promise(async (resolve) => {
			this.#focusedWindowId = windowId;
			const newWorkspace = await this.#getNewWorkspace();

			const tabsInWindow = await Browser.tabs.query({ windowId });
			const newTab = await Browser.tabs.create({ active: true, windowId });
			await Browser.tabs.remove(tabsInWindow[0].id!);

			newWorkspace.tabIds.push(newTab.id!);
			newWorkspace.activeTabId = newTab.id!;

			this.#workspaces = [...this.#workspaces, newWorkspace];
			this.#persistWorkspace();
			console.info("</addWindow>");
			resolve(true);
		});
	}

	switchWorkspace(workspace: Workspace) {
		return new Promise(async (resolve) => {
			this.#switchingWorkspace = true;

			const { activeWorkspace } = this.#getActiveWorkspace({
				windowId: workspace.windowId,
			});

			const currentTabIds = activeWorkspace.tabIds;
			const nextTabIds = workspace.tabIds;

			if (!nextTabIds.length) {
				const newTab = await Browser.tabs.create({
					active: false,
					windowId: workspace.windowId,
				});

				workspace.tabIds.push(newTab.id!);
				workspace.activeTabId = newTab.id!;
				await this.#persistWorkspace();
			}

			activeWorkspace.active = false;
			workspace.active = true;

			const activeTabId = workspace?.activeTabId || nextTabIds[0];

			await Browser.tabs.show(nextTabIds);
			await Browser.tabs.update(activeTabId, { active: true });
			await Browser.tabs.hide(currentTabIds);

			this.#switchingWorkspace = false;
			return resolve(true);
		});
	}

	switchToNextWorkspace({ windowId }: { windowId: number }) {
		return new Promise(async (resolve) => {
			const index =
				this.#getActiveWorkspace({ windowId }).activeWorkspaceIndex + 1;
			if (index > this.#workspaces.length - 1) return;

			const nextWorkspace = this.#workspaces.at(index)!;

			console.log({ nextWorkspace });

			await this.switchWorkspace(nextWorkspace);
			resolve(true);
		});
	}

	switchToPreviousWorkspace({ windowId }: { windowId: number }) {
		return new Promise(async (resolve) => {
			const index =
				this.#getActiveWorkspace({ windowId }).activeWorkspaceIndex - 1;
			if (index < 0) return;

			const previousWorkspace = this.#workspaces.at(index)!;
			await this.switchWorkspace(previousWorkspace);
			resolve(true);
		});
	}

	addWorkspace(): Promise<Workspace> {
		console.info("addWorkspace()");
		return new Promise(async (resolve) => {
			this.#addingWorkspace = true;
			const newWorkspace = await this.#getNewWorkspace();

			const tabId: number = (await Browser.tabs.create({ active: false })).id!;
			newWorkspace.tabIds = [tabId!];

			await this.switchWorkspace(newWorkspace);

			this.#workspaces = [...this.#workspaces, newWorkspace];
			this.#persistWorkspace();

			this.#addingWorkspace = false;
			return resolve(newWorkspace);
		});
	}
}
