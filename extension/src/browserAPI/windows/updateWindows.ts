import Browser from "webextension-polyfill";

export async function updateWindows(
	windows: { id: number; props: Browser.Windows.UpdateUpdateInfoType }[]
) {
	if (!windows?.length) return { updatedIds: [], errorIds: [] };

	const errorIds: number[] = [];
	const updatedWindows: Browser.Windows.Window[] = [];
	const updatedIds: number[] = [];

	const promises = [];
	for (let window of windows) {
		promises.push(
			Browser.windows
				.update(window.id, window.props)
				.then((win) => {
					updatedWindows.push(win);
					updatedIds.push(window.id);
				})
				.catch((e) => {
					errorIds.push(window.id);
				})
		);
	}

	await Promise.all(promises);
	return { updatedWindows, updatedIds, errorIds };
}
