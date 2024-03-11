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
		const p = document.createElement("p");
		p.textContent = "this window will close automatically in 3 seconds";
		document.body.appendChild(p);
	}
});
