<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";

	type Props = { children: Snippet; class?: string };

	let { children, class: classes = "" } = $props<Props>();
</script>

<p class="p-2 flex flex-wrap gap-2 items-center rounded-md bg-blue-300 text-blue-900 dark:bg-blue-300 dark:text-blue-900 w-max {classes}">
	<Icon icon="info" width={20} /> <span class="-mt-[0.1rem]">{@render children()}</span>
</p>
