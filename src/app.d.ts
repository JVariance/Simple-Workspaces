namespace Ext {
	type Workspace = {
		id: string;
		icon: string;
		name: string;
		tabIds: number[];
		active: boolean;
		activeTabId?: number;
		windowId: number;
		hidden?: boolean;
	};

	type Window = {
		id: number;
		workspaces: Workspace[];
	};
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
