import Browser from "webextension-polyfill";
import {
	BrowserStorage,
	Processes,
	TabMenuMove,
	WorkspaceStorage,
} from "./Entities";
import { createBackupAlarm } from "./helper/backupAlarm";
import { convertMillisecondsToMinutes } from "./helper/Time";
import { DEFAULT_BACKUP_INTERVAL_IN_MINUTES } from "./helper/Constants";

async function initTabMenu() {
	await TabMenuMove.init(
		Array.from(
			WorkspaceStorage.windows
				.get(WorkspaceStorage.focusedWindowId)!
				.workspaces.values()
		)
	);
}

async function initWorkspaceStorage(options: { extensionUpdated?: boolean }) {
	// WorkspaceStorage = new WorkspaceStorage();

	const { extensionUpdated = false } = options;

	await WorkspaceStorage.init({ extensionUpdated });
}

export function initExtension(options: { extensionUpdated?: boolean } = {}) {
	return new Promise<void>(async (resolve) => {
		console.info("initExtension 0");
		// await Processes.ExtensionInitialization;

		const { extensionUpdated = false } = options;

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
			await initWorkspaceStorage({ extensionUpdated });
			console.info("initExtension 4");
		}
		await initTabMenu();
		// informViews("initialized");
		console.info("initExtension 5");
		Processes.ExtensionInitialization.finish();
		Processes.extensionInitialized = true;

		resolve();

		const { backupEnabled = false } = await BrowserStorage.getBackupEnabled();

		if (backupEnabled) {
			createBackupAlarm();

			const { backupIntervalInMinutes = DEFAULT_BACKUP_INTERVAL_IN_MINUTES } =
				await BrowserStorage.getBackupIntervalInMinutes();
			const { backupLastTimeStamp } =
				await BrowserStorage.getBackupLastTimeStamp();

			if (backupLastTimeStamp) {
				const currentTime = new Date().getTime();
				const timeDiffInMinutes = convertMillisecondsToMinutes(
					currentTime - backupLastTimeStamp
				);

				if (timeDiffInMinutes > backupIntervalInMinutes) {
					//TODO: backup data
				}
			}
		}
	});
}
