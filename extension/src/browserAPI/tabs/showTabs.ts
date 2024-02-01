import Browser from "webextension-polyfill";
import { extractNumbersFromString } from "../utils";
import { getTab } from "./getTab";

async function batchShowTabs(tabIds: number[]) {
	// tested
	if (!tabIds?.length) return { shownIds: [], errorIds: [] };

	const errorIds: number[] = [];

	async function _showTabs(tabIds: number[]) {
		try {
			const shownIds = await Browser.tabs.show(tabIds);
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

async function batchShowTabs3(tabIds: number[]) {
	if (!tabIds?.length) return { shownIds: [], errorIds: [] };

	const [shownIds, errorIds] = (
		await Promise.all(tabIds.map((tabId) => getTab(tabId)))
	).reduce(
		(acc, tab, i) => {
			tab ? acc[0].push(tab.id!) : acc[1].push(tabIds[i]);
			return acc;
		},
		[[], []] as [number[], number[]]
	);

	await Browser.tabs.show(shownIds);

	return {
		shownIds,
		errorIds,
	};
}

export async function showTab(tabId: number) {
	return Browser.tabs
		.show(tabId)
		.then(() => tabId)
		.catch(() => undefined);
}

export function showTabs(tabIds: number[]) {
	return batchShowTabs3(tabIds);
}
