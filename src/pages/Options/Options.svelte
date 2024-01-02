<script lang="ts">
	import EmojiPicker from "@root/components/EmojiPicker.svelte";
	import Icon from "@root/components/Icon.svelte";
	import { debounceFunc } from "@root/utils";
	import { createRoot, onMount, tick, unstate, untrack } from "svelte";
	import { SOURCES, dndzone } from "svelte-dnd-action";
	import Browser, { i18n } from "webextension-polyfill";

	type SimpleWorkspace = Pick<Ext.Workspace, "icon" | "name"> & { id: number };

	let defaultWorkspaces: SimpleWorkspace[] = $state([]);
	let windowWorkspaces: Ext.Workspace[] = $state([]);
	let dragEnabled = $state(false);
	let applyingChangesState = $state<'rest' | 'applying' | 'applied' | 'error'>('rest');
	let mounted = $state(false);

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

	async function applyChanges(){
		// e.stopImmediatePropagation();
		applyingChangesState = 'applying';
		await persistDefaultWorkspaces();
		applyingChangesState = 'applied';
		setTimeout(() => {
			applyingChangesState ='rest';
		}, 4000);
	}

	function persistDefaultWorkspaces() {
		return Browser.runtime.sendMessage({
			msg: "setDefaultWorkspaces",
			defaultWorkspaces: defaultWorkspaces.map((workspace) => (({name, icon}) => ({name, icon}))(workspace)),
		});
	}

	function clearExtensionData(e) {
		e.stopImmediatePropagation();
	}

	const debouncedApplyChanges = debounceFunc(applyChanges, 500);

	$effect(() => {
		if(!mounted) return;
		console.info("defaultWorkspaces");
		debouncedApplyChanges(defaultWorkspaces);
	});

	onMount(async () => {
		const localDefaultWorkspaces = await Browser.runtime.sendMessage({msg: "getDefaultWorkspaces"}) as SimpleWorkspace[];
		localDefaultWorkspaces.forEach((workspace, i) => {
			workspace.id = i;
		});

		defaultWorkspaces = localDefaultWorkspaces.length ? localDefaultWorkspaces : [getNewWorkspace()];
		
		windowWorkspaces = await getWorkspaces();
		mounted = true;
	});
</script>

{#snippet Workspace(workspace)}
	<button
		title="choose icon"
		onclick={(e) => {
			openEmojiPicker(e, workspace);
		}}
	>
		{workspace.icon}
	</button>
	<input
		class="bg-transparent border"
		type="text"
		bind:value={workspace.name}
	/>
{/snippet}

<h1>{i18n.getMessage('options')}</h1>

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

<div class="grid gap-8">
	<section>
		<h2>🌍 {i18n.getMessage('language')}</h2>
		<select id="selectLanguage">
			{#each ['en', 'de-DE'] as lang}
				<option value={lang}>{lang}</option>
			{/each}
		</select>
	</section>
	<section>
		<h2>{i18n.getMessage('current_workspaces')}</h2>
		<ul class="current-workspaces grid gap-4">
			{#each windowWorkspaces as workspace}
				<li>
					{@render Workspace(workspace)}
				</li>
			{/each}
		</ul>
	</section>
	<section>
		<h2>{i18n.getMessage('default_workspaces')}</h2>
		<p>⚠ {i18n.getMessage('will_apply_for_new_windows')}</p>
		<button onclick={(e) => {defaultWorkspaces = []; addDefaultWorkspace(e);}}>{i18n.getMessage('reset_default_workspaces')}</button>
		<div 
			style:width="max-content"
		>
			<ul
				use:dndzone={{
					items: defaultWorkspaces, 
					dropTargetStyle: {}, 
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
				class="default-workspaces grid gap-4"
			>
				{#each defaultWorkspaces as workspace, i (workspace.id)}
					<li class="flex gap-2">
						<div class="drag-handle" onpointerdown={(e) => {e.preventDefault(); dragEnabled = true}} onpointerup={() => {dragEnabled = false;}} aria-label="drag-handle">
							<Icon icon="drag-handle" width={18} />
						</div>
						{@render Workspace(workspace)}
					</li>
				{/each}
				</ul>
			<button
				id="addDefaultWorkspace"
				title="add default workspace"
				onclick={addDefaultWorkspace}><Icon icon="add" width={20}/>{i18n.getMessage('add_default_workspace')}</button
			>
			<!-- <button id="applyChanges" onclick={applyChanges}>
				{i18n.getMessage('apply_changes')}
			</button> -->
		</div>
	</section>
	<section>
		<h2>⚠ {i18n.getMessage('clear')}</h2>
		<button onclick={clearExtensionData}>{i18n.getMessage('clear')}</button>
	</section>
</div>

<style lang="postcss">
	:global(html) {
		@apply dark:bg-neutral-900 dark:text-white p-0 m-0 font-sans;
	}

	h2{
		@apply m-0 flex items-center;
	}

	section {
		@apply p-2 border border-solid rounded-md mt-4 dark:border-neutral-800;
	}

	button {
		@apply cursor-pointer border border-solid p-2 rounded-md dark:bg-neutral-800 dark:text-white dark:border-neutral-700;
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
		@apply grid gap-2 mb-4;

		& > li {
			@apply flex gap-2 items-center;
		}
	}

	.drag-handle {
		@apply w-4 h-4;
	}

	input {
		@apply bg-transparent border border-solid dark:border-neutral-700 rounded-md dark:text-white p-2;
	}

	ul {
		@apply p-0;
	}

	li {
		@apply list-none;
	}

	#selectLanguage {
		@apply mt-4 border p-2 border-solid rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-white;

		option {
			@apply bg-transparent;
		}
	}

	button#addDefaultWorkspace{
			@apply mt-4 w-full flex gap-2 items-center;
	}
		
	button#applyChanges {
		@apply mt-4 bg-green-300 text-black border-green-500;
	}
</style>
