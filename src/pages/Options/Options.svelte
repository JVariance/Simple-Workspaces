<script lang="ts">
	const defaultWorkspaces: Ext.Workspace[] = [];

	function addDefaultWorkspace() {}
</script>

<h1>Options</h1>

<div class="grid gap-8">
	<section>
		<h2>🌍 Language</h2>
	</section>
	<section>
		<h2>Default workspaces</h2>
		<div>
			{#each defaultWorkspaces as workspace}
				<div></div>
			{/each}
			<button title="add default workspace" on:click={addDefaultWorkspace}
				>Add default workspace</button
			>
		</div>
	</section>
	<section>
		<h2>⚠ Clear</h2>
	</section>
</div>

<style lang="postcss">
	:global(html) {
		@apply dark:bg-neutral-900 dark:text-white p-0 m-0 font-sans;
	}

	button {
		@apply border border-solid p-2 rounded-md dark:bg-neutral-800 dark:text-white dark:border-neutral-700;
	}
</style>
