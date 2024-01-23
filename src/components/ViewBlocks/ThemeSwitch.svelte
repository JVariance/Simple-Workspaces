<script lang="ts">
	import {
		getThemeState,
		getForceDefaultThemeIfDarkModeState,
	} from "@pages/states.svelte";
	import { BrowserStorage } from "@root/background/Entities";

	let theme = $derived(getThemeState());
	let forceDefaultThemeIfDarkMode = $derived(
		getForceDefaultThemeIfDarkModeState()
	);

	function themeChanged(e) {
		BrowserStorage.setTheme(e.target.checked ? "browser" : "");
	}

	function forceDefaultThemeIfDarkModeChanged(e) {
		BrowserStorage.setForceDefaultThemeIfDarkMode(e.target.checked);
	}
</script>

<div class="flex gap-2 items-center">
	<label for="use-browser-theme">use browser theme</label>
	<input
		type="checkbox"
		id="use-browser-theme"
		checked={theme === "browser"}
		onchange={themeChanged}
	/>
</div>

<div class="flex gap-2 items-center">
	<label for="force-default-dark-theme"
		>force default dark theme in dark mode</label
	>
	<input
		type="checkbox"
		id="force-default-dark-theme"
		checked={forceDefaultThemeIfDarkMode}
		onchange={forceDefaultThemeIfDarkModeChanged}
	/>
</div>
