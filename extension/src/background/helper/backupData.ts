import { BrowserStorage, Processes } from "../Entities";
import type {
	BackupProvider,
	BackupProviderInstance,
} from "../Entities/Singletons/BackupProviders";
import BackupProviders from "../Entities/Singletons/BackupProviders";
import { StorageProviderError } from "./Authorization/IBackupProvider";
import { exportData } from "./exportData";

export async function backupData(props: { provider?: BackupProvider } = {}) {
	const { backupEnabled } = await BrowserStorage.getBackupEnabled();
	const { backupDeviceName } = await BrowserStorage.getBackupDeviceName();

	const { provider = BackupProviders.activeProvider.name } = props;
	let currentProvider = await BackupProviders.getProvider(provider);

	if (
		!backupEnabled &&
		!backupDeviceName?.length &&
		!currentProvider.authorized
	) {
		return;
	}

	console.info("bg - backupData to: ", provider);

	switch (provider) {
		case "Google Drive":
			Processes.authorizingProvider = true;

			// const currentProvider = BackupProviders.activeProvider;

			// console.info({ currentProvider });
			const { accessToken } = currentProvider!.getCredentials();
			console.info({ accessToken });
			// const info = accessToken ? await getUserInfo(accessToken) : null;
			// console.info({ info });

			// try {
			// 	const files = await currentProvider?.filesList();
			// 	console.info({ files });
			// } catch (error) {}

			const exportedData = await exportData();

			console.info({ exportedData });

			const { backupDeviceName } = await BrowserStorage.getBackupDeviceName();

			const fileUploadParams: Parameters<
				BackupProviderInstance["fileUpload"]
			>["0"] = {
				id: "",
				name: `${backupDeviceName}.json`,
				contents: exportedData,
			};

			async function uploadFile() {
				let attempts = 0;

				while (attempts < 3) {
					try {
						await currentProvider?.fileUpload(fileUploadParams);
						break;
					} catch (error) {
						attempts++;

						if (error instanceof StorageProviderError) {
							if (error.message === "invalid or expired access token") {
								try {
									await currentProvider.refreshAccessToken();
								} catch (error2) {
									throw error2;
								}
							} else {
								throw error;
							}
						} else {
							throw error;
						}
					}
				}
			}

			try {
				await uploadFile();
				currentProvider.status = { lastBackupTimeStamp: Date.now() };
			} catch (error) {}

			Processes.authorizingProvider = false;
			break;
		default:
			break;
	}
}
