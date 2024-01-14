<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";

	type Props = {summary: Snippet, children: Snippet, detailsClasses?: string, summaryClasses?: string, contentClasses?: string};
	let { summary, children, detailsClasses = "", summaryClasses = "", contentClasses = "" } = $props<Props>();

</script>

<details class="rounded-md open:border border-t-neutral-300 dark:border-neutral-600 group {detailsClasses}">
	<summary class="flex items-center gap-2 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded-md list-none cursor-pointer group-open:border-0 {summaryClasses}">
		{@render summary()}
		<Icon icon="chevron-right" width={20} class="rotate-90 transition-transform duration-200 ml-auto group-open:rotate-[270deg]" />
	</summary>
	<div class="content p-2 pt-0 {contentClasses}">
		{@render children()}
	</div>
</details>