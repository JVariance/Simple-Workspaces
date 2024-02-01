<script>
	import { onMount } from "svelte";

	let { children, enableTimeOut = false, timeOutMs = 0, timeOutCallback = () => {} } = $props();
	let loaded = $state(false);

	onMount(() => {
		loaded = true;
		
		if(enableTimeOut) {
			setTimeout(timeOutCallback, timeOutMs);
		}
	});
</script>

{#if loaded}
	{@render children()}
{/if}
