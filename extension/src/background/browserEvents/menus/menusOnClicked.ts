import Browser from "webextension-polyfill";
import { Processes, WorkspaceStorage } from "../../Entities";
import { informViews } from "../../informViews";
import * as API from "@root/browserAPI";

async function syncCookie(
	removed: boolean,
	cookie: Browser.Cookies.Cookie & { strippedDomain: string },
	targetContainerStoreId: string
) {
	console.log("syncing", cookie.domain, { removed, cookie });
	if (removed) {
		console.log(`removing cookie ${cookie.name} from store ${cookie.storeId}`);
		Browser.cookies.remove({
			url: `https://${cookie.domain}${cookie.path}`,
			name: cookie.name,
		});
	} else {
		console.log(
			`copying cookie ${cookie.name} to store ${targetContainerStoreId}`
		);

		await Browser.cookies.set({
			url: `https://${cookie.strippedDomain}${cookie.path}`,
			domain: cookie.domain,
			expirationDate: cookie.expirationDate,
			firstPartyDomain: cookie.firstPartyDomain,
			httpOnly: cookie.httpOnly,
			name: cookie.name,
			partitionKey: cookie.partitionKey,
			path: cookie.path,
			sameSite: cookie.sameSite,
			secure: cookie.secure,
			value: cookie.value,
			storeId: targetContainerStoreId,
		});
	}
}

export async function menusOnClicked(
	info: Browser.Menus.OnClickData,
	tab: Browser.Tabs.Tab | undefined
) {
	const { menuItemId: _menuItemId } = info;
	const menuItemId = _menuItemId.toString();

	const newWorkspaceDemanded =
		menuItemId.toString() === "create-workspace-menu";

	if (menuItemId.toString().startsWith("workspace") || newWorkspaceDemanded) {
		let targetWorkspaceUUID!: string;

		const highlightedTabIds = (
			await API.queryTabs({
				windowId: tab!.windowId!,
				highlighted: true,
			})
		).tabs?.map((tab) => tab.id!);

		let newWorkspace;
		const tabIds =
			highlightedTabIds && highlightedTabIds.length > 1
				? highlightedTabIds
				: [tab!.id!];

		if (menuItemId.toString().startsWith("workspace-menu")) {
			targetWorkspaceUUID = menuItemId.split("_").at(1)!;
		} else if (newWorkspaceDemanded) {
			newWorkspace = await WorkspaceStorage.activeWindow.addWorkspace([]);
			newWorkspace.active = false;
			targetWorkspaceUUID = newWorkspace.UUID;
		}

		if (!tab?.windowId) return;

		tabIds &&
			(await WorkspaceStorage.getWindow(tab!.windowId!).moveTabs({
				tabIds,
				targetWorkspaceUUID,
			}));

		if (newWorkspaceDemanded) {
			informViews(tab.windowId, "movedTabsToNewWorkspace", {
				workspace: newWorkspace,
				tabIds,
			});
		} else {
			informViews(tab.windowId!, "movedTabs", { targetWorkspaceUUID, tabIds });
		}

		if (
			targetWorkspaceUUID === WorkspaceStorage.activeWindow.activeWorkspace.UUID
		) {
			informViews(tab.windowId!, "updatedActiveWorkspace", {
				UUID: targetWorkspaceUUID,
			});
		}
	} else if (menuItemId.toString().startsWith("container")) {
		const sourceContainerName = menuItemId.split("_")[1];
		const currentTab = (
			await API.queryTabs({ active: true, currentWindow: true })
		).tabs?.at(0);

		if (!currentTab) return;
		const domain = new URL(currentTab.url!).hostname.replace("www", "");
		const currentContainer = await Browser.contextualIdentities.get(
			currentTab.cookieStoreId!
		);
		const sourceContainer =
			sourceContainerName === "firefox-default"
				? (
						await Browser.contextualIdentities.query({
							name: sourceContainerName,
						})
				  )?.at(0)
				: null;
		const sourceContainerStoreId =
			sourceContainerName === "firefox-default"
				? "firefox-default"
				: sourceContainer?.cookieStoreId;

		console.info({
			sourceContainerStoreId,
			sourceContainerName,
			menuItemId,
			domain,
		});

		try {
			const cookies = await Browser.cookies.getAll({
				domain: domain.startsWith(".") ? domain : `.${domain}`,
				storeId: sourceContainerStoreId,
			});

			console.info({ cookies });

			for (let cookie of cookies) {
				console.info({ cookie });
				// if (cookie.storeId !== "firefox-default") return;
				const { domain } = cookie;
				const strippedDomain = domain.startsWith(".")
					? domain.substring(1)
					: domain;
				console.info({ strippedDomain });
				// domains.includes(strippedDomain) && syncCookie(false, { ...cookie, strippedDomain, });
				await syncCookie(
					false,
					{ ...cookie, strippedDomain },
					currentContainer.cookieStoreId
				);
			}

			// if (!cookies.length) {
			Processes.manualTabAddition = true;
			Browser.runtime.onMessage.addListener(onMessage);
			const tab = await Browser.tabs.create({
				url: `https://${domain}`,
				active: false,
				cookieStoreId: sourceContainer?.cookieStoreId,
			});
			Processes.manualTabAddition = false;
			await Browser.tabs.hide(tab.id!);

			const removalTimer = setTimeout(clearThings, 2000);

			Browser.tabs.onUpdated.addListener(async function (
				tabId,
				changeInfo,
				_tab
			) {
				if (_tab.status == "complete") {
					console.info("tab is completely loaded");
					await Browser.tabs.executeScript(tab.id!, {
						runAt: "document_start",
						code: `
									const localStorageEntries = Object.entries(localStorage);
									browser.runtime.sendMessage({ msg: "localStorageEntries", localStorageEntries, domain: window.location.hostname.replace("www", "")});
							`,
					});
				}
			});

			async function clearThings() {
				Browser.runtime.onMessage.removeListener(onMessage);
				Browser.tabs.remove(tab.id!);
				currentTab && (await Browser.tabs.reload(currentTab.id!));
			}

			async function onMessage(message: any) {
				const { msg } = message;
				console.info({ msg });
				if (msg === "localStorageEntries") {
					clearTimeout(removalTimer);
					const { localStorageEntries, domain: pageDomain } = message;
					console.info({ localStorageEntries, pageDomain, domain });
					if (pageDomain !== domain) return;

					const activeTab = (
						await API.queryTabs({
							active: true,
							currentWindow: true,
						})
					).tabs?.at(0);

					if (activeTab) {
						// const localStorageObject =
						// 	Object.fromEntries(localStorageEntries);

						await Browser.scripting.executeScript({
							target: { tabId: activeTab.id! },
							func: (localStorageEntries: [string, any][]) => {
								console.info({ localStorageEntries });
								localStorageEntries.forEach(([key, value]) => {
									localStorage.setItem(key, value);
								});
							},
							args: [localStorageEntries],
						});
					}

					clearThings();
				}
			}
			// }
			// setTimeout(async () => {
			// 	await Browser.tabs.reload(currentTab.id!);
			// }, 3000);
			// await Promise.all(cookies.map(cookie => syncCookie(false, cookie)));
		} catch (err) {
			console.error(err);
		}
	}
}
