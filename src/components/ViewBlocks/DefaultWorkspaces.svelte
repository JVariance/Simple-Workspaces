<script lang="ts">
	import Browser, { i18n } from "webextension-polyfill";
	import { onMount } from "svelte";
	import Icon from "../Icon.svelte";
	import Accordion from "../Accordion.svelte";
	import SimpleWorkspace from "../SimpleWorkspace.svelte";
	import { SOURCES, dndzone } from "svelte-dnd-action";
	import { createToast } from "../createToast";
	import { immediateDebounceFunc } from "@root/utils";

	type Props = {dndFinish?: Function};

	let {dndFinish = () => {} } = $props<Props>();
	
	let changesMade = $state(false);
	let dragEnabled = $state(false);
	let homeWorkspace = $state<Ext.SimpleWorkspace>({id: -1, icon: "🏠", name: "Home"});		
	let defaultWorkspaces: Ext.SimpleWorkspace[] = $state([]);

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
		changesMade = true;
	}

	function removeDefaultWorkspace(workspaceId: number) {
		defaultWorkspaces = defaultWorkspaces.filter(({id}) => id !== workspaceId);
	}

	function persistDefaultWorkspaces() {
		return Browser.runtime.sendMessage({
			msg: "setDefaultWorkspaces",
			homeWorkspace: {...homeWorkspace},
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
		toast.$set({state: "success"});
		changesMade = false;
	}

	const applyDefaultWorkspacesChanges = immediateDebounceFunc(_applyDefaultWorkspacesChanges, 500);

	$effect(() => {
		defaultWorkspaces; homeWorkspace; 
		changesMade = true;
	});

	onMount(async () => {
		const localDefaultWorkspaces = await Browser.runtime.sendMessage({msg: "getDefaultWorkspaces"}) as Ext.SimpleWorkspace[];
		localDefaultWorkspaces?.forEach((workspace, i) => {
			workspace.id = i;
		});

		if(localDefaultWorkspaces) defaultWorkspaces.push(...localDefaultWorkspaces);

		const { homeWorkspace: localHomeWorkspace } = await Browser.storage.local.get("homeWorkspace") as {homeWorkspace: Ext.SimpleWorkspace};

		if(Object.keys(localHomeWorkspace || {})?.length) homeWorkspace = localHomeWorkspace;
	});


	async function forceApplyOnCurrentWindow(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }) {
		await Browser.runtime.sendMessage({msg: "forceApplyDefaultWorkspacesOnCurrentWindow"});
		createToast({
			loadingMessage: i18n.getMessage("applying_changes"),
			successMessage: i18n.getMessage("applied_changes"),
			errorMessage: "Something went wrong", 
		});
	}
	
	
	async function forceApplyOnAllWindows(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }) {
		await Browser.runtime.sendMessage({msg: "forceApplyDefaultWorkspacesOnAllWindows"});
		createToast({
			loadingMessage: i18n.getMessage("applying_changes"),
			successMessage: i18n.getMessage("applied_changes"),
			errorMessage: "Something went wrong", 
		});
	}
</script>

<div class="w-full">
	<!-- <h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('default_workspaces')}</h2>
	<Info>
		{i18n.getMessage('will_apply_for_new_windows')}
	</Info> -->
	<div 
		class="w-full"
	>
		<div class="home-workspace flex gap-2 mb-2 mt-4 ml-6">
			<SimpleWorkspace workspace={homeWorkspace} updatedIcon={(icon) => {homeWorkspace.icon = icon;}} updatedName={(name) => {homeWorkspace.name = name;}}></SimpleWorkspace>
		</div>
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
						updatedIcon={(icon) => {workspace.icon = icon; changesMade = true;}} 
						updatedName={(name) => {workspace.name = name; changesMade = true;}}
					/>
					<div class="self-center flex text-neutral-300">
						<button class="btn ghost !border-none !w-max !p-0" onclick={() => removeDefaultWorkspace(workspace.id)}>
							<Icon icon="cross" />
						</button>
					</div>
				</li>
			{/each}
		</ul>
		<button
			title="add default workspace"
			class="btn ml-6 w-full"
			style:width="-moz-available"
			onclick={addDefaultWorkspace}><Icon icon="add" width={16}/>
			<span class="-mt-1">{i18n.getMessage('add_default_workspace')}</span>
		</button>
		<button class="btn justify-center mt-4" style:width="-moz-available" disabled={!changesMade} onclick={applyDefaultWorkspacesChanges}>
			<Icon icon="check" />
			<span class="-mt-1">{i18n.getMessage('apply_changes')}</span>
		</button>
		<Accordion detailsClasses="mt-4">
			{#snippet summary()}
				<span>{i18n.getMessage('force_apply')}</span>
			{/snippet}
			<button class="btn justify-center mt-4" style:width="-moz-available" onclick={forceApplyOnCurrentWindow}>
				force apply on current window
			</button>
			<button class="btn justify-center mt-4" style:width="-moz-available" onclick={forceApplyOnAllWindows}>
				force apply on all open windows
			</button>
		</Accordion>
		<Accordion detailsClasses="mt-4">
			{#snippet summary()}
				<span class="-mt-[0.125rem]">{i18n.getMessage('reset')}</span>
			{/snippet}
			<button class="btn justify-center mt-4" style:width="-moz-available" onclick={(e) => {defaultWorkspaces = [];}}><Icon icon="reset"/><span class="-mt-0">{i18n.getMessage('reset_default_workspaces')}</span></button>
		</Accordion>
	</div>
</div>