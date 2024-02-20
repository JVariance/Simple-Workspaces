<script lang="ts">
	import Icon from "@root/components/Icon.svelte";
	import DefaultWorkspaces from "@root/components/ViewBlocks/DefaultWorkspaces.svelte";
	import { onMount } from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Shortcuts from "@root/components/ViewBlocks/Shortcuts.svelte";
	import Info from "@root/components/Info.svelte";
	import Logo from "@root/components/Logo.svelte";
	import OnMount from "@root/components/OnMount.svelte";

	const viewCount = 4;
	let activeView = $state(1);
	let swiping = $state(false);
	let swipeStarted = $state(false);
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
		swipeStarted = true;
		startSwipePos.x = event.clientX;
		startSwipePos.y = event.clientY;
		currentSwipePos = { ...startSwipePos };
	}

	function swipeMove(
		event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		if(swipeStarted && !swiping && Math.abs(startSwipePos.x - event.clientX) > 20) {
			console.info("startSwiping");
			swiping = true;
		}
		
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
		swipeStarted = false;
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
			swipeStarted = false;
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
	});
</script>

{#snippet ViewSection(id, content)}
	<section
		id="view-{id}" 
		class="
			swipe-item h-full shadow-lg shadow-[--section-shadow-color] w-[100cqw] p-8 @xl:aspect-square overflow-auto relative [scrollbar-width:none]
			text-[large]
		"
	>
		{@render content()}
	</section>
{/snippet}

{#snippet ViewStart()}
	{#snippet content()}
		<div 
			class="
				w-full h-full grid gap-y-16 items-center grid-cols-[1rem_1fr_1rem] @[571px]:grid-cols-[1fr_30rem_1fr] grid-rows-[2fr_2fr_1fr]
				justify-center md:justify-start
			"
		>
			<div 
				class="
					flex gap-6 flex-wrap items-center row-start-1 col-start-2 self-end
					justify-center @[571px]:justify-between
				"
			>
				<OnMount>
					<Logo
						class="w-28 animate-fade-right animate-duration-1000"
						draggable="false"
					/>
				</OnMount>
				<OnMount>
					<h1 class="text-4xl animate-fade-left animate-duration-1000 text-center @[571px]:text-left">
						{i18n.getMessage('welcome_to')}
						<br/>
						<span class="font-bold">Simple Workspaces!</span>
					</h1>
				</OnMount>
			</div>
			<OnMount enableTimeOut={true} timeOutMs={0} timeOutCallback={() => {
				document.querySelector('video').playbackRate = '0.9';
			}}>
				<video 
					class="
					col-start-2 [clip-path:rect(13px_0px_calc(100%_-_13px)_100%_round_6px)] row-start-2
					animate-duration-1000 animate-fade-down
					" 
					src="/videos/video.mp4" 
					autoplay
					muted
					onended={(e) => setTimeout(() => {(e.target as HTMLVideoElement).play()}, 5000)}
				/>
			</OnMount>
			<OnMount>
				<button 
					id="start-button"
					class="
					primary-btn
					text-center row-start-3 col-start-2 flex gap-2 items-center 
					border p-2 rounded-md self-start
					animate-fade animate-duration-500 animate-delay-[1000ms]
					justify-self-center @[571px]:justify-self-end
					italic !font-medium text-white/80 hover:text-white focus:text-white
					"
					onclick={() => nextSection()}
				>
				<span class="-mt-[0.1rem]">{i18n.getMessage('lets_get_you_started')}!</span>
				<Icon icon="arrow-right-long" class="stroke-[0.9]"/>
			</button>
		</OnMount>
		</div>
		<!-- <a href="about:preferences#browserRestoreSession" target="_blank"
		>restore session</a
		> -->
		<!-- <div class="swipe-icon absolute bottom-4 left-1/2 -translate-x-1/2 text-white/25">
			<Icon icon="touch" width={42} class="-translate-x-1/4" />
		</div> -->
	{/snippet}
	{@render ViewSection(1, content)}
{/snippet}
{#snippet ViewConfig()}
	{#snippet content()}
		<h2 class="m-0 mb-8 text-xl font-semibold first-letter:uppercase">{i18n.getMessage('configure_firefox')} ({i18n.getMessage('optional')})</h2>

		<div>
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
		</div>
		<div class="mt-8">
			<p>
				{@html i18n.getMessage('welcome_container_feature_proposal')}.
			</p>
			<ul class="flex flex-wrap gap-2 mt-2">
				{#each ['privacy.userContext.enabled', 'privacy.userContext.ui.enabled'] as entry, i}
					<li>
						<button 
							class="
								px-2 py-1 primary-btn w-fit flex gap-2 cursor-pointer items-center
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
								<span class="animated-icon success-icon translate-y-[calc(100%_+_10px)]" data-animation=""><Icon icon="check" width={20}/></span>
							</div>
							<span class="-mt-[0.1rem]">{entry}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/snippet}
	{@render ViewSection(2, content)}
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
			<DefaultWorkspaces dndFinish={() => {swiping = false; swipeStarted = false; scrollViewIntoView();}} isWelcomePage={true} />
		</div>
	{/snippet}
	{@render ViewSection(3, content)}
	{/snippet}
{#snippet ViewShortcuts()}
	{#snippet content()}
		<h2 class="m-0 mb-8 text-xl flex gap-2 items-center font-semibold">
			<span class="first-letter:uppercase">{i18n.getMessage('shortcuts')}</span>
		</h2>
		<Info class="w-full mb-8">
			{@html i18n.getMessage('you_can_edit_shortcuts_for_commands_in_the_addons_page')}
		</Info>
		<Shortcuts />
	{/snippet}
	{@render ViewSection(4, content)}	
{/snippet}


<div id="noise" aria-hidden="true" />
<div class="w-[100dvw] max-w-[48rem] h-max relative border-[1rem] border-transparent">
	<div class="relative h-max rounded-2xl mx-auto overflow-hidden">
		<img 
			src="/images/abstract/marble.jpg" 
			alt="" 
			class="
				absolute inset-0 pointer-events-none [filter:hue-rotate(250deg)_opacity(40%)_saturate(240%)] w-full h-full object-cover object-bottom
			"
		/>
		<!-- [filter:hue-rotate(58deg)_opacity(0.1)]  -->
		<div
			id="wrapper"
			class:swiping
			class="
			w-full h-full grid grid-cols-[100%] gap-11 grid-flow-col justify-items-center items-center overflow-auto content-center
			scroll-smooth snap-both snap-mandatory overscroll-x-contain @container mx-auto
			[&.swiping]:cursor-grabbing
			[&.swiping]:select-none
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
		<div
			id="view-buttons"
			class="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2"
		>
			{#each Array(viewCount) as _, i}
				{@const viewNum = i + 1}
				<button
					class:active={activeView === viewNum}
					class="rounded-full w-3 h-3 [&.active]:bg-[#c6c4f4] dark:bg-neutral-800"
					onclick={() => {
						activeView = viewNum;
					}}
				>
				</button>
			{/each}
		</div>
	</div>
	<button
		onclick={previousSection}
		disabled={activeView <= 1}
		class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 p-1 flex gap-2 rounded-full h-max disabled:hidden"
		aria-label="Previous view"
	>
		<Icon icon="next-filled" class="rotate-180" />
	</button>
	<button
		onclick={nextSection}
		disabled={activeView >= viewCount}
		class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 p-1 flex gap-2 rounded-full h-max disabled:hidden"
		aria-label="Next view"
	>
		<Icon icon="next-filled" />
	</button>
</div>

<style lang="postcss">
	/* :global(body) {
		@apply m-0 p-0 w-[100dvw] h-[100dvh] dark:bg-[#1c1b22];
	} */

	:global(:is(:focus, :focus-visible)){
		outline-color: #ff65ee;
		outline-style: solid;
	}

	:global(body.js-enabled #wrapper) {
		scrollbar-width: none;
	}

	:root {
		--body-bg: #625eb7;
		--section-bg: #5524c8;
		--section-shadow-color: #8f8aee;
	}

	section.swipe-item {
		--border-width: 0.1rem;
		@apply rounded-2xl shadow-none;
		/* @apply backdrop-blur-sm; */
		background: rgba(0 0 55 / 0.3);
	}

	:global(body) {
		@apply bg-[--body-bg] h-[100dvh] w-[100dvw] grid items-center justify-center;
		background-image: url("/images/mesh-6.png");
		background-size: cover;
		color: light-dark(#fff, #fff);

		&::before{
			background-image: url('/images/abstract/welcome-bg.jpg');
			background-repeat: no-repeat;
			background-size: cover;
			background-blend-mode: luminosity;
			content: "";
			display: block;
			position: absolute;
			inset: 0;
			background-color: #625eb7;
			opacity: 0.1;
			background-position: center;
			background-size: cover;
		}
	}

	:global(body:not(.js-enabled)) {
		#view-buttons {
			@apply !hidden;
		}
	}

	:global(details) {
		--accordion-border-color: color-mix(in srgb, white 25%, transparent) !important;
	}

	:global(input, details :where(div, button)) {
		@apply !border-white/25;
	}

	:global(details summary) {
		--accordion-summary-hover-bg: color-mix(in srgb, white 25% ,transparent);
		--accordion-summary-hover-color: inherit;
	}

	:global(kbd){
		@apply bg-white/40 text-black border-white/40;
		box-shadow: inset 0 5px bg-white/80;
	}

	@keyframes rotate {
  	0% { transform: translateX(calc(-50% - 10px)) rotate(-10deg) }
  	20% { transform: translateX(calc(-50% + 10px)) rotate(10deg) }
		80% { transform: translateX(calc(-50% + 10px)) rotate(10deg) }
		100% { transform: translateX(calc(-50% - 10px)) rotate(-10deg) }
	}

	.touch-icon {
		animation: rotate 4s infinite;
	}

	:global(:is(.primary-btn, .secondary-btn)) {
		@apply rounded-md backdrop-blur-2xl p-2 border border-white/40 bg-[color-mix(in_srgb,_#5d4b84_90%,_transparent)] font-medium text-base;
		@apply hover:bg-[color-mix(in_srgb,_#5d4b84_80%,_transparent)] focus:bg-[color-mix(in_srgb,_#5d4b84_80%,_transparent)];
	}

	:global(:is(.btn.ghost)) {
		@apply bg-transparent;
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

	#noise {
		background: transparent url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAgAElEQVR4Xl3dL9RUVRfH8ZmupiloR7p2tKtd7dKVjna1axc62MWuHexgBzrv/e71fmZtn1mLNc/ce+45+9/Zf377zHB++PDh5d69e6dffvnl9Pr169O///57evr06envv/+ez99///3pnXfeOb377run999///TkyZNTr0ePHp0+++yzGd+4Tz755PTrr7+enj9/PmOa88cffzx9+OGHM9eXX3451//5559ZqzV6/fDDD3OvuXu9fPlyxnz00Uenr776auZo7o8//vg/NLZ2z9y/f3/oa2x03Lp1a2j96aefTgdvQ8ft27dnbHS0bnM3plfvrfn555/Pe/M1d6/m6Jl4it+e+/3330+//fbbXG/sN998M3/jsXHNFR3xEW+N671/XWtMNPUv/r/77ruhNdrOx2KXhNbNFm5Akz948GCYTHhv3rwZIhMKApu48SkhpfVKcE0ckxFOaN1LMAnMtYiIYcLofmvGTHNHT/eNa767d+9ehdpzrZ2Q/IvRrhPQVggFNF+MU3q09y/aU2xzdq9/eI3vaGM8zRUvrZfgk1FjmqN733777RgiA23++OmZL774Yp5JptGdkXY9xWbc52OySxNniT3UhO+9994Iu4kiPsX0OWG1SJruhfFtJY1pIRZqd7VY1yI64SfcrvX6448/RoGU0prdi57WINiU+fPPP5+ePXs2dLRWjPd8DPZqvcYklCzTPAkBbZ9++unM8fXXX88a3evV2BTW3L26jsYUcj6fR3DxF129t/Ma1zwpsc/Rm/L++uuvkWFjk2tz9Uzjm8eubS3yOB/CvfRAhCSUFBNBTRARCbHJ02IMsYYssb8TcNd7RVAEUEaLN2+v5k5wEZHAE1aENSYFJ8TWy9K6FoPN3Vx2YAr54IMPrkLrOWtlNNHRHBlY9Md095svZSeg7sVLdPVM96KntZKDnZ4MHj9+PM9xcd1n6Y1r/vhCh7+7vtdhYBlL/O/QEL2thY/zoYBL1pWGWBltYaYF025MxnQL9rftnTV2ffvfnvnzzz/neoJobMpuTK+Iar38cYpsKydw86Ysyk54be2YjKmeywrbtQm1V2OaW2yKxq61G3qm51N2RpFQo605ElDzZlzxnWFwgSmjVzT2d/JgmBlJdJvDzmmuhNy4jIfCG5+c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") center center;
		@apply w-full h-full absolute inset-0 opacity-50 -z-[1];
	}


	/* Dark purple */
	:global(body::before) {
		background-color: #625eb7;
		background-blend-mode: multiply;
		opacity: 1;
	}

	section.swipe-item {
		/* background: rgba(0 0 55 / 0.3); */
		background: rgba(0 0 55 / 0);
		backdrop-filter: blur(14px);
		border: 1px solid #fff1;
	}

	img {
		opacity: 0;
	}

	#start-button {
		color: #0e221b;
		font-style: normal;
		font-weight: 600;
		font-size: 16px;
		background: color-mix(in srgb, #a399b9 80%, white);
		border: 1px solid #fff3;
		background: #61d2ac;
		border: none;
		box-shadow: -3px 9px 19px -5px #2e4624;
		
		& ~ svg {
			stroke-width: 0.5;
		}
	}

</style>
