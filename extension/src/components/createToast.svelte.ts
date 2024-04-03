import { mount } from "svelte";
import Toast from "./Toast.svelte";

export function createToast({
	loadingMessage = "",
	successMessage = "",
	errorMessage = "",
	state = "loading",
}: {
	loadingMessage?: string;
	successMessage?: string;
	errorMessage?: string;
	state?: "rest" | "success" | "error" | "loading";
}) {
	const props = $state({
		state,
		errorMessage,
		successMessage,
		loadingMessage,
	});
	return mount(Toast, {
		target: document.getElementById("toaster") || document.body,
		props,
	});
}
