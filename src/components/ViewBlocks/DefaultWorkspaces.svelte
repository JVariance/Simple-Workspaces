<script lang="ts">
	import Browser, { i18n } from "webextension-polyfill";
	import { onMount, unstate, untrack } from "svelte";
	import Icon from "../Icon.svelte";
	import Accordion from "../Accordion.svelte";
	import SimpleWorkspace from "../SimpleWorkspace.svelte";
	import { SOURCES, dndzone } from "svelte-dnd-action";
	import { createToast } from "../createToast";
	import { immediateDebounceFunc } from "@root/utils";
	import {getDefaultWorkspacesState} from "@pages/states.svelte";

	type Props = {dndFinish?: Function};

	let {dndFinish = () => {} } = $props<Props>();
	
	let dragEnabled = $state(false);
	let fetchedDefaultWorkspaces: Ext.SimpleWorkspace[] = $state([]);
	let _defaultWorkspaces = $derived(getDefaultWorkspacesState());
	let defaultWorkspaces = $state((() => unstate(_defaultWorkspaces))());

	$effect(() => {
		untrack(() => defaultWorkspaces);
		defaultWorkspaces = unstate(_defaultWorkspaces);
	});

	let changesMade = $derived((() => {
		console.info(JSON.stringify(fetchedDefaultWorkspaces) !== JSON.stringify(defaultWorkspaces));
		return JSON.stringify(fetchedDefaultWorkspaces) !== JSON.stringify(defaultWorkspaces)
	})());

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
		toast.$set({ state: "success" });
		fetchedDefaultWorkspaces = [...unstate(defaultWorkspaces)];
	}

	const applyDefaultWorkspacesChanges = immediateDebounceFunc(_applyDefaultWorkspacesChanges, 500);

	onMount(async () => {
		const localDefaultWorkspaces = await Browser.runtime.sendMessage({msg: "getDefaultWorkspaces"}) as Ext.SimpleWorkspace[];
		localDefaultWorkspaces?.forEach((workspace, i) => {
			workspace.id = i;
		});

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
		toast.$set({ state: "success" });
	}
	
	
	async function forceApplyOnAllWindows(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }) {
		event.stopImmediatePropagation();
		const toast = createToast({
			loadingMessage: i18n.getMessage("applying_changes"),
			successMessage: i18n.getMessage("applied_changes"),
			errorMessage: "Something went wrong", 
		});
		await Browser.runtime.sendMessage({msg: "forceApplyDefaultWorkspacesOnAllWindows"});
		toast.$set({ state: "success" });
	}
</script>

<div class="w-full">
	<div 
		class="w-full"
	>
		<div class="w-max list-wrapper [&:has(ul:empty)>button]:ml-0">
			<ul
				class="default-workspaces grid gap-2 [&:not(:empty)]:!mb-2"
				use:dndzone={{
					items: defaultWorkspaces,
					dropTargetStyle: {},
					zoneTabIndex: -1,
					dragDisabled: !dragEnabled || defaultWorkspaces.length < 2,
				}}
				on:consider={(e: CustomEvent<DndEvent<Ext.SimpleWorkspace>>) => {
					defaultWorkspaces = e.detail.items;
				}}
				on:finalize={(e: CustomEvent<DndEvent<Ext.SimpleWorkspace>>) => {
					const { info: { source } } = e.detail;
					defaultWorkspaces = e.detail.items;
					if(source === SOURCES.POINTER){
						dragEnabled = false;
					}
					dndFinish();
				}}
			>
				{#each defaultWorkspaces as workspace, i (workspace.id)}
					<li class="flex gap-2 items-stretch">
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
				title="add default workspace"
				class="btn primary-btn ml-6 w-full"
				style:width="-moz-available"
				onclick={addDefaultWorkspace}><Icon icon="add" width={16}/>
				<span class="-mt-[0.1rem]">{i18n.getMessage('add_default_workspace')}</span>
			</button>
			<button class="btn primary-btn justify-center mt-4 [&:not(.changes-available)]:hidden" class:changes-available={changesMade} style:width="-moz-available" disabled={!changesMade} onclick={applyDefaultWorkspacesChanges}>
				<Icon icon="check" />
				<span class="-mt-1">{i18n.getMessage('apply_changes')}</span>
			</button>
		</div>
		<Accordion detailsClasses="mt-4">
			{#snippet summary()}
				<span>{i18n.getMessage('force_apply') || "force apply"}</span>
			{/snippet}
			<button class="btn primary-btn justify-center mt-4" style:width="-moz-available" onclick={forceApplyOnCurrentWindow}>
				{i18n.getMessage("force_apply_on_current_window") || "force apply on current window"}
			</button>
			<button class="btn primary-btn justify-center mt-4" style:width="-moz-available" onclick={forceApplyOnAllWindows}>
				{i18n.getMessage("force_apply_on_all_open_windows") || "force apply on all open windows"}
			</button>
		</Accordion>
		<Accordion detailsClasses="mt-4">
			{#snippet summary()}
				<span class="-mt-[0.125rem]">{i18n.getMessage('reset')}</span>
			{/snippet}
			<button class="btn primary-btn justify-center mt-4" style:width="-moz-available" onclick={(e) => {defaultWorkspaces = [];}}><Icon icon="reset"/><span class="-mt-0">{i18n.getMessage('reset_default_workspaces')}</span></button>
		</Accordion>
	</div>
</div>