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
		cross: "iconoir:cancel",
		"drag-handle": "radix-icons:drag-handle-dots-2",
		edit: "fluent:edit-24-filled",
		remove: "ic:round-remove-circle",
		search: "tabler:search",
		settings: "material-symbols:settings",
	};
</script>

<Icon icon={icons[icon]} {width} {height} class="{classes} text-foreground" />
