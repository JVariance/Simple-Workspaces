import { debounceFunc, immediateDebounceFunc } from "@root/utils";
import { WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";
import type Browser from "webextension-polyfill";

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

export async function commandsOnCommand(
	command: string,
	tab: Browser.Tabs.Tab | undefined
) {
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
		default:
			break;
	}
}
