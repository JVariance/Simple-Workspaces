import type Browser from "webextension-polyfill";
import { WorkspaceStorage, TabMenuMove } from "../../Entities";

export function menusOnShown(
	info: Browser.Menus.OnShownInfoType,
	tab: Browser.Tabs.Tab
) {
	console.info("browser.menus.onShown");
	const workspaces = Array.from(
		WorkspaceStorage.windows.get(tab.windowId!)!.workspaces.values()
	).filter(({ active }) => !active);

	TabMenuMove.update({
		workspaces,
	});
}
