import { debounceFunc, immediateDebounceFunc } from "@root/utils";
import { Processes, WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";
import Browser from "webextension-polyfill";
import { createTab } from "@root/background/browserAPIWrapper/tabCreation";

const runSwitchWorkspaceCommand = immediateDebounceFunc(
	switchWorkspaceCommand,
	150
);

function switchWorkspaceCommand(direction: "next" | "prev") {
	switch (direction) {
		case "next":
			switchToNextWorkspace();
			break;
		case "prev":
			switchToPreviousWorkspace();
			break;
		default:
			break;
	}
}

function switchToNextWorkspace() {
	(async () => {
		const activeWorkspace =
			await WorkspaceStorage.activeWindow.switchToNextWorkspace();
		if (!activeWorkspace) return;
		informViews(
			WorkspaceStorage.activeWindow.windowId,
			"updatedActiveWorkspace",
			{
				UUID: activeWorkspace.UUID,
			}
		);
	})();
}
function switchToPreviousWorkspace() {
	(async () => {
		const activeWorkspace =
			await WorkspaceStorage.activeWindow.switchToPreviousWorkspace();
		if (!activeWorkspace) return;
		informViews(
			WorkspaceStorage.activeWindow.windowId,
			"updatedActiveWorkspace",
			{
				UUID: activeWorkspace.UUID,
			}
		);
	})();
}

const runNewWorkspaceCommand = immediateDebounceFunc(
	newWorkspaceCommandHandler,
	150
);

function newWorkspaceCommandHandler() {
	(async () => {
		const newWorkspace =
			await WorkspaceStorage.activeWindow.addWorkspaceAndSwitch();
		informViews(WorkspaceStorage.activeWindow.windowId, "addedWorkspace", {
			workspace: newWorkspace,
		});
	})();
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
		await createTab(
			{
				active: true,
				cookieStoreId: currentTab.cookieStoreId,
				index: currentTab.index + 1,
			},
			WorkspaceStorage.activeWindow.activeWorkspace
		);
	}
	Processes.manualTabAddition = false;
}

export async function commandsOnCommand(
	command: string,
	tab: Browser.Tabs.Tab | undefined
) {
	console.info("commandsOnCommand", { command });
	switch (command) {
		case "next-workspace":
			runSwitchWorkspaceCommand("next");
			break;
		case "previous-workspace":
			runSwitchWorkspaceCommand("prev");
			break;
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
