namespace Ext {
	type Workspace = {
		UUID: string;
		icon: string;
		name: string;
		tabIds: number[];
		pinnedTabIds: number[];
		active: boolean;
		activeTabId?: number;
		windowId: number;
	};

	type Window = {
		UUID: string;
		workspaces: Workspace[];
	};

	type SimpleWorkspace = Pick<Ext.Workspace, "icon" | "name"> & { id: number };
}

declare type Item = import("svelte-dnd-action").Item;
declare type DndEvent<ItemType = Item> =
	import("svelte-dnd-action").DndEvent<ItemType>;
declare namespace svelteHTML {
	interface HTMLAttributes<T> {
		"on:consider"?: (
			event: CustomEvent<DndEvent<ItemType>> & { target: EventTarget & T }
		) => void;
		"on:finalize"?: (
			event: CustomEvent<DndEvent<ItemType>> & { target: EventTarget & T }
		) => void;
	}
}
