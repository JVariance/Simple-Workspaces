import { createRoot } from "svelte";
import Toast from "./Toast.svelte";

export function createToast({
	loadingMessage,
	successMessage,
	errorMessage,
}: {
	loadingMessage: string;
	successMessage: string;
	errorMessage: string;
}) {
	return createRoot(Toast, {
		target: document.getElementById("toaster") || document.body,
		props: {
			state: "loading",
			errorMessage,
			successMessage,
			loadingMessage,
		},
	});
}
