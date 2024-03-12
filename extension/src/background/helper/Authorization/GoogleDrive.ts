/* exported getAccessToken */

import Browser from "webextension-polyfill";
import StorageProvider from "./StorageProvider";
import { BrowserStorage } from "@root/background/Entities";

const REDIRECT_URL = import.meta.env.PROD
	? "https://simpleworkspaces.com/auth/googledrive"
	: "http://localhost:3000/auth/googledrive";
const CLIENT_ID =
	"758528028452-hlu883tbm6bu8oolrso5sripso72a5ig.apps.googleusercontent.com";
// drive.appdata, drive.file, drive.metadata, drive.readonly
const SCOPES = [
	"https://www.googleapis.com/auth/drive.appdata",
	"https://www.googleapis.com/auth/drive.file",
];

const AUTH_URL_PARAMS = {
	client_id: CLIENT_ID,
	response_type: "code",
	redirect_uri: encodeURIComponent(REDIRECT_URL),
	scope: encodeURIComponent(SCOPES.join(" ")),
	prompt: "consent",
	access_type: "offline",
};

const AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(
	AUTH_URL_PARAMS
)}`;

const VALIDATION_BASE_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FILES_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export default class GoogleDrive extends StorageProvider {
	#accessToken?: string;
	#refreshToken?: string;

	constructor() {
		super();
	}

	async init() {
		const {
			GoogleDriveCredentials: { access_token = null, refresh_token = null },
		} = await BrowserStorage.getGoogleDriveCredentials();
		if (access_token) this.#accessToken = access_token;
		if (refresh_token) this.#refreshToken = refresh_token;
	}

	getType(): string {
		return "Google Drive";
	}

	async openAuhPage() {
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

	setCredentials(
		credentials: { access_token?: string; refresh_token?: string } = {}
	) {
		const { access_token = null, refresh_token = null } = credentials;
		if (access_token) this.#accessToken = access_token;
		if (refresh_token) this.#refreshToken = refresh_token;
	}

	isAuthed(): boolean {
		return !!this.#accessToken;
	}

	async deauthorize() {
		this.#accessToken = undefined;
		this.#refreshToken = undefined;
	}

	/**
		Validate the token contained in redirectURL.
		This follows essentially the process here:
		https://developers.google.com/identity/protocols/OAuth2UserAgent#tokeninfo-validation
		- make a GET request to the validation URL, including the access token
		- if the response is 200, and contains an "aud" property, and that property
		matches the clientID, then the response is valid
		- otherwise it is not valid

		Note that the Google page talks about an "audience" property, but in fact
		it seems to be "aud".
	*/
	async validate(): Promise<string | unknown> {
		const validationURL = `${VALIDATION_BASE_URL}?access_token=${
			this.#accessToken
		}`;
		const validationRequest = new Request(validationURL, {
			method: "GET",
		});

		try {
			const response = await fetch(validationRequest);
			if (response.status != 200) {
				throw new Error("Token validation error");
			}

			const json = (await response.json()) as {
				aud: string;
				// iss: "accounts.google.com" | "https://accounts.google.com";
			};
			/*
				TODO: check for other criteria
				https://developers.google.com/identity/sign-in/web/backend-auth?hl=de#verify-the-integrity-of-the-id-token
			*/

			const allCriteriaMet = json.aud && json.aud === CLIENT_ID;
			// &&
			// json.iss &&
			// ["accounts.google.com", "https://accounts.google.com"].includes(
			// 	json.iss
			// )
			if (allCriteriaMet) {
				return;
			} else {
				throw new Error("Token validation error");
			}
		} catch (error) {
			return error.message;
		}
	}

	async getAccessToken(): Promise<{
		accessToken: string | null;
		error: Error | null;
	}> {
		try {
			await this.validate();
			return { accessToken: this.#accessToken ?? null, error: null };
		} catch (e) {
			return { accessToken: null, error: e as Error };
		}
	}

	async getOrCreateAppFolder() {
		const params = {
			includeItemsFromAllDrives: "true",
			supportsAllDrives: "true",
		};

		const response = await fetch(
			`${FILES_URL}?${new URLSearchParams(params)}`,
			{
				headers: {
					Authorization: `Bearer ${this.#accessToken}`,
				},
			}
		);

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
			const data = await response.json();
			return data;
		}
	}

	async filesList(): Promise<[]> {
		await this.getOrCreateAppFolder();

		const response = await fetch(FILES_URL, {
			headers: { Authorization: `Bearer ${this.#accessToken}` },
		});

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

		const metadata = {
			name: existingFile ? existingFile.name : data.name,
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

		await fetch(`${response.headers.get("location")}`, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${this.#accessToken}`,
				"Content-Length": `${file.size}`,
			},
			body: file,
		});
	}

	async fileDownload(data: {
		id: string;
		name: string;
		contents: any;
	}): Promise<{ contents: any }> {
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

		const _data = await response.blob();

		console.info("file downloaded", _data);

		//TODO: when encrypted, decrypt the data

		return { contents: JSON.parse(_data) };
	}
}
