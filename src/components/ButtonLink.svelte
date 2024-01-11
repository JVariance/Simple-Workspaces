<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";
	import type { HTMLAnchorAttributes } from "svelte/elements";

	type Props = {children: Snippet};
	let { children, href, target, ...props } = $props<Props & HTMLAnchorAttributes>();
</script>

<a class="btn" {href} {target} {...props}>
	{#if target === "_blank"}
		<Icon icon="external" width={18}/>
	{/if}
	{@render children()}
</a>