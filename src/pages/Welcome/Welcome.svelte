<script lang="ts">
	import "@root/app.postcss";
	import { onMount } from "svelte";
	import Browser from "webextension-polyfill";
	import { Swipe, SwipeItem } from "svelte-swipe";
	import type { SwipeEvents, SwipeProps } from "svelte-swipe/dist/components/Swipe.svelte";
	import type { SwipeItemEvents } from "svelte-swipe/dist/components/SwipeItem.svelte";

	let swipeComp: Swipe;
	let js_enabled = $state(false);
	let activeView = $state(0);
	let swipe_holder_height = $state(0);

	const swipeConfig: SwipeProps = {
		transitionDuration: 500
	};

	function heightChanged({ detail }) {
		console.info("height changed to " + detail.height);
		swipe_holder_height = detail.height;
	}

	onMount(() => {
		document.body.classList.add("js-enabled");
		js_enabled = true;
	});
</script>

{#snippet view1()}
<section id="view-1" class="dark:bg-neutral-800 rounded-xl {js_enabled ? 'w-full' : 'w-[100cqw]'} p-8">
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
	<h1 class="text-4xl font-bold text-center mb-8">
		Welcome to Simple Workspaces!
	</h1>
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
{/snippet}
{#snippet view2()}
	<section
		id="view-2"
		class="dark:bg-neutral-800 rounded-xl {js_enabled ? 'w-full' : 'w-[100cqw]'} h-full p-8"
	>
	</section>
{/snippet}

<div class="w-full h-full p-4 @container">
	{#if js_enabled}
		<div class="swipe-holder w-1/2 mx-auto flex justify-center items-center" style:height="{swipe_holder_height}px">
			<Swipe {...swipeConfig} on:change={({detail}) => {activeView = detail.active_item}} bind:this={swipeComp}>
				<SwipeItem allow_dynamic_height={true} on:swipe_item_height_change={heightChanged}>{@render view1()}</SwipeItem>
				<SwipeItem allow_dynamic_height={true} on:swipe_item_height_change={heightChanged}>{@render view2()}</SwipeItem>
			</Swipe>
		</div>
	{:else}
		<div
			id="wrapper"
			class="
				w-1/2 h-full grid grid-cols-[100%] grid-flow-col gap-2 p-0 justify-items-center overflow-auto content-center
				scroll-smooth snap-both snap-mandatory overscroll-x-contain @container mx-auto
			"
		>
			{@render view1()}
			{@render view2()}
		</div>
	{/if}
	<div
		id="view-buttons"
		class="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2"
	>
		{#each Array(2) as _, i}
			<button
				class:active={activeView === i}
				class="rounded-full w-3 h-3 [&.active]:bg-[#fde9ff]"
				onclick={() => {
					if(js_enabled) {
						activeView = i;
						swipeComp.goTo(activeView);
					} else {
						activeView = i + 1;
						document.getElementById(`view-${i + 1}`)?.scrollIntoView();
					}
				}}
			/>
		{/each}
	</div>
</div>

<style lang="postcss">
	:global(body) {
		@apply m-0 p-0 w-[100dvw] h-[100dvh];
	}

	:global(body.js-enabled #wrapper) {
		scrollbar-width: none;
	}

	:global(body:not(.js-enabled)) {
		#view-buttons {
			@apply !hidden;
		}
	}
</style>
