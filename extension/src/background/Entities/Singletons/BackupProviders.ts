import GoogleDrive from "@root/background/helper/Authorization/GoogleDrive";
import { BrowserStorage } from "../Static/BrowserStorage";

export type BackupProviderInstance = GoogleDrive;
export type BackupProvider = "Google Drive";
export type BackupProviderStatusProps = {
	connected: boolean;
	lastTimeStamp: number;
};
export type BackupProviderCredentials = {
	access_token?: string;
	refresh_token?: string;
};

class WorkspaceStorage {
	initialized = false;
	private static _instance: WorkspaceStorage;
	#providers = new Map<BackupProvider, BackupProviderInstance>();
	currentProvider!: BackupProviderInstance;

	private constructor() {}

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}

	async init() {
		const { backupProvider } = await BrowserStorage.getBackupProvider();
		this.currentProvider = await this.getProvider(backupProvider);
	}

	async getProvider(provider: BackupProvider): Promise<BackupProviderInstance> {
		if (this.#providers.has(provider)) {
			return this.#providers.get(provider)!;
		} else {
			let _provider: BackupProviderInstance;
			switch (provider) {
				case "Google Drive":
				default:
					_provider = new GoogleDrive();
					break;
			}
			await _provider.init();
			_provider && this.#providers.set(provider, _provider);
			return _provider;
		}
	}

	async switchProvider(provider: BackupProvider) {
		this.currentProvider = await this.getProvider(provider);
	}
}

export default WorkspaceStorage.Instance;
