<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLDetailsAttributes } from "svelte/elements";

	type Props = { class?: string, summary: Snippet, children: Snippet };
	let { class: classes = "", summary, children, ...attributes } = $props<Props & HTMLDetailsAttributes>();

	let detailsElement: HTMLDetailsElement;

	export function open() {
		detailsElement.open = true;
	}

	export function close() {
		detailsElement.open = false;
	}
</script>

<details 
	bind:this={detailsElement}
	class="{classes}"
	style:--accordion-border-color="light-dark(#e5e7eb, #525252)"
	{...attributes}
>
	{@render summary()}
	<div class="content @container">
		<div>
			{@render children()}
		</div>
	</div>
</details>

<style lang="postcss">
	:global(:where(details)) {
		@apply rounded-md border-t-[--accordion-border-color];
	}

	:global(details[open]) {
		@apply border border-[--accordion-border-color];
	}

	:global(details > :where(.content)) {
		@apply p-2 pt-0;
	}

	:global(details :where(summary)) {
		--accordion-summary-hover-bg: light-dark(#f5f5f5, #17171c);
		--accordion-summary-hover-color: inherit;
		@apply flex items-center gap-2 p-2 border-[--accordion-border-color] rounded-md list-none cursor-pointer;
		@apply hover:bg-[--accordion-summary-hover-bg] hover:text-[--accordion-summary-hover-color];
	}

	:global(details[open] :where(summary)) {
		@apply rounded-b-none;
	}

	:global(details[open] .chevron){
		@apply rotate-[270deg];
	}


	/*
		Source: https://linkedlist.ch/animate_details_element_60/
	*/
	:global(details > div) {
		overflow: hidden;
		display: grid;
		/* intentionally independent from .animation as Safari 16
		would otherwise ignore the expansion animation. */
		animation-duration: 0.2s;
	}

	:global(details > .animation) {
		animation-name: grid-expand;
		animation-timing-function: ease-out;
	}

	:global(details > .collapsing) {
		animation-direction: reverse;
		animation-timing-function: ease-in;
	}

	:global(details > div > div) {
		min-height: 0;
	}

	@keyframes -global-grid-expand {
		0% {
			grid-template-rows: 0fr;
		}
		100% {
			grid-template-rows: 1fr;
		}
	}
</style>