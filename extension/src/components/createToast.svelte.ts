import { mount } from "svelte";
import Toast from "./Toast.svelte";

export function createToast(
	props: {
		loadingMessage?: string;
		successMessage?: string;
		errorMessage?: string;
		state?: "rest" | "success" | "error" | "loading";
		duration?: number;
	} = {}
) {
	const {
		loadingMessage = "",
		successMessage = "",
		errorMessage = "",
		state = "loading",
		duration = 4000,
	} = props;

	const _props = $state({
		state,
		errorMessage,
		successMessage,
		loadingMessage,
		duration,
	});

	return mount(Toast, {
		target: document.getElementById("toaster") || document.body,
		props: _props,
	});
}
