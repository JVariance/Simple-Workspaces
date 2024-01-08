import Browser from "webextension-polyfill";

export async function getTab(tabId: number) {
	try {
		const tab = await Browser.tabs.get(tabId);
		return tab;
	} catch (e) {
		return undefined;
	}
}
