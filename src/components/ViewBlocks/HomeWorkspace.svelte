<script lang="ts">
	import { onMount, createRoot, unstate } from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import SimpleWorkspace from "@components/SimpleWorkspace.svelte";
	import Icon from "@components/Icon.svelte";
	import Toast from "@components/Toast.svelte";
	import { BrowserStorage } from "@root/background/Storage";

	let homeWorkspace = $state<Ext.Workspace>()!;

	async function applyHomeWorkspaceChanges() {
		console.info("applyHomeWorkspaceChanges");
		const toast = createRoot(Toast, {
			target: document.body,
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
		console.log("????!?!?? wöoo");
		return Browser.runtime.sendMessage({
			msg: "setHomeWorkspace",
			homeWorkspace: unstate(homeWorkspace),
		});
	}

	onMount(async () => {
		let { homeWorkspace: _homeWorkspace } =
			await BrowserStorage.getHomeWorkspace();
		homeWorkspace = _homeWorkspace
			? _homeWorkspace
			: ({
					id: -1,
					icon: "🏠",
					name: "Home",
				} as Ext.SimpleWorkspace);
	});
</script>

<div class="flex flex-wrap gap-2">
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
