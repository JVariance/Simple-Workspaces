<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Props = { children?: Snippet, class?: string };
	let { children, class: classes = "", ...props } = $props<Props & HTMLButtonAttributes>();
</script>

<button class="btn {classes}" {...props}>
	{#if children}
		{@render children()}
	{/if}
</button>
