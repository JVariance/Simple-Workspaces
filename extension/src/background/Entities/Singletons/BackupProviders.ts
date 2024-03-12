import GoogleDrive from "@root/background/helper/Authorization/GoogleDrive";

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
	activeProvider!: BackupProviderInstance;

	private constructor() {}

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}

	async init() {
		for (let provider of allProviders) {
			if (provider === "Google Drive") {
				const thisProvider = new GoogleDrive();
				await thisProvider!.init();
				this.#providers.set(provider, thisProvider);
				if (thisProvider.status.selected) {
					this.activeProvider = thisProvider;
				}
			}
		}
	}

	async getProvider(provider: BackupProvider): Promise<BackupProviderInstance> {
		return this.#providers.get(provider)!;
	}

	async switchProvider(provider: BackupProvider) {
		this.activeProvider = await this.getProvider(provider);
	}
}

export default BackupProviders.Instance;
