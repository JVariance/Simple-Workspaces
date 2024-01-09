import Browser from "webextension-polyfill";
import { extractNumbersFromString } from "../utils";
import { getTab } from "./getTab";

export async function batchHighlightTabs(
	tabIds: number[],
	windowId?: number,
	populate = false
) {
	// tested

	if (!tabIds?.length) return { highlightedIds: [], errorIds: [] };

	const errorIds: number[] = [];

	async function _highlightTabs(tabIds: number[]) {
		try {
			await Browser.tabs.highlight({
				tabs: tabIds,
				...(windowId && { windowId }),
				populate,
			});
			return tabIds;
		} catch (e) {
			const error = e as Error;
			const errorId = extractNumbersFromString(error.message)[0];
			tabIds = tabIds.filter((tabId) => tabId !== errorId);
			errorIds.push(errorId);
			if (!tabIds.length) return [];
			return _highlightTabs(tabIds);
		}
	}

	const highlightedIds = await _highlightTabs(tabIds);
	return { highlightedIds, errorIds };
}

export async function batchHighlightTabs2(
	tabIds: number[],
	windowId?: number,
	populate = false
) {
	// tested

	if (!tabIds?.length) return { highlightedIds: [], errorIds: [] };

	const validTabIds = (await Promise.all(tabIds.map((tabId) => getTab(tabId))))
		.filter(Boolean)
		.map((tab) => tab!.id!);

	await Browser.tabs.highlight({
		tabs: validTabIds,
		...(windowId && { windowId }),
		populate,
	});

	return {
		highlightedIds: validTabIds,
		errorIds: tabIds.filter((tabId) => !validTabIds.includes(tabId)),
	};
}

export async function batchHighlightTabs3(
	tabIds: number[],
	windowId?: number,
	populate = false
) {
	//tested

	if (!tabIds?.length) return { highlightedIds: [], errorIds: [] };

	const [highlightedIds, errorIds] = (
		await Promise.all(tabIds.map((tabId) => getTab(tabId)))
	).reduce(
		(acc, tab, i) => {
			tab ? acc[0].push(tab.id!) : acc[1].push(tabIds[i]);
			return acc;
		},
		[[], []] as [number[], number[]]
	);

	await Browser.tabs.highlight({
		tabs: highlightedIds,
		...(windowId && { windowId }),
		populate,
	});

	return {
		highlightedIds,
		errorIds,
	};
}

export async function highlightTab({
	tabIndex,
	windowId = undefined,
	populate = false,
}: {
	tabIndex: number;
	windowId?: number;
	populate?: boolean;
}) {
	return Browser.tabs
		.highlight({ tabs: [tabIndex], ...(windowId && { windowId }), populate })
		.then((window) => window)
		.catch(() => undefined);
}

export function highlightTabs({
	tabIndices,
	windowId,
	populate = false,
}: {
	tabIndices: number[];
	windowId: number;
	populate: boolean;
}) {
	return batchHighlightTabs3(tabIndices, windowId, populate);
}
