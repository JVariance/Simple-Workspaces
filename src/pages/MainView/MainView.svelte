<script lang="ts">
	import { dndzone } from "svelte-dnd-action";
	import { Key } from "ts-key-enum";
	import "@root/styles/mainView.postcss";
	import Workspace from "@components/Workspace.svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Icon from "@root/components/Icon.svelte";
	import { debounceFunc, isNotNullAndDefined } from "@root/utils";
	import Skeleton from "@root/components/Skeleton.svelte";
	import { untrack, onMount, tick, unstate } from "svelte";
	import { getWorkspacesState, getThemeState, getSystemThemeState, getForceDefaultThemeIfDarkModeState, getActiveWorkspaceIndexState } from "@pages/states.svelte";
	import { fade, slide, scale,blur, crossfade, draw, fly } from "svelte/transition";

	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from "svelte-dnd-action";
	overrideItemIdKeyNameBeforeInitialisingDndZones("UUID");

	console.info("?????");

	let reordering = $state(false);
	let searchInput: HTMLInputElement = $state();
	let activeWorkspaceIndex = $state();
	let derivedActiveWorkspaceIndex  = $derived(getActiveWorkspaceIndexState());
	let selectedIndex = $state(0);
	let homeWorkspace: Ext.Workspace = $state();
	let _workspaces: Ext.Workspace[] = $derived(getWorkspacesState());
	let workspaces: Ext.Workspace[] = $state([]);
	let theme = $derived(getThemeState());
	let systemTheme = $derived(getSystemThemeState());
	let forceDefaultThemeIfDarkMode = $derived(getForceDefaultThemeIfDarkModeState());
	let activeWorkspace: Ext.Workspace = $derived(homeWorkspace?.active ? homeWorkspace : workspaces?.find(({active}) => active));
	let searchFilteredWorkspaceUUIDS: string[] = $state([]);
	let viewWorkspaces: Ext.Workspace[] = $derived((() => {
		const filteredWorkspaces = searchFilteredWorkspaceUUIDS.reduce((_workspaces, uuid) => {
			const workspace = workspaces.find(({ UUID }) => UUID === uuid);
			if(workspace) _workspaces.push(workspace);
			return _workspaces;
		}, []);

		return filteredWorkspaces.length ? filteredWorkspaces : searchInput?.value.length ? [] : workspaces;
	})());

	let windowId: number;

	$effect(() => {
		if(isNotNullAndDefined(activeWorkspaceIndex) && _workspaces.length) {
			activeWorkspaceIndex = _workspaces.findIndex(({ active }) => active);
		}
	});

	$effect(() => {
		untrack(() => workspaces);
		homeWorkspace = _workspaces[0];
		workspaces = _workspaces.slice(1);
	});

	$effect(() => {
		isNotNullAndDefined(derivedActiveWorkspaceIndex) && (activeWorkspaceIndex = derivedActiveWorkspaceIndex);
	});

	async function switchWorkspace(workspace: Ext.Workspace, instant = false) {
		console.info("MainView - switchWorkspace ", { workspace });
		await Browser.runtime.sendMessage({
			msg: "switchWorkspace",
			workspaceUUID: workspace.UUID,
			instant
		});

		searchInput.value = "";
		window.close();
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

	Browser.runtime.onMessage.addListener((message) => {
		// console.info("browser runtime onmessage");
		const { windowId: targetWindowId, msg } = message;
		if(targetWindowId !== windowId) return;

		switch (msg) {
			case "createdTab":
				// createdTab(message);
				break;
			case "removedTab":
				// removedTab(message);
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
		// e.preventDefault();
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
		reordering = true;
		workspaces = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<DndEvent<Ext.Workspace>>) {
		reordering = false;
		workspaces = e.detail.items;

		const newActiveWorkspaceIndex = activeWorkspaceIndex === 0 ? 0 : workspaces.findIndex(({ active }) => active) + 1;
		console.info(newActiveWorkspaceIndex);
		activeWorkspaceIndex = newActiveWorkspaceIndex;

		Browser.runtime.sendMessage({
			msg: "reorderedWorkspaces",
			sortedWorkspacesIds: workspaces.map(({ UUID }) => UUID),
			windowId,
		});

	}

	function openOptionsPage() {
		Browser.runtime.openOptionsPage();
	}

	let rootStyles = $state("");
	const addToRootStyles = (style: string) => rootStyles += `${style};`;

	async function setBrowserTheme(){
		document.documentElement.setAttribute('theme', 'browser');
		const { colors } = await Browser.theme.getCurrent();
		console.log({ colors });

		const sidebarBg = colors?.sidebar || colors?.toolbar;
		sidebarBg && addToRootStyles(`--body-bg: ${sidebarBg}`);
		const sidebarColor = colors?.sidebar_text;
		sidebarColor && addToRootStyles(`--workspace-color: ${sidebarColor}`);
		const workspaceActiveBg = colors?.sidebar_highlight;
		workspaceActiveBg && addToRootStyles(`--workspace-active-bg: ${workspaceActiveBg}`);
		// const workspaceActiveColor = colors?.sidebar_highlight_text;
		// workspaceActiveColor && addToRootStyles(`--workspace-active-color: ${workspaceActiveColor}`);
		const buttonBg = colors?.button_background_color || colors?.button_background_active || colors?.toolbar_field_background_color || colors?.icons;
		buttonBg && addToRootStyles(`--button-bg: ${buttonBg}`);
		const searchBg = colors?.searchbar_bg || colors?.toolbar_field_background_color;
		searchBg && addToRootStyles(`--search-bg: ${searchBg}`);
		const searchColor = colors?.searchbar_color || colors?.toolbar_field_color;
		searchColor && addToRootStyles(`--search-color: ${searchColor}`);

		await tick();
		const activeWorkspace = document.querySelector('.workspace.active');
		if(activeWorkspace){
			const rgbVals = (() => {
				const activeWorkspaceBackground = getComputedStyle(activeWorkspace)['background'];
				const extractedRGB = activeWorkspaceBackground.match(/\d+/g);
				return activeWorkspaceBackground.startsWith('color(') ? [+extractedRGB[1], +extractedRGB[2], +extractedRGB[3]] : extractedRGB.map(Number);
			})();

			if(rgbVals.filter(Number).length === 3){
				// https://css-tricks.com/switch-font-color-for-different-backgrounds-with-css/
				addToRootStyles(`
					--red: ${rgbVals[0]};
					--green: ${rgbVals[1]};
					--blue: ${rgbVals[2]};
					--r: calc(var(--red) * 0.299);
	  			--g: calc(var(--green) * 0.587);
				  --b: calc(var(--blue) * 0.114);
					--sum: calc(var(--r) + var(--g) + var(--b));
					--threshold: 0.5;
					--perceived-lightness: calc(var(--sum) / 255);
					--workspace-active-color: hsl(0, 0%, calc((var(--perceived-lightness) - var(--threshold)) * -10000000%));
				`);
			}
		}
	}

	function unsetBrowserTheme(){
		document.documentElement.removeAttribute('theme');
		rootStyles = "";
	}

	$effect(() => {
		console.info({theme});
		(theme === "browser" && (systemTheme === "light" || (systemTheme === "dark" && !forceDefaultThemeIfDarkMode))) 
			? setBrowserTheme() 
			: unsetBrowserTheme();
	});

	$effect(() => {
		document.documentElement.style.colorScheme = systemTheme;
	});	

	$inspect({ activeWorkspaceIndex });
	$inspect({ _workspaces });
	$inspect({ reordering });
	
	Browser.commands.onCommand.addListener(async (command) => {
		const activeWindowId = (await Browser.windows.getLastFocused()).id!;
		if(activeWindowId !== windowId) return;
		switch (command) {
			case "next-workspace":
				activeWorkspaceIndex = Math.min(viewWorkspaces.length, activeWorkspaceIndex + 1);
				switchWorkspace(_workspaces[activeWorkspaceIndex]);
				break;
			case "previous-workspace":
				activeWorkspaceIndex = Math.max(0, activeWorkspaceIndex - 1);
				switchWorkspace(_workspaces[activeWorkspaceIndex]);
				break;
			default:
				break;
		}
	});

	onMount(async () => {
		windowId = (await Browser.windows.getCurrent()).id!;
	});
</script>

<svelte:body onkeydown={onKeyDown} />
<svelte:head>
	{@html `<`+`style>html[theme=browser]{${rootStyles}}</style>`}
</svelte:head>

<div class="w-[100cqw] h-[100cqh] p-2 box-border overflow-auto [scrollbar-width:_thin]" style:--header-height="5rem">
	<!-- <h1 class="mb-4">Workspaces</h1> -->
	{#if true && import.meta.env.DEV}
		<div class="flex flex-wrap gap-1 absolute top-0 right-0 z-[51]">
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
	<section class="flex gap-2 items-center h-[--header-height] fixed top-0 bg-[--body-bg] w-[calc(100cqw_-_1.25rem)] z-50">
		<search
			class="
				w-full flex items-center gap-2 border
				bg-[--search-bg] hover:bg-[--search-bg-hover] focus-within:bg-[--search-bg-focus]
				border-[--search-border-color] text-[--search-color]
				focus-within:shadow-xl rounded-md px-4 py-2
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
				active={reordering ? workspace.active : activeWorkspaceIndex === i}
				selected={i === selectedIndex}
				index={i}
				editWorkspace={({ icon, name }: {icon: string; name: string;}) => {
					editWorkspace({ workspace, icon, name });
				}}
				switchWorkspace={() => {
					switchWorkspace(workspace, true);
					activeWorkspaceIndex = i;
				}}
				removeWorkspace={() => {
					removeWorkspace(workspace);
				}}
			/>
		{/if}
	{/snippet}

	<ul class="w-full @container grid mt-[--header-height]">
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
				items: unstate(workspaces),
				dropTargetStyle: {},
				zoneTabIndex: -1,
				dragDisabled:
					viewWorkspaces.length !== workspaces.length || workspaces.length < 2,
			}}
			on:consider={handleDndConsider}
			on:finalize={handleDndFinalize}
		>
			{#each viewWorkspaces as workspace, i (workspace.UUID)}
				<li 
					class="item relative max-w-[100cqw]"
					transition:slide={{ delay: 0, duration: 175 }}
				>
					{@render SWorkspace([workspace, i + 1])}
				</li>
			{/each}
		</div>
	</ul>

	<button
		id="add-workspace"
		onclick={addWorkspaceByPointer}
		onkeydown={addWorkspaceByKey}
		data-focusid={viewWorkspaces.length + 1}
		class:selected={selectedIndex === viewWorkspaces.length + 1}
		class="ghost
				!p-4 items-center flex gap-4 rounded-md text-left mt-4 w-full outline-none border
			"
		><span class="text-2xl text-center w-7 flex justify-center items-center"
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
			span:nth-of-type(1) {
				@apply w-max;
			}

			span:nth-of-type(n + 2) {
				@apply hidden;
			}
		}
	}
</style>
