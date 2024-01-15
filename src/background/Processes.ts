import { DeferredPromise } from "@root/utils";

type Process = keyof typeof _Processes;

class _Processes {
	ExtensionInitialization = new DeferredPromise<void>();
	TabCreation = new DeferredPromise<void>();
	TabAttachment = new DeferredPromise<void>();
	TabDetachment = new DeferredPromise<void>();
	TabRemoval = new DeferredPromise<void>();
	WindowCreation = new DeferredPromise<void>();
	WindowRemoval = new DeferredPromise<void>();
	WorkspaceSwitch = new DeferredPromise<void>();

	manualTabAddition = false;
	manualTabRemoval = false;

	constructor() {
		// this.ExtensionInitialization.finish();
		// this.TabAttachment.finish();
		// this.TabCreation.finish();
		// this.TabDetachment.finish();
		// this.TabRemoval.finish();
		// this.WindowCreation.finish();
		// this.WindowRemoval.finish();
		// this.WorkspaceSwitch.finish();
	}
}

export const Processes = new _Processes();
