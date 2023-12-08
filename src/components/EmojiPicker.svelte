<script lang="ts">
	import { clickOutside } from "@root/utils";
	import "emoji-picker-element";
	import type { Picker } from "emoji-picker-element";
	import { createEventDispatcher, onMount } from "svelte";

	const dispatch = createEventDispatcher();

	let picker: Picker;

	export let x = 0,
		y = 0;

	function outsideClick() {
		dispatch("remove");
	}

	function emojiClick({ detail: { unicode } }) {
		dispatch("picked", { unicode });
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
