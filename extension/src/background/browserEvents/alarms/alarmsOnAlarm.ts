import { BrowserStorage } from "@root/background/Entities";
import {
	exportData,
	type ExportData,
} from "@root/background/helper/exportData";
import { minifyBackupData } from "@root/background/helper/minifyBackupData";
import Browser from "webextension-polyfill";

let backupData: ExportData, deviceName: string;

// ["syncedBackupDeviceNames", "backupData"]
export async function alarmsOnAlarm(alarm: Browser.Alarms.Alarm) {
	if (alarm.name === "auto-backup") {
		if (!navigator.onLine) return;
		if (!backupData) {
			const { backupDeviceName } = await BrowserStorage.getBackupDeviceName();
			deviceName = backupDeviceName;
			const { [`backup_${backupDeviceName}`]: deviceBackupData } =
				await BrowserStorage.getBackupDataFromDevice(backupDeviceName);
			backupData = deviceBackupData;
		}

		const currentData = { windows: await exportData() };

		const fileSize = new TextEncoder().encode(
			`backup_${deviceName}` + JSON.stringify(currentData)
		).length;

		const minifiedData = await minifyBackupData(currentData);

		console.info({
			currentData,
			minifiedData,
			fileSize,
			minifiedFileSize: new TextEncoder().encode(
				`backup_${deviceName}` + minifiedData
			).length,
		});

		if (fileSize >= Browser.storage.sync.QUOTA_BYTES_PER_ITEM) {
			const minifiedData = JSON.parse(await minifyBackupData(currentData));
			// BrowserStorage.setBackupDataFromDevice(deviceName, minifiedData);
		} else {
			// BrowserStorage.setBackupDataFromDevice(deviceName, currentData);
		}
	}
}
