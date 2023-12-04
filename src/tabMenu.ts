import Browser from "webextension-polyfill";

export class TabMenu {
	#menu;

	constructor() {
		this.#menu = Browser.menus.create({
			id: "tab-menu",
			title: "Send to Workspace",
			contexts: ["tab"],
			// enabled: false,
		});
	}

	init(workspaces: Workspace[]) {
		return new Promise(async (resolve) => {
			workspaces.forEach((workspace) => {
				Browser.menus.create({
					id: `tab-submenu-${workspace.id}`,
					title: workspace.name,
					contexts: ["tab"],
					type: "radio",
					parentId: "tab-menu",
				});

				return resolve(true);
			});
		});
	}
}
