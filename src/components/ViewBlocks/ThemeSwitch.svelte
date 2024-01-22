<script lang="ts">
	import { getThemeState } from "@pages/states.svelte";
	import { BrowserStorage } from "@root/background/Entities";

	let theme = $derived(getThemeState());

	function themeChanged(e) {
		BrowserStorage.setTheme(e.target.checked ? "browser" : "");
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
