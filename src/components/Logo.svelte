<script lang="ts">
	import type { HTMLImgAttributes } from "svelte/elements";

	type Props = { class?: string };
	let { class: classes = "", ...props } = $props<Props & HTMLImgAttributes>();
</script>

<!-- <img
	src="/icon/icon-dark.svg"
	alt="logo"
	width="40"
	class="[@media_(prefers-color-scheme:_light)]:hidden {classes}"
	{...props}
/>
<img
	src="/icon/icon-light.svg"
	alt="logo"
	width="40"
	class="dark:hidden {classes}"
	{...props}
/> -->
<img
	src="/icon/icon-light.svg"
	alt="logo"
	width="40"
	class={classes}
	{...props}
/>
