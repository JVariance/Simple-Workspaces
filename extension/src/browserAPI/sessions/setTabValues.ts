import Browser from "webextension-polyfill";

type TabValueObj = { id: number; key: string; value: string };

async function sequentialSetTabValues(tabs: TabValueObj[]) {
	if (!tabs?.length) return { setTabIds: [], errorIds: [] };

	const errorIds: number[] = [];
	const setTabIds: number[] = [];

	const promises = tabs.map((tab) =>
		Browser.sessions
			.setTabValue(tab.id, tab.key, tab.value)
			.then(() => {
				setTabIds.push(tab.id);
				return tab.id;
			})
			.catch((e) => {
				errorIds.push(tab.id);
				return tab.id;
			})
	);

	await Promise.all(promises);
	return { setTabIds, errorIds };
}

export async function setTabValue(id: number, key: string, value: string) {
	return Browser.sessions
		.setTabValue(id, key, value)
		.then(() => value)
		.catch(() => undefined);
}

export function setTabValues(tabs: TabValueObj[]) {
	return sequentialSetTabValues(tabs);
}
