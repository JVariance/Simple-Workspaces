<script lang="ts">
	import "@root/app.postcss";
	import { onMount } from "svelte";
	import Browser from "webextension-polyfill";

	let js_enabled = $state(false);
	let activeView = $state(1);
	let swiping = $state(false);
	let startSwipePos = $state({ x: 0, y: 0 });
	let endSwipePos = $state({ x: 0, y: 0 });
	let currentSwipePos = $state({ x: 0, y: 0 });
	const minSwipeDistance = $state(100);

	function swipeStart(
		event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		const target = event.target as HTMLElement;

		if (
			!target.classList.contains("swipe-item") &&
			!target.closest(".swipe-item")
		)
			return;
		swiping = true;
		startSwipePos.x = event.clientX;
		startSwipePos.y = event.clientY;
		currentSwipePos = { ...startSwipePos };
	}

	function swipeMove(
		event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		if (swiping) {
			const deltaPos = {
				x: currentSwipePos.x - event.clientX,
				y: currentSwipePos.y - event.clientY,
			};
			document.getElementById("wrapper")?.scrollBy({ left: deltaPos.x * 5 });
			currentSwipePos.x = event.clientX;
			currentSwipePos.y = event.clientY;
		}
	}

	function swipeEnd(
		event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		if (swiping) {
			finishSwipe(event);
		}

		swiping = false;
	}

	function scrollViewIntoView() {
		document.getElementById(`view-${activeView}`)?.scrollIntoView();
	}

	function cancelSwipe(
		event: PointerEvent & {
			target: HTMLElement;
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (
			swiping &&
			!event.target.classList.contains("swipe-item") &&
			!event.target.closest(".swipe-item")
		) {
			swiping = false;
			finishSwipe(event);
		}
	}

	function finishSwipe(
		event: PointerEvent & {
			target: HTMLElement;
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		endSwipePos.x = event.clientX;
		endSwipePos.y = event.clientY;

		const deltaPos = {
			x: startSwipePos.x - endSwipePos.x,
			y: startSwipePos.y - endSwipePos.y,
		};

		const xDirection = deltaPos.x < 0 ? "left" : "right";

		if (Math.abs(deltaPos.x) > minSwipeDistance) {
			switch (xDirection) {
				case "left":
					activeView = Math.max(1, activeView - 1);
					break;
				case "right":
					activeView = Math.min(2, activeView + 1);
					break;
				default:
					break;
			}
		}

		scrollViewIntoView();
	}

	onMount(() => {
		document.body.classList.add("js-enabled");
		js_enabled = true;
	});
</script>

<div class="w-full h-full p-4 @container">
	<div
		id="wrapper"
		class:swiping
		class="
			w-1/2 h-full grid grid-cols-[100%] grid-flow-col gap-2 p-0 justify-items-center overflow-auto content-center
			scroll-smooth snap-both snap-mandatory overscroll-x-contain @container mx-auto
			[&.swiping]:cursor-grabbing
			[&.swiping]:select-none
		"
		on:pointerdown={swipeStart}
		on:pointermove={swipeMove}
		on:pointerup={swipeEnd}
		on:pointerleave={cancelSwipe}
	>
		<!-- on:pointerleave={cancelSwipe} -->
		<section
			id="view-1"
			class="swipe-item dark:bg-neutral-800 rounded-xl w-[100cqw] p-8"
		>
			<h2
				class="flex flex-wrap items-center gap-2 m-0 mb-12 text-lg first-letter:uppercase w-full justify-center"
			>
				<img
					src="/icon/icon-dark.svg"
					alt="logo"
					width="40"
					class="[filter:_invert()] dark:[filter:_invert(0)] w-40"
					draggable="false"
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
		<section
			id="view-2"
			class="swipe-item dark:bg-neutral-800 rounded-xl w-[100cqw] h-full p-8"
		></section>
	</div>
	<div
		id="view-buttons"
		class="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2"
	>
		{#each Array(2) as _, i}
			<button
				class:active={activeView === i + 1}
				class="rounded-full w-3 h-3 [&.active]:bg-[#fde9ff]"
				onclick={() => {
					activeView = i + 1;
					scrollViewIntoView();
				}}
			>
			</button>
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
