import Browser from "webextension-polyfill";

export async function updateFirstValidTab(
	tabIds: number[],
	updateInfo: Browser.Tabs.UpdateUpdatePropertiesType = {}
) {
	if (!tabIds?.length) return { updatedTab: null, errorIds: [] };
	const errorIds: number[] = [];

	async function updateTab(tabId: number) {
		try {
			const updatedTab = await Browser.tabs.update(tabId, updateInfo);
			return updatedTab;
		} catch (e) {
			errorIds.push(tabIds.shift()!);
			if (!tabIds.length) return null;
			return updateTab(tabIds[0]);
		}
	}

	const updatedTab = await updateTab(tabIds[0]);

	return { updatedTab, errorIds };
}

type TabUpdateObj = {
	id: number;
	props: Browser.Tabs.UpdateUpdatePropertiesType;
};

async function sequentialUpdateTabs(tabs: TabUpdateObj[]) {
	if (!tabs?.length) return { updatedIds: [], errorIds: [] };

	const errorIds: number[] = [];
	const updatedTabs: Browser.Tabs.Tab[] = [];
	const updatedIds: number[] = [];

	const promises = [];
	for (let tab of tabs) {
		promises.push(
			Browser.tabs
				.update(tab.id, tab.props)
				.then((_tab) => {
					updatedTabs.push(_tab);
					updatedIds.push(tab.id);
				})
				.catch(() => {
					errorIds.push(tab.id);
				})
		);
	}

	await Promise.all(promises);
	return { updatedTabs, updatedIds, errorIds };
}

export function updateTabs(tabs: TabUpdateObj[]) {
	return sequentialUpdateTabs(tabs);
}
