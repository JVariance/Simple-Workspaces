import { Processes, WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";
import { createTab } from "@root/background/browserAPIWrapper/tabCreation";
import * as API from "@root/browserAPI";
import { DeferredPromise, immediateDebounceFunc } from "@root/utils";
import Browser from "webextension-polyfill";

const runNewWorkspaceCommand = immediateDebounceFunc(
	newWorkspaceCommandHandler,
	150
);

const WorkspaceCommandInProgress = new DeferredPromise<void>();

async function newWorkspaceCommandHandler() {
	if (WorkspaceCommandInProgress.state === "pending") return;
	WorkspaceCommandInProgress.start();
	const newWorkspace =
		await WorkspaceStorage.activeWindow.addWorkspaceAndSwitch();
	informViews(WorkspaceStorage.activeWindow.windowId, "addedWorkspace", {
		workspace: newWorkspace,
	});
	WorkspaceCommandInProgress.finish();
}

async function createNewContainerTab() {
	const currentTab = (
		await Browser.tabs.query({
			currentWindow: true,
			active: true,
		})
	)?.at(0);

	console.info("createNewContainerTab");
	console.log(currentTab?.cookieStoreId);
	Processes.manualTabAddition = true;
	if (currentTab?.cookieStoreId?.split("-")[1] === "container") {
		const newTab = (await createTab(
			{
				active: true,
				cookieStoreId: currentTab.cookieStoreId,
				index: currentTab.index + 1,
			},
			WorkspaceStorage.activeWindow.activeWorkspace
		))!;

		await API.setTabValue(
			newTab.id!,
			"workspaceUUID",
			WorkspaceStorage.activeWindow.activeWorkspace.UUID
		);
	}
	Processes.manualTabAddition = false;
}

export async function commandsOnCommand(command: string) {
	console.info("commandsOnCommand", { command });
	switch (command) {
		case "new-workspace":
			runNewWorkspaceCommand();
			break;
		case "new-container-tab":
			createNewContainerTab();
			break;
		default:
			break;
	}
}
