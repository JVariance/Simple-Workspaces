<script lang="ts">
	import Icon from "@root/components/Icon.svelte";
	import DefaultWorkspaces from "@root/components/ViewBlocks/DefaultWorkspaces.svelte";
	import { onMount, type Snippet } from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Layout from "../Special_Pages/Layout.svelte";
	import Shortcuts from "@root/components/ViewBlocks/Shortcuts.svelte";
	import Info from "@root/components/Info.svelte";
	import Logo from "@root/components/Logo.svelte";
	import { intersect } from "svelte-intersection-observer-action";
	import OnMount from "@root/components/OnMount.svelte";

	const viewCount = 4;
	let js_enabled = $state(false);
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
		js_enabled = true;
	});
</script>

{#snippet ViewSection(id, content)}
	<section
		id="view-{id}" 
		class="
			swipe-item h-full shadow-lg shadow-[--section-shadow-color] w-[100cqw] @xl:aspect-square overflow-auto relative [scrollbar-width:none]
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
				w-full h-full grid gap-16 items-center grid-cols-[1fr_1fr]
				justify-center md:justify-start overflow-hidden
			"
		>
			<div 
				class="
					flex gap-6 flex-col row-start-1 col-start-1 justify-self-end
				"
			>
				<OnMount>
					<div id="logo-wrapper" class="relative mb-4 w-24 h-24">
						<Logo
							class="w-24 animate-fade-right animate-duration-1000"
							draggable="false"
						/>
					</div>
				</OnMount>
				<OnMount>
					<h1 class="text-4xl animate-fade-left animate-duration-1000">
						{i18n.getMessage('welcome_to')}
						<br/>
						<span class="font-bold">Simple Workspaces!</span>
					</h1>
				</OnMount>
				<OnMount>
					<button 
						id="start-button"
						class="
						primary-btn
						bg-[#c6c4f4] text-[#625eb7]
						text-center row-start-2 col-start-1 flex gap-2 items-center 
						p-2 rounded-md self-start
						animate-fade animate-duration-500 animate-delay-[1000ms]
						font-bold w-max
						"
						onclick={() => nextSection()}
					>
						<span class="-mt-[0.1rem]">{i18n.getMessage('lets_get_you_started')}!</span>
						<Icon icon="arrow-right-long" class="stroke-[0.9]"/>
					</button>
				</OnMount>
			</div>
			<OnMount>
				<div class="col-span-full row-start-1 self-end h-full overflow-hidden translate-y-16 -z-[1]">
					<img src="/images/simple-workspaces-welcome-page-sidebar.webp" alt="" class="object-contain h-full w-max ml-auto max-h-[866px] -translate-x-32">
				</div>
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

<div id="wrapper" class="w-[100cqw] h-[100cqh] grid">
	<div class="w-full h-dvh flex justify-center items-center">
		{@render ViewStart()}
	</div>
	<div class="flex flex-wrap gap-4 w-full h-dvh">
		{@render ViewConfig()}
		{@render ViewDefaultWorkspaces()}
	</div>
	<div class="w-full h-dvh">
		{@render ViewShortcuts()}
	</div>
</div>
	
<style lang="postcss">

	:global(body){
		@apply w-dvw h-dvh @container;
	}

	section {
		@apply rounded-3xl w-[95%] aspect-video h-auto self-center justify-self-center;
		box-shadow: inset 0 0 50px -21px rgba(0,0,0,0.1);
	}

	#logo-wrapper {
		&::after {
			@apply block absolute aspect-square rounded-full h-auto -z-[1];
			content: "";
			width: 62%;
			background: rgba(98 94 183 / 0.4);
			filter: blur(13px);
			transform: rotate(-41deg) skewX(25deg);
			top: 73px;
			left: 19%;
		}
	}
</style>
