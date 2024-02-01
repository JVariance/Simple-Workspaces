<script lang="ts">
	import { createRoot } from "svelte";
	import EmojiPicker from "./EmojiPicker.svelte";

	type Props = {
		workspace: Ext.SimpleWorkspace;
		updatedIcon: (icon: string) => void;
		updatedName: (name: string) => void;
	};
	let { workspace, updatedIcon, updatedName } = $props<Props>();

	let picker;

	function openEmojiPicker(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		}
	) {
		e.stopImmediatePropagation();

		const target = e.target as HTMLButtonElement;
		const { x, y } = target.getBoundingClientRect();

		if (!picker) {
			picker = createRoot(EmojiPicker, {
				target: document.body,
				props: {
					x,
					y,
					visible: true,
					picked: ({ unicode }: { unicode: string }) => {
						updatedIcon(unicode);
					},
				},
			});
		} else {
			console.info("picker set");
			picker.$set({
				visible: false,
			});
			picker.$set({
				x,
				y,
				visible: true,
				picked: ({ unicode }: { unicode: string }) => {
					updatedIcon(unicode);
				},
			});
		}
	}
</script>

<button
	title="choose icon"
	class="btn secondary-btn w-12 h-auto aspect-square justify-center"
	style:font-family="Noto Color Emoji"
	onclick={(e) => {
		openEmojiPicker(e);
	}}
>
	{workspace.icon}
</button>
<input
	class="grow bg-transparent border border-solid dark:border-neutral-700 rounded-md dark:text-white p-2"
	type="text"
	on:input={(e) => {
		updatedName(e.target.value);
	}}
	value={workspace.name}
/>
