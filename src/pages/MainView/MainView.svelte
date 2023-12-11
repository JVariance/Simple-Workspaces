<script lang="ts">
	import { onMount } from "svelte";
	import { dndzone } from "svelte-dnd-action";
	import { Key } from "ts-key-enum";
	import "@root/app.postcss";
	import Workspace from "@components/Workspace.svelte";
	import Browser from "webextension-polyfill";
	import Icon from "@root/components/Icon.svelte";
	import { debounceFunc } from "@root/utils";

	let workspaces: Ext.Workspace[] = $state([]);
	let viewWorkspaces: Ext.Workspace[] = $derived(
		workspaces.filter(({ id }) => !searchFilteredWorkspaceIds.includes(id))
	);
	let activeWorkspace: Ext.Workspace = $state();
	let searchInput: HTMLInputElement;
	let windowId: number;
	let searchFilteredWorkspaceIds: string[] = $state([]);

	$effect(() => {
		activeWorkspace = workspaces.find((workspace) => workspace.active)!;
	});

	function getWorkspaces({
		windowId,
	}: {
		windowId: number;
	}): Promise<Ext.Workspace[]> {
		return Browser.runtime.sendMessage({ msg: "getWorkspaces", windowId });
	}

	function updatedActiveWorkspace({
		id: workspaceId,
	}: {
		id: Ext.Workspace["id"];
	}) {
		activeWorkspace.active = false;
		const workspace = workspaces.find(({ id }) => id === workspaceId);
		workspace.active = true;
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

	function movedTabs({
		targetWorkspaceId,
		tabIds,
	}: {
		targetWorkspaceId: string;
		tabIds: number[];
	}) {
		const targetWorkspace = workspaces.find(
			({ id }) => id === targetWorkspaceId
		);

		activeWorkspace.tabIds = activeWorkspace.tabIds.filter(
			(tabId) => !tabIds.includes(tabId)
		);

		if (!activeWorkspace.tabIds.length) {
			updatedActiveWorkspace({ id: targetWorkspace.id });
		}

		targetWorkspace.tabIds.push(...tabIds);
	}

	function createdTab({ tabId }: { tabId: number }) {
		activeWorkspace.tabIds.push(tabId);
	}

	function removedTab({ tabId }: { tabId: number }) {
		activeWorkspace.tabIds = activeWorkspace.tabIds.filter(
			(id) => id !== tabId
		);
	}

	function addedWorkspace({ workspace }: { workspace: Ext.Workspace }) {
		workspaces.push(workspace);
		updatedActiveWorkspace({ id: workspace.id });
	}

	const port = Browser.runtime.connect();

	port.onMessage.addListener((message) => {
		const { msg } = message;
		switch (msg) {
			case "initialized":
				initView();
				break;
			case "addedWorkspace":
				addedWorkspace(message);
				break;
			case "updatedActiveWorkspace":
				updatedActiveWorkspace(message);
				break;
			case "movedTabs":
				movedTabs(message);
				break;
			case "createdTab":
				createdTab(message);
				break;
			case "removedTab":
				removedTab(message);
				break;
			default:
				break;
		}
	});

	function addWorkspace() {
		Browser.runtime.sendMessage({
			msg: "addWorkspace",
		});
	}

	function addWorkspaceByPointer() {
		addWorkspace();
	}

	function addWorkspaceByKey(e: KeyboardEvent) {
		e.stopPropagation();
	}

	function removeWorkspace(workspace: Ext.Workspace) {
		(async () => {
			if (workspace === activeWorkspace) {
				const currentActiveWorkspaceIndex = workspaces.findIndex(
					({ id }) => id === activeWorkspace.id
				);

				const newActiveWorkspaceIndex = Math.max(
					0,
					currentActiveWorkspaceIndex - 1
				);

				workspaces.at(newActiveWorkspaceIndex)!.active = true;
			}

			workspaces = workspaces.filter(({ id }) => id !== workspace.id);

			await Browser.runtime.sendMessage({
				msg: "removeWorkspace",
				workspaceId: workspace.id,
				windowId,
			});
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
		workspace.icon = icon;
		workspace.name = name;
		Browser.runtime.sendMessage({
			msg: "editWorkspace",
			windowId,
			workspaceId: workspace.id,
			icon,
			name,
		});
	}

	function focusButton() {
		(
			document.querySelector(
				`[data-focusid='${selectedIndex}']`
			)! as HTMLButtonElement
		)?.focus();
	}

	let selectedIndex = $state(0);

	$effect(() => {
		focusButton(selectedIndex);
	});

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
				break;
			default:
				break;
		}
	}

	function initView(): Promise<void> {
		return new Promise(async (resolve) => {
			windowId = (await Browser.windows.getCurrent()).id!;
			let localWorkspaces = await getWorkspaces({ windowId });

			workspaces.push(...localWorkspaces);
			return resolve();
		});
	}

	// let searchResults: string[] = [];

	function search(e: InputEvent & { target: HTMLInputElement }) {
		const { value } = e.target;

		// // searchResults = [];
		if (!value) {
			searchFilteredWorkspaceIds = [];
		}

		(async () => {
			const tabs = await Browser.tabs.query({ windowId });
			const matchingTabs = tabs.filter((tab) =>
				tab.url?.toLocaleLowerCase()?.includes(value.toLocaleLowerCase())
			);
			const matchingTabIds = matchingTabs.map(({ id }) => id!);

			searchFilteredWorkspaceIds = workspaces.reduce((acc, workspace) => {
				const workspaceHasSomeMatchingTab = workspace.tabIds.some((tabId) =>
					matchingTabIds.includes(tabId)
				);
				if (!workspaceHasSomeMatchingTab) {
					acc.push(workspace.id);
				}
				return acc;
			}, [] as string[]);
		})();
	}

	const debouncedSearch = debounceFunc(search, 500);

	function handleDndConsider(e) {
		workspaces = e.detail.items;
	}

	function handleDndFinalize(e) {
		workspaces = e.detail.items;

		Browser.runtime.sendMessage({
			msg: "reorderedWorkspaces",
			sortedWorkspacesIds: e.detail.items.map(({ id }) => id),
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

<svelte:body onkeydown={onKeyDown} />

<div class="w-[100dvw] p-2 box-border">
	<!-- <h1 class="mb-4">Workspaces</h1> -->
	{#if import.meta.env.DEV}
		<div class="flex flex-wrap gap-1 absolute top-0 right-0">
			<details class="bg-neutral-950 p-1 rounded-md">
				<summary></summary>
				<button
					class="mb-2 border rounded-md p-1"
					onclick={() => {
						Browser.runtime.sendMessage({ msg: "showAllTabs" });
					}}>show all tabs</button
				>
				<button
					class="mb-2 border rounded-md p-1"
					onclick={() => {
						Browser.runtime.sendMessage({ msg: "reloadAllTabs" });
					}}>reload all tabs</button
				>
				<button
					class="mb-2 border rounded-md p-1"
					onclick={() => {
						Browser.storage.local.clear();
					}}>clear DB</button
				>
			</details>
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
				oninput={debouncedSearch}
				onkeydown={searchKeydown}
				placeholder="Search..."
			/>
		</search>
		<button on:click={openOptionsPage}
			><Icon icon="settings" width={18} /></button
		>
	</section>
	<!-- <hr class="border-neutral-800" /> -->
	<!-- <div id="search-results" class="mb-6 grid gap-2">
		{#each searchResults as result}
			<p>{result}</p>
		{/each}
	</div> -->
	<!-- {#if viewWorkspaces.length && activeWorkspace} -->
	<ul
		class="grid gap-4 w-full @container"
		use:dndzone={{
			items: workspaces,
			dropTargetStyle: {},
			dragDisabled:
				viewWorkspaces.length !== workspaces.length || workspaces.length < 2,
		}}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each viewWorkspaces as workspace, i (workspace.id)}
			<li class="item relative">
				<Workspace
					{workspace}
					active={workspace.active}
					selected={i === selectedIndex}
					index={i}
					editWorkspace={({ icon, name }) => {
						editWorkspace({ workspace, icon, name });
					}}
					switchWorkspace={() => {
						switchWorkspace(workspace);
					}}
					removeWorkspace={() => {
						removeWorkspace(workspace);
					}}
				></Workspace>
			</li>
		{/each}
	</ul>

	<button
		id="add-workspace"
		onclick={addWorkspaceByPointer}
		onkeydown={addWorkspaceByKey}
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
		<span class="leading-none -mt-[0.5ch] text-lg">new workspace</span></button
	>
	<!-- {/if} -->
</div>

<style lang="postcss">
	@media screen and (width < 260px) {
		ul {
			@apply justify-center;
		}

		button#add-workspace {
			@apply w-12 h-12 p-0 aspect-square mx-auto justify-center items-center;
			span:nth-of-type(n + 2) {
				@apply hidden;
			}
		}
	}
</style>
