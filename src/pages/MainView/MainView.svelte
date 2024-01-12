<script lang="ts">
	import { dndzone } from "svelte-dnd-action";
	import { Key } from "ts-key-enum";
	import "@root/app.postcss";
	import Workspace from "@components/Workspace.svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Icon from "@root/components/Icon.svelte";
	import { debounceFunc } from "@root/utils";
	import Skeleton from "@root/components/Skeleton.svelte";
	import { untrack } from "svelte";

	import {overrideItemIdKeyNameBeforeInitialisingDndZones} from "svelte-dnd-action";
	overrideItemIdKeyNameBeforeInitialisingDndZones("UUID");

	console.info("?????");

	let searchInput: HTMLInputElement = $state();
	let selectedIndex = $state(0);
	let homeWorkspace: Ext.Workspace = $state();
	let workspaces: Ext.Workspace[] = $state([]);
	let activeWorkspace: Ext.Workspace = $state()!;
	let searchFilteredWorkspaceUUIDS: string[] = $state([]);
	let viewWorkspaces: Ext.Workspace[] = $derived((() => {
		// searchFilteredWorkspaceUUIDS;
		// const filteredWorkspaces = workspaces.filter(({UUID}) => searchFilteredWorkspaceUUIDS.includes(UUID));
		// return filteredWorkspaces.length ? filteredWorkspaces : searchInput?.value.length ? [] : workspaces;
		const filteredWorkspaces = searchFilteredWorkspaceUUIDS.reduce((_workspaces, uuid) => {
			const workspace = workspaces.find(({ UUID }) => UUID === uuid);
			if(workspace) _workspaces.push(workspace);
			return _workspaces;
		}, []);

		return filteredWorkspaces.length ? filteredWorkspaces : searchInput?.value.length ? [] : workspaces;
	})());

	let windowId: number;

	$effect(() => {
		untrack(() => activeWorkspace);
		// console.info("effect", { activeWorkspace, workspaces });
		// activeWorkspace = homeWorkspace?.active ? homeWorkspace : workspaces.find(({active}) => active)!;
		console.info({homeWorkspace, workspaces});
		activeWorkspace = homeWorkspace?.active ? homeWorkspace : workspaces.find(({active}) => active);
		console.info({ activeWorkspace });
	});

	function getWorkspaces({
		windowId,
	}: {
		windowId: number;
	}): Promise<Ext.Workspace[]> {
		return Browser.runtime.sendMessage({ msg: "getWorkspaces", windowId });
	}

	function updatedActiveWorkspace({
		UUID: workspaceUUID,
	}: {
		UUID: Ext.Workspace["UUID"];
	}) {
		console.info("UPDATEDACTIVEWORKSPACE", {windowId, activeWorkspace});
		activeWorkspace.active = false;
		const workspace = workspaceUUID === "HOME" ? homeWorkspace : workspaces.find(({ UUID }) => UUID === workspaceUUID)!;
		workspace.active = true;
	}

	function switchWorkspace(workspace: Ext.Workspace) {
		(async () => {
			await Browser.runtime.sendMessage({
				msg: "switchWorkspace",
				workspaceUUID: workspace.UUID,
			});

			searchInput.value = "";
			window.close();
		})();
	}

	function movedTabs({
		targetWorkspaceUUID,
		tabIds,
	}: {
		targetWorkspaceUUID: string;
		tabIds: number[];
	}) {
		const targetWorkspace = workspaces.find(
			({ UUID }) => UUID === targetWorkspaceUUID
			)!;
			
			activeWorkspace.tabIds = activeWorkspace.tabIds.filter(
				(tabId) => !tabIds.includes(tabId)
				);
				
				if (!activeWorkspace.tabIds.length) {
					console.info("habe keine Tabs mehr :(", {activeWorkspace});
					updatedActiveWorkspace({ UUID: targetWorkspace.UUID });
				}
				
				targetWorkspace.tabIds.push(...tabIds);
	}

	function createdTab({ tabId }: { tabId: number }) {
		console.info("MV - createdTab");
		activeWorkspace.tabIds.push(tabId);
	}

	function removedTab({ tabId }: { tabId: number }) {
		activeWorkspace.tabIds = activeWorkspace.tabIds.filter(
			(id) => id !== tabId
		);
	}

	function addedWorkspace({ workspace }: { workspace: Ext.Workspace }) {
		workspaces.push(workspace);
		updatedActiveWorkspace({ UUID: workspace.UUID });
	}
	
	async function updatedWorkspaces() {
		console.info("updatedWorkspaces");
		workspaces = await getWorkspaces({ windowId });
		// initWorkspaces();
	}

	function movedTabsToNewWorkspace({workspace}: {workspace: Ext.Workspace}){
		workspaces.push(workspace);
	}

	const port = Browser.runtime.connect();

	port.onMessage.addListener((message) => {
		const { msg } = message;
		console.info("port onmessage", { message });
		switch(msg){
			case "connected":
					initView();
				break;
			default:
				break;
		}
	});


	Browser.runtime.onMessage.addListener((message) => {
		console.info("browser runtime onmessage");
		const { windowId: targetWindowId, msg } = message;
		if(targetWindowId !== windowId) return;

		switch (msg) {
			case "initialized":
				console.info("background initialized");
				// initView();
				break;
			case "addedWorkspace":
				addedWorkspace(message);
				break;
			case "updatedWorkspaces":
				updatedWorkspaces();
				break;
			case "updatedActiveWorkspace":
				updatedActiveWorkspace(message);
				break;
			case "movedTabsToNewWorkspace":
				movedTabsToNewWorkspace(message);
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
					({ UUID }) => UUID === activeWorkspace.UUID
				);

				const newActiveWorkspaceIndex = Math.max(
					0,
					currentActiveWorkspaceIndex - 1
				);

				workspaces.at(newActiveWorkspaceIndex)!.active = true;
			}

			workspaces = workspaces.filter(({ UUID }) => UUID !== workspace.UUID);

			await Browser.runtime.sendMessage({
				msg: "removeWorkspace",
				workspaceUUID: workspace.UUID,
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
			workspaceUUID: workspace.UUID,
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

	$effect(() => {
		focusButton();
	});

	function searchKeydown(e: KeyboardEvent) {
		const { key } = e;

		switch (key) {
			case Key.Enter:
				e.stopPropagation();
				console.info("????");
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
				selectedIndex = Math.min(viewWorkspaces.length + 1, selectedIndex + 1);
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
	
	async function initView() {
		console.info("initView");
		windowId = (await Browser.windows.getCurrent()).id!;
		console.info({ windowId });
		const _workspaces = await getWorkspaces({ windowId });
		// const [_homeWorkspace, _viewWorkspaces] = _workspaces.reduce((acc, workspace, i) => {
		// 	if(i === 0) acc[1] = [];
		// 	if(workspace.UUID === "HOME") 
		// 	{
		// 		acc[0] = workspace;
		// 	} else {
		// 		acc[1].push(workspace);
		// 	}
		// 	return acc;
		// }, new Array(2) as [Ext.Workspace, Ext.Workspace[]]);
		homeWorkspace = _workspaces[0];
		workspaces = _workspaces.slice(1);

		console.info({homeWorkspace, workspaces});
	}

	async function search(e: InputEvent & { target: HTMLInputElement }) {
		const { value } = e.target;
		if (!value) {
			searchFilteredWorkspaceUUIDS = [];
			return;
		};

			const tabs = await Browser.tabs.query({ windowId });
			const matchingTabs = tabs.filter((tab) =>
				tab.url?.toLocaleLowerCase()?.includes(value.toLocaleLowerCase())
			);
			const matchingTabIds = matchingTabs.map(({ id }) => id!);

			searchFilteredWorkspaceUUIDS = workspaces.reduce((acc, workspace) => {
				const workspaceHasSomeMatchingTab = workspace.tabIds.some((tabId) =>
					matchingTabIds.includes(tabId)
				);
				if (workspaceHasSomeMatchingTab) acc.push(workspace.UUID);
				return acc;
			}, [] as string[]);
	}

	const debouncedSearch = debounceFunc(search, 500);

	function handleDndConsider(e: CustomEvent<DndEvent<Ext.Workspace>>) {
		workspaces = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<DndEvent<Ext.Workspace>>) {
		workspaces = e.detail.items;

		Browser.runtime.sendMessage({
			msg: "reorderedWorkspaces",
			sortedWorkspacesIds: workspaces.map(({ UUID }) => UUID),
			windowId,
		});
	}

	function openOptionsPage() {
		Browser.runtime.openOptionsPage();
	}
</script>

<svelte:body onkeydown={onKeyDown} />

<div class="w-[100dvw] p-2 box-border">
	<!-- <h1 class="mb-4">Workspaces</h1> -->
	{#if true && import.meta.env.DEV}
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
				<button class="mb-2 border rounded-md p-1" onclick={() => {Browser.runtime.sendMessage({msg: "logWindows"})}}>
					log windows
				</button>
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
				placeholder="{i18n.getMessage('search')}..."
			/>
		</search>
		<button class="ghost" on:click={openOptionsPage}
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
	{#snippet SWorkspace([workspace, i])}
		{#if workspace}
			<Workspace
				{workspace}
				active={workspace.active}
				selected={i === selectedIndex}
				index={i}
				editWorkspace={({ icon, name }: {icon: string; name: string;}) => {
					editWorkspace({ workspace, icon, name });
				}}
				switchWorkspace={() => {
					switchWorkspace(workspace);
				}}
				removeWorkspace={() => {
					removeWorkspace(workspace);
				}}
			/>
		{/if}
	{/snippet}

	<ul class="w-full @container">
		{#if !homeWorkspace && !workspaces.length}
			{#each [,,,] as _}
				<Skeleton class="w-full h-16 rounded-md"/>
			{/each}
		{/if}
		<li class="">
			{@render SWorkspace([homeWorkspace, 0])}
		</li>
		<div
			class="w-full grid gap-4 @container mt-4 empty:mt-0"
			use:dndzone={{
				items: workspaces,
				dropTargetStyle: {},
				dragDisabled:
					viewWorkspaces.length !== workspaces.length || workspaces.length < 2,
			}}
			on:consider={handleDndConsider}
			on:finalize={handleDndFinalize}
		>
			{#key viewWorkspaces}
				{#each viewWorkspaces as workspace, i (workspace.UUID)}
					<li class="item relative max-w-[100cqw]">
						{@render SWorkspace([workspace, i + 1])}
					</li>
				{/each}
			{/key}
		</div>
	</ul>

	<button
		id="add-workspace"
		onclick={addWorkspaceByPointer}
		onkeydown={addWorkspaceByKey}
		data-focusid={viewWorkspaces.length + 1}
		class:selected={selectedIndex === viewWorkspaces.length + 1}
		class="
				p-4 items-center flex gap-4 rounded-md text-left border mt-4 w-full
				outline-none [&.selected]:dark:bg-neutral-700
			"
		><span class="text-2xl text-center"
			><Icon icon="add" width={18} /></span
		>
		<span class="leading-none -mt-[0.5ch] text-lg">{i18n.getMessage('create_new_workspace')}</span></button
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
