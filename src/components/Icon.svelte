<script lang="ts">
	import Icon from "@iconify/svelte";
	export let icon: keyof typeof icons;
	export let width = 24;
	export let height = width;

	let classes = "";

	export { classes as class };

	const icons = {
		add: "ph:plus-bold",
		check: "tabler:check",
		edit: "fluent:edit-24-filled",
		remove: "ic:round-remove-circle",
		search: "tabler:search",
		settings: "material-symbols:settings",
	};
</script>

<Icon icon={icons[icon]} {width} {height} class="{classes} text-foreground" />
