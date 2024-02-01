import Browser from "webextension-polyfill";
import { extractNumbersFromString } from "../utils";

// export function hideTab(tabId: number) {
// 	return hideTabs([tabId]);
// }

async function batchHideTabs(tabIds: number[]) {
	// tested
	if (!tabIds?.length) return { hiddenIds: [], errorIds: [], ignoredIds: [] };

	const errorIds: number[] = [];

	async function _hideTabs(tabIds: number[]) {
		try {
			const hiddenIds = await Browser.tabs.hide(tabIds);
			return hiddenIds;
		} catch (e) {
			const error = e as Error;
			const errorId = extractNumbersFromString(error.message)[0];
			tabIds = tabIds.filter((tabId) => tabId !== errorId);
			errorIds.push(errorId);
			if (!tabIds.length) return [];
			return _hideTabs(tabIds);
		}
	}

	const hiddenIds = await _hideTabs(tabIds);
	const ignoredIds = tabIds.filter(
		(tabId) => !hiddenIds.includes(tabId) && !errorIds.includes(tabId)
	);

	return { hiddenIds, errorIds, ignoredIds };
}

export async function hideTab(tabId: number) {
	return Browser.tabs
		.hide(tabId)
		.then((tabs) => tabs?.at(0))
		.catch(() => undefined);
}

export function hideTabs(tabIds: number | number[]) {
	typeof tabIds === "number" && (tabIds = [tabIds]);
	return batchHideTabs(tabIds);
}
