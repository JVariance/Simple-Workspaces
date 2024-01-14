import Browser from "webextension-polyfill";
import { onMount } from "svelte";
import { BrowserStorage } from "@root/background/Storage";

let workspaces = $state<Ext.Workspace[]>([]);
let homeWorkspace = $state<Ext.SimpleWorkspace>();
let defaultWorkspaces = $state<Ext.SimpleWorkspace[]>([]);
let windowId = $state<number>();

export const getWorkspacesState = () => {
	return workspaces;
};

export const getDefaultWorkspacesState = () => {
	return defaultWorkspaces;
};

export const getHomeWorkspaceState = () => {
	return homeWorkspace;
};

function addedWorkspace({ workspace }: { workspace: Ext.Workspace }) {
	console.info("states: addedWorkspace");
	workspaces.push(workspace);
}

function updatedHomeWorkspace({
	homeWorkspace: _homeWorkspace,
}: {
	homeWorkspace: Ext.SimpleWorkspace;
}) {
	console.info("states: updatedHomeWorkspace");
	homeWorkspace = _homeWorkspace;
}

async function setWorkspaces() {
	console.info("states: setWorkspaces");
	workspaces =
		(await Browser.runtime.sendMessage({
			msg: "getWorkspaces",
			windowId,
		})) || [];
}

async function setHomeWorkspace() {
	console.info("states: setWorkspaces");
	homeWorkspace = (await BrowserStorage.getHomeWorkspace())?.homeWorkspace || {
		id: -1,
		icon: "🏠",
		name: "Home",
	};
}

const addIdToSimpleWorkspace = (workspace: Ext.SimpleWorkspace, i: number) => {
	workspace.id = i;
	return workspace;
};

function updatedDefaultWorkspaces({
	defaultWorkspaces: _defaultWorkspaces,
}: {
	defaultWorkspaces: Ext.SimpleWorkspace[];
}) {
	console.info("states: updatedDefaultWorkspaces");
	defaultWorkspaces = _defaultWorkspaces.map(addIdToSimpleWorkspace);
}

async function setDefaultWorkspacesFromLocalStorage() {
	defaultWorkspaces =
		(await BrowserStorage.getDefaultWorkspaces())?.defaultWorkspaces?.map(
			addIdToSimpleWorkspace
		) || [];
}

Browser.runtime.onMessage.addListener((message) => {
	console.info("browser runtime onmessage");
	const { windowId: targetWindowId, msg } = message;
	if (targetWindowId !== windowId) return;

	switch (msg) {
		case "initialized":
			console.info("background initialized");
			// initView();
			break;
		case "addedWorkspace":
			addedWorkspace(message);
			break;
		case "updatedHomeWorkspace":
			updatedHomeWorkspace(message);
			break;
		case "updatedWorkspaces":
			setWorkspaces();
			break;
		case "updatedDefaultWorkspaces":
			updatedDefaultWorkspaces(message);
			break;
		default:
			break;
	}
});

// onMount(async () => {
// 	windowId = (await Browser.windows.getCurrent()).id!;

// 	console.info("states.svelte.ts -> " + windowId);
// });

$effect.root(() => {
	console.info("effect.root");
	$effect(() => {
		(async () => {
			console.info("cooler effekt");
			windowId = (await Browser.windows.getCurrent()).id!;
			console.info("states: windowId -> " + windowId);
			await Promise.all([
				setWorkspaces(),
				setDefaultWorkspacesFromLocalStorage(),
				setHomeWorkspace(),
			]);
		})();
	});
});
