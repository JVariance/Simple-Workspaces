<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";
	import { Key } from "ts-key-enum";

	type Props = {summary: Snippet, children: Snippet, detailsClasses?: string, summaryClasses?: string, contentClasses?: string, summaryAttributes?: Record<string, any>};
	let { summary, children, detailsClasses = "", summaryClasses = "", contentClasses = "", summaryAttributes = {}, ...attributes } = $props<Props>();

	let detailsElement: HTMLDetailsElement;

	export function open() {
		detailsElement.open = true;
	}

	export function close() {
		detailsElement.open = false;
	}

	function onKeyPress(event){
		console.info({ event });
		switch(event.key) {
			case Key.ArrowLeft:
				detailsElement.open = false;
				break;
			case Key.ArrowRight:
				detailsElement.open = true;
				break;
			default:
				break;
		}
	}
</script>

<details 
	bind:this={detailsElement}
	class="rounded-md open:border border-t-neutral-300 dark:border-neutral-600 group {detailsClasses}"
	{...attributes}
>
	<summary 
		class="flex items-center gap-2 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded-md list-none cursor-pointer group-open:border-0 {summaryClasses}" 
		{...summaryAttributes}
		onkeyup={onKeyPress}
	>
		{@render summary()}
		<Icon icon="chevron-right" width={20} class="rotate-90 transition-transform duration-200 ml-auto group-open:rotate-[270deg] text-neutral-300 dark:text-neutral-600" />
	</summary>
	<div class="content p-2 pt-0 {contentClasses}">
		{@render children()}
	</div>
</details>