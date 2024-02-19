import type Browser from "webextension-polyfill";
import { BrowserStorage } from "../Entities";

export async function cookiesOnChanged(
	changeInfo: Browser.Cookies.OnChangedChangeInfoType
) {
	const { cookieDuplicatedDomains } =
		await BrowserStorage.getCookieDuplicatedDomains();

	if (
		cookieDuplicatedDomains.includes(
			changeInfo.cookie.domain.replace("www", "")
		)
	) {
	}
}
