<script lang="ts">
	import Browser, { i18n } from "webextension-polyfill";
	import Tooltip from "../Tooltip.svelte";
	import ButtonLink from "../ButtonLink.svelte";
</script>

{#snippet dd(command)}
	<dd class="px-2 py-1 grow h-full flex items-center">
		{i18n.getMessage(`command.${command.name}`)}
	</dd>
{/snippet}

<div class="mt-4 w-fit">
	{#await Browser.commands.getAll()}
		...
	{:then commands}
		<dl class="grid w-full border rounded-[3px]">
			{#each commands as command}
				<div class="w-full flex items-center [&:not(:last-of-type)]:border-b h-10">
					<dt class="flex gap-1 relative border-r p-2 h-full items-center">
						<kbd>{command.shortcut}</kbd>
					</dt>
					{#if ["new-container-tab"].includes(command.name!)}
						<dd class="grow px-2 py-1 h-full flex items-center whitespace-nowrap">
							<Tooltip class="[&_svg]:w-4 [&_svg]:h-4" popupClasses="w-max" id="shortcuts-read_more">
								{i18n.getMessage(`command.${command.name}`)}
								{#snippet message()}
									{@const link = i18n.getMessage(`command.${command.name}.link`)}
									<ButtonLink href={link} target="_blank" class="ghost flex flex-nowrap items-center gap-1">{i18n.getMessage('read_more')}</ButtonLink>
								{/snippet}
							</Tooltip>
						</dd>
						{:else}
							{@render dd(command)}
					{/if}
				</div>
			{/each}
		</dl>
	{/await}
</div>
