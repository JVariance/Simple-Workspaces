import Browser from "webextension-polyfill";
import { BrowserStorage } from "../Entities";
import { DEFAULT_BACKUP_INTERVAL_IN_MINUTES } from "./Constants";

export async function createBackupAlarm() {
	const {
		backupIntervalInMinutes:
			periodInMinutes = DEFAULT_BACKUP_INTERVAL_IN_MINUTES,
	} = await BrowserStorage.getBackupIntervalInMinutes();
	Browser.alarms.create("auto-backup", { periodInMinutes });
}

export async function clearBackupAlarm() {
	Browser.alarms.clear("auto-backup");
}
