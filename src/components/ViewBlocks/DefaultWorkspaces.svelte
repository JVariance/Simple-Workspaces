<script lang="ts">
	import Browser, { i18n } from "webextension-polyfill";
	import Info from "../Info.svelte";
	import { onMount, type Snippet } from "svelte";
	import Icon from "../Icon.svelte";
	import Accordion from "../Accordion.svelte";

	type Props = {Workspace: Snippet, applyingChangesState: 'rest' | 'applying' | 'applied' | 'error'};
	type SimpleWorkspace =  & Pick<Ext.Workspace, "icon" | "name"> & { id: number };

	let { Workspace, applyingChangesState } = $props<Props>();

	let homeWorkspace = $state<SimpleWorkspace>({id: -1, icon: "🏠", name: "Home"});		
	let defaultWorkspaces: SimpleWorkspace[] = $state([]);
	// let applyingChangesState = $state<'rest' | 'applying' | 'applied' | 'error'>('rest');

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
			homeWorkspace: {...homeWorkspace},
			defaultWorkspaces: defaultWorkspaces.map((workspace) => (({name, icon}) => ({name, icon}))(workspace)),
		});
	}

	async function applyDefaultWorkspacesChanges() {
		// e.stopImmediatePropagation();
		applyingChangesState = 'applying';
		await persistDefaultWorkspaces();
		applyingChangesState = 'applied';
		setTimeout(() => {
			applyingChangesState ='rest';
		}, 4000);
	}

	onMount(async () => {
		const localDefaultWorkspaces = await Browser.runtime.sendMessage({msg: "getDefaultWorkspaces"}) as SimpleWorkspace[];
		localDefaultWorkspaces?.forEach((workspace, i) => {
			workspace.id = i;
		});

		if(localDefaultWorkspaces) defaultWorkspaces.push(...localDefaultWorkspaces);

		const { homeWorkspace: localHomeWorkspace } = await Browser.storage.local.get("homeWorkspace") as {homeWorkspace: SimpleWorkspace};

		if(Object.keys(localHomeWorkspace || {})?.length) homeWorkspace = localHomeWorkspace;
	});
</script>

<h2 class="m-0 mb-4 text-lg font-semibold first-letter:uppercase">{i18n.getMessage('default_workspaces')}</h2>
			<Info>
				{i18n.getMessage('will_apply_for_new_windows')}
			</Info>
			<div 
				class="w-max"
			>
				<div class="home-workspace flex gap-2 mb-2 mt-4 ml-6">
					{@render Workspace(homeWorkspace)}
				</div>
				<ul
					class="default-workspaces [&:not(:empty)]:!mb-2"
					use:dndzone={{
						items: defaultWorkspaces,
						dropTargetStyle: {},
						zoneTabIndex: -1,
						dragDisabled: !dragEnabled || defaultWorkspaces.length < 2,
					}}
					on:consider={(e: CustomEvent<DndEvent<SimpleWorkspace>>) => {
						defaultWorkspaces = e.detail.items;
					}}
					on:finalize={(e: CustomEvent<DndEvent<SimpleWorkspace>>) => {
						const { info: { source } } = e.detail;
						defaultWorkspaces = e.detail.items;
						if(source === SOURCES.POINTER){
							dragEnabled = false;
						}
					}}
				>
					{#each defaultWorkspaces as workspace, i (workspace.id)}
						<li class="grid grid-flow-col gap-2 items-stretch">
							<div class="drag-handle w-4 h-4 self-center" onpointerdown={(e) => {e.preventDefault(); dragEnabled = true}} onpointerup={() => {dragEnabled = false;}} aria-label="drag-handle">
								<Icon icon="drag-handle" width={18} class="{defaultWorkspaces.length < 2 ? 'hidden' : ''}" />
							</div>
							{@render Workspace(workspace)}
							<div class="self-center flex text-neutral-300">
								<button class="!bg-transparent !border-none !w-max !p-0" onclick={() => removeDefaultWorkspace(workspace.id)}>
									<Icon icon="cross" />
								</button>
							</div>
						</li>
					{/each}
				</ul>
				<button
					title="add default workspace"
					class="ml-6 w-full flex gap-2 items-center"
					style:width="-moz-available"
					onclick={addDefaultWorkspace}><Icon icon="add" width={16}/>
					<span class="-mt-1">{i18n.getMessage('add_default_workspace')}</span>
				</button>
				<button class="flex gap-2 items-center justify-center mt-4 bg-green-100" style:width="-moz-available" onclick={applyDefaultWorkspacesChanges}>
					<Icon icon="check" />
					<span class="-mt-1">{i18n.getMessage('apply_changes')}</span>
				</button>
				<Accordion detailsClasses="mt-4">
					{#snippet summary()}
						<span class="-mt-[0.125rem]">{i18n.getMessage('reset')}</span>
					{/snippet}
					<button class="flex items-center justify-center gap-2 mt-4" style:width="-moz-available" onclick={(e) => {defaultWorkspaces = [];}}><Icon icon="reset"/><span class="-mt-0">{i18n.getMessage('reset_default_workspaces')}</span></button>
				</Accordion>
			</div>