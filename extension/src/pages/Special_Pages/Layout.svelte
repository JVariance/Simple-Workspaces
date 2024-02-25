<script lang="ts">

	import "@root/styles/specialPages.postcss";
	import type { Snippet } from "svelte";

	type Props = { children: Snippet };

	let { children } = $props<Props>();
</script>

{@render children()}
<div id="toaster" class="grid gap-2 sticky bottom-4 ml-4 pointer-events-none"/>