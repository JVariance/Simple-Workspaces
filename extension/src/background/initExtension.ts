import {
	BrowserStorage,
	Processes,
	TabMenuMove,
	TabMenuCookies,
	WorkspaceStorage,
} from "./Entities";

async function initTabMenu() {
	console.info("initTabMenuMove");
	await TabMenuMove.init(
		WorkspaceStorage.windows.get(WorkspaceStorage.focusedWindowId)!.workspaces
	);
	console.info("initTabMenuCookies");
	await TabMenuCookies.init();
	console.info("initedTabMenus");
}

async function initWorkspaceStorage() {
	// WorkspaceStorage = new WorkspaceStorage();
	await WorkspaceStorage.init();
}

export async function initExtension() {
	console.info("initExtension 0");
	// await Processes.ExtensionInitialization;
	if (
		Processes.extensionInitialized &&
		Processes.ExtensionInitialization.state === "pending"
	)
		return;
	console.info("initExtension 1");
	Processes.ExtensionInitialization.start();
	console.info("initExtension 2");

	const { keepPinnedTabs } = await BrowserStorage.getKeepPinnedTabs();
	Processes.keepPinnedTabs = keepPinnedTabs ?? false;

	// await browser.storage.local.clear();
	// if (!WorkspaceStorage.initialized && !TabMenu.initialized) {
	if (!WorkspaceStorage.initialized) {
		console.info("initExtension 3");
		await initWorkspaceStorage();
		console.info("initExtension 4");
	}
	await initTabMenu();
	// informViews("initialized");
	console.info("initExtension 5");
	Processes.ExtensionInitialization.finish();
	Processes.extensionInitialized = true;
}
