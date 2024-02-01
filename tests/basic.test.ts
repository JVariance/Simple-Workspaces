import { expect, test } from "vitest";
import { ADDON_UUID, browser } from "./setup";

// toMatchObject, toHaveProperty

/*
	Windows: 1
		Window 1
			Workspaces: 1
				Workspace 1 (active)
					Tabs: 1
						Tab 1 (active)
*/

test(
	"test",
	async () => {
		const page = await browser.newPage();
		await page.goto("https://qwant.com");
		// await page.goto(
		// 	`moz-extension://${ADDON_UUID}/src/pages/Sidebar/sidebar.html`
		// );
		await page.bringToFront();

		// const list = await page.$("ul");
		// const children = await list.$$("li");

		await page.keyboard.down("Control");
		await page.keyboard.down("Alt");
		await page.keyboard.down("D");

		await new Promise((resolve) => setTimeout(resolve, 1000));
		await page.keyboard.down("Y");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await page.keyboard.down("X");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await page.keyboard.down("D");

		await new Promise((resolve) => setTimeout(resolve, 10000));

		// expect(children.length).toBe(1);

		// await page.goto("https://qwant.com");
		// await page.bringToFront();
		// const docsLink = await page.$('input[type="search"]');

		// await docsLink?.focus();
		// await docsLink?.type("test");
		// await docsLink?.press("Enter");
		// expect(docsLink).toBeDefined();
		// await (() => new Promise((resolve) => setTimeout(resolve, 10000)))();
		// expect(1).toBe(1);
	},
	{ timeout: 30000 }
);
