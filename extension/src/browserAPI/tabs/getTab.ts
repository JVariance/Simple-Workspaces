import { isNullish } from "@root/utils";
import Browser from "webextension-polyfill";

export async function getTab(tabId: number | undefined | null) {
	if (isNullish(tabId)) return undefined;
	try {
		const tab = await Browser.tabs.get(tabId);
		return tab;
	} catch (e) {
		return undefined;
	}
}
