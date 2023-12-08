<script lang="ts">
	import { createEventDispatcher, tick } from "svelte";
	import Icon from "./Icon.svelte";

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

	function enableToggleMode() {
		(async () => {
			editMode = true;
			await tick();
			nameInput?.focus();
		})();
	}

	function editWorkspace() {
		dispatch("editWorkspace", { workspace, icon: iconValue, name: nameValue });
		editMode = false;
	}

	function removeWorkspace() {
		dispatch("removeWorkspace");
	}

	function switchWorkspace() {
		dispatch("switchWorkspace");
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
		class="workspace grid gap-2 p-4 {editMode
			? 'grid-cols-[max-content_1fr_max-content_max-content]'
			: 'grid-cols-[1fr_max-content]'} justify-items-start items-center p-1 rounded-md {classes} focus-within:bg-neutral-200 focus-within:dark:bg-neutral-700 [&.active]:bg-[#5021ff] [&.active]:text-white"
	>
		{#if editMode}
			<input
				class="w-[3ch] text-center bg-transparent"
				type="text"
				max="1"
				disabled={!editMode}
				bind:value={iconValue}
			/>
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
		{:else}
			<button
				on:click={switchWorkspace}
				class="outline-transparent outline-none"
				data-focusid={index}
				bind:this={workspaceButton}
			>
				<span>{icon}</span>
				<span>{name}/{windowId}</span>
				<span>({tabIds.join(",")})</span>
			</button>
		{/if}
		{#if editMode}
			<button on:click={editWorkspace}>
				<Icon icon="check" width={18} />
			</button>
		{:else}
			<button on:click={enableToggleMode}>
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
