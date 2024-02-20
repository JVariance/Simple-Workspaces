<script lang="ts">
	import Icon from "@root/components/Icon.svelte";
	import { mount } from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Accordion from "@components/Accordion/Accordion.svelte";
	import Summary from "@components/Accordion/Summary.svelte";
	import DefaultWorkspaces from "@root/components/ViewBlocks/DefaultWorkspaces.svelte";
	import Info from "@root/components/Info.svelte";
	import SimpleWorkspace from "@root/components/SimpleWorkspace.svelte";
	import Toast from "@root/components/Toast.svelte";
	import ButtonLink from "@root/components/ButtonLink.svelte";
	import Shortcuts from "@root/components/ViewBlocks/Shortcuts.svelte";
	import Logo from "@root/components/Logo.svelte";
	import HomeWorkspace from "@root/components/ViewBlocks/HomeWorkspace.svelte";
	import Layout from "@pages/Special_Pages/Layout.svelte";
	import { getKeepPinnedTabs, getWorkspacesState } from "@pages/states.svelte";
	import ThemeSwitch from "@root/components/ViewBlocks/ThemeSwitch.svelte";
	import { BrowserStorage } from "@root/background/Entities";
	import Tooltip from "@root/components/Tooltip.svelte";

	let windowWorkspaces = $derived(getWorkspacesState()?.filter(({ UUID }) => UUID !== "HOME") || []);
	let keepPinnedTabs = $derived(getKeepPinnedTabs());

	async function applyCurrentWorkspacesChanges() {
		const toast = mount(Toast, {
			target: document.getElementById('toaster') ?? document.body,
			props: {
				state: "loading",
				loadingMessage: i18n.getMessage("applying_changes"),
				successMessage: i18n.getMessage("applied_changes"),
				errorMessage: "something went wrong",
			}
		});

		await persistCurrentWorkspaces();
		toast.$set({state: 'success'});
	}

	function persistCurrentWorkspaces() {
		return Browser.runtime.sendMessage({
			msg: "setCurrentWorkspaces",
			currentWorkspaces: windowWorkspaces.map((workspace) => (({UUID, name, icon}) => ({UUID, name, icon}))(workspace))
		});
	}

	function clearExtensionData(e) {
		e.stopImmediatePropagation();
		Browser.runtime.sendMessage({
			msg: "clearExtensionData",
		});
	}

	function keepPinnedTabsChanged(e) {
		BrowserStorage.setKeepPinnedTabs(e.target.checked);
	}
</script>

