import { promisedDebounceFunc } from "@root/utils";
import Browser from "webextension-polyfill";
import { Window } from "./Window";

enum StorageKeys {
	windowIds = "tw_windowIds",
	workspaces = "tw_workspaces",
	activeWorkspace = "tw_activeWorkspace",
}

export class WorkspaceStorage {
	#windows: Map<Ext.Window["id"], Window> = new Map();
	#focusedWindowId!: number;
	#movingTabs = false;

	constructor() {}

	async init() {
		// this.clearDB();
		let { [StorageKeys.windowIds]: localWindowIds } =
			(await Browser.storage.local.get(StorageKeys.windowIds)) as {
				[StorageKeys.windowIds]: Ext.Window["id"][];
			};

		const currentWindows = await Browser.windows.getAll();
		const focusedWindow = (currentWindows.find(({ focused }) => focused) ||
			currentWindows.at(0))!;

		this.#focusedWindowId = focusedWindow.id!;

		if (!localWindowIds) {
			for (let window of currentWindows) {
				const newWindowInstance = new Window(window.id!);
				await newWindowInstance.init();

				this.windows.set(newWindowInstance.id, newWindowInstance);
			}
		} else {
			for (let winId of localWindowIds) {
				const windowInstance = new Window(winId);
				await windowInstance.init();
				this.windows.set(winId, windowInstance);
			}
		}

		for (let window of this.#windows.values()) {
			const workspaces = window.workspaces;

			await Browser.tabs.hide(
				workspaces
					.filter(({ active }) => !active)
					.flatMap(({ tabIds }) => tabIds)
			);

			for (let workspace of workspaces.filter(({ active }) => active)) {
				await Browser.tabs.update(
					workspace.activeTabId || workspace.tabIds[0],
					{ active: true }
				);
			}
		}

		this.#persistWindows();
	}

	get windows(): Map<Ext.Window["id"], Window> {
		return this.#windows;
	}

	get focusedWindowId(): number {
		return this.#focusedWindowId;
	}

	set focusedWindowId(id: number) {
		this.#focusedWindowId = id;
	}

	get activeWindow(): Window {
		return this.#windows.get(this.focusedWindowId)!;
	}

	#persistWindows = promisedDebounceFunc<void>(this.#_persistWindows, 500);

	#_persistWindows() {
		return Browser.storage.local.set({
			[StorageKeys.windowIds]: Array.from(this.#windows).flatMap(
				([key, val]) => key
			),
		});
	}

	clearDB() {
		Browser.storage.local.remove([
			StorageKeys.windowIds,
			StorageKeys.workspaces,
			StorageKeys.activeWorkspace,
		]);
		// Browser.storage.local.set({[StorageKeys.workspaces]: []});
		// Browser.storage.local.set({[StorageKeys.activeWorkspace]: });
	}

	getWindow(windowId: number): Window {
		return this.#windows.get(windowId)!;
	}

	async getOrCreateWindow(windowId: number): Promise<Window> {
		return this.getWindow(windowId) || (await this.addWindow(windowId));
	}

	async moveAttachedTabs({
		tabIds,
		targetWindowId,
	}: {
		tabIds: number[];
		targetWindowId: number;
	}) {
		console.info("moveAttachedTabs");
		await this.getWindow(targetWindowId)?.addTabs(tabIds);
		console.info("End of moveAttachedTabs func");
	}

	async moveDetachedTabs({
		tabIds,
		currentWindowId,
	}: {
		tabIds: number[];
		currentWindowId: number;
	}) {
		console.info("moveDetachedTabs");
		const window = this.getWindow(currentWindowId);
		const currentActiveWorkspace = window?.activeWorkspace;
		await window?.removeTabs(tabIds);
		const currentTabIds = currentActiveWorkspace?.tabIds;

		console.log({ currentTabIds, window });

		if (window && !currentTabIds?.length) {
			console.info("keine tabs mehr im workspace");
			const activeTab = (
				await Browser.tabs.query({
					active: true,
					windowId: window.id,
				})
			)?.at(0);

			if (activeTab) {
				console.info({ activeTab, window, workspaces: window.workspaces });
				const currentWorkspace = window.workspaces.find((workspace) =>
					workspace.tabIds.includes(activeTab.id!)
				);

				console.info({ currentWorkspace });

				const newTab = await Browser.tabs.create({
					active: false,
					windowId: window.id,
				});

				await window.addTab(newTab.id!);
				console.info("ADDED TAB");

				if (currentWorkspace) {
					currentWorkspace.activeTabId = undefined;
					await window.switchWorkspace(currentWorkspace);
				}
				// window. = currentWorkspace;
				// window.setActiveTab(activeTab.id!);

				console.log({
					activeTab: structuredClone(activeTab),
					workspaces: structuredClone(window.workspaces),
					activeWorkspace: structuredClone(window?.activeWorkspace),
					currentWorkspace: structuredClone(currentWorkspace),
				});
			}
		}

		return window?.activeWorkspace;
	}

	async removeWindow(windowId: number) {
		console.info("Workspace Storage - window to be removed");
		await this.getWindow(windowId).remove();
		this.#windows.delete(windowId);
		this.#persistWindows();
	}

	async addWindow(windowId: number): Promise<Window> {
		this.#focusedWindowId = windowId;
		const newWindow = new Window(windowId);
		await newWindow.init({ lookInStorage: false });
		this.#windows.set(windowId, newWindow);

		this.#persistWindows();

		return newWindow;
	}

	async initFreshWindow(windowId: number) {
		await this.getWindow(windowId).freshInit();
	}
}
