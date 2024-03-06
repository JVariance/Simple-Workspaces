import Browser from "webextension-polyfill";
import { BrowserStorage } from "../Entities";

export async function createBackupAlarm() {
	const { backupPeriodInMinutes: periodInMinutes = 0.5 } =
		await BrowserStorage.getBackupPeriodInMinutes();
	Browser.alarms.create("auto-backup", { periodInMinutes });
}

export async function clearBackupAlarm() {
	Browser.alarms.clear("auto-backup");
}
