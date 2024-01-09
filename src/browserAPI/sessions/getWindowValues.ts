import Browser from "webextension-polyfill";

type WindowValueObj = { id: number; key: string };

async function sequentialGetWindowValues(windows: WindowValueObj[]) {
	if (!windows?.length) return { gottenValues: [], errorIds: [] };

	const errorIds: number[] = [];
	const gottenValues: { windowId: number; value: any }[] = [];

	const promises = windows.map((window) =>
		Browser.sessions
			.getWindowValue(window.id, window.key)
			.then((value) => {
				gottenValues.push({ windowId: window.id, value });
			})
			.catch((e) => {
				errorIds.push(window.id);
			})
	);

	await Promise.all(promises);
	return { gottenValues, errorIds };
}

export async function getWindowValue<T = any>(windowId: number, key: string) {
	return Browser.sessions
		.getWindowValue(windowId, key)
		.then((value) => value as T)
		.catch(() => undefined);
}

export function getWindowValues(windows: WindowValueObj[]) {
	return sequentialGetWindowValues(windows);
}
