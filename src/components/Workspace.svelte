<script lang="ts">
	import { createEventDispatcher, tick } from "svelte";
	import Icon from "./Icon.svelte";
	import { Picker } from "emoji-picker-element";
	import EmojiPicker from "./EmojiPicker.svelte";

	export let workspace: Ext.Workspace;
	export let active = false;
	export let selected = false;
	export let index: number;

	let { name: nameValue, icon: iconValue } = workspace;

	let editMode = false;
	let classes = "";
	let workspaceButton: HTMLButtonElement;
	let nameInput: HTMLInputElement;

	const dispatch = createEventDispatcher();

	export { classes as class };

	function toggleEditMode() {
		(async () => {
			editMode = true;
			await tick();
			nameInput?.focus();
		})();
	}

	function editWorkspace() {
		editMode = false;
		dispatch("editWorkspace", { workspace, icon: iconValue, name: nameValue });
	}

	function removeWorkspace() {
		dispatch("removeWorkspace");
	}

	function switchWorkspace() {
		dispatch("switchWorkspace");
	}

	function openEmojiPicker(e: Event & { target: HTMLButtonElement }) {
		const { target } = e;

		const { x, y } = target.getBoundingClientRect();
		const picker = new EmojiPicker({ target: document.body, props: { x, y } });
		picker.$on("remove", () => {
			picker.$destroy();
		});

		picker.$on("picked", ({ detail: { unicode } }) => {
			iconValue = unicode;
			picker.$destroy();
		});
	}

	$: if (selected) {
		(async () => {
			await tick();
			workspaceButton?.focus();
		})();
	}
</script>

{#if workspace}
	{@const { id, name, icon, tabIds, windowId } = workspace}
	<div
		class:active
		class:selected
		class="workspace grid gap-8 p-4 {editMode
			? 'grid-cols-[max-content_1fr_max-content_max-content]'
			: 'grid-cols-[1fr_max-content]'} justify-items-start items-center p-1 rounded-md {classes} focus-within:bg-neutral-200 focus-within:dark:bg-neutral-700 [&.active]:bg-[#5021ff] [&.active]:text-white"
	>
		{#if editMode}
			<button on:click={openEmojiPicker} class="text-2xl">{iconValue}</button>
			<input
				class="bg-transparent border disabled:border-transparent"
				{id}
				type="text"
				disabled={!editMode}
				bind:this={nameInput}
				bind:value={nameValue}
			/>
			<button on:click={removeWorkspace}
				><Icon icon="remove" width={16} /></button
			>
			<button on:click={editWorkspace}>
				<Icon icon="check" width={18} />
			</button>
		{:else}
			<button
				on:click={switchWorkspace}
				class="outline-transparent outline-none flex items-center gap-4"
				data-focusid={index}
				bind:this={workspaceButton}
			>
				<span class="text-2xl w-[2ch] text-center">{icon}</span>
				<span class="{active ? 'font-bold' : ''} text-lg">{name}</span>
				<!-- <span>({tabIds.join(",")})</span> -->
			</button>
			<button on:click={toggleEditMode}>
				<Icon icon="edit" width={14} />
			</button>
		{/if}
	</div>
{/if}

<style lang="postcss">
	.workspace {
		@media screen and (width < 260px) {
			@apply aspect-square grid-cols-1 h-12 p-0 justify-items-center justify-self-center;

			button span:nth-of-type(n + 2) {
				@apply hidden;
			}

			button:last-of-type {
				@apply hidden;
			}
		}
	}
</style>
