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
	import HomeWorkspace from "@root/components/ViewBlocks/HomeWorkspace.svelte";

	onMount(() => {
		document.body.classList.add("js-enabled");
	});
</script>

<Layout>
	<header class="flex h-16 sticky top-0 z-10 items-center mb-24 justify-center">
		<div
			class="
			flex flex-wrap items-center h-max p-2 justify-between
		bg-[--body-bg] rounded-full
			w-full sm:w-[500px] md:w-[700px] lg:w-[900px] xl:w-[1100px] 2xl:w-[1300px]
		"
		>
			<OnMount>
				<h1
					class="text-base animate-fade-left animate-duration-1000 flex gap-2 bg-[--badge-bg] rounded-full items-center py-2 px-4 text-[--heading-2-color]"
				>
					<Logo class="w-6 h-6" draggable="false" />
					<span class="text-base md:text-xl">Simple Workspaces</span>
				</h1>
			</OnMount>
			<p
				class="py-2 px-4 rounded-full text-base md:text-xl bg-[--badge-bg] text-[--heading-2-color]"
			>
				v{Browser.runtime.getManifest().version}
			</p>
		</div>
	</header>
	<main
		class="
			flex flex-wrap gap-8 w-3/4 sm:w-[400px] md:w-[600px] lg:w-[800px] xl:w-[1000px] 2xl:w-[1200px] mx-auto mb-8
			@container
		"
	>
		<section class="grid gap-4 md:gap-[7.5rem] basis-full max-w-[100cqw]">
			<h1
				class="
				grid gap-2
				font-bold max-w-[412px]
				text-4xl md:text-6xl
				text-[--heading-color]
				!leading-[1.1]
				animate-duration-1000 animate-fade-down
			"
			>
				<span class="[font-family:Noto_Color_Emoji]">🏠</span>
				{@html i18n.getMessage("the_new_home_of_your_tabs")}.
			</h1>
			<div
				class="relative rounded-2xl h-max animate-duration-1000 animate-fade-down"
			>
				<div
					class="blur-[454px] bg-[light-dark(#e8e7ff,#625eb7)] w-full h-auto aspect-[14/5] absolute top-0 left-0 right-0 -z-[2]"
					role="presentation"
				/>
				<div
					class="absolute inset-0 rounded-2xl [box-shadow:inset_0_0_10px_-8px_#625eb7]"
					role="presentation"
				/>
				<img
					src="/images/sidebar.webp"
					alt="sidebar"
					class="w-full relative -z-[1] rounded-2xl"
				/>
				<!-- <video
					class="
						w-full
						col-start-2 row-start-2
						relative -z-[1]
						rounded-2xl
					"
					src="/videos/video.mp4" 
					muted
					loop
				/> -->
			</div>
		</section>
		<section
			class="[background:_var(--section-bg)] p-4 rounded-md grid gap-4 basis-full max-w-[100cqw] overflow-auto md:overflow-visible"
		>
			<h1 class="text-xl font-semibold text-[--heading-2-color]">
				{i18n.getMessage("configure_firefox")} ({i18n.getMessage("optional")})
			</h1>
			<p class="text-[--section-color]">
				{i18n.getMessage(
					"you_may_want_to_enable_the_open_previous_windows_and_tabs_option_in_preferences"
				)}
			</p>
			<button
				class="btn"
				onclick={() => {
					window.navigator.clipboard.writeText(
						"about:preferences#browserRestoreSession"
					);
					Browser.tabs.create({ active: true });
				}}
			>
				<Icon icon="copy" width={20} />
				{i18n.getMessage("copy_link_and_open_new tab")}
			</button>
		</section>
		<section
			class="[background:_var(--section-bg)] p-4 rounded-md grid gap-4 content-start basis-full lg:flex-1 max-w-[100cqw] overflow-auto md:overflow-visible"
		>
			<h1 class="text-xl font-semibold text-[--heading-2-color]">
				{i18n.getMessage("home_workspace")}
			</h1>
			<HomeWorkspace />
		</section>
		<section
			class="[background:_var(--section-bg)] p-4 rounded-md grid gap-4 content-start basis-full lg:flex-1 max-w-[100cqw] overflow-auto md:overflow-visible"
		>
			<h1 class="text-xl font-semibold text-[--heading-2-color]">
				{i18n.getMessage("default_workspaces")}
			</h1>
			<p class="text-[--section-color]">
				{i18n.getMessage("welcome_default_workspaces_message")}
			</p>
			<DefaultWorkspaces isWelcomePage={true} />
		</section>
		<section
			class="[background:_var(--section-bg)] p-4 rounded-md grid gap-4 basis-full max-w-[100cqw] overflow-auto md:overflow-visible"
		>
			<h1 class="text-xl font-semibold text-[--heading-2-color]">
				{i18n.getMessage("shortcuts")}
			</h1>
			<p class="text-[--section-color]">
				{@html i18n.getMessage(
					"you_can_edit_shortcuts_for_commands_in_the_addons_page"
				)}
			</p>
			<!-- <Info class="w-full mb-8 text-[--section-color]">
				{@html i18n.getMessage('you_can_edit_shortcuts_for_commands_in_the_addons_page')}
			</Info> -->
			<Shortcuts />
		</section>
		<section
			class="[background:_var(--section-bg)] p-4 rounded-md grid gap-4 basis-full max-w-[100cqw] overflow-auto md:overflow-visible"
		>
			<h1 class="text-xl font-semibold text-[--heading-2-color]">
				{i18n.getMessage("all_options")}
			</h1>
			<a
				class="btn"
				href={Browser.runtime.getURL("/src/pages/Options/options.html")}
				>{i18n.getMessage("view_all_options")}
			</a>
		</section>
	</main>
</Layout>
