<script lang="ts">
	import Browser, { i18n } from "webextension-polyfill";
	import { onMount, unstate, untrack } from "svelte";
	import Icon from "../Icon.svelte";
	import Accordion from "@components/Accordion/Accordion.svelte";
	import Summary from "@components/Accordion/Summary.svelte";
	import Button from "@components/Button.svelte";
	import SimpleWorkspace from "../SimpleWorkspace.svelte";
	import { createToast } from "../createToast.svelte";
	import { immediateDebounceFunc } from "@root/utils";
	import { getDefaultWorkspacesState } from "@pages/states.svelte";
	import { overflowSwipe } from "@root/actions/overflowSwipe";
	import { draggable, type DragOptions } from "@neodrag/svelte";

	type Props = {dndFinish?: Function, isWelcomePage?: boolean};

	let { dndFinish = () => {}, isWelcomePage = false } = $props<Props>();
	
	let dragEnabled = $state(false);
	let fetchedDefaultWorkspaces: Ext.SimpleWorkspace[] = $state([]);
	let _defaultWorkspaces = $derived(getDefaultWorkspacesState());
	let defaultWorkspaces = $state((() => unstate(_defaultWorkspaces))());
	let existingWindowsWorkspaces = $state<[number, Pick<Ext.SimpleWorkspace, 'name' | 'icon'>[]][]>([]);
	let existingWindowWorkspacesAccordionElem: Accordion;

	$effect(() => {
		untrack(() => defaultWorkspaces);
		defaultWorkspaces = unstate(_defaultWorkspaces);
	});

	let changesMade = $derived.by(() => {
		console.info(JSON.stringify(fetchedDefaultWorkspaces) !== JSON.stringify(defaultWorkspaces));
		return JSON.stringify(fetchedDefaultWorkspaces) !== JSON.stringify(defaultWorkspaces)
	});

	function getNewWorkspace(){
		return {
			id: defaultWorkspaces.length,
			icon: "😀",
			name: i18n.getMessage('workspace'),
		}
	}

	function addDefaultWorkspace(e) {
		e.stopImmediatePropagation();
		defaultWorkspaces.push(getNewWorkspace());
		console.info({defaultWorkspaces});
	}

	function removeDefaultWorkspace(workspaceId: number) {
		defaultWorkspaces = defaultWorkspaces.filter(({id}) => id !== workspaceId);
	}

	function persistDefaultWorkspaces() {
		return Browser.runtime.sendMessage({
			msg: "setDefaultWorkspaces",
			defaultWorkspaces: defaultWorkspaces.map((workspace) => (({name, icon}) => ({name, icon}))(workspace)),
		});
	}

	async function _applyDefaultWorkspacesChanges() {
		// e.stopImmediatePropagation();
		console.info("applyDefaultWorkspacesChanges");
		const toast = createToast({
				errorMessage: "Something went wrong", 
				successMessage: i18n.getMessage("applied_changes"),
				loadingMessage: i18n.getMessage("applying_changes"),
		});

		await persistDefaultWorkspaces();
		toast.state = "success";
		fetchedDefaultWorkspaces = [...unstate(defaultWorkspaces)];
	}

	const applyDefaultWorkspacesChanges = immediateDebounceFunc(_applyDefaultWorkspacesChanges, 500);

	function getExistingWindowsWorkspaces(){
		return Browser.runtime.sendMessage({ msg: "getExistingWindowsWorkspaces" });
	}


	let currentDragIndex = $state(0);
	let itemHeight = $state(56); // height of item(+gap) to calculate offset
  let translateY = $state(0); // offset to apply to current dragged item
  let lastOffsetY = $state(0); // last offset reported by neodrag
	const dragOptions: DragOptions = {
		axis: 'y',
		bounds: 'parent',
		handle: '.drag-handle',
		onDragStart({rootNode, offsetY}){
			currentDragIndex = [...rootNode.parentNode.children].indexOf(rootNode); // get start index from dom
      lastOffsetY = offsetY; // store neodrag offset to correctly calculate delta in onDrag
      translateY = 0;
		},
		onDrag({offsetY}){
			translateY+=(offsetY - lastOffsetY); // move dragged item by delta from last event
      lastOffsetY = offsetY; // store neodrag offset for next delta calc 
      if(translateY > 0.5 * itemHeight){
        shiftCurrentItem(1) // dragged by more than half height down, shift down by one
      } else if (translateY < -0.5 * itemHeight) {
        shiftCurrentItem(-1) // dragged by more than half height up, shift up by one
      }
		},
		onDragEnd({rootNode}){
      rootNode.style.transform=`translate3d(0,0,0)` // on end of drag, remove translate so item returns to natural pos
      translateY = 0;
			dndFinish();
			// 	const newActiveWorkspaceIndex = activeWorkspaceIndex === 0 ? 0 : workspaces.findIndex(({ active }) => active) + 1;
			// 	activeWorkspaceIndex = newActiveWorkspaceIndex;
    },
    transform({offsetY}){
      return `translate3d(0,${translateY}px,0)` // apply calculated offset
    }
	};

	function shiftCurrentItem(shift: number) {
    defaultWorkspaces.splice(currentDragIndex+shift,0,defaultWorkspaces.splice(currentDragIndex,1)[0]); // double splice to switch currentDragIndex item by shift
    currentDragIndex+=shift; // update currentDragIndex so next shift works 
    translateY -= shift * itemHeight; // item has moved to a new place, update translate so that it keeps its current dragged pos
  }

	onMount(async () => {
		const localDefaultWorkspaces = await Browser.runtime.sendMessage({ msg: "getDefaultWorkspaces" }) as Ext.SimpleWorkspace[];
		localDefaultWorkspaces?.forEach((workspace, i) => {
			workspace.id = i;
		});

		existingWindowsWorkspaces = await getExistingWindowsWorkspaces();

		if(localDefaultWorkspaces) {
			fetchedDefaultWorkspaces = [...localDefaultWorkspaces];
			defaultWorkspaces = localDefaultWorkspaces;
		};
	});


	async function forceApplyOnCurrentWindow(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }) {
		event.stopImmediatePropagation();
		const toast = createToast({
			loadingMessage: i18n.getMessage("applying_changes"),
			successMessage: i18n.getMessage("applied_changes"),
			errorMessage: "Something went wrong", 
		});
		await Browser.runtime.sendMessage({msg: "forceApplyDefaultWorkspacesOnCurrentWindow"});
		toast.state = "success";
	}
	
	
	async function forceApplyOnAllWindows(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }) {
		event.stopImmediatePropagation();
		const toast = createToast({
			loadingMessage: i18n.getMessage("applying_changes"),
			successMessage: i18n.getMessage("applied_changes"),
			errorMessage: "Something went wrong", 
		});
		await Browser.runtime.sendMessage({msg: "forceApplyDefaultWorkspacesOnAllWindows"});
		toast.state = "success";
	}
