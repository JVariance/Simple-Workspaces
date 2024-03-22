import Browser from "webextension-polyfill";

window.addEventListener("message", (e) => {
	console.info({ e });
	if (
		e.source == window &&
		e.data &&
		e.data?.tokens &&
		e.data?.message === "tokens"
	) {
		Browser.runtime.sendMessage({ msg: "tokens", tokens: e.data.tokens });
		setTimeout(() => window.close(), 3000);
	}
});
