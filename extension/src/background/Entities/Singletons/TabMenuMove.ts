import Browser, { i18n } from "webextension-polyfill";

class TabMenuMove {
	#parentId!: string;
	private static _instance: TabMenuMove;

	private constructor() {}

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}

	init(workspaces: Ext.Workspace[]) {
		return this.update({ workspaces });
	}

	#createParentMenu() {
		this.#parentId = Browser.menus.create({
			id: "tab-menu-move",
			title: i18n.getMessage("send_to_workspace"),
			contexts: ["tab"],
			// enabled: false,
		}) as string;
	}

	async update({
		// windowId,
		workspaces,
	}: {
		// windowId: number;
		workspaces: Ext.Workspace[];
	}) {
		console.info("update TabMenu");

		await Browser.menus.removeAll();
		this.#createParentMenu();

		console.log("update tabmenu", { workspaces });

		workspaces
			.filter(({ active }) => !active)
			.forEach((workspace) => {
				Browser.menus.create({
					id: `workspace-menu_${workspace.UUID}`,
					title: `${workspace.icon} ${workspace.name}`,
					contexts: ["tab"],
					type: "normal",
					parentId: this.#parentId,
				});
			});

		Browser.menus.create({
			id: `create-workspace-menu`,
			title: i18n.getMessage("create_new_workspace"),
			contexts: ["tab"],
			type: "normal",
			parentId: this.#parentId,
		});

		Browser.menus.refresh();
	}
}

export default TabMenuMove.Instance;
