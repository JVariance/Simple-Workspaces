<script lang="ts">
	import { mount, tick, unmount } from "svelte";
	import Icon from "./Icon.svelte";
	import EmojiPicker from "./EmojiPicker.svelte";
	import { Key } from "ts-key-enum";

	type Props = {
		workspace: Ext.Workspace;
		index: number;
		active?: boolean;
		class?: string;
		switchWorkspace: Function;
		editWorkspace: Function;
		removeWorkspace: Function;
	};

	let {
		workspace,
		index,
		active,
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
		if (active) return;
		switchWorkspace();
	}

	function cancelEditing() {
		editMode = false;
	}

	function openEmojiPicker(e: Event & { target: HTMLButtonElement }) {
		const { target } = e;

		const { x, y } = target.getBoundingClientRect();
		const props = $state({
			x,
			y,
			visible: false,
			remove: () => {
				// picker.$destroy();
				unmount(picker);
			},
			picked: ({ unicode }) => {
				iconValue = unicode;
				// picker.$destroy();
				unmount(picker);
			},
		});
		const picker = mount(EmojiPicker, {
			target: document.body,
			props,
		});
		// picker.$set({ visible: true });
		picker.visible = true;
	}

	// $effect(() => {
	// 	// console.log("workspace update");
	// 	const activeElement = document.activeElement;
	// 	if (
	// 		selected &&
	// 		activeElement?.tagName !== "search" &&
	// 		!activeElement?.closest("search")
	// 	) {
	// 		(async () => {
	// 			await tick();
	// 			workspaceButton?.focus();
	// 		})();
	// 	}
	// });
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
	{@const { UUID, name, icon, tabIds, windowId } = workspace}
	<!--
			Opera One: #5021ff
			darker purple: #8786a7
	-->
	<div
		class:active
		class="
			workspace flex gap-2 @[360px]:gap-8 justify-center @[244px]:justify-start items-center p-4 rounded-md {classes} group
			bg-[--workspace-bg] text-[--workspace-color] focus-within:bg-[--workspace-bg-focus] hover:bg-[--workspace-bg-hover]
			[&.active]:bg-[--workspace-active-bg] [&.active]:text-[--workspace-active-color] [&.active]:hover:bg-[--workspace-active-bg-hover] [&.active]:focus-within:bg-[--workspace-active-bg-focus]
		"
	>
		{#if editMode}
			<div
				class="@[244px]:hidden ghost text-2xl rounded-full flex-grow-0 flex-shrink basis-0"
				style:font-family="Noto Color Emoji"
			>
				{iconValue}
			</div>
			<button
				title="pick emoji"
				onclick={openEmojiPicker}
				class="hidden @[244px]:[display:initial] ghost text-2xl rounded-full flex-grow-0 flex-shrink basis-0"
				style:font-family="Noto Color Emoji"
				>{iconValue}
			</button>
			<div class="hidden @[244px]:contents">
				<input
					class="min-w-0 bg-transparent border-b disabled:border-transparent outline-none w-full flex-1"
					id={UUID}
					type="text"
					disabled={!editMode}
					onkeydown={onKeyDown}
					bind:this={nameInput}
					bind:value={nameValue}
				/>
				<div class="flex gap-2 flex-grow-0 flex-shrink basis-0">
					{#if UUID === "HOME"}
						<button class="invisible" />
					{:else}
						<button
							title="remove"
							onclick={showRemovalDialog}
							class="ghost rounded-full outline-none focus:bg-white/25"
							><Icon icon="bin" width={16} /></button
						>
					{/if}
					<button
						title="apply"
						onclick={_editWorkspace}
						class="ghost rounded-full outline-none focus:bg-white/25"
					>
						<Icon icon="check" width={18} />
					</button>
					<button
						title="cancel"
						onclick={cancelEditing}
						class="ghost rounded-full outline-none focus:bg-white/25"
					>
						<Icon icon="cross" width={18} />
					</button>
				</div>
			</div>
		{:else}
			<button
				onclick={_switchWorkspace}
				class="reset w-full outline-transparent outline-none flex items-center gap-4 {active
					? '!cursor-default'
					: ''} min-w-0"
				data-focusable
				bind:this={workspaceButton}
			>
				<span
					class="text-2xl w-[1.25ch] overflow-hidden text-center"
					style:font-family="Noto Color Emoji">{icon}</span
				>
				<span
					class="{active
						? 'font-bold'
						: ''} text-lg w-full overflow-hidden text-ellipsis text-left"
					>{name}</span
				>
				<!-- <span>({tabIds.join(",")})</span> -->
			</button>
			{#if UUID === "HOME"}
				<button class="invisible" />
			{:else}
				<button
					class="ghost invisible group-hover:visible group-focus-within:visible"
					title="edit"
					onclick={toggleEditMode}
				>
					<Icon icon="edit" width={14} />
				</button>
			{/if}
		{/if}
	</div>
{/if}

<style lang="postcss">
	/*
		Opera One:
			Sidebar: #252835
			Workspace-hover: #484d64
	*/
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
