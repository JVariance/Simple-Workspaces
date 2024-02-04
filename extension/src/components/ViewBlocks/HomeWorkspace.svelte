<script lang="ts">
	import { createRoot, unstate } from "svelte";
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
		const toast = createRoot(Toast, {
			target: document.getElementById("toaster") ?? document.body,
			props: {
				state: "loading",
				loadingMessage: i18n.getMessage("applying_changes"),
				successMessage: i18n.getMessage("applied_changes"),
				errorMessage: "something went wrong",
			},
		});
		await persistHomeWorkspace();
		toast.$set({ state: "success" });
	}

	function persistHomeWorkspace() {
		return Browser.runtime.sendMessage({
			msg: "setHomeWorkspace",
			homeWorkspace: unstate(homeWorkspace),
		});
	}
</script>

<div class="flex flex-wrap gap-x-2">
	{#if homeWorkspace}
		<SimpleWorkspace
			workspace={homeWorkspace}
			updatedName={(name) => {
				homeWorkspace.name = name;
			}}
			updatedIcon={(icon) => {
				homeWorkspace.icon = icon;
			}}
		/>
		<button
			class="btn justify-center mt-4 basis-full"
			style:width="-moz-available"
			onclick={applyHomeWorkspaceChanges}
		>
			<Icon icon="check" />
			<span class="-mt-1">{i18n.getMessage("apply_changes")}</span>
		</button>
	{/if}
</div>
