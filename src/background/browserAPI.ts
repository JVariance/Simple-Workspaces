import Browser from "webextension-polyfill";

export function extractNumbersFromString(str: string) {
	const regex = /(\d+)/g;
	return str.match(regex)?.map((stringedNum) => parseInt(stringedNum)) || [];
}

export function hideTab(tabId: number) {
	return hideTabs([tabId]);
}

export async function hideTabs(tabIds: number[]) {
	// tested
	if (!tabIds?.length) return [];

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

	return { hiddenIds, errorIds };
}

export async function removeTabs(tabIds: number[]) {
	// untested
	if (!tabIds?.length) return [];

	const errorIds: number[] = [];

	async function _removeTabs(tabIds: number[]) {
		try {
			await Browser.tabs.remove(tabIds);
			return [];
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

export async function queryTabs(query: Browser.Tabs.QueryQueryInfoType = {}) {
	try {
		return await Browser.tabs.query(query);
	} catch (e) {
		return e;
	}
}

export async function updateFirstValidTab(
	tabIds: number[],
	updateInfo: Browser.Tabs.UpdateUpdatePropertiesType = {}
) {
	if (!tabIds?.length) return undefined;

	async function updateTab(tabId: number) {
		try {
			const updatedTab = await Browser.tabs.update(tabId, updateInfo);
			return updatedTab;
		} catch (e) {
			tabIds.shift();
			if (!tabIds.length) return undefined;
			return updateTab(tabIds[0]);
		}
	}

	const updatedTab = await updateTab(tabIds[0]);

	return updatedTab;
}
