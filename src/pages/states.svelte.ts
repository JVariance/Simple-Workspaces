import Browser from "webextension-polyfill";
import { BrowserStorage } from "@root/background/Entities/Static/Storage";
import { tick } from "svelte";

let workspaces = $state<Ext.Workspace[]>([]);
let homeWorkspace = $state<Ext.SimpleWorkspace>();
let defaultWorkspaces = $state<Ext.SimpleWorkspace[]>([]);
let windowId = $state<number>();
let theme = $state<"browser" | "">("");

export const getWorkspacesState = () => workspaces;
export const getDefaultWorkspacesState = () => defaultWorkspaces;
export const getHomeWorkspaceState = () => homeWorkspace;
export const getThemeState = () => theme;

function addedWorkspace({ workspace }: { workspace: Ext.Workspace }) {
	console.info("states: addedWorkspace");
	workspaces.push(workspace);
	updatedActiveWorkspace({ UUID: workspace.UUID });
}

function updatedHomeWorkspace({
	homeWorkspace: _homeWorkspace,
}: {
	homeWorkspace: Ext.SimpleWorkspace;
}) {
	console.info("states: updatedHomeWorkspace");
	homeWorkspace = _homeWorkspace;
	workspaces[0] = { ...workspaces[0], ...homeWorkspace };
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

const findActiveWorkspace = (workspace: Ext.Workspace) => workspace.active;

function updatedActiveWorkspace({
	UUID: workspaceUUID,
}: {
	UUID: Ext.Workspace["UUID"];
}) {
	console.info("states: updatedActiveWorkspace");

	const activeWorkspace = workspaces.find(findActiveWorkspace);

	if (activeWorkspace) {
		activeWorkspace.active = false;
		const workspace = workspaces.find(({ UUID }) => UUID === workspaceUUID)!;
		(workspace as Ext.Workspace).active = true;
	}
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

	const activeWorkspace = workspaces.find(findActiveWorkspace);

	if (activeWorkspace) {
		activeWorkspace.tabIds = activeWorkspace.tabIds.filter(
			(tabId) => !tabIds.includes(tabId)
		);

		if (!activeWorkspace.tabIds.length) {
			console.info("habe keine Tabs mehr :(", { activeWorkspace });
			updatedActiveWorkspace({ UUID: targetWorkspace.UUID });
		}
	}

	targetWorkspace.tabIds.push(...tabIds);
}

function movedTabsToNewWorkspace({ workspace }: { workspace: Ext.Workspace }) {
	workspaces.push(workspace);
}

async function setTheme() {
	const { theme: _theme } = await BrowserStorage.getTheme();
	theme = _theme || "";
}

function updatedTheme({ theme: _theme }: { theme: typeof theme }) {
	theme = _theme || "";
}

async function themeChanged() {
	console.info("themeChanged");
	if (theme === "browser") {
		theme = "";
		await tick();
		theme = "browser";
	}
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
		case "updatedActiveWorkspace":
			updatedActiveWorkspace(message);
			break;
		case "movedTabs":
			movedTabs(message);
			break;
		case "movedTabsToNewWorkspace":
			movedTabsToNewWorkspace(message);
			break;
		case "updatedDefaultWorkspaces":
			updatedDefaultWorkspaces(message);
			break;
		case "updatedTheme":
			updatedTheme(message);
			break;
		case "themeChanged":
			themeChanged();
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
				setTheme(),
			]);
		})();
	});
});
