import Browser from "webextension-polyfill";

export async function informViews(
	windowId: number,
	message: string,
	props: Record<string | symbol, any> = {}
) {
	console.info("bg - informViews -> " + message, props);
	Browser.runtime.sendMessage({ windowId, msg: message, ...props });
}
