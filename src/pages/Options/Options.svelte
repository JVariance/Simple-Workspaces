<script lang="ts">
	import Icon from "@root/components/Icon.svelte";
	import { getContext, createRoot, type Snippet} from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import "@root/app.postcss";
	import Accordion from "@root/components/Accordion.svelte";
	import DefaultWorkspaces from "@root/components/ViewBlocks/DefaultWorkspaces.svelte";
	import Info from "@root/components/Info.svelte";
	import SimpleWorkspace from "@root/components/SimpleWorkspace.svelte";
	import Toast from "@root/components/Toast.svelte";
	import ButtonLink from "@root/components/ButtonLink.svelte";
	import Shortcuts from "@root/components/ViewBlocks/Shortcuts.svelte";
	import Logo from "@root/components/Logo.svelte";
	import HomeWorkspace from "@root/components/ViewBlocks/HomeWorkspace.svelte";

	let windowWorkspaces = $derived(getContext<() => Ext.Workspace[]>("workspaces")()?.filter(({ UUID }) => UUID !== "HOME") || []);

	async function applyCurrentWorkspacesChanges() {
		const toast = createRoot(Toast, {
			target: document.body,
			props: {
			state: "loading",
			loadingMessage: i18n.getMessage("applying_changes"),
			successMessage: i18n.getMessage("applied_changes"),
			errorMessage: "something went wrong",
		}});

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
</script>

{#snippet Section([content, classes]: [Snippet, string])}
	<section class="p-2 border border-solid rounded-md border-gray-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-[#23222b] {classes}">
		{@render content()}
	</section>
{/snippet}

<div class="p-8">
	<h2 class="flex items-center gap-2 m-0 mb-4 text-lg first-letter:uppercase">
		<Logo />
		Simple Workspaces
	</h2>
	<!-- <h1 class="first-letter:uppercase mb-2">{i18n.getMessage('options')}</h1> -->

	<div class="flex flex-wrap gap-4 mt-16 flex-col sm:flex-row">
		<!-- <section>
			<h2 class="m-0 mb-4 text-lg first-letter:uppercase">🌍 {i18n.getMessage('language')}</h2>
			<select id="selectLanguage">
				{#each ['en', 'de-DE'] as lang}
					<option value={lang}>{lang}</option>
				{/each}
			</select>
		</section> -->
		{#snippet Section_HomeWorkspace()}
			<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('home_workspace') || 'Home Workspace'}</h2>
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
				There are no current worspaces in this window.
			{/if}
		{/snippet}
		{#snippet Section_DefaultWorkspaces()}
			<div class="">
				<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('default_workspaces')}</h2>
				<Info class="mb-4">
					{i18n.getMessage('changes_will_apply_for_new_windows')}
				</Info>
				<DefaultWorkspaces />
			</div>
		{/snippet}
		{#snippet Section_Shortcuts()}
			<h2 class="m-0 mb-4 text-lg flex gap-2 items-center font-semibold">
				<span class="first-letter:uppercase">{i18n.getMessage('shortcuts')}</span>
			</h2>
			<Info>
				{i18n.getMessage('you_can_edit_shortcuts_for_commands_in_the_addons_page')}
			</Info>
			<Shortcuts />
		{/snippet}
		{#snippet Section_ClearExtensionData()}
			<Accordion summaryClasses="border-none" detailsClasses="border-none" contentClasses="mt-4">
				{#snippet summary()}
					<h2 class="m-0 text-lg flex gap-2 items-center font-semibold">
						<Icon icon="clear" />
						<span class="-mt-[0rem] first-letter:uppercase">{i18n.getMessage('clear')}</span>
					</h2>
				{/snippet}
				<button class="btn" onclick={clearExtensionData}>{i18n.getMessage('clear')}</button>
			</Accordion>
		{/snippet}
		{#snippet Section_WelcomePage()}
			<h2 class="m-0 mb-4 text-lg flex gap-2 items-center font-semibold first-letter:uppercase">Want to see the Welcome Page again?</h2>
			<ButtonLink class="btn" href="{Browser.runtime.getURL('src/pages/Welcome/welcome.html')}" target="_blank">Open Welcome Page</ButtonLink>
		{/snippet}
		{#snippet Section_FurtherLinks()}
			<h2 class="m-0 mb-4 text-lg flex gap-2 items-center font-semibold first-letter:uppercase">Feedback and Feature Requests?</h2>
			<ButtonLink href="https://github.com/JVariance/Simple-Workspaces" target="_blank">
				<img src="/images/github-mark/github-mark-white.svg" alt="GitHub Logo" class="w-8 aspect-square [@media_(prefers-color-scheme:_light)]:hidden">
				<img src="/images/github-mark/github-mark.svg" alt="GitHub Logo" class="w-8 aspect-square dark:hidden">
				GitHub Repository
			</ButtonLink>
		{/snippet}

		{@render Section([Section_HomeWorkspace, "basis-full flex-1"])}
		{@render Section([Section_CurrentWorkspaces, "flex-0"])}
		{@render Section([Section_DefaultWorkspaces, "flex-1 w-full overflow-auto [scrollbar-gutter:_stable] sm:[scrollbar-gutter:_unset]"])}
		{@render Section([Section_Shortcuts, "basis-full"])}
		{@render Section([Section_ClearExtensionData, "basis-full"])}
		{@render Section([Section_WelcomePage, "flex-0"])}
		{@render Section([Section_FurtherLinks, "flex-0"])}
	</div>
</div>

<style lang="postcss">
</style>