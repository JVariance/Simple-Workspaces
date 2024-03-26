<script lang="ts">
	import Icon from "@iconify/svelte";

	type Props = {
		icon: keyof typeof icons;
		width?: number;
		height?: number;
		class?: string;
		inheritColor?: boolean;
	};

	let {
		icon,
		width = 24,
		height = width,
		class: classes = "",
		inheritColor = false,
	} = $props<Props>();

	const icons = {
		add: "ph:plus-bold",
		"arrow-right": "bitcoin-icons:arrow-right-outline",
		"arrow-right-long": "heroicons:arrow-long-right",
		bin: "fluent:bin-recycle-24-filled",
		"caret-right": "bitcoin-icons:caret-right-outline",
		check: "tabler:check",
		"check-cirlce": "material-symbols:check-circle",
		"chevron-right": "fluent:chevron-right-24-filled",
		clear: "ant-design:clear-outlined",
		clear2: "pajamas:clear",
		"cloud-disconnect": "iconamoon:cloud-remove-fill",
		copy: "icon-park-outline:copy",
		cross: "iconoir:cancel",
		"drag-handle": "radix-icons:drag-handle-dots-2",
		edit: "fluent:edit-24-filled",
		external: "octicon:link-external-24",
		"import-file": "mingcute:file-import-fill",
		info: "material-symbols:info",
		"json-file": "bxs:file-json",
		"next-filled": "carbon:next-filled",
		reload: "ion:reload-outline",
		reset: "radix-icons:reset",
		remove: "ic:round-remove-circle",
		person: "bi:person-check-fill",
		"person-2": "fa-solid:user-check",
		"sad-face-2": "fluent-emoji:sad-but-relieved-face",
		search: "tabler:search",
		settings: "material-symbols:settings",
		sync: "mdi:cloud-sync",
		touch: "carbon:touch-1-filled",
		triangleUp: "ion:triangle-sharp",
	};
</script>

<Icon
	icon={icons[icon]}
	{width}
	{height}
	class="{classes} text-foreground {inheritColor ? '' : 'text-[--icon-fill]'}"
/>