{#snippet Section(content, classes)}
	<section class="p-2 border border-solid rounded-md border-gray-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-[#23222b] w-[100cqw] overflow-auto sm:overflow-visible {classes}">
		{@render content()}
	</section>
{/snippet}

<Layout>
	<div class="p-8">
		<div class="flex items-center gap-2 mb-4 justify-between">
			<h2 class="flex items-center gap-2 m-0 text-lg first-letter:uppercase">
				<Logo />
				Simple Workspaces
			</h2>
			<p class="text-black/75 dark:text-white/75">{i18n.getMessage('version')}: {Browser.runtime.getManifest().version}</p>
		</div>

		<!-- <h1 class="first-letter:uppercase mb-2">{i18n.getMessage('options')}</h1> -->

		<div class="flex flex-wrap gap-4 mt-16 flex-col sm:flex-row @container">
			<!-- <section>
				<h2 class="m-0 mb-4 text-lg first-letter:uppercase">🌍 {i18n.getMessage('language')}</h2>
				<select id="selectLanguage">
					{#each ['en', 'de-DE'] as lang}
						<option value={lang}>{lang}</option>
					{/each}
				</select>
			</section> -->
			{#snippet Section_Theme()}
				<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('theme')}</h2>
				<ThemeSwitch />
			{/snippet}
			{#snippet Section_HomeWorkspace()}
				<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('home_workspace')}</h2>
				<HomeWorkspace />
			{/snippet}
			{#snippet Section_CurrentWorkspaces()}
				<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('current_workspaces')}</h2>
				<ul class="current-workspaces grid gap-4">
					{#each windowWorkspaces as workspace}
						<li class="flex items-stretch gap-2">
							<SimpleWorkspace 
								{workspace} 
								updatedName={(name) => {workspace.name = name;}}
								updatedIcon={(icon) => {workspace.icon = icon;}}
							/>
						</li>
					{/each}
				</ul>

				{#if windowWorkspaces?.length}
					<button class="btn justify-center mt-4" style:width="-moz-available" onclick={applyCurrentWorkspacesChanges}>
						<Icon icon="check" />
						<span class="-mt-1">{i18n.getMessage('apply_changes')}</span>
					</button>
					{:else}
					{i18n.getMessage('There_are_no_current_workspaces_in_this_window')}.
				{/if}
			{/snippet}
			{#snippet Section_DefaultWorkspaces()}
				<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('default_workspaces')}</h2>
				<Info class="mb-4">
					{i18n.getMessage('changes_will_apply_for_new_windows')}
				</Info>
				<DefaultWorkspaces />
			{/snippet}
			{#snippet Section_TabPinning()}
				<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('tab_pinning')}</h2>
				<div class="flex gap-4 items-center w-full">
					<input
						type="checkbox"
						id="keep-pinned-tabs"
						checked={keepPinnedTabs}
						onchange={keepPinnedTabsChanged}
					/>
					<label for="keep-pinned-tabs" class="-mt-[0.2rem]">{i18n.getMessage("keep_pinned_tabs")}</label>
				</div>
			{/snippet}
			{#snippet Section_Shortcuts()}
				<h2 class="m-0 mb-4 text-lg flex gap-2 items-center font-semibold">
					<span class="first-letter:uppercase">{i18n.getMessage('shortcuts')}</span>
				</h2>
				<Info>
					<Tooltip id="shortcuts-info" class="[&_svg]:w-4 [&_svg]:h-4" popupClasses="absolute top-0 right-0 w-max">
						{@html i18n.getMessage('you_can_edit_shortcuts_for_commands_in_the_addons_page')}
						{#snippet message()}
							<ButtonLink href={i18n.getMessage('shortcuts.help.link')} target="_blank" class="ghost flex flex-nowrap items-center gap-1">
								{i18n.getMessage('read_more')}
							</ButtonLink>
						{/snippet}
					</Tooltip>
				</Info>
				<Shortcuts />
			{/snippet}
			{#snippet Section_ClearExtensionData()}
				<Accordion class="border-none">
					{#snippet summary()}
						<Summary class="border-none">
							<h2 class="m-0 text-lg flex gap-2 items-center font-semibold">
								<Icon icon="clear" />
								<span class="-mt-[0rem] first-letter:uppercase">{i18n.getMessage('clear')}</span>
							</h2>
						</Summary>
					{/snippet}
					<button class="btn mt-4" onclick={clearExtensionData}>{i18n.getMessage('clear')}</button>
				</Accordion>
			{/snippet}
			{#snippet Section_WelcomePage()}
				<h2 class="m-0 mb-4 text-lg flex gap-2 items-center font-semibold first-letter:uppercase">{i18n.getMessage('want_to_see_the_welcome_page_again')}</h2>
				<ButtonLink class="btn w-max" href="{Browser.runtime.getURL('src/pages/Welcome/welcome.html')}" target="_blank">{i18n.getMessage('open_welcome_page')}</ButtonLink>
			{/snippet}
			{#snippet Section_FurtherLinks()}
				<h2 class="m-0 mb-4 text-lg flex gap-2 items-center font-semibold first-letter:uppercase">{i18n.getMessage("feedback_and_feature_requests_heading")}</h2>
				<ButtonLink href="https://github.com/JVariance/Simple-Workspaces" target="_blank" class="btn w-max">
					<img src="/images/github-mark/github-mark-white.svg" alt="GitHub Logo" class="w-6 aspect-square [@media_(prefers-color-scheme:_light)]:hidden">
					<img src="/images/github-mark/github-mark.svg" alt="GitHub Logo" class="w-6 aspect-square dark:hidden">
					{i18n.getMessage('github_repository')}
				</ButtonLink>
			{/snippet}

			{@render Section(Section_Theme, "basis-full flex-1")}
			{@render Section(Section_HomeWorkspace, "flex-1")}
			{@render Section(Section_CurrentWorkspaces, "flex-1")}
			{@render Section(Section_DefaultWorkspaces, "flex-1 overflow-auto scrollbar-gutter:_stable] sm:scrollbar-gutter:_unset]")}
			{@render Section(Section_TabPinning, "basis-full")}
			{@render Section(Section_Shortcuts, "basis-full")}
			{@render Section(Section_ClearExtensionData, "basis-full")}
			{@render Section(Section_WelcomePage, "flex-1")}
			{@render Section(Section_FurtherLinks, "flex-1")}
		</div>
	</div>
</Layout>

<style lang="postcss">
	:global(html) {
		color-scheme: light dark;
	}
</style>