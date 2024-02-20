<script lang="ts">
	import { mount, unstate } from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import SimpleWorkspace from "@components/SimpleWorkspace.svelte";
	import Icon from "@components/Icon.svelte";
	import Toast from "@components/Toast.svelte";
	import { getHomeWorkspaceState } from "@pages/states.svelte";

	let homeWorkspace = $derived(getHomeWorkspaceState());

	async function applyHomeWorkspaceChanges(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		event.stopImmediatePropagation();
		const props = $state({
			state: "loading",
			loadingMessage: i18n.getMessage("applying_changes"),
			successMessage: i18n.getMessage("applied_changes"),
			errorMessage: "something went wrong",
		});
		mount(Toast, {
			target: document.getElementById("toaster") ?? document.body,
			props,
		});
		await persistHomeWorkspace();
		props.state = "success";
	}

	function persistHomeWorkspace() {
		return Browser.runtime.sendMessage({
			msg: "setHomeWorkspace",
			homeWorkspace: unstate(homeWorkspace),
		});
	}
</script>

<div class="flex flex-col gap-x-2">
	{#if homeWorkspace}
		<div class="flex gap-2">
			<SimpleWorkspace
				workspace={homeWorkspace}
				updatedName={(name) => {
					homeWorkspace.name = name;
				}}
				updatedIcon={(icon) => {
					homeWorkspace.icon = icon;
				}}
			/>
		</div>
		<button
			class="btn justify-center mt-4 max-w-fit"
			style:width="-moz-available"
			onclick={applyHomeWorkspaceChanges}
		>
			<Icon icon="check" />
			<span class="-mt-1">{i18n.getMessage("apply_changes")}</span>
		</button>
	{/if}
</div>
