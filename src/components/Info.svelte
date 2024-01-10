<script lang="ts">
	import Icon from "./Icon.svelte";

	// type Props = { message: string };

	let { children } = $props();
</script>

<p class="py-1 px-2 flex gap-2 w-max items-center rounded-md">
	<Icon icon="info" width={20} /> <span class="-mt-1">{@render children()}</span>
</p>
