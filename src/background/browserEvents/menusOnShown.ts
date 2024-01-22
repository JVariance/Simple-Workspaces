import type Browser from "webextension-polyfill";
import WorkspaceStorage from "../WorkspaceStorage";
import TabMenu from "../TabMenu";

export function menusOnShown(
	info: Browser.Menus.OnShownInfoType,
	tab: Browser.Tabs.Tab
) {
	console.info("browser.menus.onShown");
	const workspaces = WorkspaceStorage.windows
		.get(tab.windowId!)!
		.workspaces.filter(({ active }) => !active);

	TabMenu.update({
		workspaces,
	});
}
