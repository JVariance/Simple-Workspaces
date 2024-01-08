import Browser from "webextension-polyfill";

export async function queryTabs(query: Browser.Tabs.QueryQueryInfoType = {}) {
	try {
		const tabs = await Browser.tabs.query(query);
		return { tabs, error: null };
	} catch (e) {
		return { tabs: null, error: e };
	}
}
