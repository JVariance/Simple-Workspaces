<script lang="ts">
	import EmojiPicker from "@root/components/EmojiPicker.svelte";
	import Icon from "@root/components/Icon.svelte";
	import { createRoot, onMount, tick, unstate, untrack } from "svelte";
	import { SOURCES, dndzone } from "svelte-dnd-action";
	import Browser, { i18n } from "webextension-polyfill";

	type SimpleWorkspace = Pick<Ext.Workspace, "icon" | "name"> & { id: number };

	let defaultWorkspaces: SimpleWorkspace[] = $state([]);
	let dragEnabled = $state(false);

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

	function applyChanges(e){
		e.stopImmediatePropagation();
		persistDefaultWorkspaces();
	}

	function persistDefaultWorkspaces() {
		Browser.runtime.sendMessage({
			msg: "setDefaultWorkspaces",
			defaultWorkspaces: defaultWorkspaces.map((workspace) => (({name, icon}) => ({name, icon}))(workspace)),
		});
	}

	onMount(async () => {
		const localDefaultWorkspaces = await Browser.runtime.sendMessage({msg: "getDefaultWorkspaces"});
		defaultWorkspaces = localDefaultWorkspaces || [getNewWorkspace()];
	});
</script>

<h1>Options</h1>

<div class="grid gap-8">
	<section>
		<h2>🌍 Language</h2>
		<select id="selectLanguage">
			{#each ['en', 'de-DE'] as lang}
				<option value={lang}>{lang}</option>
			{/each}
		</select>
	</section>
	<section>
		<h2>Default workspaces</h2>
		<p>⚠ Will apply for new windows</p>
		<button onclick={(e) => {defaultWorkspaces = []; addDefaultWorkspace(e);}}>reset default workspaces</button>
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
					</li>
				{/each}
				</ul>
			<button
				id="addDefaultWorkspace"
				title="add default workspace"
				onclick={addDefaultWorkspace}><Icon icon="add" width={20}/> Add default workspace</button
			>
			<button id="applyChanges" onclick={applyChanges}>
				apply changes
			</button>
		</div>
	</section>
	<section>
		<h2>⚠ Clear</h2>
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

	.default-workspaces {
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
