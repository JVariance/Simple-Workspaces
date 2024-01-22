import Processes from "../Processes";
import { initExtension } from "../initExtension";

export async function runtimeOnStartup() {
	console.info("onStartup");
	if (!Processes.extensionInitialized) await initExtension();
}
