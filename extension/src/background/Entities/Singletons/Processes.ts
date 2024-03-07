import { DeferredPromise } from "@root/utils";

class Processes {
	private static _instance: Processes;
	ExtensionInitialization = new DeferredPromise<void>();
	TabCreation = new DeferredPromise<void>();
	TabAttachment = new DeferredPromise<void>();
	TabDetachment = new DeferredPromise<void>();
	TabRemoval = new DeferredPromise<void>();
	WindowCreation = new DeferredPromise<void>();
	WindowRemoval = new DeferredPromise<void>();
	WorkspaceCreation = new DeferredPromise<void>();
	WorkspaceSwitch = new DeferredPromise<void>();
	TabCreations = new DeferredPromise<void>();
	DataImport = new DeferredPromise<void>();

	extensionInitialized = false;
	manualTabAddition = false;
	manualTabRemoval = false;
	searchWasUsed = false;
	keepPinnedTabs = false;
	runningTabsOnCreated = false;
	runningTabsOnAttached = false;
	runningTabsOnDetached = false;
	importingData = false;
	authorizingProvider = false;

	private constructor() {}

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}
}

export default Processes.Instance;
