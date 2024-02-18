import Browser, { i18n } from "webextension-polyfill";
import * as API from "@root/browserAPI";

class TabMenuCookies {
	#parentId!: string;
	private static _instance: TabMenuCookies;

	private constructor() {}

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}

	init() {
		return this.update();
	}

	#createParentMenu() {
		this.#parentId = Browser.menus.create({
			id: "tab-menu-cookies",
			title: i18n.getMessage("get_login_data_from_container"),
			contexts: ["tab", "page"],
			// enabled: false,
		}) as string;
	}

	async update() {
		console.info("update TabMenuCookies");

		await Browser.menus.removeAll();
		this.#createParentMenu();

		const containers = await Browser.contextualIdentities.query({});

		console.info({ containers });

		const currentTabCookieStoreId = (
			await API.queryTabs({
				active: true,
				currentWindow: true,
			})
		).tabs?.at(0)?.cookieStoreId;

		console.info({ currentTabCookieStoreId });

		const currentContainer =
			currentTabCookieStoreId && currentTabCookieStoreId !== "firefox-default"
				? await Browser.contextualIdentities.get(currentTabCookieStoreId)
				: null;

		console.log("update tabmenu cookies", { containers });

		[
			{
				name: "firefox-default",
				color: "",
				colorCode: "",
				cookieStoreId: "firefox-default",
				icon: "",
				iconUrl: "",
			},
		]
			.concat(containers)
			.filter(({ name }) => name !== currentContainer?.name)
			.forEach((container) => {
				Browser.menus.create({
					id: `container-menu_${container.name}`,
					title: `${container.name}`,
					contexts: ["tab", "page"],
					type: "normal",
					parentId: this.#parentId,
					icons: { 16: container.iconUrl },
				});
			});

		Browser.menus.refresh();
	}
}

export default TabMenuCookies.Instance;
