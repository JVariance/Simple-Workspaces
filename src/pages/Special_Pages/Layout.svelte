<script lang="ts">
	let { children } = $props();
</script>

{@render children()}
<div id="toaster" class="grid gap-2 sticky bottom-4 ml-4"/>

<style lang="postcss">
	:global(html) {
		@apply text-neutral-800 dark:text-white p-0 m-0 font-sans;
	}

	:global(body){
		@apply dark:bg-[#1c1b22] m-0 p-0;
	}

	p {
		@apply m-0;
	}

	:global(details summary > svg){
		@apply transition-transform duration-200;
	}

	:global(details[open] summary > svg){
		@apply rotate-90;
	}

	:global(.btn) {
		@apply flex gap-2 items-center cursor-pointer border border-solid p-2 rounded-md bg-neutral-100 border-gray-300 dark:bg-[#33323a] dark:text-white dark:border-neutral-700;
		@apply hover:bg-gray-200 dark:hover:bg-[#414049] focus-within:bg-gray-200 focus:bg-gray-200 dark:focus:bg-[#414049];
	}

	.default-workspaces, .current-workspaces {
		@apply grid gap-2;

		& > li {
			@apply flex gap-2;
		}
	}

	ul {
		@apply p-0 m-0;
	}

	li {
		@apply list-none;
	}

	/* #selectLanguage {
		@apply border p-2 border-solid rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-white;

		option {
			@apply bg-transparent;
		}
	} */
</style>