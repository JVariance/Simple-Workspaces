<script lang="ts">
	import { tick } from "svelte";
	import Icon from "./Icon.svelte";

	export let workspace: Workspace;
	export let active = false;
	export let selected = false;

	let editMode = false;
	let classes = "";
	let workspaceButton: HTMLButtonElement;
	let nameInput: HTMLInputElement;

	export { classes as class };

	async function toggleEditMode() {
		editMode = !editMode;
		if (editMode) {
			await tick();
			nameInput?.focus();
		}
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
			? 'grid-cols-[max-content_1fr_max-content]'
			: 'grid-cols-[1fr_max-content]'} justify-items-start items-center p-1 rounded-md {classes} focus-within:bg-neutral-700 [&.active]:bg-[#5021ff]"
	>
		{#if editMode}
			<input
				class="w-[3ch] text-center bg-transparent"
				type="text"
				max="1"
				value={icon}
			/>
			<input
				class="bg-transparent border disabled:border-transparent"
				{id}
				type="text"
				disabled={!editMode}
				bind:this={nameInput}
				value={name}
			/>
		{:else}
			<button
				on:click
				class="outline-transparent outline-none"
				bind:this={workspaceButton}
			>
				<span>{icon}</span>
				<span>{name}/{windowId}</span>
				<span>({tabIds.join(",")})</span>
			</button>
		{/if}
		<button on:click={toggleEditMode}>
			{#if editMode}
				<Icon icon="check" width={18} />
			{:else}
				<Icon icon="edit" width={14} />
			{/if}
		</button>
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
