import Browser from "webextension-polyfill";

type WindowValueObj = { id: number; key: string; value: string };

async function sequentialSetWindowValues(windows: WindowValueObj[]) {
	if (!windows?.length) return { setWindowIds: [], errorIds: [] };

	const errorIds: number[] = [];
	const setWindowIds: number[] = [];

	const promises = windows.map((window) =>
		Browser.sessions
			.setWindowValue(window.id, window.key, window.value)
			.then(() => {
				setWindowIds.push(window.id);
				return window.id;
			})
			.catch((e) => {
				errorIds.push(window.id);
				return window.id;
			})
	);

	await Promise.all(promises);
	return { setWindowIds, errorIds };
}

export function setWindowValues(windows: WindowValueObj[]) {
	return sequentialSetWindowValues(windows);
}
