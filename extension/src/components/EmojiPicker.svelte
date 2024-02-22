<svelte:options accessors={true} />

<script lang="ts">
	import { clickOutside } from "@root/utils";
	import "emoji-picker-element";
	import type { Picker } from "emoji-picker-element";
	import { onMount } from "svelte";
	import Browser from "webextension-polyfill";

	import de from "emoji-picker-element/i18n/de";
	import en from "emoji-picker-element/i18n/en";

	const locales = { de, en };
	let activeOriginElement: HTMLElement | null;

	type Props = {
		x: number;
		y: number;
		picked: Function;
		remove?: Function;
	};

	let emojiPicker: Picker;
	let picker: HTMLDivElement;
	let searchInput: HTMLInputElement;

	let { x = 0, y = 0, picked, remove = () => {} } = $props<Props>();

	function outsideClick(e: CustomEvent) {
		const { target: originalTarget } = e.detail;
		const closestPicker = originalTarget.closest(".picker");
		const clickedInsidePicker = closestPicker || originalTarget === emojiPicker;

		if (!clickedInsidePicker) {
			console.info("remove picker");
			remove();
		}
	}

	$effect(() => {
		searchInput?.focus();
		setTimeout(() => {
			emojiPicker.addEventListener("outsideclick", outsideClick);
		}, 50);
	});

	function emojiClick({ detail: { unicode } }) {
		picked({ unicode });
		remove();
	}

	onMount(() => {
		activeOriginElement = document.activeElement as HTMLElement;
		let lang: keyof typeof locales = "en";
		switch (Browser.i18n.getUILanguage()) {
			case "de-DE":
			case "de":
				lang = "de";
				break;
			default:
				break;
		}

		emojiPicker.i18n = locales[lang];
		emojiPicker.locale = lang;
		emojiPicker.dataSource = `https://cdn.jsdelivr.net/npm/emoji-picker-element-data@%5E1/${lang}/cldr/data.json`;

		picker = emojiPicker.shadowRoot.children[1];
		searchInput = picker.querySelector("#search");

		console.info("onMount", { searchInput, remove });

		searchInput.focus();
	});

	$effect(() => {
		return () => {
			console.info("onDestroy");
			activeOriginElement?.focus();
		};
	});
</script>

<emoji-picker
	class="absolute"
	emoji-version="15.1"
	use:clickOutside
	on:emoji-click={emojiClick}
	bind:this={emojiPicker}
	style:top="{y}px"
	style:left="{x}px"
	style:--emoji-font-family="Noto Color Emoji"
/>

<style lang="postcss">
	:global(emoji-picker) {
		@apply absolute hidden;
	}

	:global(emoji-picker) {
		@apply flex;
	}
</style>
