<script lang="ts">
	import Icon from "@root/components/Icon.svelte";
	import { debounceFunc } from "@root/utils";
	import { createRoot, onMount, unstate, type Snippet} from "svelte";
	import { SOURCES, dndzone } from "svelte-dnd-action";
	import Browser, { i18n } from "webextension-polyfill";
	import "@root/app.postcss";
	import Accordion from "@root/components/Accordion.svelte";
	import DefaultWorkspaces from "@root/components/ViewBlocks/DefaultWorkspaces.svelte";
	import Workspace from "@root/components/Workspace.svelte";
	import Info from "@root/components/Info.svelte";
	import SimpleWorkspace from "@root/components/SimpleWorkspace.svelte";
	import Layout from "../Special_Pages/Layout.svelte";
	import Toast from "@root/components/Toast.svelte";

	let windowWorkspaces: Ext.Workspace[] = $state([]);
	let mounted = $state(false);

	async function getWorkspaces(): Promise<Ext.Workspace[]> {
		const windowId = (await Browser.windows.getCurrent()).id!;
		return Browser.runtime.sendMessage({ msg: "getWorkspaces", windowId });
	}

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

	// const debouncedApplyChanges = debounceFunc(applyChanges, 500);

	// $effect(() => {
	// 	if(!mounted) return;
	// 	// console.info({defaultWorkspaces});
	// 	debouncedApplyChanges();
	// });

	onMount(async () => {
		windowWorkspaces = (await getWorkspaces()).filter(({UUID}) => UUID !== "HOME");
		mounted = true;
	});
</script>

{#snippet Section([content, classes]: [Snippet, string])}
	<section class="p-2 border border-solid rounded-md border-gray-300 dark:border-neutral-800 bg-gray-100 dark:bg-[#23222b] {classes}">
		{@render content()}
	</section>
{/snippet}

<Layout>
	<div class="p-8">
		<h2 class="flex items-center gap-2 m-0 mb-4 text-lg first-letter:uppercase">
			<img src="/icon/icon-dark.svg" alt="logo" width="40" class="[filter:_invert()] dark:[filter:_invert(0)]"/>
			Simple Workspaces
		</h2>
		<!-- <h1 class="first-letter:uppercase mb-2">{i18n.getMessage('options')}</h1> -->

		<div class="flex flex-wrap gap-4 mt-16">
			<!-- <section>
				<h2 class="m-0 mb-4 text-lg first-letter:uppercase">🌍 {i18n.getMessage('language')}</h2>
				<select id="selectLanguage">
					{#each ['en', 'de-DE'] as lang}
						<option value={lang}>{lang}</option>
					{/each}
				</select>
			</section> -->
			{#snippet Section1Content()}
				<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('current_workspaces')}</h2>
				<ul class="current-workspaces grid gap-4">
					{#each windowWorkspaces as workspace}
						<li class="flex items-stretch gap-2">
							<SimpleWorkspace {workspace}/>
						</li>
					{/each}
				</ul>

				<button class="flex gap-2 items-center justify-center mt-4" style:width="-moz-available" onclick={applyCurrentWorkspacesChanges}>
					<Icon icon="check" />
					<span class="-mt-1">{i18n.getMessage('apply_changes')}</span>
				</button>
			{/snippet}
			{#snippet Section2Content()}
				<DefaultWorkspaces />
			{/snippet}
			{#snippet Section3Content()}
				<h2 class="m-0 mb-4 text-lg flex gap-2 items-center font-semibold first-letter:uppercase">{i18n.getMessage('shortcuts')}</h2>
				<Info>
					{i18n.getMessage('you_can_set_shortcuts_for_commands_in_the_addons_page')}
				</Info>
				<div class="mt-4">
					{#await Browser.commands.getAll()}
						...
						{:then commands}
							<dl class="grid grid-cols-[max-content_max-content] gap-4">
								{#each commands as command}
									<dt>{i18n.getMessage(`command.${command.name}`)}</dt>
									<dd><kbd>{command.shortcut}</kbd></dd>
								{/each}
							</dl>
					{/await}	
				</div>
			{/snippet}
			{#snippet Section4Content()}
				<Accordion summaryClasses="border-none" detailsClasses="border-none" contentClasses="mt-4">
					{#snippet summary()}
						<h2 class="m-0 text-lg flex gap-2 items-center font-semibold first-letter:uppercase">
							<Icon icon="clear" />
							<span class="-mt-1">{i18n.getMessage('clear')}</span>
						</h2>
					{/snippet}
					<button onclick={clearExtensionData}>{i18n.getMessage('clear')}</button>
				</Accordion>
			{/snippet}

			{@render Section([Section1Content, "flex-0"])}
			{@render Section([Section2Content, "flex-1"])}
			{@render Section([Section3Content, "basis-full"])}
			{@render Section([Section4Content, "basis-full"])}
		</div>
	</div>
</Layout>

<style lang="postcss">
</style>