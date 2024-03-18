import { backupData } from "@root/background/helper/backupData";
import Browser from "webextension-polyfill";

export async function alarmsOnAlarm(alarm: Browser.Alarms.Alarm) {
	if (alarm.name === "auto-backup") {
		if (!navigator.onLine) return;

		backupData();
	}
}
