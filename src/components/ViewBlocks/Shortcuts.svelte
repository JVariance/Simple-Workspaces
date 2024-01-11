<script lang="ts">
	import Browser, { i18n } from "webextension-polyfill";
</script>

<div class="mt-4">
	{#await Browser.commands.getAll()}
		...
	{:then commands}
		<dl class="grid grid-cols-[max-content_max-content] gap-4">
			{#each commands as command}
				<dt>{i18n.getMessage(`command.${command.name}`)}</dt>
				<dd><kbd>{command.shortcut}</kbd></dd>
			{/each}
		</dl>
	{/await}
</div>
