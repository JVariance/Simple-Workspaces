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

	init() {
		// this.clearDB();
		return new Promise(async (resolve) => {
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
			resolve(true);
		});
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

	removeWindow(windowId: number) {
		return new Promise(async (resolve) => {
			await this.getWindow(windowId).remove();
			this.#windows.delete(windowId);
			this.#persistWindows();
			return resolve(true);
		});
	}

	addWindow(windowId: number): Promise<Window> {
		return new Promise(async (resolve) => {
			this.#focusedWindowId = windowId;
			const newWindow = new Window(windowId);
			await newWindow.init({ lookInStorage: false });
			this.#windows.set(windowId, newWindow);

			this.#persistWindows();

			resolve(newWindow);
		});
	}
}
