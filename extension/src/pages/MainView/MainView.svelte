<script lang="ts">
	import { dndzone } from "svelte-dnd-action";
	import { Key } from "ts-key-enum";
	import "@root/styles/mainView.postcss";
	import Workspace from "@components/Workspace.svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Icon from "@root/components/Icon.svelte";
	import { debounceFunc, isNullish } from "@root/utils";
	import Skeleton from "@root/components/Skeleton.svelte";
	import { untrack, onMount, tick, unstate } from "svelte";
	import { getWorkspacesState, getThemeState, getSystemThemeState, getForceDefaultThemeIfDarkModeState, getActiveWorkspaceIndexState } from "@pages/states.svelte";
	import { slide } from "svelte/transition";
	import Fuse from "fuse.js";
	import { overflowSwipe } from "@root/actions/overflowSwipe";
	import Accordion from "@components/Accordion/Accordion.svelte";
	import Summary from "@components/Accordion/Summary.svelte";

	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from "svelte-dnd-action";
	overrideItemIdKeyNameBeforeInitialisingDndZones("UUID");

	console.info("?????");

	let reordering = $state(false);
	let searchInput: HTMLInputElement = $state();
	let searchValue = $state("");
	let activeWorkspaceIndex = $state();
	let derivedActiveWorkspaceIndex  = $derived(getActiveWorkspaceIndexState());
	let homeWorkspace: Ext.Workspace = $state();
	let _workspaces: Ext.Workspace[] = $derived(getWorkspacesState());
	let workspaces: Ext.Workspace[] = $state([]);
	let theme = $derived(getThemeState());
	let systemTheme = $derived(getSystemThemeState());
	let forceDefaultThemeIfDarkMode = $derived(getForceDefaultThemeIfDarkModeState());
	let activeWorkspace: Ext.Workspace = $derived(homeWorkspace?.active ? homeWorkspace : workspaces?.find(({active}) => active));
	let searchUnmatchingWorkspaceUUIDS: string[] = $state([]);
	let viewWorkspaces: Ext.Workspace[] = $derived.by(() => {
		const filteredWorkspaces = workspaces.filter(({ UUID }) => !searchUnmatchingWorkspaceUUIDS.includes(UUID));
		return filteredWorkspaces.length ? filteredWorkspaces : searchInput?.value.length ? [] : workspaces;
	});

	let windowId: number;

	$effect(() => {
		if(isNullish(activeWorkspaceIndex) && _workspaces.length) {
			activeWorkspaceIndex = _workspaces.findIndex(({ active }) => active);
		}
	});

	$effect(() => {
		untrack(() => workspaces);
		homeWorkspace = _workspaces[0];
		workspaces = _workspaces.slice(1);
	});

	$effect(() => {
		!isNullish(derivedActiveWorkspaceIndex) && (activeWorkspaceIndex = derivedActiveWorkspaceIndex);
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

	// $effect(() => {
	// 	focusButton();
	// });

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
				focusNextElement();
				break;
				case Key.ArrowUp:
					e.preventDefault();
					focusPreviousElement();
				break;
			case Key.Enter:
				break;
			default:
				break;
		}
	}

	// const matchingTabsPerWorkspace = $state({});
	let matchingTabs = $state([]);
	// let matchingTabIds = $state([]);

	const fuse = new Fuse([], {
		keys: ['url', 'title'], 
		threshold: 0.4, 
		useExtendedSearch: true
	});

	async function search(e: InputEvent & { target: HTMLInputElement }) {
		const { value } = e.target;
		matchingTabs = [];
		// matchingTabIds = [];
		if (!value) {
			searchUnmatchingWorkspaceUUIDS = [];
			return;
		};

			const tabs = await Browser.tabs.query({ windowId });

			fuse.setCollection(tabs);
			const fuseResults = fuse.search(value.normalize().toLocaleLowerCase());

			matchingTabs = fuseResults.map(({ item }) => item);

			// console.info({ fuseResults });

			// matchingTabs = tabs.filter((tab) =>
			// 	tab.url?.toLocaleLowerCase()?.includes(value.toLocaleLowerCase())
			// );

			const matchingTabIds = matchingTabs.map(({ id }) => id!);

			searchUnmatchingWorkspaceUUIDS = _workspaces.reduce((acc, workspace) => {
				const workspaceHasSomeMatchingTab = workspace.tabIds.some((tabId) =>
					matchingTabIds.includes(tabId)
				);
				if (!workspaceHasSomeMatchingTab) acc.push(workspace.UUID);
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
				console.info({extractedRGB, activeWorkspaceBackground});
				return activeWorkspaceBackground.startsWith('color(')
						? [+extractedRGB[1], +extractedRGB[2], +extractedRGB[3]] 
						: activeWorkspaceBackground.startsWith('rgba(')
						? [+extractedRGB[0], +extractedRGB[1], +extractedRGB[2]] 
						: extractedRGB.map(Number);
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
	$inspect({ searchUnmatchingWorkspaceUUIDS });

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

	function getAllFocusableElements() {
		return [].filter.call(document.querySelectorAll('[data-focusable]'), (elem) => elem.offsetParent !== null);
	}

	function focusNextElement() {
		const [elements, currentActiveElement] = [getAllFocusableElements(), document.activeElement];
		const elementIndex = [].indexOf.call(elements, currentActiveElement);
		const newIndex = Math.min(elements.length - 1, elementIndex + 1);
		console.info({ elements, elementIndex, newIndex, el: elements[newIndex] });
		elements[newIndex].focus();
		activeWorkspaceIndex = currentActiveElement.dataset?.workspaceIndex || activeWorkspaceIndex;
	}
	
	function focusPreviousElement() {
		const [elements, currentActiveElement] = [getAllFocusableElements(), document.activeElement];
		const elementIndex = [].indexOf.call(elements, currentActiveElement);
		const newIndex = Math.max(0, elementIndex - 1);
		console.info({ elements, elementIndex, newIndex, el: elements[newIndex] });
		elements[newIndex].focus();
		activeWorkspaceIndex = currentActiveElement.dataset?.workspaceIndex || activeWorkspaceIndex;
	}

	function switchWorkspaceAndFocusTab(workspaceUUID: string, tabId: number) {
		Browser.runtime.sendMessage({msg: 'switchWorkspaceAndFocusTab', workspaceUUID, tabId });
	}

	onMount(async () => {
		windowId = (await Browser.windows.getCurrent()).id!;
		await tick();
		if(document.documentElement.dataset.page === 'popup') {
			searchInput.focus();
		};
	});
</script>

<svelte:body onkeydown={onKeyDown} />
<svelte:head>
	{@html `<`+`style>html[theme=browser]{${rootStyles}}</style>`}
</svelte:head>

<!-- <div id="noise" aria-hidden="true" /> -->
<div class="w-[100cqw] h-[100cqh] p-2 box-border overflow-auto [scrollbar-width:_thin]" style:--header-height="5rem">
	<!-- <h1 class="mb-4">Workspaces</h1> -->
	{#if true && import.meta.env.DEV}
		<div class="flex flex-wrap gap-1 absolute top-0 right-0 z-[51]">
			<details class="bg-neutral-950 p-1 rounded-md">
				<summary></summary>
				{#each [
					["show all tabs", () => Browser.runtime.sendMessage({ msg: "showAllTabs" })], 
					["reload all tabs", () => Browser.runtime.sendMessage({ msg: "reloadAllTabs" })],
					["clear DB", () => Browser.storage.local.clear()],
					["log windows", () => Browser.runtime.sendMessage({msg: "logWindows"})],
					["open sidebar page", () => Browser.tabs.create({url: Browser.runtime.getURL('src/pages/Sidebar/sidebar.html')})]
				] as btnEvent}
				<button
					class="mb-2 border rounded-md p-1"
					onclick={() => {
						btnEvent[1]();
					}}>{btnEvent[0]}</button>
				{/each}
			</details>
		</div>
	{/if}
	<section id="header" class="flex gap-2 items-center h-[--header-height] fixed top-0 bg-[--body-bg] w-[calc(100cqw_-_1.25rem)] z-50">
		<search
			class="
				w-full flex items-center gap-2 border
				bg-[--search-bg] hover:bg-[--search-bg-hover] focus-within:bg-[--search-bg-focus]
				border-[--search-border-color] text-[--search-color]
				focus-within:shadow-xl rounded-md px-4 py-2
			"
		>
			<label for="search">
				<Icon icon="search" width={20} class="text-neutral-400" />
			</label>
			<input
				id="search"
				type="search"
				class="min-w-0 w-full bg-transparent p-1 !outline-none !outline-0"
				data-focusable
				bind:this={searchInput}
				bind:value={searchValue}
				oninput={debouncedSearch}
				onkeydown={searchKeydown}
				placeholder="{i18n.getMessage('search')}..."
			/>
			<button class="ghost hover:bg-black/20 dark:hover:bg-white/10 rounded-full p-0" onclick={() => {searchValue = ""; searchUnmatchingWorkspaceUUIDS = [];}}>
				<Icon icon="cross" width={16} />
			</button>
		</search>
		<button class="ghost" on:click={openOptionsPage}>
			<Icon icon="settings" width={18} />
		</button>
	</section>
	<!-- <hr class="border-neutral-800" /> -->
	<!-- <div id="search-results" class="mb-6 grid gap-2">
		{#each searchResults as result}
			<p>{result}</p>
		{/each}
	</div> -->
	<!-- {#if viewWorkspaces.length && activeWorkspace} -->

	{#snippet SWorkspace(workspace, i)}
		{#if workspace}
			{#if !searchValue.length}
				<Workspace
					{workspace}
					active={reordering ? workspace.active : activeWorkspaceIndex === i}
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
			{#if searchValue.length && matchingTabs.length}
				<Accordion 
					class="w-[100cqw] overflow-hidden" 
					open
				>
					{#snippet summary()}
						<Summary 
							data-focusable="true" 
							class="
								flex gap-2 border-[color-mix(in_srgb,light-dark(black,white)_50%,var(--body-bg))] pb-2
								focus:bg-[--button-bg-focus] outline-none
							"
						>
							<span>{workspace.icon}</span>
							<span>{workspace.name}</span>
						</Summary>
					{/snippet}
					<div 
						class="
							swipe-item
							grid grid-rows-[repeat(5,_auto)] grid-flow-col overflow-auto 
							[scrollbar-width:_thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:initial] 
							pb-1 w-[100cqw] mt-2
							overscroll-contain
						"
						use:overflowSwipe
						onwheel={(e) => e.currentTarget.scrollBy({left: -e.wheelDelta})}
					>
						{#each matchingTabs.filter(({ id }) => workspace.tabIds.includes(id)) as tab}
							<button 
								class="btn ghost h-max flex gap-2 items-center outline-none mt-2 [&:nth-child(1)]:mt-0 [&:nth-child(6)]:mt-0"
								data-focusable
								onclick={() => {switchWorkspaceAndFocusTab(workspace.UUID, tab.id)}}
							>
								{#if tab.favIconUrl}
									<img class="w-5 h-5" src={tab.favIconUrl} alt="{tab.title} favicon"/>
								{/if}
								<span class="max-w-[30ch] overflow-hidden text-ellipsis whitespace-nowrap -mt-[0.2rem]">
									{tab.title}
								</span>
							</button>
						{/each}
					</div>
				</Accordion>
			{/if}
		{/if}
	{/snippet}

	<ul class="w-full @container grid mt-[calc(var(--header-height)_-_0.5rem)]">
		{#if !homeWorkspace && !workspaces.length}
			<div class="grid gap-4">
				{#each [,,,] as _}
					<Skeleton class="w-full h-14 rounded-md"/>
				{/each}
			</div>
		{/if}
		{#if searchValue.length && searchUnmatchingWorkspaceUUIDS.length === _workspaces.length}
			<p class="px-5 py-2 flex items-center gap-4">
				<Icon icon="sad-face-2" width={24} />
				{i18n.getMessage('search_no_matches')}
			</p>
		{/if}
		<li class="">
			{#if !searchUnmatchingWorkspaceUUIDS.includes('HOME')}
				{@render SWorkspace(homeWorkspace, 0)}
			{/if}
		</li>
		<div
			class="w-full grid gap-4 @container mt-4 empty:mt-0 {searchValue.length ? 'mt-0' : ''}"
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
					{@render SWorkspace(workspace, i + 1)}
				</li>
			{/each}
		</div>
	</ul>

	<button
		id="add-workspace"
		onclick={addWorkspaceByPointer}
		onkeydown={addWorkspaceByKey}
		data-focusable
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

	/* :global(body) {
		background: url("/images/mesh-6.png"), url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAgAElEQVR4Xl3dL9RUVRfH8ZmupiloR7p2tKtd7dKVjna1axc62MWuHexgBzrv/e71fmZtn1mLNc/ce+45+9/Zf377zHB++PDh5d69e6dffvnl9Pr169O///57evr06envv/+ez99///3pnXfeOb377run999///TkyZNTr0ePHp0+++yzGd+4Tz755PTrr7+enj9/PmOa88cffzx9+OGHM9eXX3451//5559ZqzV6/fDDD3OvuXu9fPlyxnz00Uenr776auZo7o8//vg/NLZ2z9y/f3/oa2x03Lp1a2j96aefTgdvQ8ft27dnbHS0bnM3plfvrfn555/Pe/M1d6/m6Jl4it+e+/3330+//fbbXG/sN998M3/jsXHNFR3xEW+N671/XWtMNPUv/r/77ruhNdrOx2KXhNbNFm5Akz948GCYTHhv3rwZIhMKApu48SkhpfVKcE0ckxFOaN1LMAnMtYiIYcLofmvGTHNHT/eNa767d+9ehdpzrZ2Q/IvRrhPQVggFNF+MU3q09y/aU2xzdq9/eI3vaGM8zRUvrZfgk1FjmqN733777RgiA23++OmZL774Yp5JptGdkXY9xWbc52OySxNniT3UhO+9994Iu4kiPsX0OWG1SJruhfFtJY1pIRZqd7VY1yI64SfcrvX6448/RoGU0prdi57WINiU+fPPP5+ePXs2dLRWjPd8DPZqvcYklCzTPAkBbZ9++unM8fXXX88a3evV2BTW3L26jsYUcj6fR3DxF129t/Ma1zwpsc/Rm/L++uuvkWFjk2tz9Uzjm8eubS3yOB/CvfRAhCSUFBNBTRARCbHJ02IMsYYssb8TcNd7RVAEUEaLN2+v5k5wEZHAE1aENSYFJ8TWy9K6FoPN3Vx2YAr54IMPrkLrOWtlNNHRHBlY9Md095svZSeg7sVLdPVM96KntZKDnZ4MHj9+PM9xcd1n6Y1r/vhCh7+7vtdhYBlL/O/QEL2thY/zoYBL1pWGWBltYaYF025MxnQL9rftnTV2ffvfnvnzzz/neoJobMpuTK+Iar38cYpsKydw86Ysyk54be2YjKmeywrbtQm1V2OaW2yKxq61G3qm51N2RpFQo605ElDzZlzxnWFwgSmjVzT2d/JgmBlJdJvDzmmuhNy4jIfCG5+c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") center center !important;
		background-size: cover, cover;
		background-blend-mode: multiply;
	} */

	/* #header {
		@apply !bg-transparent;
	}

	:global(.workspace){
		@apply backdrop-blur-2xl p-2 border !border-white/40 !bg-white/40;
	} */

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

	/* #noise {
		background: transparent url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAgAElEQVR4Xl3dL9RUVRfH8ZmupiloR7p2tKtd7dKVjna1axc62MWuHexgBzrv/e71fmZtn1mLNc/ce+45+9/Zf377zHB++PDh5d69e6dffvnl9Pr169O///57evr06envv/+ez99///3pnXfeOb377run999///TkyZNTr0ePHp0+++yzGd+4Tz755PTrr7+enj9/PmOa88cffzx9+OGHM9eXX3451//5559ZqzV6/fDDD3OvuXu9fPlyxnz00Uenr776auZo7o8//vg/NLZ2z9y/f3/oa2x03Lp1a2j96aefTgdvQ8ft27dnbHS0bnM3plfvrfn555/Pe/M1d6/m6Jl4it+e+/3330+//fbbXG/sN998M3/jsXHNFR3xEW+N671/XWtMNPUv/r/77ruhNdrOx2KXhNbNFm5Akz948GCYTHhv3rwZIhMKApu48SkhpfVKcE0ckxFOaN1LMAnMtYiIYcLofmvGTHNHT/eNa767d+9ehdpzrZ2Q/IvRrhPQVggFNF+MU3q09y/aU2xzdq9/eI3vaGM8zRUvrZfgk1FjmqN733777RgiA23++OmZL774Yp5JptGdkXY9xWbc52OySxNniT3UhO+9994Iu4kiPsX0OWG1SJruhfFtJY1pIRZqd7VY1yI64SfcrvX6448/RoGU0prdi57WINiU+fPPP5+ePXs2dLRWjPd8DPZqvcYklCzTPAkBbZ9++unM8fXXX88a3evV2BTW3L26jsYUcj6fR3DxF129t/Ma1zwpsc/Rm/L++uuvkWFjk2tz9Uzjm8eubS3yOB/CvfRAhCSUFBNBTRARCbHJ02IMsYYssb8TcNd7RVAEUEaLN2+v5k5wEZHAE1aENSYFJ8TWy9K6FoPN3Vx2YAr54IMPrkLrOWtlNNHRHBlY9Md095svZSeg7sVLdPVM96KntZKDnZ4MHj9+PM9xcd1n6Y1r/vhCh7+7vtdhYBlL/O/QEL2thY/zoYBL1pWGWBltYaYF025MxnQL9rftnTV2ffvfnvnzzz/neoJobMpuTK+Iar38cYpsKydw86Ysyk54be2YjKmeywrbtQm1V2OaW2yKxq61G3qm51N2RpFQo605ElDzZlzxnWFwgSmjVzT2d/JgmBlJdJvDzmmuhNy4jIfCG5+cMm58xF//eIIUOjtE8BIUuReBPstowRbgrgTBBNBErJpvbXwKSAiE2bUI6LP4kOAjsDmyyBTTuARtLcxGV7T0TOsmPLuse9ErmGYAPddaLJAyWzuhRXPr9Y6u5kjQ8dFz4kQC7Zr403gxICOSHHBh0ZagW4c8k1lKz83aiV3LEONrFHJY72VPJiOQAcRgg1soAUegnZMFRmjXs8TmyWJ6NovaAW9bkEwnoUfgnTt3hqies0u5Ae7CnL3L3Iar45Ui8+9ZfwKOjgSbQJtfQBd07fLoiN4EHb1ipWzKbqCI5stVt775uafolWnGSzuBy+96wm5sRtHfdnVzJ8+e75kJ6iyiB1OILSo2pBDWiyDpHJ8dESmIf4y5mLUDYqb7fY75/k64MS9GsU73E1gGECO5p9xMyu/V/Fm/nSrj6plo7EVoGVNKYYndk5xkvY1vTMYl9tg9dlluN2U3f/MmxJ6NnnjiJWRvrcVIm7/nG59MyFlZER9d6/O5OqQ/IqCX3RDDEdNksgmLNGn3ZUfSzRaVGnaNBYojGGKxWe9ObSkgg8g9to5/mGkHJYCeS4hqmOiMKYrihhNQ66RM2VQCTYApIB4lKtLt+CjTjN94z/2IJQSXnJqzd7GPMYuHjK7rybg1X716NbzFY7Iii3ZOc50PK70oqvhNPjULlvZ1LSuNuAiWPUnlEiZ/nQAoJoElxNZQ3ySE3BQLlmklENlQ80sNxQNCjzFZUkJtnmiVrqbEDKJX6+diWChDIsydISWk+FFjWaNn1CjSaLWD+EQxahiZW/fVJeSXt1F4U2w7rXXOB0MXgbFJEgKNNnkWITfn+wVdAcy2b1LPFMxbOOElyJ7pnkyMtURwf0esLC6FcmUpueu7PmjeriX05owu8araorWgD63NZ6Ob+1V3iUW9N76546X3xmQ80RQNCbC5UyTr5lmiNcXFe7LJg/TKIPqXYqK5OTKkDKfrzZV7G5dV2tvD8nDVqa3Pr+d2svQejlgpody75xNq7/y+oq1dteEIayUgWzniUyzUQA0R0RHbM71aO1qkoNGRYAgsRTa+2MZaVe9cUXO0Q6LJrmruaMhVtWYC46qlxbJQvHOfra9YtIvRqKoXW5Nfiu1+7/ElcxuXdUx06Waa7aagBHdSnSdseXcP9ndMR5zyf2NQfLttH5Mpt1eCV3xmrf1Nkfx94xP6jhdokiy0tnEJJx5U9Srp5n779u24g+gT5yi08c2bYYkxGYWdktJSiFoI5pRC7eR2PXQiBbQGl5TrJvTmZ/z4osjoHzQgl5WGEqCb6o6EZ8s2OKLbdvxoi4FcpMN8dUxGaJ8TRkQBIxMS+IAyUnzPNHfWGT3RITVul3F9PZNgQCEJR/JhJ3EjvWedUvIEAh9rjmiEU0WrNF9sBPOYT9EIcVA0tyuLQWJTMi2AF+BlpOqSeOl+xmj3R0NzTlDn93MTEZSFxFj/QBgJQUXJv8vCEhowsGspKmttXEJLGM25YY0UKauKkJ5X+7ST2pHNFcGNbU4vtYnKWoCFQMPMmjdF9XxxIIEDNNU7oBB1gESDF4B1iVliVXRxsxBlu5Vxcc1wNEptfMrYO7H1ksegvfzdRh5TUlYSoeAA2k4AWVYENFGCiUDVLKRUOt0c1qBYykrwCa7d03MFRDl/Y8Qe0HVMJdQER2jRmbL7LOiqlxiN53oH/olhAnT09uKiJAxog1YAJhV+PEYexG5snsa1Y8Se5gPkJi91m3jZvVFIAzHZRHoPqmPpp4q162CLiEkhEfPixYsrAXL6hEpBjSsLah4WotrPOuBdjYEBJazuZdEAzaxVegzeiO7GJrzuwd5aE6Any8rw4kExB24Bw7cei+1ZkI8+Rvzsyjy6uhf/GS3eU1iCF9ek93jrmdYEnnZ9XJa0MiKkuZDRGN34je2Xxcc0dwEdhrQiqjkjeLu1FgYyAh65q5gngIwkgSdkgZML7V6uKMPoHWNd78XquKbGqOCl4o3LgnM9FBBPkApyUfAxXMViO8A1rlBpkDtKNilEMG89icP2Jhllc3ZtKvUYLt2LWaipHLxJ5dMRpmMWI8WJGFeHNGm7q2sRpNOWNal2E4pglxAQmWJ2T8Ouam79hnZO46LJs5QtU7JLFJ5dp6zeM6SUI3FJ4TqPikT3k4FEpvEKUuPwrYuqsBYruXv1mh0p1iiuWwckMy4LhCCFZS1yaEUZv8xPtmAK6L4sp4mlkKBpCYIUWp+B0Ckog4g5yoEvNQ8LUki1hqQDuCkNh0nFh9SZm+pzik8Rdre6Kvp0NptbYpKBZYDiXopQ5OGptWV0zd/c0Oq8A1lGG/cshqhjovF8fLgkiF4mb7FerIciIjDCAG6AvT7nO2UxUswWF5S7n4A0tZq7+ypaipT/97mdCXjkhhIUbCzBKGC73tztxN6jtTWhuQkI5oZPcSD+8xC9wDDiFDyu922I4PV4UqNEj86qhKQ141Fm1RhlRgbZC8KeTGaHCOLd2JrXVwd79DDQMCK6rw3a5BFsp/CziicWkvVIEmBOAnz3UmrCTVlZTAzv2qZ7rZOwpahqgRiKptbq2WhMGAkpOuX67ZKUoCBWtSeoBJ0yW7NnNNDExtbSFIuPnrGOAjB5Nkev5KL/w83yCCAr6fEE9Sp1mVALSB1ttxiSgSWkiBGQ0naT5z5iLgERTq4lV8C1qLJ1Au0WhVGMlaUk1BTDfcGAigkZi3qAMsQgfrr31krIXgrehNt60dp6ap/GCsaNTfitJWZ0bxey0aS+UpVHV2OSSbuh5+MFMJnQ9ZEay2haw+GO7k9Q58NAwAq1hNa9FAByF5BkUb3z4Qkga2FFsKAI5er4U5lTbkm1HkExKg1M2awKNBIDCQgAyG31mRASkqwM6hvdWS6XyM1IEpp/ny7JOPqc0qKn58zJIBloc0dHRtK4dlY8c4nc0i6yAa8KcajDgIvwFpV4E6TRHSs2ENbiCapJ+fjGp2lAYtdTCGIjLgZSev0AOXtjwOutG0OEryLnCtCXETCahJRSU1J/p5g+59YgBgBLKX3P8vGSkngVN0H5KT8hQ3fjubnjMX7slOZSi0ELWh9u1fOKyZ7jJWRdXH18nw8iLvukSX/rX/RgQoSIxlAL07gaQ7uWv3YChCtkbd2PwVyKwwSt1+fGZllZecqPWU0maaRg2Lh2GKQ4OsUmKTdYI/q5rNaP/vjIdSlk4yNDYZjxJ31Ws3AzjY1e5wRkb6B0WaCajqK4z2Sj65kM4sH5tokhKWT3y0EQIHSpo2yoBWNSgRPB+gusXfGoGxixQD9ZiRxdEiAb4csTrGwtZvpbyiqYxoyquS0P/yreFC96iQn93ZieaVdEU4YmdrW7tkuxG7oOKuem49+JSQU0122e6OXmWjtD7JrMSm89OejXRPPEEDhRxEZUDzXI0aCIZsVNLssQ7Fl8Fufoi4CpUSRLkfs7VZKiIckC9AYUndqIpgimmD4rqFJQQmvOjKNXMSv6+OqutbYszS5PUNaDWUGAd2tBLGsOxTMDzOJbqzVV7/EVTdEZDWoqBXU7Om8QzRkGoPR8EDh1SAs1KQigndCCzj7Jw6VxfW7BlNmEMSZuRPzuS4CZd7+h8TsTSxh8NogjuhIWsBE2FF0EL5ORCDCo6AP6obExLFQfPGNKKPuMgNOPXHZ0crv4ziXq/jWnzylcApTipMTtSmtKc7UT7PxoPx8TXWIqJrcPtVtgTJpC+gkOBmj0KADl7lmXwAtMozAZDqUA8OBTWY+uXETfRAhShgYRd9a7CjhFQHkZmZRTsdl4KX60g4BSmjpIlZ+htBu5SklGdGnAqdXEtXhLYe3qnXWhVzGewUEhov98THpJ2GAMVayecgSCusHLWpD8dvfb5hHqcFxC2Tujey0sc4oZjaUEEyPmiejWgOhmqRmNplE0tXN7pWSnQ2RrndFqfs0lub6D5GoHDTN1SzupZ6IxeggqWlKInd/f8S4OoZ8cKbv5HPERP6I9o2jHiH/tzuhtzfOR619kLQ4ggCfaqnoGAqJgbwfFZMKB/GLiZsBtHie+swS+HONy/O5RTC4qpcGdKNPXD+TuMcntmrtdJ+XWRuiaEx9dA6BW9auHuOTmlKEJuo1XvFIQDCsZRndrglXwlmL0i9RxTuh0L4U7m3A+PkxQT9CEnLDSWgJooENwjclaXUuIMVlwQkSTU5CMDRQtJsR0wa95YtrhCQF/B8juyXIcSmBZrc1NtTNvdjqjt2d7pdR2RpYI6W0nJUQ1gwxPx3FnZrun099qsXjK2PDWM46pCuBdS6aqeWfErNdcEonBsiIy4Ujr9KxF/64L2i1MebAYxAloW8BS5LKvhAaizgg09jWZWsfpEVV7c7YjWrO/Wx98E0NiA+OB3Eo79falsfCxPgMDweDJwBmBaAKepnj1RzSr28RRtYSvOezvgDgiC9KRwcaH1kG7hgeZs70t1gD9hgbmiroWo1JXFaZaRB+gMSpmBVFWgbCIiGnQTMKyRcUVLktmJ3uKUBmKJIGfz/3o4yQcgtNybo19Wqbnmg+6Gp8pOeOId74/gTOujdTGxz7pQukZhlKgZ1O0eBJdDKj5U5AD3tbvebjZdAwTLLDMboCIKmhAE6wjy9folzpGhF6Aggxk7/Re62wrVwFrdgmYCdIhgJScgrga2Flz6YH0d/edDYv5BC0b6140JYwE4TwAqCO6xY2ezfgAmWVKTvE3jz5Q9zOKZJa8EnxyyvjQ0hitBqWFZMBBD827Pg+W1YTig5SxSTSmYEMa87abLa7PIAtSA7D2lNrfmIpZJ941/e3QxnIhCYhFabPKqhrf+nZkCuezrZWV96/1UkTKsqsTemsnUF9H2/0guzjhiSWyv97bKWozJYEsVAOrz1rQDCZ6MgioeEqyg7o3QT2FILZFVNUJoy3bA3oj3U8IAhLIIAtpLAETZO+N17vO6hM4VxTjvfpc/ODmnHjRs4hYwR5dfYbi9vwuZOPHYYdol9WhUdosO1RYKoTtUNV260S304qKYgKl/BQg6ehatEbnRhUAsqCa+FfZj0Jg/ariJm1wg8DJgmWLZI35XGhvyjG5rQ66587AI1yK4566jREOlOzZGE5BFBdTCVgVv89qZW0yRac/GpuFBuGrYZpP/JGkQAjUJCkGSrFhnvhTj0nffSNLiyLlOkwRHT6D8e0KuzZFpJx4cmBjWrgszjtfmnCljgm9CZX5MixBL+vUpWshxVaKADcUTDVxckGt4yhMSshX58owpZLmKmRVs6WOV4JmTAKjmJLQAIyq4cYI6gmlV0IHsfRsO7RawzMq74TuqGrryhJTVALvmWJB8im9ptjm5Ko1rngdabDTmd2fL+w49Ab2Bug1sGsx4mCCoJwCQOSsNiZZjV5Aiok5fe6ec8hAJUvpraunocnV8wk9WuyShKTatTMSQnSC9Tec3nhIQAJUCJahRTP3271ddTcupaIJqi3R4fYE7mjhGXpPBs6JgeedO6CE/aWeDOPqsuTHERAhmObLE34LYCx3YEckqCxCAJQpaWpxL6CJ5rCLIK2KUjWJStqcKRqe1LMQAemleNKa4PEElrC51OhPuc5KqZDFOX4+WUAo+rvnexYqDiSNxugVl/CQXFo7pSS3jENCJF6C7yUiDHjgdwAiGNk2lVO3aJW17zAkjAjOuiI4bQPe+iw7Ilw9D+lgY8DYEei7JFLTlK2/z+drQum4xYAACr6IPqhCCmoO2VBCyl8L/r7b2Lz685SpxxOfvVKUglY/Xn2WxUd/L4BhRtwzEqH+bryqXpq8s8Ceae5RSETFYBPbhoq4NBkxWUmCFtwVdDKZtnOTxrhqNgGnjFxSRIgfEQL3aayMBuwdI+CM5mhNfZbmA6EnQF81bhylsfiU5zyyVLT3XlJ1LVmIdAprnlyfuKZOSMnbRcY7JEELQt+jnZsBJI+u3YyP0eB4bH83bzRMUN/WKiva3xdRk6QUf/suu/at0xVpGTqrQu9ea7R9YWHtuF5OnegycneNzwB6l8M3PuX5kYGMBaLMPSU0pybFP8hzBqfVC7B0Mqb1xRDFbcrPcFTRPdMrRbWuJEU91j2ZKQOn4PiCeDSO3JJRmaDDGAO/x0yWxEVFHOibNfGpEaGfwSdDdm3tFKfYoSDFotas7lwGENNOfZStZFksn/8XBBOqbmPKJERr64M4vaImSGjthsY1R0LoXuN2G1YmCdfTsOv5rL6xEGiwTDykPDVVvElkUh4aknGG2DXn21pfZtb16+n3hNogxRU/n6CaBOze9RaDwxgH2Y0oAbBnMBExCS+leyZLd+hAIymi+H9Mqj8iHl6VoTgskOVmsRDn1jWvONP4FNLaEgRf8pTSwtd6zyjRqbpmgFJ1CoGZqUegxdre0Smdj56MrFeGraXAQK9faYPZ+4pZCkoZPZxQKUCGlJVGUL49q9Hhk4Fo6sB3CE/+D/JwWnL/okJrGk853EhMskTAIGQ2N5sQ7TCxSwMrV8bl7MNseGx3wb4SYEaWXJxmTHjwNLG1+RwVSjGNSQbxH08ZhpjHUPEM5UiG8dTYSXtjkiuRiciawNuqy/yxdi3YXatSCrgttnmcOuFHnaOKwIhiSQJ57xENCk8I0bUhF9iVVBNSAE+CYEeb+KJ715qU5OhRikj4CmCQCoMA3aQAWRO/H7++s7+re/GPu47meO4FfG1NKXBrzSEHJb3Kt8X7O8vPTWRZdo7um5RX9QtZBabJuKSvrIQfl6LGXM/CdxrHygrq7bAsTveyndoaUlPQQ88QRmPtAF+F07vovfkUcPHT+NyYL/eoxBPeLjCTQU2t1hIXEi6YR+e1exBlP/nhe4WehQZQZGu2I6cfEvEgbcEu5hxQTqgJ0EkP29n2jakWzAK1JAmtedQhCbfdoo6JcOmnLK1tDvfi2xsHRIyRlA3eia7WjP7m0J3Uk1d5O9CdITVvtKpREqpfWIhW/1JIVsuiNxLBRTPUFM9dyw7tAkE74+XK8NhaXYdonA9hz8lFfqytbHtyT1mAqryHCdLJ9oQqj+4Zqa04Ichlnf0NAodl9TmByJRSbvcaHy0wLalqa+mXJzRtgp3B5Qb05oGUvk6XMMQdCtM3T4i+TduY5szlRRs3SsApquf6nOFlEBln/5KRuKBVLYZFz67NxKZ4mjqkCywsBgFwKScF5Loc4SFc1bwTHH2mSMUQ5XJPAmrCbl4+uLVTOlRUPyQCE2rGAm21bnQ0TjyAUMfLRllZa7Q0T/N1zdcNtB24WucEtF7FpGjUutZOyPDM346JRrJKhvEkQ+MJFMrJSErNNQ64WIOqRZX6vivSor0EnRaGA7WYIklhldabg3VodDVfQnTQzNcLfOUggSYUef4uBmUy3YccODvWnKrmlBBzGmTgbHHCro4+ncKsOWG1W6LZEdD40vNoPt8P2WukLOcBihE9n4AdsshQNMXAL9FLqXC4nonfXtzj/ICZAOm7EwlAm7HBCkYHiSOmlyJM9S7gqugJWmbSPAlBrMkidOmaq1f37BzpZNca1xjxTN9FXQIu2dBO9Ha9+fT00crg0ACrsuOjs+el/IDFnufmdicUTte4XlDnaHc4Ty0HHSdDOFbyuv74TIwqmvhucHwClh1wTRGW1WeZ+whpBPG9MqissTkdjAPhx3CxQ+9BOkmIWZ7vlYDJ1TGCdwpQ+VLGzd2sr9N8+EgY8RJdCS/+40Vl7Yc2E1a7SDbHZUeHgg/MpJ4B6fSuCIxeckyuKRr6UJKULLs/0ImT2GlO5tQEaVed0N8JGgQeMwA9v+LmZzdUn3aICj1rzEoSQq+YdIapZ1SxXI0iNKvN/2dpkGXIcHOwVDvJmHY+BKG/o4//HwL+v8tbu2cb49CzfgsYXVUONuJm0Agxt9O5eq4VUpEiJAC8kKRp+iGHNc25LBdhQ7po/KtCsUlSSv8iMpeh9SuVzEL1CiJMcGu8wK3HLqWleP0PVay0NkE2L6NIuKryDCql+IG0hNnfoIme23/7TmF0QXkzluhTD4BHfCNYjSb58GPKySGjaM3kqGeU0JOhbM8Zg+huTV8U4s55gPMxwaXtIn1rgZgDc0dIg3c9UQxRrTchLCelOWkhsMUA/9yc4BgnWXQLFWtSZW5vGwTDaU0VuILTyY8YTYhwMpbpUAI3ohaSpjprK/VWUXe/dZUArSNF1v/IaFKQpl002UlCQUYBKRArbx746/P1NxehnLkqsIPMQVraRC1kewq6EaDJkwXA+bWGWeJWTuOdUNmAW4TnNqIBlB2jfU4YzbGP/ufTN0YEc+N6ozn6okv/Qg3CZUEB4rc17O4ExDC0YONfaSA2pSxFX+tLAJofRB9f3LKUXX9ln3yZSj3BRIyirodjqF0glW3ihCHOdB+AGKPtgiyz8RHX595b1DGi/WWV5olxEIsAJ/Dvipob6BlQDFhfHJLZtK4dKeNhpTvJ6Fq7xxd6EnxGoh0gxjVOKRCfvgbX+hkqdFta7jmJEQhnH9iT6VE840zGc3JRtevL9g2MqTTq6EsLC5L7ByIjQHoplWxsBPeixOZK6LZtSldIqg8cv2kH+FpzSnA4LloEbAclEkqKh1k5E1D21ssvxDnzlZLirTUzBo22dlGC0sZW5ceTE++NV6WrY+Ivw3WkNaPsb82xeEkpYiKgtPnRYedMx/C4cckK/JJB27BJezWR3eKzjIYfBD4mXBBGigUMcjvNGVHN6bQgoRjfnD2nggU4+tJnayd8cYbr7L3nIADxI820q7geRbAsyMGLBKd7CfGVpm44SMqKdsG9NZ3FYtCtCSaC/G4cTztZXTY7JLQX4kjrMR5D0swmySKdv/VdCE0c1WbjUkxKYJECccqIQcmAgAZCkO1wVVqqDla4Thlcoqyw+3o6oKAY9J31nW7Hh3bqLkITYLQ3p8ofzK8Y3NkaiCYeHS1qTWBqNHHL6CVHyERy6JVc8gqT9oKuoZMKHMVXEwtq+ghcUQw1eRbicELXWC+fLpBJp1OEVmzMQpuzvBhqfAISa/hZ92VX4HrKiL4MRLop63JeTDwg8OaNFzFB19RZMOlodLeGGCaZ0OmL38YCQFMsWflWcMalbJCFQdrzBslgdggoOOb6W00AX0l4oImUtZv64kIMdc8ZpAgXN/jPLADhOxtRXCWM/jmdwlD82gIENYuKOQ2f6FNbNAY42loxTvF6ItZT1zQG7AOKcQgDQgypluSkHNmfLNNuz5CBmDCwZNMaPQ8Ina1xvGRoE0OOz/PzTL4mBpNxUqMH/DSRXkYMptmekbfLuFq0GkABlKVmORHdOipfvY62egK0vWVmwLue53d11mJWBzGhMxJHR4uHGUjj/AiMX6nLsMwJbZDuwujiWesV2qvQE8cy3CxfzAUsxkf0tgasD9zETUb7/pE0KHIyOR+EX/Q1mtSWa1DBt8ktlvUQKrBPSgrKiJCYBhFQjqo6haRsJz1inuXEQMRbpy2cwlhRtDQv9+ccWTQ1f/98bS3mEhYLFw/t1gTX3GIELAsS25rS5HhTW3VfnaFWan2QSfKDNki7W5ML1YbWp1cvwejm1Emaa5Lem1hVqcPnXNXukzRGFZ3yfH+j6wkly+KPVf0RyM9CALJuX6zfaGiMRywMChLdHFk0EFBBGi0Zzq55uCaJANzMIQgKTTH6H2ql5oluwCheGExzgkq0wLvWjuS+UwRBJ1870Fky2WYyk4XNDskSIy6B93eMqcgBfQlGAOse15Ngs9j9NQOZVEIV8GVDso7eNXXsstaGvCb0BJcv1y6NwZ7DqJSVm8iqCVDyICHpXQ0DrklIOo9qCU21DCXlJDQHPXz2Y/roiJaYcjQAAA0XSURBVNZ4BddIk+0wblkmKZ2+2WlNMVeXpaiTXqZ9QUsgltamTVkOHx0xMiJFYQLq2QhrflAJgJHymy/30rYGIiYE/p5b697+jgcFEQSjyWC4NcrU00kYBGGXOtUOD4ueXN0+9aK33rNqLoiAnQhS38Vh8kluDiIyzIy+vx1KVBzOMaAE1oIa9jAnRDiAwCISvA5b1uA3TiIIhJDVg2MoNEa671foIqJX1yMsxpz1BZP3rIxGS7dnBM7GqQdSYELuXtYMjdYS7jmnSxrDqmU5+hoqa+tEGzTDwYjcX9fEWKk6IwKrxFOyigdHXJNnc0IYem98HuF8CG3qkJh1ZpYL0k2LsBhtUsHSsUjnuDBBsAAz6SKL5w43LC3ggz3UQ37aKKbEDQWaukXh50ul3cdgNKUMaGw0i5VcUfQ45B2fxUKKi1enXGR/3Y/2+OMdtIW5YxV6hsbj6A05mZI8INBgoukYtkPgLgA2x+vB8LkCp0psvx1cBasI4qKkwwk7q2FhxSn9lASmdyHNzI86kKBrJ/XWAOu5sKoEo9JOwAQChY1pbV/fk48eaabCDZzCx0ulex6+F83bYMTWjMVZs8aDmmB2recgeWP3mV9y0Wvp+dkhMiZYVIun2QYAGTdYGMExqrrsXmO73t9pOiXx3zKP5tJmjaG2bpYnxihKCYSFNY/2QNeyTqBnc8KOEnRzQaljtGvaxHAo/RzZVgpvTrgXFyMlTahiYHM3VrdP/GsOgKejtf6nIK5ZbItPBptXSl7xMx3Dg4jZIQTce4ISR5zsSHCE3QIyCEQkFNB8Y0EVEM0+S2VZTFbUPABFtQyBglRyNfC13hOQYisF9bzejOxKmmpnJ+TWa6f6et4GUSUTaojeO1ECpwNYthtU8xmKX9jrvuOo2hHJRIHb3w4+kJO4oWUxa4b2Jmhbs4stmNb2rkiIOoIRLysjHEdjGhPjsKwWbT5wSDspC4nQmElRCTHB6n+LE/o00cEAoApV46AK9VEK96NrClw7HDySsWnVyhQh0vGuZRz9CtLWVhr0jDi0z6TB2Fq3+aMP7hUNGUyukVvf4cFZgMYNltWDWZJj+iyzd4GcPwbJx3xChk91X37d343zjdgE7mdXm5NAGt+YLAe629+KTNBGzDhsl3KkjimMC+l5TCY0Bxb0xjdQKsNKOdbSNIrW/rZLe/dtqpSdQeg8ZumSFlBJ9EmAWqfP+vLxm+HJvPRekr9ey/U/BVMHJCyFkOMsTSDHBziCKm72MiwYMY3h8kAuirKduUFsHWyOFvFMU0oNlDL0Hbg42U406ms4ztpzAm/pNuimuJKSoLzRoKhMcA7yKTYTvgZagjSvIjAlGNs4XkD86F50Gt9nabB4Ozuk38ty5oi/hOc7NSGjSthOWLTNshzQBVcBj4pBZ2JZRETETMRTQte4TFvajkiouYcyJLjaTgJaS1PJyXUoMBQ6V8JSexbym9Gp8CUxzt5Kf4GBGQGD7FoGkcH0PC+iUdfn6BbTGGjXm2fHQPO3brJPzhNDEpiMJ0Ij0IMRJ57EkDanUxgR104S7CQIuTLfQpXVyIKaMwFTVOsp3vSg7QKpYc/I92M+BntGjdL9hBbdCl0CgwJzjbAnmFPzyHKaVxoqewSvJ7Tm7qXwzR35Yg66mn8f0Gi+XLYM0alLGCJvMXXIscB8LVrvF+wOUxIX+G0FoQPQXJHUscWbi+J0F7MC3x+EiPK1rEoTCKDIr7crM5QYbaw2ckrjtmSG7ktOpNBqqfihXJljAtc3USTvTLI5xaWECXxtbl+fYBAKVl/VTgncuwy2sRmSJCk6pMqjECisIytchl+ftmV9YTFBaUDpS0Qk39vkaXsfKQLsgaQVk4K/81wJQrCTNrZLwAz5/tZkdc5PsermafdRVnMlkKw3oUdTLlnWJA3ueTuoa/y9Gml/bS+BNkfzsfL+VhRK73tXkccLfC1331h4IXgoOieow3Jo3haKeMWNvjtiNG5SWi9FIDdAEPAvRabYEbGwJ7hThFI2qEJy0L2yQLvMb4hIN7mLjCkG9bZTPHchOemZdhABOtkCgHRoL1r1avRwsvgN41hLvGMgO+GIJ67OnL0z6uaOz9a67pAE3AWaA3H0We5N2OJMQpNjE3wEp0iZUjvD8ypffW0NfhbSfYCd6lxB5XdQuE47RaUOI4te6S9YPGY1mBrfTkj4/S11dr7LUSfVur6OxpfqP2OSSmtYobn1orP7KT6ZiJ/qNwXzRsiT5xwllYuDgkEpjmGqJ6RwjoPmlmQbEQWCb7GUJmuBbCrW9FUUmLqHiFVQNd5BNkXi7sxFDz+c8J0I4f/Fiw23+wU455GjzRd5EpwMc/f21SsQg6xdVim4J7Pk6AdtuF29/uiMHtibRGHjZ801O6SHadAXGxO2HnaTSVXtiNxU93eKqHZovC5cxAPzGkv4uRHtWUVmzzW2tfh27nCjpoKstqsMrefgbDEM7JNtScNbr/l18XzZKH7AGQ51qLCBnyAhWFTPJBPeo7m3t4mm4lHrRUc0R0e8k4VstLWmQZXmGhgTfl9QGhyDTdbETeC8VmPl+DIxmVVEylpibBMbIQ5H+PpX1oU4wU+K64RLY5xlcvhM3aQHIygnFLTo6fcO/yIUAGc8tcN3Sh/9EgGoNOH3HDwKLT3b+P1NXi1jxkEpYnbzRmvjoMDXb1CxDD94v7eWr3VFUJP7ZYesV4HVIlBY/jemElbExvSGpFW6Utmelak0b8rWpyAAqXnKio6d4Yhh8dHLTpM8gCZaQzxSxDbeATY/C958zmZpFadQiYCmlTaw+NG6TqYoWltH8O9d5tYcrau4znjnW7hSUQEM3CEwJ/QY8k0iX2Zx5pVL43Ic/XGiQ6YSMayQu0KgjltW5pBZdPi+X4w2Jp+cQcSUACtNT4HqD66C+0voKbb7zQOz4k7En8ZkXII+6+56BpWQua9oT0FcY7TnlhSGIKi8jRYALK57ekGN50WuP6Tcwi0aobKnFoyIhJFwC1gJgqK0VhsHco6gmJNawoQSQvNAVBMiIbWeTlrKENS7ji6H+YCR7Vq4WELNCPj15i5rkmVFD/BPloYez8R3gmat8SF1hlz0nkJ2YSdmZWDtICdKNK329eTXuvGVvCQsAnzX5veyYiyLiAAFnSMuCUpQFLQjQrrZFvd/vvLdDiJwQzFgHkeL7DqBufl6ZXH8txMg9SWyoD73XEolYHUKKJ9Pb64Yb9c7EO27kF1vHbQ0Fs1qA0jE3q0JzDMZb3JRu2kBaKR1v3tgpdaUdIiFPEc8adzN16IdYthfyoTRt2iTAccSXP+KCeoJwU/PIYWljKyJv869RVwCjDHbvc8RHuNdaz0uQJ2SZWYoMU2ofjAN41lZ8ySQnpPCwpSaUy/G/xwtRige9WWk6wkp4fXq7+SgLmpXakgpdhmMWmintFx+9MYPupJh8hPrrj/x57en5PYxjjkNmRhQ/jep6jUBqDQVhRHJ9XU/C5RJCLq+LmzHSW1bLyL7pyoGQySYmNJIAoUASHU1HXAQbFXf0Q1dbs6UsxFqQm++Mj+n79GRVWfpwNVcXG5JnydFpWAGkOCbp/UTfjLV/1A8Jp+U2L/r/7Bj4iwPVqS44U4iKgE4YKDaTJDc0sa2uA8oZ8LY/xchN9nOUjxqKAnOdiqFaLtyKc0p7c4InKVypDW6wDEJSnCWCTnI4KCgZKHnVOBgIodBGpMb9PtcdiP4SF1nR2tkNU/8SL8FeMYzaC/4XfUt3eNSmkCQjUhBv/sqYkcyZSAQzsbHsCKz8btnLcDqwKUMPjwh2q3Nry7huhzF8YM4dilAs3nalX79DeCXIuzA1ojWxu1DeuKn9NqBhq5DbnPFPQumkQBIBhzYyOozGMYsAYE4UDK8axSyc+QGgL/9jwFZtaaMYN5W728wSMKXWQlefGi7RlG5wT9wgkwKcMdVAugokTuEpfUcTEuxyUebW2DndhtnnixUYI1WJyo36Ec2Cdh3EhlOu1oxGu199vtb8Swmdl1lntG2g1IUhUtQpkEFOnEGN4VQinTUwQAnOroeU71v/KfnILYyEIUU9yZbAl1AOsHw1uo+TExaqMoH6mleiUEZRfek4Ami9SABzZOxqEfEi4SXcHo2o4JUizuNE4RTVrsO7pYQ7ShZoaadVm8CB6BKSiRJzkH3TDKbHcIy9XilqxGpUcUPJrAEL7PIWptMAPQlSmmhwwcx2joRoMhTr8Rw/7hEREogmgu8ER06eb332q1WmJviL1+f9WeZUOfGtJ5irfWgvfEnc3P6xumSPvvCP2NM2Vx3tNiZrZFxAiv3oQuxya9QSKWbc3aIFDIt+s6EvHqnvbkbqW4L8q2ISEAAOy6kORMEi5cApAxuxA6QfQnC/iuldkrXMAx3ai7wOQAzY8oyM4SUKMvpWRibNJ0RSFrgc8WpXo1zaCJarZFx5cL8F7K994rn/b2X6IQkq5coMmNThCY/hvA/nG7BUG7Dj4cAAAAASUVORK5CYII=") center center;
		@apply w-full h-full absolute inset-0 opacity-50 -z-[1];
	} */
</style>
