<script lang="ts">
	import { clickOutside } from "@root/utils";
	import "emoji-picker-element";
	import type { Picker } from "emoji-picker-element";
	import { onDestroy, onMount, untrack } from "svelte";

	type Props = {
		x: number;
		y: number;
		visible: boolean;
		remove: Function;
		picked: Function;
	};

	let emojiPicker: Picker;
	let picker: HTMLDivElement;
	let searchInput: HTMLInputElement;

	let { x = 0, y = 0, remove, picked, visible } = $props<Props>();

	function outsideClick(e) {
		console.info("outsideClick");
		const { explicitOriginalTarget } = e;
		const closestPicker = explicitOriginalTarget.closest(".picker");
		const clickedInsidePicker =
			closestPicker || explicitOriginalTarget === emojiPicker;

		// if (!clickedInsidePicker) remove();
		if (!clickedInsidePicker) visible = false;
	}

	$effect(() => {
		console.log("updated", { visible });
		if (visible) {
			emojiPicker.addEventListener("outsideclick", outsideClick);
		} else {
			emojiPicker.removeEventListener("outsideclick", outsideClick);
		}
	});

	function emojiClick({ detail: { unicode } }) {
		console.info("emojiClick");
		picked({ unicode });
		visible = false;
	}

	onMount(() => {
		picker = emojiPicker.shadowRoot.children[1];
		searchInput = picker.querySelector("#search");
		searchInput.focus();
		// setTimeout(() => {
		// 	emojiPicker.addEventListener("outsideclick", outsideClick);
		// }, 500);
	});
</script>

<emoji-picker
	class="absolute"
	class:visible
	use:clickOutside
	on:emoji-click={emojiClick}
	bind:this={emojiPicker}
	style:top="{y}px"
	style:left="{x}px"
/>

<style lang="postcss">
	:global(emoji-picker) {
		@apply absolute hidden;
	}

	:global(emoji-picker.visible) {
		@apply flex;
	}
</style>
