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
		console.info("init WorkspaceStorage");
		// this.clearDB();
		return new Promise(async (resolve) => {
			let { [StorageKeys.windowIds]: localWindowIds } =
				(await Browser.storage.local.get(StorageKeys.windowIds)) as {
					[StorageKeys.windowIds]: Ext.Window["id"][];
				};

			const currentWindows = await Browser.windows.getAll();
			const focusedWindow = (currentWindows.find(({ focused }) => focused) ||
				currentWindows.at(0))!;
			console.log({ focusedWindow, id: focusedWindow.id });
			this.#focusedWindowId = focusedWindow.id!;

			if (!localWindowIds) {
				console.log({ currentWindows });
				for (let window of currentWindows) {
					console.log({ window, id: window.id });
					const newWindowInstance = new Window(window.id!);
					await newWindowInstance.init();
					console.log({ newWindowInstance, id: newWindowInstance.id });
					this.windows.set(newWindowInstance.id, newWindowInstance);
					console.log({ windows: this.windows });
				}
			} else {
				console.info("localWindowIds found");
				for (let winId of localWindowIds) {
					const windowInstance = new Window(winId);
					await windowInstance.init();
					this.windows.set(winId, windowInstance);
				}
			}

			console.log({ localWindowIds, windows: this.windows });

			for (let window of this.#windows.values()) {
				const workspaces = window.workspaces;
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

	#persistWindows() {
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
		console.info("getWindow()", { windowId });
		console.log(this.#windows);
		return this.#windows.get(windowId)!;
	}

	removeWindow(windowId: number) {
		return new Promise(async (resolve) => {
			await this.getWindow(windowId).remove();
			this.#windows.delete(windowId);
			this.#persistWindows();
			return resolve(true);
		});
	}

	addWindow(windowId: number) {
		console.info("<addWindow>");
		return new Promise(async (resolve) => {
			this.#focusedWindowId = windowId;
			const newWindow = new Window(windowId);
			await newWindow.init({ lookInStorage: false });
			this.#windows.set(windowId, newWindow);

			this.#persistWindows();
			console.info("</addWindow>");
			resolve(true);
		});
	}
}
