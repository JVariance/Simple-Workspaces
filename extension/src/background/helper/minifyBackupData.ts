import type { ExportData } from "./exportData";

function arrayLengthToShortCode(length: number) {
	return length.toString(36);
}

export async function minifyBackupData(minifiedData: ExportData) {
	const shortCodesKey = "codes";

	const windowData = minifiedData.windows;
	minifiedData[shortCodesKey] = [];

	const originMap = new Map();

	for (let [windowUUID, window] of Object.entries(windowData)) {
		const { w: workspaces } = window;

		for (let [workspaceUUID, workspace] of workspaces) {
			const { t: tabs } = workspace;

			for (let tab of tabs) {
				const { u: url } = tab;
				const { origin, pathname } = new URL(url);

				if (origin && origin !== "null" && origin !== "undefined") {
					if (originMap.has(origin)) {
						const currCount = originMap.get(origin);
						originMap.set(origin, currCount + 1);
					} else {
						originMap.set(origin, 1);
					}
				}

				if (
					pathname &&
					pathname !== "" &&
					pathname !== " " &&
					pathname !== "null" &&
					pathname !== "undefined"
				) {
					// This part reduces the file size immensely for many recurring terms. However, the file is larger for a few terms.

					const pathNameParts = pathname.split("/");
					for (let part of pathNameParts) {
						if (part === "" || part === " ") continue;
						// console.info({ part });
						if (originMap.has(part)) {
							const currCount = originMap.get(part);
							originMap.set(part, currCount + 1);
						} else {
							originMap.set(part, 1);
						}
					}
				}
			}
		}
	}

	const sortedOriginArray = [...originMap].toSorted(
		([key1, val1], [key2, val2]) => val2 - val1
	);
	const shortcodeMap = new Map();

	for (let i = 0, counter = 0; i < sortedOriginArray.length; i++) {
		const [origin, count] = sortedOriginArray[i] as [string, number];
		if (count === 0) continue;
		const shortcode = `:${arrayLengthToShortCode(counter++)}:`;

		if (origin.repeat(count).length < `,["${shortcode}","${origin}"]`.length) {
			counter--;
			continue;
		}

		shortcodeMap.set(shortcode, origin);
	}

	let minifiedDataString = JSON.stringify(minifiedData);

	for (let [shortcode, origin] of shortcodeMap.entries()) {
		minifiedDataString = minifiedDataString.replaceAll(origin, shortcode);
	}

	minifiedData = JSON.parse(minifiedDataString);
	for (let [shortcode, origin] of shortcodeMap.entries()) {
		minifiedData[shortCodesKey]!.push([shortcode, origin]);
	}

	return JSON.stringify(minifiedData)
		.replaceAll("https://", "_h")
		.replaceAll("www.", "_w")
		.replaceAll(".de", "_d")
		.replaceAll(".com", "_c")
		.replaceAll(".org", "_o")
		.replaceAll(".net", "_n")
		.replaceAll(".fr", "_f")
		.replaceAll(".gov", "_g")
		.replaceAll(".site", "_st")
		.replaceAll(".info", "_i")
		.replaceAll(".education", "_e")
		.replaceAll(".me", "_m")
		.replaceAll(".us", "_u")
		.replaceAll(".social", "_s")
		.replaceAll(".dev", "_dv");
}
