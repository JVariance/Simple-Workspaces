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

	let toast: HTMLDivElement;

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
				setTimeout(() => {
					toast.remove();
				}, 2000);
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
		class="{classes} {_state}"
		bind:this={toast}
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
