<script lang="ts">
	import type { HTMLImgAttributes } from "svelte/elements";

	type Props = { class?: string };
	let { class: classes = "", ...props } = $props<Props & HTMLImgAttributes>();
</script>

<img
	src="/icon/icon-light.svg"
	alt="logo"
	width="40"
	class={classes}
	{...props}
/>
