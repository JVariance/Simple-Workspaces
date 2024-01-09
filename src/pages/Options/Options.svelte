<script lang="ts">
	import EmojiPicker from "@root/components/EmojiPicker.svelte";
	import Icon from "@root/components/Icon.svelte";
	import { debounceFunc } from "@root/utils";
	import { createRoot, onMount, unstate, type Snippet} from "svelte";
	import { SOURCES, dndzone } from "svelte-dnd-action";
	import Browser, { i18n } from "webextension-polyfill";
	import "@root/app.postcss";
	import Accordion from "@root/components/Accordion.svelte";

	type SimpleWorkspace =  & Pick<Ext.Workspace, "icon" | "name"> & { id: number };

	let defaultWorkspaces: SimpleWorkspace[] = $state([]);
	let windowWorkspaces: Ext.Workspace[] = $state([]);
	let dragEnabled = $state(false);
	let applyingChangesState = $state<'rest' | 'applying' | 'applied' | 'error'>('rest');
	let mounted = $state(false);

	let homeWorkspace = $state<SimpleWorkspace>({id: -1, icon: "🏠", name: "Home"});

	async function getWorkspaces(): Promise<Ext.Workspace[]> {
		const windowId = (await Browser.windows.getCurrent()).id!;
		return Browser.runtime.sendMessage({ msg: "getWorkspaces", windowId });
	}

	function getNewWorkspace(){
		return {
			id: defaultWorkspaces.length,
			icon: "😀",
			name: i18n.getMessage('workspace'),
		}
	}

	function addDefaultWorkspace(e) {
			e.stopImmediatePropagation();
			defaultWorkspaces.push(getNewWorkspace());
			console.info({defaultWorkspaces});
	}

	let picker;

	function openEmojiPicker(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		workspace: SimpleWorkspace
	) {

		e.stopImmediatePropagation();

		const target = e.target as HTMLButtonElement;
		const { x, y } = target.getBoundingClientRect();

		if(!picker){
			picker = createRoot(EmojiPicker, {
				target: document.body,
				props: {
					x,
					y,
					visible: true,
					picked: ({ unicode }: { unicode: string }) => {
						workspace.icon = unicode;
					},
				}
			});
		} else {
			console.info("picker set");
			picker.$set({
				visible: false
			});
			picker.$set({
				x,
				y,
				visible: true,
				picked: ({ unicode }: { unicode: string }) => {
					workspace.icon = unicode;
				},
			});
		}
	}

	async function applyCurrentWorkspacesChanges() {
		applyingChangesState = 'applying';
		await persistCurrentWorkspaces();
		applyingChangesState = 'applied';
		setTimeout(() => {
			applyingChangesState ='rest';
		}, 4000);
	}

	async function applyDefaultWorkspacesChanges() {
		// e.stopImmediatePropagation();
		applyingChangesState = 'applying';
		await persistDefaultWorkspaces();
		applyingChangesState = 'applied';
		setTimeout(() => {
			applyingChangesState ='rest';
		}, 4000);
	}

	function persistCurrentWorkspaces() {
		return Browser.runtime.sendMessage({
			msg: "setCurrentWorkspaces",
			currentWorkspaces: windowWorkspaces.map((workspace) => (({UUID, name, icon}) => ({UUID, name, icon}))(workspace))
		});
	}

	function persistDefaultWorkspaces() {
		return Browser.runtime.sendMessage({
			msg: "setDefaultWorkspaces",
			homeWorkspace: {...homeWorkspace},
			defaultWorkspaces: defaultWorkspaces.map((workspace) => (({name, icon}) => ({name, icon}))(workspace)),
		});
	}

	function removeDefaultWorkspace(workspaceId: number) {
		defaultWorkspaces = defaultWorkspaces.filter(({id}) => id !== workspaceId);
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
		const localDefaultWorkspaces = await Browser.runtime.sendMessage({msg: "getDefaultWorkspaces"}) as SimpleWorkspace[];
		localDefaultWorkspaces?.forEach((workspace, i) => {
			workspace.id = i;
		});

		if(localDefaultWorkspaces) defaultWorkspaces.push(...localDefaultWorkspaces);

		const { homeWorkspace: localHomeWorkspace } = await Browser.storage.local.get("homeWorkspace") as {homeWorkspace: SimpleWorkspace};

		if(Object.keys(localHomeWorkspace || {})?.length) homeWorkspace = localHomeWorkspace;
		
		windowWorkspaces = (await getWorkspaces()).filter(({UUID}) => UUID !== "HOME");
		mounted = true;
	});
