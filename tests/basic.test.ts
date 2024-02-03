import { expect, test } from "vitest";
import { ADDON_UUID, browser } from "./setup";
import { Page } from "puppeteer";

// toMatchObject, toHaveProperty

/*
	Windows: 1
		Window 1
			Workspaces: 1
				Workspace 1 (active)
					Tabs: 1
						Tab 1 (active)
*/

async function createAndGetSidebarPage() {
	const page = await browser.newPage();
	await page.goto(
		`moz-extension://${ADDON_UUID}/src/pages/Sidebar/sidebar.html`,
		{ waitUntil: "networkidle0" }
	);
	await page.bringToFront();

	return page;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createNewWorkspace(page: Page) {
	await page.keyboard.down("Control");
	await page.keyboard.down("Alt");
	await page.keyboard.down("D");
}

test.skip(
	"workspaces loaded on sidebar opening",
	async () => {
		const page = await createAndGetSidebarPage();
		await page.waitForSelector("ul");
		const list = await page.$("ul");
		const children = await list.$$("li");

		expect(children.length).toBe(1);
	},
	{ timeout: 30000 }
);

//#region 1
test(
	"bidi - if workspace creation leads to workspaces.length of two",
	async () => {
		const page = await createAndGetSidebarPage();
		await page.waitForSelector("ul");
		const list = await page.$("ul");

		// await createNewWorkspace(page);
		const page2 = await browser.newPage();
		await page2.goto("https://qwant.com", { waitUntil: "networkidle0" });
		await page2.bringToFront();
		await page2.keyboard.down("Alt");
		await page2.keyboard.down("Shift");
		await page2.keyboard.down("5");
		await page2.keyboard.up("5");
		await page2.keyboard.up("Alt");
		await page2.keyboard.up("Shift");
		// await page2.keyboard.type("welcome");
		await sleep(3000);
		const children = await list.$$("li");

		expect(children.length).toBe(2);
		// expect(1).toBe(1);
	},
	{ timeout: 30000 }
);

test.skip(
	"no bidi - if workspace creation leads to workspaces.length of two",
	async () => {
		// const page = await createAndGetSidebarPage();
		// await page.waitForSelector("ul");
		// const list = await page.$("ul");

		// await createNewWorkspace(page);
		const page2 = await browser.newPage();
		await page2.goto("https://qwant.com", { waitUntil: "domcontentloaded" });
		await page2.bringToFront();
		await page2.keyboard.down("Alt");
		await page2.keyboard.down("Shift");
		await page2.keyboard.down("5");
		await page2.keyboard.up("5");
		await page2.keyboard.up("Alt");
		await page2.keyboard.up("Shift");
		// await page2.keyboard.type("welcome");
		await sleep(3000);
		// const children = await list.$$("li");

		// expect(children.length).toBe(2);
		// expect(1).toBe(1);
	},
	{ timeout: 30000 }
);
//#endregion

test.skip(
	"simple tab search",
	async () => {
		const page = await createAndGetSidebarPage();
		const list = await page.$("ul");
		const searchInput = await page.$('input[type="search"]');
		await searchInput?.focus();
		await page.keyboard.type("welcome");
		await sleep(1000);
		await list!.waitForSelector("details");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("ArrowDown");
		await sleep(1000);
		const focusedElementHandle = await page.evaluateHandle(
			() => document.activeElement
		);
		const focusedElement = await focusedElementHandle.jsonValue();
		expect(focusedElement?.tagName).toEqual("BUTTON");
	},
	{ timeout: 30000 }
);

// test("commands", async () => {
// 	const page = await browser.newPage();
// 	await page.goto("https://qwant.com");
// 	await page.bringToFront();

// 	await page.keyboard.down("Control");
// 	await page.keyboard.down("Alt");
// 	await page.keyboard.down("D");

// 	await sleep(1000);
// 	await page.keyboard.down("Y");
// 	await sleep(1000);
// 	await page.keyboard.down("X");
// 	await sleep(1000);
// 	await page.keyboard.down("D");

// 	await sleep(1000);
// });
