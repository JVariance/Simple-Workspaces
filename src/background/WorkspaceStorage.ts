import { promisedDebounceFunc } from "@root/utils";
import Browser from "webextension-polyfill";
import { Window } from "./Window";

enum StorageKeys {
	windowUUIDs = "windowIds",
	workspaces = "workspaces",
	activeWorkspace = "activeWorkspace",
}

export class WorkspaceStorage {
	#windows: Map<number, Window> = new Map();
	#focusedWindowId!: number;
	#movingTabs = false;

	constructor() {}

	async init() {
		// this.clearDB();
		// const { [StorageKeys.windowUUIDs]: localWindowUUIDs } =
		// 	(await Browser.storage.local.get(StorageKeys.windowUUIDs)) as {
		// 		[StorageKeys.windowUUIDs]: string[];
		// 	};

		const currentWindows = await Browser.windows.getAll();
		const currentWindowsObjs: { windowId: number; uuid: string | undefined }[] =
			[];

		for (let currentWindow of currentWindows) {
			currentWindowsObjs.push({
				windowId: currentWindow.id!,
				uuid: await Browser.sessions.getWindowValue(
					currentWindow.id!,
					"windowUUID"
				),
			});
		}

		for (let currentWindow of currentWindowsObjs) {
			const newWindowInstance = new Window(
				currentWindow.uuid,
				currentWindow.windowId
			);
			await newWindowInstance.init();
			this.windows.set(currentWindow.windowId, newWindowInstance);
		}

		const focusedWindow = (currentWindows.find(({ focused }) => focused) ||
			currentWindows.at(0))!;

		this.#focusedWindowId = focusedWindow.id!;

		for (let window of this.#windows.values()) {
			const workspaces = window.workspaces;
			const activeWorkspace = workspaces.find(({ active }) => active)!;

			console.info({ activeWorkspace });
			try {
				await Browser.tabs.update(
					activeWorkspace.activeTabId || activeWorkspace.tabIds[0],
					{
						active: true,
					}
				);
			} catch (e) {
				console.error({ e });
			}

			const inactiveWorkspaces = workspaces.filter(({ active }) => !active);
			console.info({ inactiveWorkspaces });
			try {
				await Browser.tabs.hide(
					inactiveWorkspaces.flatMap(({ tabIds }) => tabIds)
				);
			} catch (e) {
				console.error({ e });
			}
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
		// return Browser.storage.local.set({
		// 	[StorageKeys.windowIds]: Array.from(this.#windows).flatMap(
		// 		([key, _]) => key
		// 	),
		// });
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

		console.log({ currentTabIds, currentActiveWorkspace, window });

		if (window && !currentTabIds?.length) {
			console.info("keine tabs mehr im workspace");
			const activeTab = (
				await Browser.tabs.query({
					active: true,
					windowId: window.windowId,
				})
			)?.at(0);

			if (activeTab) {
				console.info({ activeTab, window, workspaces: window.workspaces });
				const workspaceOfActiveTab = window.workspaces.find((workspace) =>
					workspace.tabIds.includes(activeTab.id!)
				);

				console.info({ workspaceOfActiveTab });

				const newTab = await Browser.tabs.create({
					active: false,
					windowId: window.windowId,
				});

				await window.addTab(newTab.id!);
				console.info("ADDED TAB");

				if (workspaceOfActiveTab) {
					// workspaceOfActiveTab.activeTabId = undefined;
					await window.switchWorkspace(workspaceOfActiveTab);
					// window.setActiveTab(newTab.id!);
					currentActiveWorkspace.activeTabId = newTab.id!;
				}
				// window. = workspaceOfActiveTab;
				// window.setActiveTab(activeTab.id!);

				console.log({
					activeTab: structuredClone(activeTab),
					workspaces: structuredClone(window.workspaces),
					activeWorkspace: structuredClone(window?.activeWorkspace),
					workspaceOfActiveTab: structuredClone(workspaceOfActiveTab),
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
		const newWindow = new Window(undefined, windowId);
		await newWindow.init({ lookInStorage: false });
		this.#windows.set(windowId, newWindow);

		this.#persistWindows();

		return newWindow;
	}

	async initFreshWindow(windowId: number) {
		await this.getWindow(windowId).freshInit();
	}
}
