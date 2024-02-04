import Browser from "webextension-polyfill";
import * as API from "@root/browserAPI";
import { initExtension } from "../../initExtension";
import { Processes } from "../../Entities";
import { createTab } from "@root/background/browserAPIWrapper/tabCreation";

export async function runtimeOnInstalled(
	details: Browser.Runtime.OnInstalledDetailsType
) {
	console.info("onInstalled");
	Processes.ExtensionInitialization.start();
	await Browser.storage.local.clear();
	if (Processes.extensionInitialized) {
		Processes.ExtensionInitialization.finish();
	} else {
		await initExtension();
	}

	console.info("?????? HALLOPOLO");

	switch (details.reason) {
		case "install":
			createTab({
				url: Browser.runtime.getURL("src/pages/Welcome/welcome.html"),
				active: true,
			});
			break;
		case "update":
			break;
		default:
			break;
	}
}
