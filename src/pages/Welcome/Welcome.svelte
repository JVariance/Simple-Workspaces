<script lang="ts">
	import "@root/app.postcss";
	import Browser from "webextension-polyfill";
</script>

<div id="wrapper" class="w-full h-full p-8 flex justify-center items-center">
	<section
		id="view-1"
		class="dark:bg-neutral-800 rounded-xl aspect-square w-1/2 p-8"
	>
		<h2
			class="flex flex-wrap items-center gap-2 m-0 mb-12 text-lg first-letter:uppercase w-full justify-center"
		>
			<img
				src="/icon/icon-dark.svg"
				alt="logo"
				width="40"
				class="[filter:_invert()] dark:[filter:_invert(0)] w-40"
			/>
			<!-- <span class="basis-full w-full text-center text-2xl"
				>Simple Workspaces</span
			> -->
		</h2>
		<h1 class="text-4xl font-bold text-center mb-8">Welcome to Simple Workspaces!</h1>
		<!-- <a href="about:preferences#browserRestoreSession" target="_blank"
		>restore session</a
	> -->
		You may want to enable the "open previous windows and tabs" option in preferences.
		<button
			class="bg-neutral-900 px-2 py-1 rounded-md"
			onclick={(e) => {
				window.navigator.clipboard.writeText(
					"about:preferences#browserRestoreSession"
				);
				Browser.tabs.create({ active: true });
			}}
		>
			copy link
		</button>
	</section>
</div>

<style>
	:global(body) {
		@apply m-0 p-0 w-[100dvw] h-[100dvh];
	}
</style>
