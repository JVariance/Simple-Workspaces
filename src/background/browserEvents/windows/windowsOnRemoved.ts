import WorkspaceStorage from "../../WorkspaceStorage";

export async function windowsOnRemoved(windowId: number) {
	if (WorkspaceStorage.windows.size > 1) {
		await WorkspaceStorage.removeWindow(windowId);
	}
}
