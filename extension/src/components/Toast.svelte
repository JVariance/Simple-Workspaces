<svelte:options accessors={true} />

<script lang="ts">
	import { onMount } from "svelte";
	import { fly } from "svelte/transition";

	type Props = {
		state: State;
		loadingMessage: string;
		successMessage: string;
		errorMessage: string;
		class?: string;
		duration?: number;
	};
	type State = "rest" | "success" | "error" | "loading";

	let {
		class: classes = "",
		state: _state,
		loadingMessage,
		successMessage,
		errorMessage,
		duration = 4000,
	} = $props<Props>();

	let visible = $state(false);

	$effect(() => {
		if (["success", "error"].includes(_state)) {
			setTimeout(() => {
				visible = false;
			}, duration ?? 4000);
		}
	});

	onMount(() => {
		visible = true;
	});
</script>

{#if visible}
	<div
		id="toast"
		class="
			{_state}
			[&.info]:bg-[--toast-bg-info] [&.info]:text-[--toast-color-info]
			[&.success]:bg-[--toast-bg-success] [&.success]:text-[--toast-color-success]
			[&.error]:bg-[--toast-bg-error] [&.error]:text-[--toast-color-error]
			[&.warning]:bg-[--toast-bg-warning] [&.warning]:text-[--toast-color-warning]
			[&.rest]:bg-[--toast-bg-neutral] [&.neutral]:text-[--toast-color-neutral]
			grid grid-cols-[1rem_1fr] group
			items-center justify-center w-max gap-2 text-xl p-8 rounded-md
			text-neutral-950 bg-neutral-300
			transition-opacity duration-200
			[&.rest]:opacity-0
			{classes}
		"
		in:fly={{ x: -200, duration: 500 }}
		out:fly={{ x: -200, duration: 500 }}
	>
		<span
			class="
				loading-spinner col-start-1 row-start-1 hidden group-[&.loading]:inline-block
				animate-spin w-max h-max
			">&#9692;</span
		>
		<span
			class="checkmark col-start-1 row-start-1 hidden group-[&.success]:inline-block"
			>&#10003;</span
		>
		<span
			class="cross col-start-1 row-start-1 hidden group-[&.error]:inline-block"
			>&#x2715;</span
		>
		<span class="col-start-2 row-start-1">
			{#if _state === "loading"}
				{loadingMessage}
			{:else if _state === "success"}
				{successMessage}
			{:else if _state === "error"}
				{errorMessage}
			{/if}
		</span>
	</div>
{/if}

<style lang="postcss">
	#toast {
		&.loading {
			@apply bg-[--toast-bg-neutral] text-[--toast-color-neutral];
		}

		&.success {
			@apply bg-[--toast-bg-success] text-[--toast-color-success];
		}

		&.error {
			@apply bg-[--toast-bg-error] text-[--toast-color-error];
		}

		span {
			@apply -mt-[0.175rem];
		}
	}
</style>
