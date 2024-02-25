<script lang="ts">
	import { mount, unmount } from "svelte";
	import EmojiPicker from "./EmojiPicker.svelte";

	type Props = {
		workspace: Ext.SimpleWorkspace;
		updatedIcon: (icon: string) => void;
		updatedName: (name: string) => void;
	};
	let { workspace, updatedIcon, updatedName } = $props<Props>();

	let picker: EmojiPicker | null;

	function openEmojiPicker(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		}
	) {
		e.stopImmediatePropagation();

		const target = e.target as HTMLButtonElement;
		const { x: _x, y: _y } = target.getBoundingClientRect();

		const x = _x + window.scrollX;
		const y = _y + window.scrollY;

		const pickerProps = {
			x,
			y,
			picked: ({ unicode }: { unicode: string }) => {
				updatedIcon(unicode);
			},
			remove: () => {
				console.info("remove", { picker });
				unmount(picker);
				picker = null;
			},
		};

		picker = mount(EmojiPicker, {
			target: document.body,
			props: pickerProps,
		});
	}
</script>

<button
	title="choose icon"
	class="btn secondary-btn w-12 h-auto aspect-square justify-center focus:outline focus:outline-2 focus:outline-[#0060df]"
	style:font-family="Noto Color Emoji"
	onclick={(e) => {
		openEmojiPicker(e);
	}}
>
	{workspace.icon}
</button>
<input
	class="min-w-0 grow bg-transparent border border-solid dark:border-neutral-700 rounded-md dark:text-white p-2"
	type="text"
	on:input={(e) => {
		updatedName(e.target.value);
	}}
	value={workspace.name}
/>
