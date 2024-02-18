import type Browser from "webextension-polyfill";
import { WorkspaceStorage, TabMenuMove, TabMenuCookies } from "../../Entities";

export function menusOnShown(
	info: Browser.Menus.OnShownInfoType,
	tab: Browser.Tabs.Tab
) {
	console.info("browser.menus.onShown");
	const workspaces = WorkspaceStorage.windows
		.get(tab.windowId!)!
		.workspaces.filter(({ active }) => !active);

	TabMenuMove.update({
		workspaces,
	});
	TabMenuCookies.update();
}
