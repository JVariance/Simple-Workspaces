import { DeferredPromise } from "@root/utils";
import { BrowserStorage } from "../Static/Storage";

type Process = keyof typeof Processes;

class Processes {
	private static _instance: Processes;
	ExtensionInitialization = new DeferredPromise<void>();
	TabCreation = new DeferredPromise<void>();
	TabAttachment = new DeferredPromise<void>();
	TabDetachment = new DeferredPromise<void>();
	TabRemoval = new DeferredPromise<void>();
	WindowCreation = new DeferredPromise<void>();
	WindowRemoval = new DeferredPromise<void>();
	WorkspaceSwitch = new DeferredPromise<void>();
	TabCreations = new DeferredPromise<void>();

	extensionInitialized = false;
	manualTabAddition = false;
	manualTabRemoval = false;
	searchWasUsed = false;
	keepPinnedTabs = false;
	runningTabsOnCreated = false;
	runningTabsOnAttached = false;
	runningTabsOnDetached = false;

	private constructor() {
		// this.ExtensionInitialization.finish();
		// this.TabAttachment.finish();
		// this.TabCreation.finish();
		// this.TabDetachment.finish();
		// this.TabRemoval.finish();
		// this.WindowCreation.finish();
		// this.WindowRemoval.finish();
		// this.WorkspaceSwitch.finish();
	}

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}
}

export default Processes.Instance;
