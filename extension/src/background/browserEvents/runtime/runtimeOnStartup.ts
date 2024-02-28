import { Processes } from "../../Entities";
import { initExtension } from "../../initExtension";

export async function runtimeOnStartup() {
	console.info("onStartup");
	// if (!Processes.extensionInitialized) await initExtension();
	// await Browser.storage.local.clear();
	if (Processes.extensionInitialized) {
		Processes.ExtensionInitialization.finish();
	} else {
		await initExtension();
	}
}
