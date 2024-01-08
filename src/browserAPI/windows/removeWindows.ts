import Browser from "webextension-polyfill";

export async function removeWindows(windowIds: number[]) {
	if (!windowIds?.length) return { removedIds: [], errorIds: [] };

	const errorIds: number[] = [];
	const removedIds: number[] = [];

	const promises = windowIds.map((windowId) =>
		Browser.windows
			.remove(windowId)
			.then(() => {
				removedIds.push(windowId);
				return windowId;
			})
			.catch((e) => {
				errorIds.push(windowId);
				return windowId;
			})
	);

	await Promise.all(promises);
	return { removedIds, errorIds };
}
