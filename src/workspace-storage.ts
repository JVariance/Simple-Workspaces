import Browser from "webextension-polyfill";

enum StorageKeys {
	windows = "tw_windows",
	workspaces = "tw_workspaces",
	activeWorkspace = "tw_activeWorkspace",
}

export class WorkspaceStorage {
	#windows: Map<Ext.Window["id"], Ext.Window> = new Map();
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
			let { [StorageKeys.windows]: localWindows } =
				(await Browser.storage.local.get(StorageKeys.windows)) as {
					[StorageKeys.windows]: Ext.Window[];
				};

			const currentWindows = await Browser.windows.getAll();
			const focusedWindow = (currentWindows.find(({ focused }) => focused) ||
				currentWindows.at(0))!;
			console.log({ focusedWindow, id: focusedWindow.id });
			// console.log({ currentWindows, focusedWindow });
			this.#focusedWindowId = focusedWindow.id!;

			if (!localWindows) {
				for (let window of currentWindows) {
					const currentTabIds = (
						await Browser.tabs.query({
							windowId: window.id,
						})
					).map((tab) => tab.id!);

					const newWindow = { id: window.id!, workspaces: [] } as Ext.Window;
					console.log({ newWindow: structuredClone(newWindow) });
					const newWorkspace = await this.#getNewWorkspace(newWindow);
					newWorkspace.tabIds = currentTabIds || [];
					newWindow.workspaces.push(newWorkspace);

					this.#windows.set(newWindow.id, newWindow);
				}
			} else {
				this.#windows = new Map(
					localWindows as Iterable<readonly [number, Ext.Window]>
				);
			}

			for (let { workspaces } of this.#windows.values()) {
				console.log({ workspaces });
				await Browser.tabs.hide(
					workspaces
						.filter(({ active }) => !active)
						.flatMap(({ tabIds }) => tabIds)
				);

				for (let workspace of workspaces.filter(({ active }) => active)) {
					console.log({ workspace });
					await Browser.tabs.update(
						workspace.activeTabId || workspace.tabIds[0],
						{ active: true }
					);
				}
			}

			resolve(true);
		});
	}

	get windows(): Map<Ext.Window["id"], Ext.Window> {
		return this.#windows;
	}

	// get workspaces(): Ext.Workspace[] {
	// 	return this.#workspaces;
	// }

	get focusedWindowId(): number {
		return this.#focusedWindowId;
	}

	set focusedWindowId(id: number) {
		this.#focusedWindowId = id;
	}

	#getActiveWorkspace({ windowId }: { windowId: number }): {
		activeWorkspace: Ext.Workspace;
		activeWorkspaceIndex: number;
		windowRelativeWorkspaceIndex: number;
	} {
		const { workspaces } = this.#getWindow(windowId)!;

		let activeWorkspaceIndex!: number;
		const activeWorkspace = workspaces.find((workspace, i) => {
			if (workspace.active && workspace.windowId === windowId) {
				activeWorkspaceIndex = i;
				return workspace;
			}
		})!;

		const windowRelativeWorkspaceIndex = workspaces
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
			const { workspaces } = this.#getWindow(windowId)!;

			this.#movingTabs = true;
			const { activeWorkspace, windowRelativeWorkspaceIndex } =
				this.#getActiveWorkspace({
					windowId,
				});

			const targetWorkspace = workspaces.find(
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

			this.#persistWindows();

			this.#movingTabs = true;
			return resolve(true);
		});
	}

	#getNewWorkspace(window: Ext.Window): Promise<Ext.Workspace> {
		return new Promise(async (resolve) => {
			return resolve({
				id: crypto.randomUUID(),
				icon: "🐠",
				name: `Workspace ${window.workspaces.length + 1}`,
				tabIds: [],
				active: true,
				windowId: this.#focusedWindowId,
				activeTabId: undefined,
			});
		});
	}

	#persistWindows() {
		return Browser.storage.local.set({
			[StorageKeys.windows]: Array.from(this.#windows),
		});
	}

	clearDB() {
		Browser.storage.local.remove([
			StorageKeys.windows,
			StorageKeys.workspaces,
			StorageKeys.activeWorkspace,
		]);
		// Browser.storage.local.set({[StorageKeys.workspaces]: []});
		// Browser.storage.local.set({[StorageKeys.activeWorkspace]: });
	}

	getWorkspaces({ windowId }: { windowId: number }): Promise<Ext.Workspace[]> {
		return new Promise(async (resolve) => {
			console.info("getWorkspaces()");

			console.log({ windows: this.#windows, windowId });

			const window = this.#getWindow(windowId)!;

			if (!window) return;

			const { workspaces } = window;

			return resolve(workspaces);
		});
	}

	#getWindow(windowId: number): Ext.Window {
		return this.#windows.get(windowId)!;
	}

	editWorkspace({
		windowId,
		workspace,
		name,
		icon,
	}: {
		windowId: Ext.Window["id"];
		workspace: Ext.Workspace;
		name: string;
		icon: string;
	}): Promise<boolean> {
		return new Promise(async (resolve) => {
			const { workspaces } = this.#getWindow(windowId)!;

			let _workspace = workspaces.find((worksp) => worksp.id === workspace.id)!;

			_workspace.name = name;
			_workspace.icon = icon;

			await this.#persistWindows();

			resolve(true);
		});
	}

	removeWorkspace(id: string): Promise<boolean> {
		return new Promise(async (resolve) => {
			let { workspaces } = this.#windows.get(this.#focusedWindowId)!;

			this.#removingWorkspace = true;
			const workspace = workspaces.find((workspace) => workspace.id === id)!;

			const workspacesInWindow = workspaces.filter(
				(_workspace) => _workspace.windowId === workspace.windowId
			);

			if (workspacesInWindow.length <= 1) return;

			if (workspace.active) {
				await this.switchToPreviousWorkspace({ windowId: workspace.windowId });
			}

			await Browser.tabs.remove(workspace.tabIds);

			workspaces = workspaces.filter((workspace) => workspace.id !== id);

			this.#persistWindows();
			this.#removingWorkspace = false;
			resolve(true);
		});
	}

	removeWindow(windowId: number) {
		return new Promise(async (resolve) => {
			this.#windows.delete(windowId);
			this.#persistWindows();
			return resolve(true);
		});
	}

	removeWorkspaces({ windowId }: { windowId: number }) {
		return new Promise(async (resolve) => {
			let { workspaces } = this.#getWindow(windowId)!;

			workspaces = workspaces.filter(
				(workspace) => workspace.windowId !== windowId
			);

			resolve(workspaces);
		});
	}

	addTab(tabId: number, windowId: number) {
		if (this.#addingWorkspace || this.#switchingWorkspace || this.#movingTabs)
			return;
		console.info("addTab()", { tabId, windowId });

		const { workspaces } = this.#getWindow(windowId)!;

		let { activeWorkspace, activeWorkspaceIndex } = this.#getActiveWorkspace({
			windowId,
		});

		console.log({ activeWorkspace });

		if (!activeWorkspace) return;

		activeWorkspace.tabIds.push(tabId);

		workspaces[activeWorkspaceIndex] = activeWorkspace;
		this.#persistWindows();
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

		this.#persistWindows();
	}

	addWindow(windowId: number) {
		console.info("<addWindow>");
		return new Promise(async (resolve) => {
			this.#focusedWindowId = windowId;
			const newWindow = { id: windowId, workspaces: [] } as Ext.Window;
			const newWorkspace = await this.#getNewWorkspace(newWindow);
			newWindow.workspaces.push(newWorkspace);
			this.#windows.set(windowId, newWindow);

			const tabsInWindow = await Browser.tabs.query({ windowId });
			const newTab = await Browser.tabs.create({ active: true, windowId });
			await Browser.tabs.remove(tabsInWindow[0].id!);

			newWorkspace.tabIds.push(newTab.id!);
			newWorkspace.activeTabId = newTab.id!;

			newWindow.workspaces = [...newWindow.workspaces, newWorkspace];
			this.#persistWindows();
			console.info("</addWindow>");
			resolve(true);
		});
	}

	switchWorkspace(workspace: Ext.Workspace) {
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
				await this.#persistWindows();
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
			const { workspaces } = this.#getWindow(windowId)!;

			if (index > workspaces.length - 1) return;

			const nextWorkspace = workspaces.at(index)!;

			console.log({ nextWorkspace });

			await this.switchWorkspace(nextWorkspace);
			resolve(true);
		});
	}

	switchToPreviousWorkspace({ windowId }: { windowId: number }) {
		return new Promise(async (resolve) => {
			const { workspaces } = this.#getWindow(windowId)!;
			const index =
				this.#getActiveWorkspace({ windowId }).activeWorkspaceIndex - 1;
			if (index < 0) return;

			const previousWorkspace = workspaces.at(index)!;
			await this.switchWorkspace(previousWorkspace);
			resolve(true);
		});
	}

	addWorkspace(): Promise<Ext.Workspace> {
		console.info("addWorkspace()");
		return new Promise(async (resolve) => {
			const window = this.#windows.get(this.#focusedWindowId)!;

			this.#addingWorkspace = true;
			const newWorkspace = await this.#getNewWorkspace(window);

			const tabId: number = (await Browser.tabs.create({ active: false })).id!;
			newWorkspace.tabIds = [tabId!];

			await this.switchWorkspace(newWorkspace);

			window.workspaces = [...window.workspaces, newWorkspace];
			this.#persistWindows();

			this.#addingWorkspace = false;
			return resolve(newWorkspace);
		});
	}
}
