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
