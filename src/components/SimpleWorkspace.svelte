<script lang="ts">
	import { createRoot } from "svelte";
	import EmojiPicker from "./EmojiPicker.svelte";

	type Props = { workspace: Ext.SimpleWorkspace };
	let { workspace } = $props<Props>();

	let picker;

	function openEmojiPicker(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		workspace: Ext.SimpleWorkspace
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
						workspace.icon = unicode;
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
					workspace.icon = unicode;
				},
			});
		}
	}
</script>

<button
	title="choose icon"
	class="w-12 h-auto aspect-square flex justify-center items-center"
	onclick={(e) => {
		openEmojiPicker(e, workspace);
	}}
>
	{workspace.icon}
</button>
<input
	class="bg-transparent border border-solid dark:border-neutral-700 rounded-md dark:text-white p-2"
	type="text"
	bind:value={workspace.name}
/>
