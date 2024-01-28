<script lang="ts">
	import {
		getThemeState,
		getForceDefaultThemeIfDarkModeState,
	} from "@pages/states.svelte";
	import { BrowserStorage } from "@root/background/Entities";
	import { i18n } from "webextension-polyfill";
	import Tooltip from "../Tooltip.svelte";

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

<div class="flex flex-wrap gap-2">
	<div class="flex gap-4 items-center w-full">
		<input
		type="checkbox"
		id="use-browser-theme"
		checked={theme === "browser"}
		onchange={themeChanged}
		/>
		<label for="use-browser-theme">{i18n.getMessage("use_browser_theme")}</label>
	</div>
	<div class="flex gap-4 items-center w-full">
		<input
			type="checkbox"
			id="force-default-dark-theme"
			checked={forceDefaultThemeIfDarkMode}
			onchange={forceDefaultThemeIfDarkModeChanged}
		/>
		<Tooltip id="options-force_dark_theme" class="[&>svg]:w-4 [&>svg]:h-4" popupClasses="absolute top-0 right-0 w-[200px]">
			<label for="force-default-dark-theme" class="flex gap-1 flex-wrap relative">
				{i18n.getMessage("force_default_dark_theme_in_dark_mode")}
			</label>
			{#snippet message()}
				{i18n.getMessage('force_default_dark_theme_in_dark_mode_tooltip')}.
			{/snippet}
		</Tooltip>
	</div>
</div>
