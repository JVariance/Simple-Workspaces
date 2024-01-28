<script lang="ts">
	import Icon from "@iconify/svelte";

	type Props = {
		icon: keyof typeof icons;
		width?: number;
		height?: number;
		class?: string;
	};

	let {
		icon,
		width = 24,
		height = width,
		class: classes = "",
	} = $props<Props>();

	const icons = {
		add: "ph:plus-bold",
		bin: "fluent:bin-recycle-24-filled",
		check: "tabler:check",
		"chevron-right": "fluent:chevron-right-24-filled",
		clear: "ant-design:clear-outlined",
		clear2: "pajamas:clear",
		copy: "icon-park-outline:copy",
		cross: "iconoir:cancel",
		"drag-handle": "radix-icons:drag-handle-dots-2",
		edit: "fluent:edit-24-filled",
		external: "octicon:link-external-24",
		info: "material-symbols:info",
		"next-filled": "carbon:next-filled",
		reset: "radix-icons:reset",
		remove: "ic:round-remove-circle",
		"sad-face-2": "fluent-emoji:sad-but-relieved-face",
		search: "tabler:search",
		settings: "material-symbols:settings",
		touch: "carbon:touch-1-filled",
		triangleUp: "ion:triangle-sharp",
	};
</script>

<Icon
	icon={icons[icon]}
	{width}
	{height}
	class="{classes} text-foreground text-[--icon-fill]"
/>
