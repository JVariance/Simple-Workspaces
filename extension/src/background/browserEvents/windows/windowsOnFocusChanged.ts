import Browser from "webextension-polyfill";
import {WorkspaceStorage} from "../../Entities";

export function windowsOnFocusChanged(windowId: number) {
	if (windowId !== Browser.windows.WINDOW_ID_NONE) {
		WorkspaceStorage.focusedWindowId = windowId;
	}
}
