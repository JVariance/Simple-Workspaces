import GoogleDrive from "@root/background/helper/Authorization/GoogleDrive";
import { BrowserStorage } from "../Static/BrowserStorage";

export type BackupProviderInstance = GoogleDrive;
export type BackupProvider = "Google Drive";
export type BackupProviderStatusProps = {
	selected: boolean;
	authorized: boolean;
	lastBackupTimeStamp: number;
};
export type BackupProviderCredentials = {
	access_token?: string;
	refresh_token?: string;
};

const allProviders: BackupProvider[] = ["Google Drive"];

class BackupProviders {
	initialized = false;
	private static _instance: BackupProviders;
	#providers = new Map<BackupProvider, BackupProviderInstance>();
	currentProvider!: BackupProviderInstance;

	private constructor() {}

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}

	async init() {
		const { backupProvider } = await BrowserStorage.getBackupProvider();
		for (let provider of allProviders) {
		}
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

export default BackupProviders.Instance;
