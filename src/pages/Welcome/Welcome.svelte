<script lang="ts">
	import Icon from "@root/components/Icon.svelte";
	import DefaultWorkspaces from "@root/components/ViewBlocks/DefaultWorkspaces.svelte";
	import { onMount, type Snippet } from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Layout from "../Special_Pages/Layout.svelte";
	import Shortcuts from "@root/components/ViewBlocks/Shortcuts.svelte";
	import Info from "@root/components/Info.svelte";
	import Logo from "@root/components/Logo.svelte";

	const viewCount = 4;
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
		class="swipe-item h-full shadow-lg shadow-[--section-shadow-color] w-[100cqw] p-8 @xl:aspect-square overflow-auto relative [scrollbar-width:none]"
	>
		{@render content()}
	</section>
{/snippet}

{#snippet ViewStart()}
	{#snippet content()}
		<div class="w-full h-full grid gap-16 items-center grid-cols-1 grid-rows-2">
			<div class="flex gap-6 flex-wrap items-center row-start-1 col-span-full self-end justify-center">
				<Logo
					class="w-28"
					draggable="false"
				/>
				<h1 class="text-4xl">
					<!-- {i18n.getMessage('welcome_welcome_message')}! -->
					Welcome to
					<br/>
					<span class="font-bold">Simple Workspaces!</span>
				</h1>
			</div>
			<button 
				class="primary-btn font-semibold text-center row-start-2 col-start-1 justify-self-end mb-16 self-end flex gap-2 items-center"
				onclick={() => nextSection()}
			>
				<Icon icon="next-filled"/>
				{i18n.getMessage('lets_get_you_started')}!
			</button>
		</div>
		<!-- <a href="about:preferences#browserRestoreSession" target="_blank"
		>restore session</a
		> -->
		<div class="touch-icon absolute bottom-4 left-1/2 -translate-x-1/2 text-[rgba(0_0_55_/_0.25)]">
			<Icon icon="touch" width={42} class="-translate-x-1/4" />
		</div>
	{/snippet}
	{@render ViewSection([1, content])}
{/snippet}
{#snippet ViewConfig()}
	{#snippet content()}
		<h2 class="m-0 mb-8 text-xl font-semibold first-letter:uppercase">{i18n.getMessage('configure_firefox')} ({i18n.getMessage('optional')})</h2>

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
		<div class="mt-8">
			<p>
				{@html i18n.getMessage('welcome_container_feature_proposal')}.
			</p>
			<ul class="flex flex-wrap gap-2 mt-2">
				{#each ['privacy.userContext.enabled', 'privacy.userContext.ui.enabled'] as entry, i}
					<li>
						<button 
							class="
								px-2 py-1 bg-indigo-400 hover:bg-indigo-500 text-indigo-950 rounded-full w-fit flex gap-2 cursor-pointer items-center
								group overflow-clip
							" 
							onclick={(e) => {
								navigator.clipboard.writeText(entry);
								e.currentTarget.querySelector('.copy-icon').dataset.animation = 'flyOut';
								e.currentTarget.querySelector('.success-icon').dataset.animation = 'flyIn';
								console.info(e.currentTarget);
								setTimeout((currentTarget) => {
									console.info(e.currentTarget);
									currentTarget.querySelector('.copy-icon').dataset.animation = 'flyIn';
									currentTarget.querySelector('.success-icon').dataset.animation = 'flyOut';
								}, 1000, e.currentTarget);
							}}
						>
							<div class="grid">
								<!-- <span class="select-none w-6 aspect-square rounded-full font-bold bg-indigo-600 flex items-center justify-center">{i + 1}</span> -->
								<span class="animated-icon copy-icon" data-animation=""><Icon icon="copy" width={20}/></span>
								<span class="animated-icon success-icon translate-y-[120%]" data-animation=""><Icon icon="check" width={20}/></span>
							</div>
							<span class="-mt-[0.1rem]">{entry}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/snippet}
	{@render ViewSection([2, content])}
{/snippet}
{#snippet ViewDefaultWorkspaces()}
	{#snippet content()}
		<div class="h-max flex flex-wrap">
			<h2 class="m-0 mb-8 text-xl font-semibold first-letter:uppercase">{i18n.getMessage('default_workspaces')}</h2>
			<!-- <Info>
				{i18n.getMessage('changes_will_apply_for_new_windows')}
			</Info> -->
			<p class="mb-8 basis-full">
				{i18n.getMessage('welcome_default_workspaces_message')}.
			</p>
			<DefaultWorkspaces dndFinish={() => {swiping = false; scrollViewIntoView();}} />
		</div>
	{/snippet}
	{@render ViewSection([3, content])}
	{/snippet}
{#snippet ViewShortcuts()}
	{#snippet content()}
		<h2 class="m-0 mb-8 text-xl flex gap-2 items-center font-semibold">
			<span class="first-letter:uppercase">{i18n.getMessage('shortcuts')}</span>
		</h2>
		<Info class="w-full">
			{@html i18n.getMessage('you_can_edit_shortcuts_for_commands_in_the_addons_page')}
		</Info>
		<Shortcuts />
	{/snippet}
	{@render ViewSection([4, content])}	
{/snippet}


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
			{@render ViewConfig()}
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

<style lang="postcss">
	/* :global(body) {
		@apply m-0 p-0 w-[100dvw] h-[100dvh] dark:bg-[#1c1b22];
	} */

	:global(body.js-enabled #wrapper) {
		scrollbar-width: none;
	}

	:root {
		--body-bg: #625eb7;
		/* 
			section-bg: #241742, #531fc4, #524abd, #4e4a88, #403d77
		*/
		--section-bg: #5524c8;
		--section-shadow-color: #8f8aee;
	}

	section.swipe-item {
		--border-width: 0.1rem;
		/* background: linear-gradient(to right, var(--section-bg), var(--section-bg)), linear-gradient(to right, #c6c4f4, #8c88e3); */
		/* background-size: 100%, calc(100% + var(--border-width) * 2);
  	background-clip: padding-box, border-box;
		box-sizing: border-box;
		background-position: calc(var(--border-width) * -1);
		border-radius: 1rem;
		border: var(--border-width) solid transparent;
		background-origin: border-box; */
		/* background-image: url("/images/mesh-6.png");
  	background-size: cover;
		background-position: right; */
		background: rgba(0 0 55 / 0.25);
		backdrop-filter: blur(10px);
		border-radius: 1rem;
		box-shadow: none;
	}

	:global(body) {
		@apply bg-[--body-bg];
		/* background-image: radial-gradient(color-mix(in srgb, var(--body-bg) 90%, black) 0.55px, var(--body-bg) 2px);
		background-size: 11px 11px; */
		background-image: url("/images/mesh-6.png");
		background-size: cover;
	}

	:global(body:not(.js-enabled)) {
		#view-buttons {
			@apply !hidden;
		}
	}

	/* :global(.primary-btn){
		@apply bg-[#8c88e3] hover:bg-[#746edd] focus:bg-[#746edd] text-black border-none;
	}

	:global(.secondary-btn){
		@apply bg-[#eae9ff] hover:bg-[#e1e0f7] focus:bg-[#e1e0f7] text-[#59586f] border-none;
	} */

	:global(details, summary) {
		@apply !border-[#8c88e3];
	}

	:global(kbd){
		@apply bg-[#8c88e3] text-black border-[#807cd5];
		box-shadow: inset 0 5px #9f9ce3;
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

	.primary-btn {
		/* @apply bg-indigo-400 hover:bg-indigo-500;
		 */
		background: rgba(255 255 255 / 0.25);
  	padding: 0.5rem;
  	border-radius: 6px;
  	backdrop-filter: blur(50px);
  	border: 1px solid rgba(255 255 255 / 0.25);
  	font-size: larger;
	}

	.animated-icon {
		grid-column: 1;
		grid-row: 1;
		animation-duration: 0.5s;
		animation-fill-mode: both;
	}

	:global([data-animation=flyIn]) {
		animation-name: flyIn;
	}

	:global([data-animation=flyOut]) {
		animation-name: flyOut;
	}
</style>
