import { DeferredPromise } from "@root/utils";

type Process = keyof typeof Processes;

export class Processes {
	static ExtensionInitialization = new DeferredPromise<void>();
	static TabCreation = new DeferredPromise<void>();
	static TabAttachment = new DeferredPromise<void>();
	static TabDetachment = new DeferredPromise<void>();
	static TabRemoval = new DeferredPromise<void>();
	static WindowCreation = new DeferredPromise<void>();
	static WindowRemoval = new DeferredPromise<void>();

	constructor() {
		Processes.ExtensionInitialization.finish();
		Processes.TabAttachment.finish();
		Processes.TabCreation.finish();
		Processes.TabDetachment.finish();
		Processes.TabRemoval.finish();
		Processes.WindowCreation.finish();
		Processes.WindowRemoval.finish();
	}
}
