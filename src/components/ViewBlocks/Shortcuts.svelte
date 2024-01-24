<script lang="ts">
	import Browser, { i18n } from "webextension-polyfill";
	import Tooltip from "../Tooltip.svelte";
	import ButtonLink from "../ButtonLink.svelte";
</script>

<div class="mt-4 w-fit">
	{#await Browser.commands.getAll()}
		...
	{:then commands}
		<dl class="grid gap-6 w-full">
			{#each commands as command}
				<div class="w-full flex flex-wrap gap-x-4 gap-y-2 items-center">
					<dt class="grow flex gap-1 relative">
						{i18n.getMessage(`command.${command.name}`)}
						{#if ["new-container-tab"].includes(command.name!)}
							<Tooltip class="[&>svg]:w-4 [&>svg]:h-4 absolute top-0 right-0" popupClasses="w-max">
								{#snippet message()}
									{@const link = i18n.getMessage(`command.${command.name}.link`)}
									<ButtonLink href={link} target="_blank" class="ghost flex flex-nowrap items-center gap-1">{i18n.getMessage('read_more')}</ButtonLink>
								{/snippet}
							</Tooltip>
						{/if}
					</dt>
					<dd class="text-right"><kbd>{command.shortcut}</kbd></dd>
				</div>
			{/each}
		</dl>
	{/await}
</div>
