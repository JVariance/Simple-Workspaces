import type { ImportData } from "./importData";

export async function deminifyDataWithStringify(
	dataString: string
): Promise<ImportData> {
	let deminifiedDataString = dataString
		.replaceAll("_h", "https://")
		.replaceAll("_w", "www.")
		.replaceAll("_d", ".de")
		.replaceAll("_c", ".com")
		.replaceAll("_o", ".org")
		.replaceAll("_n", ".net")
		.replaceAll("_f", ".fr")
		.replaceAll("_g", ".gov")
		.replaceAll("_st", ".site")
		.replaceAll("_i", ".info")
		.replaceAll("_e", ".education")
		.replaceAll("_m", ".me")
		.replaceAll("_u", ".us")
		.replaceAll("_s", ".social")
		.replaceAll("_dv", ".dev");

	let deminifiedData = JSON.parse(deminifiedDataString);
	const codes = deminifiedData.codes;

	for (let [shortcode, value] of codes) {
		deminifiedDataString = deminifiedDataString.replaceAll(shortcode, value);
	}

	deminifiedData = JSON.parse(deminifiedDataString);
	delete deminifiedData.codes;

	return deminifiedData;
}
