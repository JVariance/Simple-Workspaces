import Browser from "webextension-polyfill";

type TabProps = Browser.Tabs.CreateCreatePropertiesType;

export async function createTab(props: TabProps) {
	return Browser.tabs
		.create(props)
		.then((tab) => tab)
		.catch(() => undefined);
}

export async function createTabs(tabProps: TabProps[]) {
	const errorIndexes: number[] = [];
	const createdTabs: Browser.Tabs.Tab[] = [];

	const promises = [];
	for (let [i, props] of tabProps.entries()) {
		try {
			promises.push(
				Browser.tabs.create(props).then((tab) => {
					createdTabs.push(tab);
				})
			);
		} catch (e) {
			errorIndexes.push(i);
		}
	}

	await Promise.all(promises);

	return { createdTabs, errorIndexes };
}
