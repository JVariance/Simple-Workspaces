<script lang="ts">
	import "@root/styles/specialPages.postcss";
	import Icon from "@root/components/Icon.svelte";
	import DefaultWorkspaces from "@root/components/ViewBlocks/DefaultWorkspaces.svelte";
	import { onMount, type Snippet } from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Layout from "../Special_Pages/Layout.svelte";
	import Shortcuts from "@root/components/ViewBlocks/Shortcuts.svelte";
	import Info from "@root/components/Info.svelte";
	import Logo from "@root/components/Logo.svelte";

	const viewCount = 3;
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
					previousSection();
					break;
				case "right":
					nextSection();
					break;
				default:
					break;
			}
		}

		scrollViewIntoView();
	}

	function previousSection() {
		activeView = Math.max(1, activeView - 1);
	}

	function nextSection() {
		activeView = Math.min(viewCount, activeView + 1);
	}

	$effect(() => {
		activeView;
		scrollViewIntoView();
	});

	onMount(() => {
		document.body.classList.add("js-enabled");
		js_enabled = true;
	});
</script>

{#snippet ViewSection([id, content]: [number, Snippet])}
	<section
		id="view-{id}" 
		class="swipe-item h-full shadow-lg ring-1 dark:ring-0 shadow-purple-200 dark:shadow-black bg-purple-50 text-blue-950 dark:bg-[#23222b] dark:text-white rounded-xl w-[100cqw] p-8 aspect-square overflow-auto relative [scrollbar-width:none]"
	>
		{@render content()}
	</section>
{/snippet}

{#snippet ViewStart()}
	{#snippet content()}
		<h2
				class="flex flex-wrap items-center gap-2 m-0 mb-12 text-lg first-letter:uppercase w-full justify-center"
		>
			<Logo
				class="w-40"
				draggable="false"
			/>
				<!-- <span class="basis-full w-full text-center text-2xl"
			>Simple Workspaces</span
			> -->
		</h2>
		<h1 class="text-4xl font-bold text-center mb-8">
			{i18n.getMessage('welcome_welcome_message')}!
		</h1>
		<!-- <a href="about:preferences#browserRestoreSession" target="_blank"
		>restore session</a
		> -->
		{i18n.getMessage('you_may_want_to_enable_the_open_previous_windows_and_tabs_option_in_preferences')}.
		<button
			class="btn primary-btn px-2 py-1 mt-2"
			onclick={(e) => {
				window.navigator.clipboard.writeText(
					"about:preferences#browserRestoreSession"
				);
				Browser.tabs.create({ active: true });
			}}
		>
			<Icon icon="copy" width={20}/>
			{i18n.getMessage('copy_link_and_open_new tab')}
		</button>

		<div class="touch-icon absolute bottom-4 left-1/2 -translate-x-1/2 opacity-50">
			<Icon icon="touch" width={42} />
		</div>
	{/snippet}
	{@render ViewSection([1, content])}
{/snippet}
{#snippet ViewDefaultWorkspaces()}
	{#snippet content()}
		<div class="h-max flex flex-wrap">
			<h2 class="m-0 mb-4 text-xl font-semibold first-letter:uppercase">{i18n.getMessage('default_workspaces')}</h2>
			<!-- <Info>
				{i18n.getMessage('changes_will_apply_for_new_windows')}
			</Info> -->
			<p class="mb-8 basis-full">
				{i18n.getMessage('welcome_default_workspaces_message')}.
			</p>
			<DefaultWorkspaces dndFinish={() => {swiping = false; scrollViewIntoView();}} />
		</div>
	{/snippet}
	{@render ViewSection([2, content])}
	{/snippet}
{#snippet ViewShortcuts()}
	{#snippet content()}
		<h2 class="m-0 mb-4 text-xl flex gap-2 items-center font-semibold">
			<span class="first-letter:uppercase">{i18n.getMessage('shortcuts')}</span>
		</h2>
		<Info class="w-full">
			{i18n.getMessage('you_can_edit_shortcuts_for_commands_in_the_addons_page')}
		</Info>
		<Shortcuts />
	{/snippet}
	{@render ViewSection([3, content])}	
{/snippet}

<Layout>
	<div class="w-full h-[100dvh] p-4">
		<div class="relative h-full max-w-3xl mx-auto">
			<div
				id="wrapper"
				class:swiping
				class="
				w-full h-full grid grid-cols-[100%] grid-flow-col justify-items-center items-center overflow-auto content-center
				scroll-smooth snap-both snap-mandatory overscroll-x-contain @container mx-auto
				[&.swiping]:cursor-grabbing
				[&.swiping]:select-none
				scroll-p-8 p-8 gap-11
			"
				onpointerdown={swipeStart}
				onpointermove={swipeMove}
				onpointerup={swipeEnd}
				onpointerleave={cancelSwipe}
			>
				{@render ViewStart()}
				{@render ViewDefaultWorkspaces()}
				{@render ViewShortcuts()}
			</div>
			<button
				onclick={previousSection}
				disabled={activeView <= 1}
				class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 p-1 flex gap-2 rounded-full h-max disabled:hidden light:text-[#8c88e3]"
			>
				<Icon icon="next-filled" class="rotate-180" />
			</button>
			<button
				onclick={nextSection}
				disabled={activeView >= viewCount}
				class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 p-1 flex gap-2 rounded-full h-max disabled:hidden light:text-[#8c88e3]"
			>
				<Icon icon="next-filled" />
			</button>
			<div
				id="view-buttons"
				class="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2"
			>
				{#each Array(viewCount) as _, i}
					{@const viewNum = i + 1}
					<button
						class:active={activeView === viewNum}
						class="rounded-full w-3 h-3 [&.active]:bg-[#c6c4f4] bg-purple-100 dark:bg-neutral-700"
						onclick={() => {
							activeView = viewNum;
						}}
					>
					</button>
				{/each}
			</div>
		</div>
	</div>
</Layout>

<style lang="postcss">
	/* :global(body) {
		@apply m-0 p-0 w-[100dvw] h-[100dvh] dark:bg-[#1c1b22];
	} */

	:global(body.js-enabled #wrapper) {
		scrollbar-width: none;
	}

	:global(body:not(.js-enabled)) {
		#view-buttons {
			@apply !hidden;
		}
	}

	:global(.primary-btn){
		@screen light {
			@apply bg-[#8c88e3] hover:bg-[#746edd] focus:bg-[#746edd] text-white border-none;
		}
	}

	:global(.secondary-btn){
		@screen light {
			@apply bg-[#eae9ff] hover:bg-[#e1e0f7] focus:bg-[#e1e0f7] text-[#59586f] border-none;
		}
	}

	:global(details, summary) {
		@screen light {
			@apply !border-[#8c88e3];
		}
	}

	:global(kbd){
		@screen light {
			@apply bg-[#8c88e3] text-white border-[#807cd5];
  		box-shadow: inset 0 5px #9f9ce3;
		}
	}

	@keyframes rotate {
  	0% { transform: translateX(calc(-50% - 10px)) rotate(-10deg) }
  	20% { transform: translateX(calc(-50% + 10px)) rotate(10deg) }
		80% { transform: translateX(calc(-50% + 10px)) rotate(10deg) }
		100% { transform: translateX(calc(-50% - 10px)) rotate(-10deg) }
	}

	.touch-icon {
		animation: rotate 6s infinite;
	}
</style>
