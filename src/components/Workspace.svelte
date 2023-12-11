<script lang="ts">
	import { createRoot, tick } from "svelte";
	import Icon from "./Icon.svelte";
	import EmojiPicker from "./EmojiPicker.svelte";
	import { Key } from "ts-key-enum";

	type Props = {
		workspace: Ext.Workspace;
		index: number;
		active?: boolean;
		selected?: boolean;
		class?: string;
		switchWorkspace: Function;
		editWorkspace: Function;
		removeWorkspace: Function;
	};

	let {
		workspace,
		index,
		active,
		selected = false,
		class: classes = "",
		switchWorkspace,
		editWorkspace,
		removeWorkspace,
	} = $props<Props>();

	let nameValue = $state(workspace.name);
	let iconValue = $state(workspace.icon);

	let editMode = $state(false);
	let workspaceButton: HTMLButtonElement;
	let nameInput: HTMLInputElement;

	let removalDialog: HTMLDialogElement;
	let confirmRemovalButton: HTMLButtonElement;
	let removalDialogVisible = $state(false);

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

	function _editWorkspace() {
		editMode = false;
		editWorkspace({ workspace, icon: iconValue, name: nameValue });
	}

	function showRemovalDialog() {
		removalDialogVisible = true;
		(async () => {
			await tick();
			confirmRemovalButton.focus();
		})();
	}

	function _removeWorkspace() {
		removeWorkspace();
	}

	function _switchWorkspace() {
		switchWorkspace();
	}

	function cancelEditing() {
		editMode = false;
	}

	function openEmojiPicker(e: Event & { target: HTMLButtonElement }) {
		const { target } = e;

		const { x, y } = target.getBoundingClientRect();
		const picker = createRoot(EmojiPicker, {
			target: document.body,
			props: {
				x,
				y,
				remove: () => {
					picker.$destroy();
				},
				picked: ({ unicode }) => {
					iconValue = unicode;
					picker.$destroy();
				},
			},
		});
	}

	$effect(() => {
		// console.log("workspace update");
		if (selected) {
			(async () => {
				await tick();
				workspaceButton?.focus();
			})();
		}
	});
</script>

<dialog
	bind:this={removalDialog}
	class="p-4 rounded-md shadow-lg w-max h-max border absolute top-0 right-0 gap-2 items-center {removalDialogVisible
		? 'flex'
		: 'hidden'}"
>
	<button
		bind:this={confirmRemovalButton}
		class="focus:bg-red-400"
		onclick={_removeWorkspace}>Confirm removal</button
	>
	<button
		onclick={() => {
			removalDialogVisible = false;
		}}>Cancel removal</button
	>
</dialog>
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
				onclick={openEmojiPicker}
				class="text-2xl rounded-full">{iconValue}</button
			>
			<input
				class="bg-transparent border-b disabled:border-transparent outline-none"
				{id}
				type="text"
				disabled={!editMode}
				onkeydown={onKeyDown}
				bind:this={nameInput}
				bind:value={nameValue}
			/>
			<div class="flex gap-2">
				<button
					title="remove"
					onclick={showRemovalDialog}
					class="rounded-full outline-none focus:bg-white/25"
					><Icon icon="bin" width={16} /></button
				>
				<button
					title="apply"
					onclick={_editWorkspace}
					class="rounded-full outline-none focus:bg-white/25"
				>
					<Icon icon="check" width={18} />
				</button>
				<button
					title="cancel"
					onclick={cancelEditing}
					class="rounded-full outline-none focus:bg-white/25"
				>
					<Icon icon="cross" width={18} />
				</button>
			</div>
		{:else}
			<button
				onclick={_switchWorkspace}
				class="w-full outline-transparent outline-none flex items-center gap-4"
				data-focusid={index}
				bind:this={workspaceButton}
			>
				<span class="text-2xl w-[2ch] text-center">{icon}</span>
				<span class="{active ? 'font-bold' : ''} text-lg">{name}</span>
				<!-- <span>({tabIds.join(",")})</span> -->
			</button>
			<button title="edit" onclick={toggleEditMode}>
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
