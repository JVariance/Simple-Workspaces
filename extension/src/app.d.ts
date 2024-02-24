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
