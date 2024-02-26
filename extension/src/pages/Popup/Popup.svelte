<script lang="ts">
	import MainView from "../MainView/MainView.svelte";
</script>

<MainView pageType="popup" />

<style lang="postcss">
	:global(html) {
		@apply text-[12px];
	}

	:global(body) {
		@apply w-[40rem] h-[600px];
	}
</style>
