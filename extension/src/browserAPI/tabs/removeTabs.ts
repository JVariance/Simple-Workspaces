import Browser from "webextension-polyfill";
import { extractNumbersFromString } from "../utils";
import { getTab } from "./getTab";

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

async function batchRemoveTabs3(tabIds: number[]) {
	if (!tabIds?.length) return { removedIds: [], errorIds: [] };

	const [removedIds, errorIds] = (
		await Promise.all(tabIds.map((tabId) => getTab(tabId)))
	).reduce(
		(acc, tab, i) => {
			tab ? acc[0].push(tab.id!) : acc[1].push(tabIds[i]);
			return acc;
		},
		[[], []] as [number[], number[]]
	);

	await Browser.tabs.remove(removedIds);

	return {
		removedIds,
		errorIds,
	};
}

export async function removeTab(tabId: number) {
	return Browser.tabs
		.remove(tabId)
		.then(() => tabId)
		.catch(() => undefined);
}

export function removeTabs(tabIds: number | number[], batch = true) {
	typeof tabIds === "number" && (tabIds = [tabIds]);
	return batch ? batchRemoveTabs3(tabIds) : sequentialRemoveTabs(tabIds);
}
