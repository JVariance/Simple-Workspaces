import Browser from "webextension-polyfill";

export class TabMenu {
	#parentId;

	constructor() {
		this.#parentId = Browser.menus.create({
			id: "rootMenu",
			title: "Send to Workspace",
			contexts: ["tab"],
			// enabled: false,
		});
	}

	init(workspaces: Ext.Workspace[]) {
		return new Promise(async (resolve) => {
			workspaces.forEach((workspace) => {
				Browser.menus.create({
					id: `tab-submenu-${workspace.id}`,
					title: workspace.name,
					contexts: ["tab"],
					type: "radio",
					parentId: this.#parentId,
				});

				return resolve(true);
			});
		});
	}

	#createParentMenu() {
		this.#parentId = Browser.menus.create({
			id: "tab-menu",
			title: "Send to Workspace",
			contexts: ["tab"],
			// enabled: false,
		});
	}

	update({
		// windowId,
		workspaces,
	}: {
		// windowId: number;
		workspaces: Ext.Workspace[];
	}) {
		return new Promise(async (resolve) => {
			await Browser.menus.removeAll();
			this.#createParentMenu();
			console.info("update", { workspaces });
			workspaces.forEach((workspace) => {
				Browser.menus.create({
					id: `workspace-menu_${workspace.id}`,
					title: `${workspace.icon} ${workspace.name}`,
					contexts: ["tab"],
					type: "normal",
					parentId: this.#parentId,
				});

				Browser.menus.refresh();

				return resolve(true);
			});
		});
	}
}
