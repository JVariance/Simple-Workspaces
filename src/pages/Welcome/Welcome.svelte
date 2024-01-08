<script lang="ts">
	import "@root/app.postcss";
	import Browser from "webextension-polyfill";
</script>

<div id="wrapper" class="w-full h-full p-8">
	<h1>Moin</h1>
	<!-- <a href="about:preferences#browserRestoreSession" target="_blank"
		>restore session</a
	> -->
	You may want to enable the "open previous windows and tabs" option in preferences.
	<button
		onclick={(e) => {
			window.navigator.clipboard.writeText(
				"about:preferences#browserRestoreSession"
			);
			Browser.tabs.create({ active: true });
		}}>copy</button
	>
</div>

<style>
	:global(body) {
		@apply m-0 p-0 w-[100dvw] h-[100dvh];
	}
</style>
