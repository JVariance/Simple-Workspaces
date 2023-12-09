<script lang="ts">
	import { onMount } from "svelte";
	import { dndzone } from "svelte-dnd-action";
	import { Key } from "ts-key-enum";
	import "@root/app.postcss";
	import WorkspaceComponent from "@components/Workspace.svelte";
	import Browser from "webextension-polyfill";
	import Icon from "@root/components/Icon.svelte";
	import { debounceFunc } from "@root/utils";

	let workspaces: Ext.Workspace[] = [];
	let searchInput: HTMLInputElement;
	let windowId: number;

	$: viewWorkspaces = workspaces.filter(({ hidden }) => !hidden);
	$: activeWorkspace = workspaces.find((workspace) => workspace.active)!;

	function getWorkspaces({
		windowId,
	}: {
		windowId: number;
	}): Promise<Ext.Workspace[]> {
		return Browser.runtime.sendMessage({ msg: "getWorkspaces", windowId });
	}

	function switchWorkspace(workspace: Ext.Workspace) {
		(async () => {
			await Browser.runtime.sendMessage({
				msg: "switchWorkspace",
				workspaceId: workspace.id,
			});

			searchInput.value = "";
			window.close();
		})();
	}

	const port = Browser.runtime.connect();

	port.onMessage.addListener((message) => {
		const { msg } = message;
		switch (msg) {
			case "initialized":
				initView();
				break;
			case "updated":
				(async () => {
					workspaces = await getWorkspaces({ windowId });
				})();
				break;
			default:
				break;
		}
	});

	Browser.runtime.onMessage.addListener((message) => {
		const { msg } = message;
		switch (msg) {
			case "tabCreated":
				const { tabId } = message;
				activeWorkspace.tabIds.push(tabId);
				break;
			default:
				break;
		}
	});

	function addWorkspace() {
		(async () => {
			await Browser.runtime.sendMessage({
				msg: "addWorkspace",
			});

			workspaces = await getWorkspaces({ windowId });
		})();
	}

	function addWorkspaceByPointer() {
		addWorkspace();
	}

	function addWorkspaceByKey(e: KeyboardEvent) {
		e.stopPropagation();

		if (e.key === Key.Enter) {
			// addWorkspace();
		} else {
			onKeyDown(e as KeyboardEvent);
		}
	}

	function removeWorkspace(workspace: Ext.Workspace) {
		(async () => {
			await Browser.runtime.sendMessage({
				msg: "removeWorkspace",
				workspaceId: workspace.id,
				windowId,
			});

			workspaces = await getWorkspaces({ windowId });
		})();
	}

	function editWorkspace({
		workspace,
		icon,
		name,
	}: {
		workspace: Ext.Workspace;
		icon: string;
		name: string;
	}) {
		(async () => {
			await Browser.runtime.sendMessage({
				msg: "editWorkspace",
				windowId,
				workspace,
				icon,
				name,
			});

			workspaces = await getWorkspaces({ windowId });
		})();
	}

	function focusButton() {
		(
			document.querySelector(
				`[data-focusid='${selectedIndex}']`
			)! as HTMLButtonElement
		)?.focus();
	}

	let selectedIndex = 0;

	$: selectedIndex, focusButton();

	function searchKeydown(e: KeyboardEvent) {
		const { key } = e;

		switch (key) {
			case Key.Enter:
				e.stopPropagation();
				break;
			default:
				break;
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		const { key } = e;

		switch (key) {
			case Key.ArrowDown:
				e.preventDefault();
				selectedIndex = Math.min(viewWorkspaces.length, selectedIndex + 1);
				break;
			case Key.ArrowUp:
				e.preventDefault();
				selectedIndex = Math.max(-1, selectedIndex - 1);
				break;
			case Key.Enter:
				e.preventDefault();
				activeWorkspace = workspaces.at(selectedIndex)!;
				switchWorkspace(activeWorkspace);
				break;
			default:
				break;
		}
	}

	function initView(): Promise<void> {
		return new Promise(async (resolve) => {
			windowId = (await Browser.windows.getCurrent()).id!;
			let localWorkspaces = await getWorkspaces({ windowId });

			workspaces = localWorkspaces;
			return resolve();
		});
	}

	// let searchResults: string[] = [];

	function search(e: InputEvent & { target: HTMLInputElement }) {
		const { value } = e.target;

		// searchResults = [];
		if (!value) {
			// viewWorkspaces = workspaces.filter(({ hidden }) => !hidden);
			viewWorkspaces = workspaces.map((workspace) => {
				workspace.hidden = false;
				return workspace;
			});
			return;
		}

		(async () => {
			console.log({ value });
			const tabs = await Browser.tabs.query({ windowId });
			const matchingTabs = tabs.filter((tab) => tab.url?.includes(value));
			const matchingTabIds = matchingTabs.map(({ id }) => id);

			console.log({ matchingTabs });

			viewWorkspaces = workspaces
				.map((workspace) => {
					const workspaceHasSearchedTab = workspace.tabIds.some((tabId) =>
						matchingTabIds.includes(tabId)
					);

					workspace.hidden = !workspaceHasSearchedTab;
					return workspace;
				})
				.filter(({ hidden }) => !hidden);

			// searchResults = [
			// 	...searchResults,
			// 	...matchingTabs.map((tab) => tab.url!),
			// ];
		})();
	}

	const debouncedSearch = debounceFunc(search, 500);

	function handleDndConsider(e) {
		viewWorkspaces = e.detail.items;
	}

	function handleDndFinalize(e) {
		viewWorkspaces = e.detail.items;
		Browser.runtime.sendMessage({
			msg: "reorderedWorkspaces",
			workspaces: viewWorkspaces,
			windowId,
		});
	}

	function openOptionsPage() {
		Browser.runtime.openOptionsPage();
	}

	onMount(() => {
		(async () => {
			if (
				await Browser.runtime.sendMessage({ msg: "checkBackgroundInitialized" })
			) {
				await initView();
			}
		})();
	});
</script>

<svelte:body on:keydown={onKeyDown} />

<div class="w-[100dvw] p-2 box-border">
	<!-- <h1 class="mb-4">Workspaces</h1> -->
	{#if true}
		<div class="flex flex-wrap gap-1 absolute top-0 right-0">
			<button
				class="mb-2 border rounded-md p-1"
				on:click={() => {
					Browser.runtime.sendMessage({ msg: "showAllTabs" });
				}}>show all tabs</button
			>
			<button
				class="mb-2 border rounded-md p-1"
				on:click={() => {
					Browser.runtime.sendMessage({ msg: "reloadAllTabs" });
				}}>reload all tabs</button
			>
			<button
				class="mb-2 border rounded-md p-1"
				on:click={() => {
					Browser.storage.local.clear();
				}}>clear DB</button
			>
		</div>
	{/if}
	<section class="flex gap-2 items-center mt-4 mb-6 w-full">
		<search
			class="
			w-full flex items-center gap-2 border
			focus-within:bg-neutral-50 focus-within:shadow-xl
			dark:focus-within:bg-neutral-700
			dark:border-neutral-700 dark:bg-neutral-800 rounded-md px-4 py-2
			"
		>
			<label for="search"
				><Icon icon="search" width={20} class="text-neutral-400" /></label
			>
			<input
				id="search"
				type="search"
				class="w-full bg-transparent p-1 !outline-none !outline-0"
				data-focusid={-1}
				bind:this={searchInput}
				on:input={debouncedSearch}
				on:keydown={searchKeydown}
				placeholder="Search..."
			/>
		</search>
		<button on:click={openOptionsPage}
			><Icon icon="settings" width={18} /></button
		>
	</section>
	<hr class="border-neutral-800" />
	<!-- <div id="search-results" class="mb-6 grid gap-2">
		{#each searchResults as result}
			<p>{result}</p>
		{/each}
	</div> -->
	{#if viewWorkspaces.length && activeWorkspace}
		<div
			class="grid gap-4 w-full @container"
			use:dndzone={{
				items: viewWorkspaces,
				dropTargetStyle: {},
				dragDisabled:
					viewWorkspaces.length !== workspaces.length || workspaces.length < 2,
			}}
			on:consider={handleDndConsider}
			on:finalize={handleDndFinalize}
		>
			{#each viewWorkspaces as workspace, i (workspace.id)}
				<WorkspaceComponent
					{workspace}
					active={workspace.active}
					selected={i === selectedIndex}
					index={i}
					on:editWorkspace={({ detail: { icon, name } }) => {
						editWorkspace({ workspace, icon, name });
					}}
					on:switchWorkspace={() => {
						switchWorkspace(workspace);
					}}
					on:removeWorkspace={() => {
						removeWorkspace(workspace);
					}}
				></WorkspaceComponent>
			{/each}
		</div>
		<button
			id="add-workspace"
			on:click={addWorkspaceByPointer}
			on:keydown={addWorkspaceByKey}
			data-focusid={viewWorkspaces.length}
			class:selected={selectedIndex === viewWorkspaces.length}
			class="
				p-4 items-center flex gap-4 rounded-md text-left border mt-4 w-full
				outline-none
				dark:border-neutral-700 dark:bg-neutral-800 [&.selected]:dark:bg-neutral-700
			"
			><span class="w-[2ch] text-2xl text-center"
				><Icon icon="add" width={18} /></span
			>
			<span class="leading-none -mt-[0.5ch] text-lg">new workspace</span
			></button
		>
	{/if}
</div>

<style lang="postcss">
	@media screen and (width < 260px) {
		button#add-workspace {
			@apply h-12 p-0 aspect-square justify-self-center justify-center items-center;
			span:nth-of-type(n + 2) {
				@apply hidden;
			}
		}
	}
</style>
