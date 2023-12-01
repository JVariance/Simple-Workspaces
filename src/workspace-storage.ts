import Browser from "webextension-polyfill";

enum StorageKeys {
	workspaces = "tw_workspaces",
	activeWorkspace = "tw_activeWorkspace",
}

export class WorkspaceStorage {
	#workspaces: Workspace[] = [];
	#addingWorkspace = false;
	#focusedWindowId!: number;
	#initializingNewWindow = false;

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
				this.#workspaces.push({
					...newWorkspace,
					tabIds: (
						await Browser.tabs.query({ windowId: this.#focusedWindowId })
					).flatMap(({ id }) => id!),
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
	} {
		let activeWorkspaceIndex!: number;
		const activeWorkspace = this.#workspaces.find((workspace, i) => {
			if (workspace.active && workspace.windowId === windowId) {
				activeWorkspaceIndex = i;
				return workspace;
			}
		})!;

		return {
			activeWorkspace,
			activeWorkspaceIndex,
		};
	}

	setActiveTab(tabId: number, windowId: number) {
		const { activeWorkspace } = this.#getActiveWorkspace({ windowId });
		activeWorkspace.activeTabId = tabId;
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

			if (!workspaces.length) {
				this.#initializingNewWindow = true;
				const newWorkspace = await this.addWorkspace();
				workspaces = [newWorkspace];
				this.#initializingNewWindow = false;
			}

			return resolve(workspaces);
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
		if (this.#addingWorkspace) return;

		const { activeWorkspace, activeWorkspaceIndex } = this.#getActiveWorkspace({
			windowId,
		});

		activeWorkspace.tabIds.push(tabId);

		this.#workspaces[activeWorkspaceIndex] = activeWorkspace;
		this.#persistWorkspace();
	}

	removeTab(tabId: number, windowId: number) {
		// if (this.#addingWorkspace) return;
		const { activeWorkspace } = this.#getActiveWorkspace({ windowId });

		activeWorkspace.tabIds = activeWorkspace.tabIds.filter(
			(id) => id !== tabId
		);

		if (!activeWorkspace.tabIds.length) {
			this.switchToPreviousWorkspace({ windowId });
		}

		this.#persistWorkspace();
	}

	switchWorkspace(workspace: Workspace) {
		return new Promise(async (resolve) => {
			const { activeWorkspace } = this.#getActiveWorkspace({
				windowId: workspace.windowId,
			});

			const currentTabIds = activeWorkspace.tabIds;
			const nextTabIds = workspace.tabIds;

			activeWorkspace.active = false;
			workspace.active = true;

			const activeTabId = workspace?.activeTabId || nextTabIds[0];

			await Browser.tabs.show(nextTabIds);
			await Browser.tabs.update(activeTabId, { active: true });
			await Browser.tabs.hide(currentTabIds);

			return resolve(true);
		});
	}

	switchToNextWorkspace({ windowId }: { windowId: number }) {
		return new Promise(async (resolve) => {
			const index =
				this.#getActiveWorkspace({ windowId }).activeWorkspaceIndex + 1;
			if (index > this.#workspaces.length - 1) return;

			const nextWorkspace = this.#workspaces.at(index)!;
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
		return new Promise(async (resolve) => {
			this.#addingWorkspace = true;
			const newWorkspace = await this.#getNewWorkspace();

			const tabId: number = (await Browser.tabs.create({ active: false })).id!;
			newWorkspace.tabIds = [tabId!];

			if (this.#initializingNewWindow) {
				newWorkspace.active = true;
				newWorkspace.activeTabId = tabId;
				const blankTabId = (
					await Browser.tabs.query({
						currentWindow: true,
						index: 0,
					})
				)[0].id!;

				await Browser.tabs.remove(blankTabId);
			} else {
				await this.switchWorkspace(newWorkspace);
			}

			this.#workspaces = [...this.#workspaces, newWorkspace];
			this.#persistWorkspace();

			// return resolve(tabId);

			this.#addingWorkspace = false;
			return resolve(newWorkspace);
		});
	}
}
