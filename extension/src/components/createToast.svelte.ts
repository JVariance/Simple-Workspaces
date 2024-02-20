import { mount } from "svelte";
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
	const props = $state({
		state: "loading",
		errorMessage,
		successMessage,
		loadingMessage,
	});
	return mount(Toast, {
		target: document.getElementById("toaster") || document.body,
		props,
	});
}
