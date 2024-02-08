import * as API from "@root/browserAPI";

export function pinTabs(tabIds: number[]) {
	return API.updateTabs(
		tabIds.map((tabId) => ({
			id: tabId,
			props: {
				pinned: true,
			},
		}))
	);
}

export function unpinTabs(tabIds: number[]) {
	return API.updateTabs(
		tabIds.map((tabId) => ({
			id: tabId,
			props: {
				pinned: false,
			},
		}))
	);
}
