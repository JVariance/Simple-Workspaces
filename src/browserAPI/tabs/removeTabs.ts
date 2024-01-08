import Browser from "webextension-polyfill";
import { extractNumbersFromString } from "../utils";

async function sequentialRemoveTabs(tabIds: number[]) {
	if (!tabIds?.length) return { removedIds: [], errorIds: [] };

	const errorIds: number[] = [];
	const removedIds: number[] = [];

	const promises = tabIds.map((tabId) =>
		Browser.tabs
			.remove(tabId)
			.then(() => {
				removedIds.push(tabId);
				return tabId;
			})
			.catch((e) => {
				errorIds.push(tabId);
				return tabId;
			})
	);

	await Promise.all(promises);
	return { removedIds, errorIds };
}

async function batchRemoveTabs(tabIds: number[]) {
	// tested

	if (!tabIds?.length) return { removedIds: [], errorIds: [] };

	const errorIds: number[] = [];

	async function _removeTabs(tabIds: number[]) {
		try {
			await Browser.tabs.remove(tabIds);
			return tabIds;
		} catch (e) {
			const error = e as Error;
			const errorId = extractNumbersFromString(error.message)[0];
			tabIds = tabIds.filter((tabId) => tabId !== errorId);
			errorIds.push(errorId);
			if (!tabIds.length) return [];
			return _removeTabs(tabIds);
		}
	}

	const removedIds = await _removeTabs(tabIds);
	return { removedIds, errorIds };
}

export function removeTabs(tabIds: number[], batch = false) {
	return batch ? batchRemoveTabs(tabIds) : sequentialRemoveTabs(tabIds);
}
