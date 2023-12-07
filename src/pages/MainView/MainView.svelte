<script lang="ts">
	import { onMount, tick } from "svelte";
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
			addWorkspace();
		} else {
			onKeyDown(e as KeyboardEvent);
		}
	}

	function removeWorkspace(workspace: Ext.Workspace) {
		(async () => {
			await Browser.runtime.sendMessage({
				msg: "removeWorkspace",
				workspaceId: workspace.id,
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

	function onKeyDown(e: KeyboardEvent) {
		const { key } = e;

		switch (key) {
			case Key.ArrowDown:
				e.preventDefault();
				selectedIndex = Math.min(viewWorkspaces.length, selectedIndex + 1);
				break;
			case Key.ArrowUp:
				e.preventDefault();
				selectedIndex = Math.max(0, selectedIndex - 1);
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

	let searchResults: string[] = [];

	function search(e: InputEvent & { target: HTMLInputElement }) {
		const { value } = e.target;

		searchResults = [];
		if (!value) {
			viewWorkspaces = workspaces.filter(({ hidden }) => !hidden);
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
	<h1 class="mb-4">Workspaces</h1>
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
	<search class="my-6 w-full flex gap-2 bg-neutral-800 rounded-md p-1">
		<label for="search"><Icon icon="search" /></label>
		<input
			id="search"
			type="search"
			class="w-full bg-transparent p-1 !outline-none !outline-0"
			bind:this={searchInput}
			on:input={debouncedSearch}
			placeholder="Search..."
		/>
	</search>
	<div id="search-results" class="mb-6 grid gap-2">
		{#each searchResults as result}
			<p>{result}</p>
		{/each}
	</div>
	{#if viewWorkspaces.length && activeWorkspace}
		<div class="grid gap-4 w-full @container">
			{#each viewWorkspaces as workspace, i}
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
			<button
				id="add-workspace"
				on:click={addWorkspaceByPointer}
				on:keydown={addWorkspaceByKey}
				data-focusid={viewWorkspaces.length}
				class:selected={selectedIndex === viewWorkspaces.length}
				class="p-4 flex gap-2 rounded-md text-left bg-neutral-800 [&.selected]:bg-neutral-700"
				><span><Icon icon="add" width={20} /></span>
				<span>new workspace</span></button
			>
		</div>
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
