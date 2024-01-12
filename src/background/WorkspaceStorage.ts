import { promisedDebounceFunc } from "@root/utils";
import Browser from "webextension-polyfill";
import { Window } from "./Window.svelte";
import * as API from "@root/browserAPI";

enum StorageKeys {
	windowUUIDs = "windowIds",
	workspaces = "workspaces",
	activeWorkspace = "activeWorkspace",
}

// TODO: make windows state as soon as Map is supported

export class WorkspaceStorage {
	#windows: Map<number, Window> = new Map();
	#focusedWindowId!: number;

	constructor() {}

	async init() {
		const currentWindows = await Browser.windows.getAll();
		const currentWindowsObjs: { windowId: number; uuid: string | undefined }[] =
			[];

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
			await newWindowInstance.init();
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
			const activeWorkspace = workspaces.find(({ active }) => active)!;

			console.info({ activeWorkspace });
			API.updateTabs([
				{
					id: activeWorkspace.activeTabId || activeWorkspace.tabIds[0],
					props: {
						active: true,
					},
				},
			]);

			const inactiveWorkspaces = workspaces.filter(({ active }) => !active);
			console.info({ inactiveWorkspaces });
			API.hideTabs(inactiveWorkspaces.flatMap(({ tabIds }) => tabIds));
		}

		this.#persistWindows();
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

	#persistWindows = promisedDebounceFunc<void>(this.#_persistWindows, 500);

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

	async getOrCreateWindow(windowId: number): Promise<Window> {
		return this.getWindow(windowId) || (await this.addWindow(windowId));
	}

	async moveAttachedTabs({
		tabIds,
		targetWindowId,
	}: {
		tabIds: number[];
		targetWindowId: number;
	}): Promise<Ext.Workspace> {
		console.info("moveAttachedTabs");
		const window = this.getWindow(targetWindowId);
		await window?.addTabs(tabIds);
		for (let tabId of tabIds) {
			await API.setTabValue(
				tabId,
				"workspaceUUID",
				window.activeWorkspace.UUID
			);
		}
		console.info("End of moveAttachedTabs func");

		return window.activeWorkspace;
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

		console.log({ currentTabIds, currentActiveWorkspace, window });

		if (window && !currentTabIds?.length) {
			console.info("keine tabs mehr im workspace");
			const activeTab = (
				await API.queryTabs({
					active: true,
					windowId: window.windowId,
				})
			).tabs?.at(0);

			if (activeTab) {
				console.info({ activeTab, window, workspaces: window.workspaces });
				const workspaceOfActiveTab = window.workspaces.find((workspace) =>
					workspace.tabIds.includes(activeTab.id!)
				);

				console.info({ workspaceOfActiveTab });

				const newTab = (await API.createTab({
					active: false,
					windowId: window.windowId,
				}))!;

				await window.addTab(newTab.id!);
				console.info("ADDED TAB");

				if (workspaceOfActiveTab) {
					await window.switchWorkspace(workspaceOfActiveTab);
					currentActiveWorkspace.activeTabId = newTab.id!;
				}
			}
		}

		console.info("detachedTabs - Return ->", window?.activeWorkspace);
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
		const newWindow = new Window(undefined, windowId);
		await newWindow.init({ lookInStorage: false });
		this.#windows.set(windowId, newWindow);

		this.#persistWindows();

		return newWindow;
	}

	async forceApplyDefaultWorkspacesOnAllWindows() {
		for (let window of this.#windows.values()) {
			await window.forceApplyDefaultWorkspaces();
		}
	}
}
