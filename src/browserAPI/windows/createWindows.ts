import Browser from "webextension-polyfill";

export async function createWindows(
	windowProps: Browser.Windows.CreateCreateDataType[]
) {
	const errorIndexes: number[] = [];
	const createdWindows: Browser.Windows.Window[] = [];

	const promises = [];
	for (let [i, props] of windowProps.entries()) {
		try {
			promises.push(
				Browser.windows.create(props).then((window) => {
					createdWindows.push(window);
				})
			);
		} catch (e) {
			errorIndexes.push(i);
		}
	}

	await Promise.all(promises);

	return { createdWindows, errorIndexes };
}
