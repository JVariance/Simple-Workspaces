/* 
	Source: https://github.com/mdn/webextensions-examples/blob/main/google-userinfo/background/authorize.js
	License: MIT
	modified
*/

import type { BackupProviderCredentials } from "@root/background/Entities/Singletons/BackupProviders";

// import LZString from  "lz-string";
// gzip, zstd,, brotli
// import Cryptr from "cryptr";

// Secret string
// TODO: This pattern could be used to password-protect files as a new feature. For now it is just be using to compress and obfuscate the data.
// var secretKey = "GYYw7AHADAJsUFoBMFgEMEBYCMmCcCARgGwCsxCo2AzLDKdnmIUAAA==";

// var cryptr = new Cryptr(LZString.decompressFromBase64(secretKey));

/**
 * To help capture user-friendly error messaging
 */
export class StorageProviderError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export interface IBackupProvider {
	get type(): string;
	getCredentials(): {
		accessToken: string | null;
		refreshToken: string | null;
	};
	openAuthPage: () => void;
	isAuthed: () => boolean;
	authorize: (credentials: BackupProviderCredentials) => Promise<void>;
	deauthorize: () => Promise<void>;
	filesList: () => Promise<[]>;
	fileUpload: (data: any) => Promise<void>;
	fileDownload: (data: any) => Promise<void>;
	encryptData: (contents: any) => string;
	// return cryptr.encrypt(LZString.compressToBase64(JSON.stringify(contents)));
	decryptData: (contents: any) => string;
	// return JSON.parse(LZString.decompressFromBase64(cryptr.decrypt(contents)));
}
