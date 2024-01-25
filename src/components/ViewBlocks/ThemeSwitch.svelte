<script lang="ts">
	import {
		getThemeState,
		getForceDefaultThemeIfDarkModeState,
	} from "@pages/states.svelte";
	import { BrowserStorage } from "@root/background/Entities";
	import { i18n } from "webextension-polyfill";

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
	<label for="use-browser-theme">{i18n.getMessage("use_browser_theme")}</label>
	<input
		type="checkbox"
		id="use-browser-theme"
		checked={theme === "browser"}
		onchange={themeChanged}
	/>
</div>

<div class="flex gap-2 items-center">
	<label for="force-default-dark-theme"
		>{i18n.getMessage("force_default_dark_theme_in_dark_mode")}</label
	>
	<input
		type="checkbox"
		id="force-default-dark-theme"
		checked={forceDefaultThemeIfDarkMode}
		onchange={forceDefaultThemeIfDarkModeChanged}
	/>
</div>
