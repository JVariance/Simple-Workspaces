import Browser from "webextension-polyfill";
import { extractNumbersFromString } from "../utils";

export async function batchShowTabs(tabIds: number[]) {
	// tested
	if (!tabIds?.length) return { shownIds: [], errorIds: [] };

	const errorIds: number[] = [];

	async function _showTabs(tabIds: number[]) {
		try {
			const shownIds = await Browser.tabs.hide(tabIds);
			return shownIds;
		} catch (e) {
			const error = e as Error;
			const errorId = extractNumbersFromString(error.message)[0];
			tabIds = tabIds.filter((tabId) => tabId !== errorId);
			errorIds.push(errorId);
			if (!tabIds.length) return [];
			return _showTabs(tabIds);
		}
	}

	const shownIds = await _showTabs(tabIds);

	return { shownIds, errorIds };
}
