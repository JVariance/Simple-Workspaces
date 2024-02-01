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

test("test", async () => {
	console.info("HALLooooo???");

	// const debuggingPage = await browser.newPage();
	// // await page.goto(Browser.runtime.getURL("src/pages/Sidebar/sidebar.html"));

	// await debuggingPage.goto("about:debugging");

	// // console.info({ debuggingPage });

	// const sidebarURL = await debuggingPage
	// 	.$(':has(> [title="Simple Workspaces"]) a')
	// 	.replace("manifest.json", "src/pages/Sidebar/sidebar.html");

	// console.info({ sidebarURL });

	// const page = await browser.newPage();
	// // await page.goto(sidebarURL);
	// await page.goto(sidebarURL);

	const page = await browser.newPage();
	await page.goto(
		`moz-extension://${ADDON_UUID}/src/pages/Sidebar/sidebar.html`
	);

	const list = await page.$("ul");
	const children = await list.$$("li");
	expect(children.length).toBe(0);
});