</script>

<div class="w-full">
	<div 
		class="w-full"
	>
		<div class="w-full list-wrapper [&:has(ul:empty)>button]:ml-0">
			{#if !isWelcomePage}
				<div class="flex gap-2 items-center">
					<h2 class="text-[--heading-2-color] text-lg font-semibold">{i18n.getMessage('existing_windows_workspaces')}</h2>
					<Button title={i18n.getMessage('reload')} class="ghost !p-1" onclick={async () => existingWindowsWorkspaces = await getExistingWindowsWorkspaces()}>
						<Icon icon="reload" width={16} />
						<!-- <span class="-mt-[0.1rem] text-base">{i18n.getMessage('reload')}</span> -->
					</Button>
				</div>
				<div 
					class="
						max-w-[100cqw] group
						grid grid-flow-col auto-cols-[minmax(150px_auto)] gap-2 justify-start my-4 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:initial] pb-1
						overscroll-contain select-none
						opacity-50 rounded-md overflow-hidden h-12
						hover:overflow-auto focus-within:overflow-auto hover:opacity-100 focus-within:opacity-100
						hover:h-auto focus-within:h-auto
						[transition:height_200ms]
					"
					use:overflowSwipe
				>
					{#each existingWindowsWorkspaces as [i, workspaces]}
						<div class="swipe-item p-1 rounded-md border border-[--workspace-bg] w-min bg-[--body-bg] grid grid-rows-[auto_1fr_auto]">
							<h2 class="first-letter:uppercase text-[--heading-2-color] w-max">{i18n.getMessage('window')} {i + 1}</h2>
							<div class="flex gap-4 mt-2 flex-wrap max-h-32 overflow-auto [scrollbar-width:thin] content-start">
								{#each workspaces as workspace}
									<div class="flex gap-2 w-full">
										<span class="[font-family:_Noto_Color_Emoji]">{workspace.icon}</span>
										<p class="overflow-hidden text-ellipsis">{workspace.name}</p>
									</div>
									{:else}
									<span>-</span>
								{/each}
							</div>
							{#if workspaces.length}
								<Button class="primary-btn mt-4" onclick={() => {defaultWorkspaces = workspaces.map(({name, icon}, i) => ({id: i, name, icon}));}}>
									{i18n.getMessage('use_as_template')}
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
			<!-- dragDisabled: !dragEnabled || defaultWorkspaces.length < 2 -->
			<ul class="default-workspaces grid gap-2 [&:not(:empty)]:!mb-2">
				{#each defaultWorkspaces as workspace, i (workspace.id)}
					<li class="flex gap-2 items-stretch" use:draggable={dragOptions}>
						<div class="drag-handle w-4 h-4 self-center" onpointerdown={(e) => {e.preventDefault(); dragEnabled = true}} onpointerup={() => {dragEnabled = false;}} aria-label="drag-handle">
							<Icon icon="drag-handle" width={18} class="{defaultWorkspaces.length < 2 ? 'hidden' : ''}" />
						</div>
						<SimpleWorkspace 
							{workspace} 
							updatedIcon={(icon) => workspace.icon = icon} 
							updatedName={(name) => workspace.name = name}
						/>
						<div class="self-center flex">
							<button class="btn secondary-btn !border-none !w-max !p-0" onclick={() => removeDefaultWorkspace(workspace.id)}>
								<Icon icon="cross" />
							</button>
						</div>
					</li>
				{/each}
			</ul>
			<button
				title={i18n.getMessage('add_default_workspace')}
				class="btn primary-btn ml-6 max-w-[100cqw]"
				style:width="-moz-available"
				onclick={addDefaultWorkspace}><Icon icon="add" width={16} class="min-w-4 min-h-4"/>
				<span class="-mt-[0.1rem] whitespace-nowrap overflow-hidden text-ellipsis">{i18n.getMessage('add_default_workspace')}</span>
			</button>
			<button 
				class="btn primary-btn justify-center mt-4 [&:not(.changes-available)]:hidden max-w-[100cqw]" 
				class:changes-available={changesMade} 
				style:width="-moz-available" 
				disabled={!changesMade} 
				onclick={applyDefaultWorkspacesChanges}
			>
				<Icon icon="check" />
				<span class="-mt-1">{i18n.getMessage('apply_changes')}</span>
			</button>
		</div>
		{#if !isWelcomePage}
			<Accordion class="mt-4">
				{#snippet summary()}
					<Summary>
						<span>{i18n.getMessage('force_apply') || "force apply"}</span>
					</Summary>
				{/snippet}
				<button class="btn primary-btn justify-center mt-4 !w-auto" style:width="-moz-available" onclick={forceApplyOnCurrentWindow}>
					{i18n.getMessage("force_apply_on_current_window") || "force apply on current window"}
				</button>
				<button class="btn primary-btn justify-center mt-4 !w-auto" style:width="-moz-available" onclick={forceApplyOnAllWindows}>
					{i18n.getMessage("force_apply_on_all_open_windows") || "force apply on all open windows"}
				</button>
			</Accordion>
			<Accordion class="mt-4">
				{#snippet summary()}
					<Summary>
						<span class="-mt-[0.125rem]">{i18n.getMessage('reset')}</span>
					</Summary>
				{/snippet}
				<button class="btn primary-btn justify-center mt-4 !w-auto" style:width="-moz-available" onclick={(e) => {defaultWorkspaces = [];}}><Icon icon="reset"/><span class="-mt-0">{i18n.getMessage('reset_default_workspaces')}</span></button>
			</Accordion>
		{/if}
	</div>
</div>