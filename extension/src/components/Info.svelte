<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";

	type Props = { children: Snippet; type?: string; class?: string };

	let { children, type = 'info', class: classes = "" } = $props<Props>();
</script>

<p 
	class="
		{type} p-2 flex flex-wrap gap-2 items-center rounded-md w-fit
		[&.info]:bg-[--info-box-bg-info] [&.info]:text-[--info-box-color-info]
		[&.success]:bg-[--info-box-bg-success] [&.success]:text-[--info-box-color-success]
		[&.error]:bg-[--info-box-bg-error] [&.error]:text-[--info-box-color-error]
		[&.warning]:bg-[--info-box-bg-warning] [&.warning]:text-[--info-box-color-warning]
		[&.neutral]:bg-[--info-box-bg-neutral] [&.neutral]:text-[--info-box-color-neutral]
		{classes}
	"
>
	<Icon icon="info" width={20} /> <span class="-mt-[0.1rem]">{@render children()}</span>
</p>