import { promisedDebounceFunc } from "@root/utils";
import Browser from "webextension-polyfill";
import * as API from "@root/browserAPI";
import { Window } from "@background/Entities/Window.svelte";
import { createTab } from "@root/background/browserAPIWrapper/tabCreation";

enum StorageKeys {
	windowUUIDs = "windowIds",
	workspaces = "workspaces",
	activeWorkspace = "activeWorkspace",
}

// TODO: make windows state as soon as Map is supported

class WorkspaceStorage {
	#windows: Map<number, Window> = new Map();
	#focusedWindowId!: number;
	initialized = false;
	private static _instance: WorkspaceStorage;

	private constructor() {}

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}

	async init(options: { extensionUpdated?: boolean } = {}) {
		const currentWindows = await Browser.windows.getAll();
		const currentWindowsObjs: { windowId: number; uuid: string | undefined }[] =
			[];

		const { extensionUpdated = false } = options;

		for (let currentWindow of currentWindows) {
			currentWindowsObjs.push({
				windowId: currentWindow.id!,
				uuid: await API.getWindowValue(currentWindow.id!, "windowUUID"),
			});
		}

		for (let currentWindow of currentWindowsObjs) {
			const newWindowInstance = new Window(
				currentWindow.uuid,
				currentWindow.windowId
			);
			await newWindowInstance.init({ extensionUpdated });
			this.windows.set(currentWindow.windowId, newWindowInstance);
			if (!currentWindow.uuid)
				await API.setWindowValue(
					currentWindow.windowId,
					"windowUUID",
					newWindowInstance.UUID
				);
		}

		const focusedWindow = (currentWindows.find(({ focused }) => focused) ||
			currentWindows.at(0))!;

		this.#focusedWindowId = focusedWindow.id!;

		for (let window of this.#windows.values()) {
			const workspaces = window.workspaces;
			// const activeWorkspace = workspaces.find(({ active }) => active)!;
			const activeWorkspace = window.activeWorkspace;

			console.info({ activeWorkspace });
			API.updateTabs([
				{
					id: activeWorkspace.activeTabId || activeWorkspace.tabIds[0],
					props: {
						active: true,
					},
				},
			]);

			const inactiveWorkspaces = Array.from(workspaces.values()).filter(
				({ active }) => !active
			);
			console.info({ inactiveWorkspaces });
			API.hideTabs(inactiveWorkspaces.flatMap(({ tabIds }) => tabIds));
		}

		this.persistWindows();
		this.initialized = true;
	}

	get windows(): Map<number, Window> {
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

	persistWindows = promisedDebounceFunc<void>(this.#_persistWindows, 500);

	#_persistWindows() {
		const windowUUIDs = Array.from(this.#windows).flatMap(
			({ 1: win }) => win.UUID
		);
		console.log("persistWindowIds -> " + windowUUIDs);
		return Browser.storage.local.set({
			[StorageKeys.windowUUIDs]: windowUUIDs,
		});
	}

	clearDB() {
		Browser.storage.local.remove([
			StorageKeys.windowUUIDs,
			StorageKeys.workspaces,
			StorageKeys.activeWorkspace,
		]);
	}

	getWindow(windowId: number): Window {
		return this.#windows.get(windowId)!;
	}

	async getOrCreateWindow({
		windowId,
		windowUUID = undefined,
		restored = false,
	}: {
		windowId: number;
		windowUUID?: string;
		restored?: boolean;
	}): Promise<Window> {
		return (
			this.getWindow(windowId) ||
			(await this.addWindow({ windowId, windowUUID, restored }))
		);
	}

	async moveAttachedTabs({
		tabIds,
		targetWindowId,
	}: {
		tabIds: number[];
		targetWindowId: number;
	}): Promise<Ext.Workspace> {
		const window = this.getWindow(targetWindowId);
		const activeWorkspace = window?.activeWorkspace;
		console.info("moveAttachedTabs", {
			activeWorkspace,
			currentActiveWorkspaceTabIds: structuredClone(activeWorkspace.tabIds),
			tabIds,
		});
		await window?.addTabs(tabIds, activeWorkspace);
		for (let tabId of tabIds) {
			await API.setTabValue(tabId, "workspaceUUID", activeWorkspace.UUID);
		}
		console.info("End of moveAttachedTabs func");

		return activeWorkspace;
	}

	/*
		moveDetachedTabs:
		- get new active tab
		- switch to active tab's workspace
		- set new active tab's id as activetabid
		- remove tabids from according workspaces (tabids/pinnedtabids)
		- create new tabs for now empty workspaces
			- set activetabid to new tab's id
	*/

	async moveDetachedTabs({
		tabIds,
		currentWindowId,
	}: {
		tabIds: number[];
		currentWindowId: number;
	}) {
		console.info("moveDetachedTabs", { tabIds, currentWindowId });
		const window = this.getWindow(currentWindowId);
		if (!window) return;
		const activeWorkspace = window.activeWorkspace;

		const activeTab = (
			await API.queryTabs({
				active: true,
				windowId: currentWindowId,
			})
		).tabs?.at(0);
		const activeTabsWorkspaceUUID = await API.getTabValue(
			activeTab?.id,
			"workspaceUUID"
		);

		const activeTabsWorkspace = window.workspaces.get(activeTabsWorkspaceUUID);

		const isActiveWorkspace =
			activeTabsWorkspace?.UUID === activeWorkspace.UUID;

		if (isActiveWorkspace) {
			activeTabsWorkspace.activeTabId = activeTab?.id;
		} else {
			activeTabsWorkspace &&
				(await window.switchWorkspace(activeTabsWorkspace));
		}

		const emptyWorkspaces = [];
		for (let tabId of tabIds) {
			const workspace = Array.from(window.workspaces.values()).find(
				(workspace) => workspace.tabIds.includes(tabId)
			);

			if (workspace) {
				workspace.tabIds = workspace.tabIds.filter((id) => id !== tabId);
				workspace.pinnedTabIds = workspace.pinnedTabIds.filter(
					(id) => id !== tabId
				);

				console.info({ workspace });

				!workspace.tabIds.length && emptyWorkspaces.push(workspace);
				// if (!workspace.activeTabId) {
				workspace.activeTabId = workspace.tabIds?.at(-1);
				// }
			}
		}

		console.info({ emptyWorkspaces });

		for (let emptyWorkspace of emptyWorkspaces) {
			const newTab = (await createTab(
				{ windowId: window.windowId, active: false },
				emptyWorkspace
			))!;

			await API.setTabValue(newTab.id!, "workspaceUUID", emptyWorkspace.UUID);
			if (emptyWorkspace.UUID !== window.activeWorkspace.UUID) {
				await API.hideTab(newTab.id);
			}
		}

		console.info("detachedTabs - Return ->", window?.activeWorkspace);
		return window?.activeWorkspace;
	}

	async removeWindow(windowId: number) {
		console.info("Workspace Storage - window to be removed");
		await this.getWindow(windowId).remove();
		this.#windows.delete(windowId);
		this.persistWindows();
	}

	async addWindow({
		windowId,
		windowUUID = undefined,
		restored = false,
	}: {
		windowId: number;
		windowUUID?: string;
		restored?: boolean;
	}): Promise<Window> {
		this.#focusedWindowId = windowId;
		const newWindow = new Window(windowUUID, windowId);
		await newWindow.init({ lookInStorage: false, restored });
		this.#windows.set(windowId, newWindow);

		this.persistWindows();

		return newWindow;
	}

	async forceApplyDefaultWorkspacesOnAllWindows() {
		// for (let window of this.#windows.values()) {
		const promises: Promise<any>[] = [];
		this.#windows.forEach((window) => {
			promises.push(window.forceApplyDefaultWorkspaces());
		});
		await Promise.all(promises);
	}
}

// const WorkspaceStorage = new _WorkspaceStorage();

// export default new _WorkspaceStorage();
export default WorkspaceStorage.Instance;
