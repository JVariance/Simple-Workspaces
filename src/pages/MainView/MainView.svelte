<script lang="ts">
	import { onMount, tick } from "svelte";
	import { Key } from "ts-key-enum";
	import "@root/app.postcss";
	import WorkspaceComponent from "@components/Workspace.svelte";
	import Browser from "webextension-polyfill";
	import Icon from "@root/components/Icon.svelte";

	let workspaces: Ext.Workspace[] = [];
	// let activeWorkspace: Workspace;
	let selectedWorkspaceIndex: number;
	let newWorkspaceButton: HTMLButtonElement;
	let windowId: number;

	$: activeWorkspace = workspaces.find((workspace) => workspace.active)!;
	$: console.log({ workspaces });

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

			workspaces = await getWorkspaces({ windowId });

			window.close();
		})();
	}

	const port = Browser.runtime.connect();

	port.onMessage.addListener((message) => {
		const { msg } = message;
		switch (msg) {
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
				console.info("tabCreated");
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
			// workspaces = [...workspaces, newWorkspace];

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

	function getCurrentWorkspaceIndex() {
		return workspaces.findIndex(
			(workspace) => workspace.id === activeWorkspace.id
		);
	}

	function onKeyDown(e: KeyboardEvent) {
		let newIndex;

		const { key } = e;

		switch (key) {
			case Key.ArrowDown:
				e.preventDefault();
				newIndex = Math.min(workspaces.length, getCurrentWorkspaceIndex() + 1);
				selectedWorkspaceIndex = newIndex!;

				if (newIndex === workspaces.length) {
					(async () => {
						await tick();
						newWorkspaceButton.focus();
					})();
				}
				break;
			case Key.ArrowUp:
				e.preventDefault();
				newIndex = Math.max(0, getCurrentWorkspaceIndex() - 1);
				selectedWorkspaceIndex = newIndex!;
				break;
			case Key.Enter:
				e.preventDefault();
				activeWorkspace = workspaces.at(selectedWorkspaceIndex)!;
				switchWorkspace(activeWorkspace);
				break;
			default:
				break;
		}
	}

	function initExtension(): Promise<void> {
		return new Promise(async (resolve) => {
			console.info("initExtension");
			windowId = (await Browser.windows.getCurrent()).id!;
			let localWorkspaces = await getWorkspaces({ windowId });
			console.log({ localWorkspaces });
			workspaces = localWorkspaces;
			return resolve();
		});
	}

	onMount(() => {
		(async () => {
			await initExtension();
			// activeWorkspace = await getLocalActiveWorkspace();
			// selectedWorkspaceIndex = getCurrentWorkspaceIndex();
		})();
	});
</script>

<svelte:body on:keydown={onKeyDown} />

<div class="w-[100dvw] p-2 box-border">
	<h1 class="mb-4">Workspaces</h1>
	{#if false}
		<div class="flex gap-1 absolute top-0 right-0">
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
					Browser.runtime.sendMessage({ msg: "clearDB" });
				}}>clear DB</button
			>
		</div>
	{/if}
	{#if workspaces.length && activeWorkspace}
		<div class="grid gap-4 w-full @container">
			{#each workspaces as workspace, i}
				<WorkspaceComponent
					{workspace}
					active={workspace.active}
					selected={i === selectedWorkspaceIndex}
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
				on:pointerdown={addWorkspaceByPointer}
				on:keydown={addWorkspaceByKey}
				bind:this={newWorkspaceButton}
				class:selected={selectedWorkspaceIndex === workspaces.length}
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
