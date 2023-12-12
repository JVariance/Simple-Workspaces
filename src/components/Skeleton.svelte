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
		skeleton inline-block relative overflow-hidden h-[1em]
		bg-neutral-300 dark:bg-neutral-800
		[--shimmer-color:_255,255,255] dark:[--shimmer-color:_64,64,64]
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
				rgba(var(--shimmer-color), 0) 0,
				rgba(var(--shimmer-color), 0.2) 20%,
				rgba(var(--shimmer-color), 0.5) 60%,
				rgba(var(--shimmer-color), 0)
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
