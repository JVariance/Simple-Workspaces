import Browser from "webextension-polyfill";

export class TabMenu {
	#parentId!: string;

	constructor() {}

	init(workspaces: Ext.Workspace[]) {
		return this.update({ workspaces });
	}

	#createParentMenu() {
		this.#parentId = Browser.menus.create({
			id: "tab-menu",
			title: "Send to Workspace",
			contexts: ["tab"],
			// enabled: false,
		}) as string;
	}

	update({
		// windowId,
		workspaces,
	}: {
		// windowId: number;
		workspaces: Ext.Workspace[];
	}): Promise<boolean> {
		return new Promise(async (resolve) => {
			await Browser.menus.removeAll();
			this.#createParentMenu();

			console.log("update tabmenu", { workspaces });

			workspaces
				.filter(({ active }) => !active)
				.forEach((workspace) => {
					Browser.menus.create({
						id: `workspace-menu_${workspace.id}`,
						title: `${workspace.icon} ${workspace.name}`,
						contexts: ["tab"],
						type: "normal",
						parentId: this.#parentId,
					});
				});

			Browser.menus.create({
				id: `create-workspace-menu`,
				title: "create new workspace",
				contexts: ["tab"],
				type: "normal",
				parentId: this.#parentId,
			});

			Browser.menus.refresh();
			return resolve(true);
		});
	}
}
