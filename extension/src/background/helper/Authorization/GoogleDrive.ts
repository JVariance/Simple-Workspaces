/* exported getAccessToken */

import Browser from "webextension-polyfill";
import StorageProvider from "./StorageProvider";

const REDIRECT_URL = Browser.identity.getRedirectURL();
const CLIENT_ID =
	"758528028452-hlu883tbm6bu8oolrso5sripso72a5ig.apps.googleusercontent.com";
// drive.appdata, drive.file, drive.metadata, drive.readonly
const SCOPES = [
	"https://www.googleapis.com/auth/drive.appdata",
	"https://www.googleapis.com/auth/drive.file",
];
const AUTH_URL = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
	REDIRECT_URL
)}&scope=${encodeURIComponent(SCOPES.join(" "))}`;
const VALIDATION_BASE_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FILES_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export default class GoogleDrive extends StorageProvider {
	#accessToken?: string;
	#refreshToken?: string;

	constructor() {
		super();
	}

	getType(): string {
		return "google-drive";
	}

	getCredentials() {
		return this.#accessToken
			? { accessToken: this.#accessToken, refreshToken: this.#refreshToken! }
			: null;
	}

	isAuthed(): boolean {
		return this.#accessToken ? true : false;
	}

	/**
		Authenticate and authorize using browser.identity.launchWebAuthFlow().
		If successful, this resolves with a redirectURL string that contains
		an access token.
	*/
	authorize(): Promise<string> {
		console.info("authorize", AUTH_URL);
		return Browser.identity.launchWebAuthFlow({
			interactive: true,
			url: AUTH_URL,
		});
	}

	async deauthorize() {
		//TODO: check validation
		this.#accessToken = undefined;
		this.#refreshToken = undefined;
	}

	extractAccessToken(redirectUri: string) {
		let m = redirectUri.match(/[#?](.*)/);
		if (!m || m.length < 1) return null;
		let params = new URLSearchParams(m[1].split("#")[0]);
		return params.get("access_token");
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
	async validate(redirectURL: string): Promise<string | unknown> {
		const accessToken = this.extractAccessToken(redirectURL);
		if (!accessToken) {
			throw "Authorization failure";
		}
		const validationURL = `${VALIDATION_BASE_URL}?access_token=${accessToken}`;
		const validationRequest = new Request(validationURL, {
			method: "GET",
		});

		let self = this;
		function checkResponse(response) {
			return new Promise((resolve, reject) => {
				if (response.status != 200) {
					reject("Token validation error");
				}
				response.json().then((json: { aud: string }) => {
					if (json.aud && json.aud === CLIENT_ID) {
						self.#accessToken = accessToken ? accessToken : undefined;
						resolve(accessToken);
					} else {
						reject("Token validation error");
					}
				});
			});
		}

		return fetch(validationRequest).then(checkResponse);
	}

	async getAccessToken(): Promise<{
		accessToken: string | null;
		error: Error | null;
	}> {
		try {
			const redirectURL = await this.authorize();
			const validationString = await this.validate(redirectURL);
			return { accessToken: this.#accessToken ?? null, error: null };
		} catch (e) {
			return { accessToken: null, error: e as Error };
		}
	}

	async getOrCreateAppFolder() {
		//TODO: check validation

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
		//TODO: check validation
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
		//TODO: check validation

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
