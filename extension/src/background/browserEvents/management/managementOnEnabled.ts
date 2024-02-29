import { initExtension } from "@root/background/initExtension";
import Browser from "webextension-polyfill";

export async function managementOnEnabled(
	info: Browser.Management.ExtensionInfo
) {
	console.info("management.onEnabled", info);
	if (info.id === "{eb7c9a05-56f8-47bf-9c14-2c7da7529a02}") {
		// await Browser.storage.local.clear();
		await initExtension({ extensionUpdated: true });
	}
}
