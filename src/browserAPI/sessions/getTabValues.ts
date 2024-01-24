import Browser from "webextension-polyfill";

type TabValueObj = { id: number; key: string };

async function sequentialGetTabValues(tabs: TabValueObj[]) {
	if (!tabs?.length) return { gottenValues: [], errorIds: [] };

	const errorIds: number[] = [];
	const gottenValues: { tabId: number; value: any }[] = [];

	const promises = tabs.map((tab) =>
		Browser.sessions
			.getTabValue(tab.id, tab.key)
			.then((value) => {
				gottenValues.push({ tabId: tab.id, value });
			})
			.catch((e) => {
				errorIds.push(tab.id);
			})
	);

	await Promise.all(promises);
	return { gottenValues, errorIds };
}

export function getTabValues(tabs: TabValueObj[]) {
	return sequentialGetTabValues(tabs);
}

export async function getTabValue<T = any>(
	tabId: number | undefined,
	key: string
) {
	if (!tabId) return undefined;
	return Browser.sessions
		.getTabValue(tabId, key)
		.then((value) => value as T)
		.catch(() => undefined);
}
