<script lang="ts">
	import { clickOutside } from "@root/utils";
	import "emoji-picker-element";
	import type { Picker } from "emoji-picker-element";
	import { onMount } from "svelte";

	type Props = { x: number; y: number; remove: Function; picked: Function };

	let picker: Picker;

	let { x = 0, y = 0, remove, picked } = $props<Props>();

	function outsideClick(e) {
		console.info("outsideClick", e);
		if (e.srcElement.tagName !== "EMOJI-PICKER") remove();
	}

	function emojiClick({ detail: { unicode } }) {
		picked({ unicode });
	}

	onMount(() => {
		setTimeout(() => {
			picker.addEventListener("outsideclick", outsideClick);
		}, 500);
	});
</script>

<emoji-picker
	class="absolute"
	use:clickOutside
	on:emoji-click={emojiClick}
	bind:this={picker}
	style:top={y}
	style:left={x}
/>
