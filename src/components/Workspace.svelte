<script lang="ts">
	import { createEventDispatcher, tick } from "svelte";
	import Icon from "./Icon.svelte";
	import EmojiPicker from "./EmojiPicker.svelte";
	import { Key } from "ts-key-enum";

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

	function onKeyDown(e: KeyboardEvent) {
		const { key } = e;

		switch (key) {
			case Key.Escape:
				cancelEditing();
				break;
			default:
				break;
		}
	}

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
		const removalConfirmed = confirm(
			"This workspace will be removed. Continue?"
		);

		if (removalConfirmed) dispatch("removeWorkspace");
	}

	function switchWorkspace() {
		dispatch("switchWorkspace");
	}

	function cancelEditing() {
		editMode = false;
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
			? 'grid-cols-[max-content_1fr_max-content]'
			: 'grid-cols-[1fr_max-content]'} justify-items-start items-center p-1 rounded-md {classes} focus-within:bg-neutral-200 focus-within:dark:bg-neutral-700 [&.active]:bg-[#5021ff] [&.active]:text-white"
	>
		{#if editMode}
			<button
				title="pick emoji"
				on:click={openEmojiPicker}
				class="text-2xl rounded-full">{iconValue}</button
			>
			<input
				class="bg-transparent border-b disabled:border-transparent outline-none"
				{id}
				type="text"
				disabled={!editMode}
				on:keydown={onKeyDown}
				bind:this={nameInput}
				bind:value={nameValue}
			/>
			<div class="flex gap-2">
				<button
					title="remove"
					on:click={removeWorkspace}
					class="rounded-full outline-none focus:bg-white/25"
					><Icon icon="bin" width={16} /></button
				>
				<button
					title="apply"
					on:click={editWorkspace}
					class="rounded-full outline-none focus:bg-white/25"
				>
					<Icon icon="check" width={18} />
				</button>
				<button
					title="cancel"
					on:click={cancelEditing}
					class="rounded-full outline-none focus:bg-white/25"
				>
					<Icon icon="cross" width={18} />
				</button>
			</div>
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
			<button title="edit" on:click={toggleEditMode}>
				<Icon icon="edit" width={14} />
			</button>
		{/if}
	</div>
{/if}

<style lang="postcss">
	.workspace {
		@media screen and (width < 260px) {
			@apply aspect-square grid-cols-1 h-12 p-0 justify-items-center justify-self-center;

			button:first-of-type span {
				@apply w-full;
			}

			button span:nth-of-type(n + 2) {
				@apply hidden;
			}

			button:last-of-type {
				@apply hidden;
			}
		}
	}
</style>
