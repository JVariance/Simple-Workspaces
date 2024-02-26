<script lang="ts">
	import MainView from "../MainView/MainView.svelte";
</script>

<MainView pageType="sidebar" />

<style lang="postcss">
	:global(html) {
		@apply overflow-hidden w-dvw h-dvh;
	}
</style>
