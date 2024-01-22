import { WorkspaceStorage } from "@root/background/Entities";
import { informViews } from "@root/background/informViews";
import type Browser from "webextension-polyfill";

export function themeOnUpdated(updateInfo: Browser.Theme.ThemeUpdateInfo) {
	WorkspaceStorage.windows.forEach((window) => {
		informViews(window.windowId, "themeChanged");
	});
}
