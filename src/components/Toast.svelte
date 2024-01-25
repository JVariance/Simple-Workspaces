<script lang="ts">
	import { onMount } from "svelte";
	import { fly } from "svelte/transition";

	type Props = {
		state: State;
		loadingMessage: string;
		successMessage: string;
		errorMessage: string;
		class?: string;
	};
	type State = "rest" | "success" | "error" | "loading";

	let {
		class: classes = "",
		state: _state,
		loadingMessage,
		successMessage,
		errorMessage,
	} = $props<Props>();

	let visible = $state(false);

	$effect(() => {
		if (["success", "error"].includes(_state)) {
			setTimeout(() => {
				visible = false;
			}, 4000);
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
			{classes}
		"
		in:fly={{ x: -200, duration: 500 }}
		out:fly={{ x: -200, duration: 500 }}
	>
		<span class="loading-spinner">&#9692;</span>
		<span class="checkmark">&#10003;</span>
		<span>
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
		@apply flex items-center justify-center w-max gap-2 text-xl p-8 rounded-md;
		@apply text-neutral-950 bg-neutral-300;
		@apply transition-opacity duration-200;

		&.rest {
			@apply opacity-0;

			.loading-spinner,
			.checkmark {
				@apply hidden;
			}
		}

		&.loading {
			@apply bg-[--toast-bg-neutral] text-[--toast-color-neutral];

			.checkmark {
				@apply hidden;
			}
		}

		&.success {
			@apply bg-[--toast-bg-success] text-[--toast-color-success];

			.loading-spinner {
				@apply hidden;
			}
		}

		&.error {
			@apply bg-[--toast-bg-error] text-[--toast-color-error];
		}

		span {
			@apply -mt-[0.175rem];
		}
	}

	.loading-spinner {
		@apply animate-spin w-max h-max;
	}
</style>
