import { beforeAll, vi } from "vitest";
import type Browser from "../extension/node_modules/webextension-polyfill";
import type { Browser as PBrowser } from "puppeteer";
import { afterEach, beforeEach } from "vitest";
import { firefox } from "playwright-firefox";
import puppeteer from "puppeteer";
import path from "path";
// import { connect } from "web-ext/lib/firefox/remote.js";
import { connect } from "./node_modules/web-ext/lib/firefox/remote.js";
import getPort from "get-port";
import fs from "node:fs";

export let browser: PBrowser;

// https://github.com/mozilla/web-ext/issues/1927#issuecomment-1397225305
export const ADDON_UUID = "eb7c9a05-56f8-47bf-9c14-2c7da7529a02";
const ADDON_ID = JSON.parse(
	fs.readFileSync(path.join("../extension/dist", "manifest.json"))
).browser_specific_settings.gecko.id;

beforeEach(async () => {
	const rppPort = await getPort();
	browser = await puppeteer.launch({
		headless: false,
		product: "firefox",
		protocol: "webDriverBiDi",
		args: [`--start-debugger-server=${rppPort}`],
		extraPrefsFirefox: {
			"devtools.chrome.enabled": true,
			"devtools.debugger.prompt-connection": false,
			"devtools.debugger.remote-enabled": true,
			"toolkit.telemetry.reportingpolicy.firstRun": false,
			// "extensions.webextension.restrictedAPIs.enabled": true,
			// "extensions.webextension.experimentalAPIs": true,
			"extensions.webextensions.uuids": `{"${ADDON_ID}": "${ADDON_UUID}"}`,
			// "remote.log.level": "Trace",
		},
		executablePath: firefox.executablePath(),
		// dumpio: true,
	});

	const rdp = await connect(rppPort);
	await rdp.installTemporaryAddon(path.resolve("../extension/dist"));
});

afterEach(async () => {
	await browser.close();
	browser = undefined;
});

type MockTab = Pick<
	Browser.Tabs.Tab,
	| "id"
	| "active"
	| "favIconUrl"
	| "cookieStoreId"
	| "pinned"
	| "sessionId"
	| "title"
	| "url"
	| "windowId"
>;

type MockWindow = Omit<
	Browser.Windows.Window,
	"alwaysOnTop" | "incognito" | "width" | "height" | "left" | "top" | "tabs"
> & { tabs: MockTab[] };

const blankTab = {
	id: 0,
	active: true,
	pinned: false,
	url: "about:blank",
	title: "New Tab",
	windowId: 0,
} as MockTab;

const emptyWindow: MockWindow = {
	id: 0,
	focused: true,
	tabs: [blankTab],
	title: "Mock1",
	state: "normal",
	type: "normal",
	sessionId: undefined,
};

beforeAll(() => {
	const browserMock = {
		tabs: {
			query: vi.fn(
				(_queryInfo) =>
					new Promise((resolve) => {
						resolve([blankTab]);
					})
			),
			create: vi.fn(() => {}),
		},
		windows: {
			get: vi.fn((windowId: number, getInfo?: { popuplate?: boolean }) => [
				emptyWindow,
			]),
			getAll: vi.fn(() => [emptyWindow]),
			getCurrent: vi.fn(() => emptyWindow),
			getLastFocused: vi.fn(() => emptyWindow),
		},
	};

	vi.stubGlobal("browser", browserMock);
});
