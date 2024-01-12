<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";

	type Props = { children: Snippet; class?: string };

	let { children, class: classes = "" } = $props<Props>();
</script>

<p class="w-full py-1 px-2 flex flex-wrap gap-2 items-center rounded-md {classes}">
	<Icon icon="info" width={20} /> <span class="-mt-1">{@render children()}</span>
</p>