</script>

{#snippet Workspace(workspace)}
	<button
		title="choose icon"
		class="w-12 h-auto aspect-square flex justify-center items-center"
		onclick={(e) => {
			openEmojiPicker(e, workspace);
		}}
	>
		{workspace.icon}
	</button>
	<input
		class="bg-transparent border border-solid dark:border-neutral-700 rounded-md dark:text-white p-2"
		type="text"
		bind:value={workspace.name}
		/>
{/snippet}

{#snippet Section([content, classes]: [Snippet, string])}
	<section class="p-2 border border-solid rounded-md border-gray-300 dark:border-neutral-800 bg-gray-100 dark:bg-[#23222b] {classes}">
		{@render content()}
	</section>
{/snippet}

{#snippet Info(message: string)}
	<p class="py-1 px-2 flex gap-2 w-max items-center rounded-md">
		<Icon icon="info" width={20}/> <span class="-mt-1">{message}</span>
	</p>
{/snippet}

<div class="p-8">
	<h2 class="flex items-center gap-2 m-0 mb-4 text-lg first-letter:uppercase">
		<img src="/icon/icon-dark.svg" alt="logo" width="40" class="[filter:_invert()] dark:[filter:_invert(0)]"/>
		Simple Workspaces
	</h2>
	<!-- <h1 class="first-letter:uppercase mb-2">{i18n.getMessage('options')}</h1> -->

	<div id="applying-notification" class={applyingChangesState}>
		<span class="loading-spinner">&#9692;</span>
		<span class="checkmark">&#10003;</span>
		<span>
			{#if applyingChangesState === "applying"}
				{i18n.getMessage('applying_changes')}
				{:else if applyingChangesState === "applied"}
					{i18n.getMessage('applied_changes')}
			{/if}
		</span>
	</div>

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
					{@render Workspace(workspace)}
				</li>
				{/each}
			</ul>

			<button class="flex gap-2 items-center justify-center mt-4 bg-green-100" style:width="-moz-available" onclick={applyCurrentWorkspacesChanges}>
				<Icon icon="check" />
				<span class="-mt-1">{i18n.getMessage('apply_changes')}</span>
			</button>
		{/snippet}
		{#snippet Section2Content()}
			<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('default_workspaces')}</h2>
			{@render Info(i18n.getMessage('will_apply_for_new_windows'))}
			<div 
				class="w-max"
			>
				<div class="home-workspace flex gap-2 mb-2 mt-4 ml-6">
					{@render Workspace(homeWorkspace)}
				</div>
				<ul
					class="default-workspaces [&:not(:empty)]:!mb-2"
					use:dndzone={{
						items: defaultWorkspaces, 
						dropTargetStyle: {},
						zoneTabIndex: -1,
						dragDisabled: !dragEnabled || defaultWorkspaces.length < 2,
					}}
					on:consider={(e: CustomEvent<DndEvent<SimpleWorkspace>>) => {
						defaultWorkspaces = e.detail.items;
					}}
					on:finalize={(e: CustomEvent<DndEvent<SimpleWorkspace>>) => {
						const { info: { source } } = e.detail;
						defaultWorkspaces = e.detail.items;
						if(source === SOURCES.POINTER){
							dragEnabled = false;
						}
					}}
				>
					{#each defaultWorkspaces as workspace, i (workspace.id)}
						<li class="grid grid-flow-col gap-2 items-stretch">
							<div class="drag-handle w-4 h-4 self-center" onpointerdown={(e) => {e.preventDefault(); dragEnabled = true}} onpointerup={() => {dragEnabled = false;}} aria-label="drag-handle">
								<Icon icon="drag-handle" width={18} class="{defaultWorkspaces.length < 2 ? 'hidden' : ''}" />
							</div>
							{@render Workspace(workspace)}
							<div class="self-center flex text-neutral-300">
								<button class="!bg-transparent !border-none !w-max !p-0" onclick={() => removeDefaultWorkspace(workspace.id)}>
									<Icon icon="cross" />
								</button>
							</div>
						</li>
					{/each}
				</ul>
				<button
					title="add default workspace"
					class="ml-6 w-full flex gap-2 items-center"
					style:width="-moz-available"
					onclick={addDefaultWorkspace}><Icon icon="add" width={16}/>
					<span class="-mt-1">{i18n.getMessage('add_default_workspace')}</span>
				</button>
				<button class="flex gap-2 items-center justify-center mt-4 bg-green-100" style:width="-moz-available" onclick={applyDefaultWorkspacesChanges}>
					<Icon icon="check" />
					<span class="-mt-1">{i18n.getMessage('apply_changes')}</span>
				</button>
				<Accordion detailsClasses="mt-4">
					{#snippet summary()}
						<span class="-mt-[0.125rem]">{i18n.getMessage('reset')}</span>
					{/snippet}
					<button class="flex items-center justify-center gap-2 mt-4" style:width="-moz-available" onclick={(e) => {defaultWorkspaces = [];}}><Icon icon="reset"/><span class="-mt-0">{i18n.getMessage('reset_default_workspaces')}</span></button>
				</Accordion>
			</div>
		{/snippet}
		{#snippet Section3Content()}
			<h2 class="m-0 mb-4 text-lg flex gap-2 items-center font-semibold first-letter:uppercase">{i18n.getMessage('shortcuts')}</h2>
			{@render Info(i18n.getMessage('you_can_set_shortcuts_for_commands_in_the_addons_page'))}
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

<style lang="postcss">
	:global(html) {
		@apply text-neutral-800 dark:text-white p-0 m-0 font-sans;
	}

	:global(body){
		@apply dark:bg-[#1c1b22] m-0 p-0 w-[100dvw] h-[100dvh];
	}

	p {
		@apply m-0;
	}

	:global(details summary > svg){
		@apply transition-transform duration-200;
	}

	:global(details[open] summary > svg){
		@apply rotate-90;
	}

	button {
		@apply cursor-pointer border border-solid p-2 rounded-md bg-gray-200 border-gray-300 dark:bg-[#33323a] dark:text-white dark:border-neutral-700;
		@apply hover:bg-gray-300 dark:hover:bg-[#414049] focus-within:bg-gray-300 focus:bg-gray-300 dark:focus:bg-[#414049];
	}

	.loading-spinner {
		@apply animate-spin w-max h-max;
	}

	#applying-notification {
		@apply flex items-center justify-center w-max gap-2 text-xl p-8 rounded-md;
		@apply text-neutral-950 bg-neutral-300;
		@apply fixed bottom-4 left-4 transition-opacity duration-200;

		&.rest {
			@apply opacity-0;
			.loading-spinner {
				@apply hidden;
			}
		}

		&.applying {
			@apply text-neutral-950 bg-neutral-300;

			.checkmark {
				@apply hidden;
			}
		}

		&.applied {
			@apply text-green-950 bg-green-300;

			.loading-spinner {
				@apply hidden;
			}
		}

		&.error {
			@apply text-red-950 bg-red-300;
		}


		span {
			@apply -mt-[0.175rem];
		}
	}

	.default-workspaces, .current-workspaces {
		@apply grid gap-2;

		& > li {
			@apply flex gap-2;
		}
	}

	ul {
		@apply p-0 m-0;
	}

	li {
		@apply list-none;
	}

	/* #selectLanguage {
		@apply border p-2 border-solid rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-white;

		option {
			@apply bg-transparent;
		}
	} */
</style>
