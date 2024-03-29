/* exported getAccessToken */

import Browser from "webextension-polyfill";
import { StorageProviderError, type IBackupProvider } from "./IBackupProvider";
import type {
	BackupProviderCredentials,
	BackupProviderStatusProps,
} from "@root/background/Entities/Singletons/BackupProviders";

export class GoogleDriveError extends StorageProviderError {
	code?: number;

	constructor(
		message:
			| "invalid or expired access token"
			| "no refresh token"
			| (string & {}),
		code?: number
	) {
		super(message);
		code && (this.code = code);
	}

	static get #InvalidOrExpiredAccessToken() {
		return new this("invalid or expired access token", 401);
	}

	static get NoRefreshToken() {
		return new this("no refresh token");
	}

	static throwError(code: number) {
		switch (code) {
			case 401:
				throw GoogleDriveError.#InvalidOrExpiredAccessToken;
			default:
				throw new GoogleDriveError(code.toString(), code);
		}
	}
}

const AUTH_BASE_URL = import.meta.env.DEV
	? "http://localhost:5174"
	: "https://simple-workspaces-auth.vercel.app";

const REDIRECT_URL = `${AUTH_BASE_URL}/auth/googledrive`;

const CLIENT_ID =
	"758528028452-hlu883tbm6bu8oolrso5sripso72a5ig.apps.googleusercontent.com";
// drive.appdata, drive.file, drive.metadata, drive.readonly
const SCOPES = [
	"https://www.googleapis.com/auth/drive.appdata",
	"https://www.googleapis.com/auth/drive.file",
];

const AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
	REDIRECT_URL
)}&scope=${encodeURIComponent(
	SCOPES.join(" ")
)}&prompt=consent&access_type=offline`;

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FILES_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

const REFRESH_TOKEN_URL = `${AUTH_BASE_URL}/auth/googledrive/refreshtoken`;

export default class GoogleDrive implements IBackupProvider {
	#accessToken?: string;
	#refreshToken?: string;
	#authorized: boolean = false;
	#selected: boolean = true;
	#lastBackupTimeStamp: number = 0;

	constructor() {}

	async init() {
		const {
			GoogleDriveCredentials: {
				access_token = null,
				refresh_token = null,
			} = {},
		} = await this.getLocalCredentials();
		if (access_token) this.#accessToken = access_token;
		if (refresh_token) this.#refreshToken = refresh_token;

		const {
			GoogleDriveStatus: {
				selected = true,
				lastBackupTimeStamp = 0,
				authorized = false,
			} = {},
		} = await this.getLocalStatus();

		this.#authorized = authorized;
		this.#selected = selected;
		this.#lastBackupTimeStamp = lastBackupTimeStamp;

		const code = `window.addEventListener('tokens', async function(event){
				await browser.runtime.sendMessage({msg: 'authTokens', tokens: event.detail.tokens, provider: 'Google Drive'});
				setTimeout(() => { window.close(); }, 3000);
			})`;

		await Browser.contentScripts.register({
			matches: [
				"https://simple-workspaces-auth.vercel.app/auth/googledrive/*",
				"https://simple-workspaces-auth.vercel.app/auth/googledrive?*",
				"http://localhost/*",
			],
			js: [{ code }],
			runAt: "document_start",
		});
	}

	getLocalCredentials(): Promise<
		Record<"GoogleDriveCredentials", BackupProviderCredentials>
	> {
		return Browser.storage.local.get("GoogleDriveCredentials");
	}

	setLocalCredentials(credentials: BackupProviderCredentials): Promise<void> {
		const GoogleDriveCredentials = {
			access_token: this.#accessToken,
			refresh_token: this.#refreshToken,
			...credentials,
		};
		return Browser.storage.local.set({ GoogleDriveCredentials });
	}

	getLocalStatus(): Promise<
		Record<"GoogleDriveStatus", BackupProviderStatusProps>
	> {
		return Browser.storage.local.get("GoogleDriveStatus");
	}

	setLocalStatus(status: BackupProviderStatusProps): Promise<void> {
		return Browser.storage.local.set({
			GoogleDriveStatus: status,
		});
	}

	get status(): BackupProviderStatusProps {
		return {
			selected: this.#selected,
			lastBackupTimeStamp: this.#lastBackupTimeStamp,
			authorized: this.#authorized,
		};
	}

	set status(props: Partial<BackupProviderStatusProps>) {
		for (let [key, val] of Object.entries(props)) {
			//@ts-ignore
			this[key] = val;
		}

		this.setLocalStatus(this.status);
	}

	get name(): "Google Drive" {
		return "Google Drive";
	}

	async openAuthPage() {
		console.info({ REDIRECT_URL, AUTH_URL });
		Browser.windows.create({
			url: AUTH_URL,
			type: "popup",
			allowScriptsToClose: true,
		});
	}

	getCredentials() {
		return {
			accessToken: this.#accessToken || null,
			refreshToken: this.#refreshToken! || null,
		};
	}

	async authorize(credentials: BackupProviderCredentials = {}) {
		const { access_token = undefined, refresh_token = undefined } = credentials;
		if (access_token) this.#accessToken = access_token;
		if (refresh_token) this.#refreshToken = refresh_token;

		await this.setLocalCredentials({
			access_token,
			refresh_token,
		});

		if (import.meta.env.DEV) {
			console.log({ refresh_token });
		}

		this.#authorized = true;
		await this.setLocalStatus({
			selected: this.#selected,
			lastBackupTimeStamp: 0,
			authorized: true,
		});
	}

	get authorized(): boolean {
		return this.#authorized;
	}

	async deauthorize() {
		this.#accessToken = undefined;
		this.#refreshToken = undefined;

		this.#authorized = false;
		await this.setLocalStatus({
			selected: this.#selected,
			lastBackupTimeStamp: 0,
			authorized: false,
		});
		await this.setLocalCredentials({
			access_token: undefined,
			refresh_token: undefined,
		});
	}

	async getOrCreateAppFolder() {
		const params = {
			includeItemsFromAllDrives: "true",
			supportsAllDrives: "true",
		};

		try {
			const response = await fetch(
				`${FILES_URL}?${new URLSearchParams(params)}`,
				{
					headers: {
						Authorization: `Bearer ${this.#accessToken}`,
					},
				}
			);

			if (!response.ok) {
				GoogleDriveError.throwError(response.status);
			}

			const data = await response.json();
			const fullFileList = data.files;

			let appFolder = fullFileList.find(
				(file) =>
					file.mimeType === "application/vnd.google-apps.folder" &&
					file.name === "simpleworkspaces"
			);

			if (appFolder) {
				return appFolder;
			} else {
				const response = await fetch(FILES_URL, {
					method: "POST",
					headers: { Authorization: `Bearer ${this.#accessToken}` },
					body: JSON.stringify({
						name: "simpleworkspaces",
						mimeType: "application/vnd.google-apps.folder",
					}),
				});

				if (!response.ok) {
					GoogleDriveError.throwError(response.status);
				}

				const data = await response.json();
				return data;
			}
		} catch (error) {
			throw error;
		}
	}

	async refreshAccessToken() {
		console.info("GoogleDrive - refreshAccessToken");
		// console.info(this.#refreshToken);

		if (!this.#refreshToken) {
			throw GoogleDriveError.NoRefreshToken;
		}

		const params = {
			refresh_token: this.#refreshToken,
		};

		try {
			const response = await fetch(
				`${REFRESH_TOKEN_URL}?${new URLSearchParams(params)}`,
				{
					method: "GET",
				}
			);

			console.info({ response });

			if (response.ok) {
				console.info("response was ok");
				// console.info(await response.text());
				const data = await response.json();
				console.info({ data });
				const { access_token } = data;

				console.info("refreshed access_token", access_token, data);

				this.#accessToken = access_token;
				this.setLocalCredentials({ access_token: access_token });
			} else {
				await this.deauthorize();
				GoogleDriveError.throwError(response.status);
			}
		} catch (error) {
			throw error;
		}
	}

	async filesList(): Promise<{ id: string; name: string }[]> {
		await this.getOrCreateAppFolder();

		const response = await fetch(FILES_URL, {
			headers: { Authorization: `Bearer ${this.#accessToken}` },
		});

		if (!response.ok) {
			GoogleDriveError.throwError(response.status);
		}

		const data = await response.json();

		const filesFound = data.files.filter(
			(file) => file.mimeType !== "application/vnd.google-apps.folder"
		);

		return filesFound.map((file) => ({
			id: file.id,
			name: file.name.replace(/\.(.*?)$/g, ""),
		}));
	}

	async fileUpload(data: {
		id: string;
		name: string;
		contents: any;
	}): Promise<void> {
		let file = null;
		let appFolder = null;

		appFolder = await this.getOrCreateAppFolder();
		const filesList = await this.filesList();
		let existingFile = null;

		if (!data.id && !data.name) {
			throw new Error("Error, profile id and file name are required");
		} else {
			existingFile = filesList.find(
				(file) => file.id === data.id || `${file.name}.json` === data.name
			);
		}

		//TODO: encrypt Data

		const method = existingFile ? "PATCH" : "POST";
		const url = existingFile
			? `${FILES_UPLOAD_URL}/${existingFile.id}`
			: FILES_UPLOAD_URL;

		const params = { uploadType: "resumable" };

		// Regex with lookbehind (keeps solo .json): /(?<=.)\.json$/
		const name = `${(existingFile ? existingFile.name : data.name).replace(
			/\.json$/,
			""
		)}.json`;

		const metadata = {
			name,
			mimeType: "application/json",
			...(!existingFile && { parents: [appFolder.id] }),
		};

		file = new Blob([JSON.stringify(data.contents, null, 2)], {
			type: "application/json",
		});

		// initiate upload
		const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
			method,
			headers: {
				Authorization: `Bearer ${this.#accessToken}`,
				"Content-Type": "application/json; charset=UTF-8",
				"X-Upload-Content-Length": `${file.size}`,
				"X-Upload-Content-Type": "application/json",
			},
			body: JSON.stringify(metadata),
		});

		if (!response.ok) {
			GoogleDriveError.throwError(response.status);
		}

		const response2 = await fetch(`${response.headers.get("location")}`, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${this.#accessToken}`,
				"Content-Length": `${file.size}`,
			},
			body: file,
		});

		if (!response2.ok) {
			GoogleDriveError.throwError(response2.status);
		}
	}

	async fileDownload(data: {
		id: string;
		name: string;
	}): Promise<{ contents: unknown }> {
		//TODO: check validation

		const files = await this.filesList();
		let existingFile = files.find((file) => file.id === data.id);

		const params = {
			alt: "media",
		};

		// initiate download
		const response = await fetch(
			`${FILES_URL}/${existingFile.id}?${new URLSearchParams(params)}`,
			{
				headers: { Authorization: `Bearer ${this.#accessToken}` },
			}
		);

		if (!response.ok) {
			GoogleDriveError.throwError(response.status);
		}

		// const _data = await response.blob();
		const _data = await response.json();

		console.info("file downloaded", _data);

		//TODO: when encrypted, decrypt the data

		return { contents: _data };
	}
}
