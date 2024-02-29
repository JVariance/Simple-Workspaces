import Browser from "webextension-polyfill";
import * as API from "@root/browserAPI";
import { initExtension } from "../../initExtension";
import { Processes } from "../../Entities";

export async function runtimeOnInstalled(
	details: Browser.Runtime.OnInstalledDetailsType
) {
	console.info("onInstalled");
	Processes.ExtensionInitialization.start();
	// await Browser.storage.local.clear();
	if (Processes.extensionInitialized) {
		Processes.ExtensionInitialization.finish();
	}

	switch (details.reason) {
		case "install":
			await initExtension();
			API.createTab({
				url: Browser.runtime.getURL("src/pages/Welcome/welcome.html"),
				active: true,
			});
			break;
		case "update":
			console.info("updated extension");
			await initExtension({ extensionUpdated: true });
			API.createTab({
				url: Browser.runtime.getURL("src/pages/Changelog/changelog.html"),
				active: true,
			});
			break;
		default:
			break;
	}
}
