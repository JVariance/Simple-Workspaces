<script lang="ts">
	/* 
		CSS source: https://codepen.io/maoberlehner/pen/bQGZYB 
		modified	
	*/
	type Props = { class?: string };
	let { class: classes = "" } = $props<Props>();
</script>

<div
	class="
		skeleton inline-block relative overflow-hidden min-h-[1em]
		bg-[color-mix(in_srgb,black_10%,transparent)] dark:bg-[color-mix(in_srgb,black_20%,transparent)]
		[--shimmer-color:var(--body-bg,_rgb(255,255,255))] dark:[--shimmer-color:var(--body-bg,_rgb(64,64,64))]
		{classes}
	"
/>

<style lang="postcss">
	.skeleton {
		&::after {
			content: "";
			@apply absolute inset-0 -translate-x-full;
			background-image: linear-gradient(
				90deg,
				color-mix(in srgb, var(--shimmer-color) 0%, transparent) 0,
				color-mix(in srgb, var(--shimmer-color) 20%, transparent) 20%,
				color-mix(in srgb, var(--shimmer-color) 50%, transparent) 60%,
				color-mix(in srgb, var(--shimmer-color) 0%, transparent)
			);
			animation: shimmer 3s infinite;
		}

		@keyframes shimmer {
			100% {
				transform: translateX(100%);
			}
		}
	}
</style>
