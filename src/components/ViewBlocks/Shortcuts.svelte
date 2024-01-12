<script lang="ts">
	import Browser, { i18n } from "webextension-polyfill";
</script>

<div class="mt-4 w-fit">
	{#await Browser.commands.getAll()}
		...
	{:then commands}
		<dl class="grid gap-6 w-full">
			{#each commands as command}
				<div class="w-full flex flex-wrap gap-x-4 gap-y-2 items-center">
					<dt class="grow">{i18n.getMessage(`command.${command.name}`)}</dt>
					<dd class="text-right"><kbd>{command.shortcut}</kbd></dd>
				</div>
			{/each}
		</dl>
	{/await}
</div>
