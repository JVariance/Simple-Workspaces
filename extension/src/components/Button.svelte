<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = { children?: Snippet, external?: boolean };
	let { children } = $props<Props>();
</script>

<button class="btn">
	{#if children}
		{@render children()}
	{/if}
</button>
