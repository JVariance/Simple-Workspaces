<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		state: State;
		loadingMessage: Snippet;
		successMessage: Snippet;
		errorMessage: Snippet;
		class?: string;
		updateState?: (state: State) => {};
	};
	type State = "rest" | "success" | "error" | "loading";

	let {
		class: classes = "",
		state,
		updateState = () => {},
		loadingMessage,
		successMessage,
		errorMessage,
	} = $props<Props>();

	$effect(() => {
		updateState(state);
	});
</script>

<div id="toast" class="{classes} {state}">
	<span class="loading-spinner">&#9692;</span>
	<span class="checkmark">&#10003;</span>
	<span>
		{#if state === "loading"}
			{loadingMessage}
		{:else if state === "success"}
			{successMessage}
		{:else if state === "error"}
			{errorMessage}
		{/if}
	</span>
</div>

<style lang="postcss">
	#toast {
		@apply flex items-center justify-center w-max gap-2 text-xl p-8 rounded-md;
		@apply text-neutral-950 bg-neutral-300;
		@apply fixed bottom-4 left-4 transition-opacity duration-200;

		&.rest {
			@apply opacity-0;
			.loading-spinner {
				@apply hidden;
			}
		}

		&.loading {
			@apply text-neutral-950 bg-neutral-300;

			.checkmark {
				@apply hidden;
			}
		}

		&.success {
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

	.loading-spinner {
		@apply animate-spin w-max h-max;
	}
</style>
