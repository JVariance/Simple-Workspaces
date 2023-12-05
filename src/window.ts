import Browser from "webextension-polyfill";

export class Window {
	#workspaces: Ext.Workspace[] = [];
	#activeWorkspace!: Ext.Workspace;
	#self!: Ext.Window;

	constructor(id: number) {
		this.#self.id = id;
	}

	get workspaces(): Ext.Workspace[] {
		return this.#workspaces;
	}

	addWorkspace(workspace: Ext.Workspace) {
		this.#workspaces.push(workspace);
	}

	removeWorkspace(workspace: Ext.Workspace) {
		this.#workspaces = this.#workspaces.filter((w) => w.id !== workspace.id);
	}

	persist() {
		(async () => {
			await Browser.storage.local.set({ "": this.workspaces.map((w) => w.id) });
		})();
	}
}
