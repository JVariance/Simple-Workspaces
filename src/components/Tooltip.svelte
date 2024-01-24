<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";

	type Props = { message: Snippet, class?: string, popupClasses?: string };

	let { message, class: classes = "", popupClasses = "" } = $props<Props>();
</script>

<div
	class="tooltip relative group {classes}"
>
	<Icon icon="info" width={24} />
	<div 
		class="
			popup absolute right-0 max-w-[100dvw] opacity-0 transition-opacity duration-200 delay-200 pointer-events-none 
			group-hover:opacity-100 group-hover:pointer-events-auto
			bg-white/75 dark:bg-black/75 backdrop-blur-md rounded-md p-1 {popupClasses}
		"
	>
		{@render message()}
	</div>
</div>
