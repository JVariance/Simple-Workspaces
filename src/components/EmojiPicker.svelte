<script lang="ts">
	import { clickOutside } from "@root/utils";
	import "emoji-picker-element";
	import type { Picker } from "emoji-picker-element";
	import { onMount } from "svelte";

	type Props = {
		x: number;
		y: number;
		picked: Function;
		visible?: boolean;
		remove?: Function;
	};

	let emojiPicker: Picker;
	let picker: HTMLDivElement;
	let searchInput: HTMLInputElement;

	let {
		x = 0,
		y = 0,
		picked,
		remove = () => {},
		visible = true,
	} = $props<Props>();

	function outsideClick(e: CustomEvent) {
		const { target: originalTarget } = e.detail;
		const closestPicker = originalTarget.closest(".picker");
		const clickedInsidePicker = closestPicker || originalTarget === emojiPicker;

		if (!clickedInsidePicker) {
			visible = false;
			console.info("remove picker");
			remove();
		}
	}

	$effect(() => {
		if (visible) {
			setTimeout(() => {
				emojiPicker.addEventListener("outsideclick", outsideClick);
			}, 50);
		} else {
			emojiPicker.removeEventListener("outsideclick", outsideClick);
		}
	});

	function emojiClick({ detail: { unicode } }) {
		picked({ unicode });
		visible = false;
	}

	onMount(() => {
		visible = true;
		picker = emojiPicker.shadowRoot.children[1];
		searchInput = picker.querySelector("#search");
		searchInput.focus();
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
