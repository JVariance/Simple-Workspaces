<script lang="ts">
	let { width = 50, height = 50 }: { width?: number; height?: number } =
		$props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	{width}
	{height}
	viewBox="0 0 24 24"
	class="[&>g>circle]:stroke-1 col-start-1 col-end-2 row-start-1 row-end-2"
>
	<g stroke="currentColor">
		<circle
			cx="12"
			cy="12"
			r="9.5"
			fill="none"
			stroke-linecap="round"
			stroke-width="1"
		>
			<animate
				attributeName="stroke-dasharray"
				calcMode="spline"
				dur="1.5s"
				keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1"
				keyTimes="0;0.475;0.95;1"
				repeatCount="indefinite"
				values="0 150;42 150;42 150;42 150"
			/>
			<animate
				attributeName="stroke-dashoffset"
				calcMode="spline"
				dur="1.5s"
				keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1"
				keyTimes="0;0.475;0.95;1"
				repeatCount="indefinite"
				values="0;-16;-59;-59"
			/>
		</circle>
		<animateTransform
			attributeName="transform"
			dur="4s"
			repeatCount="indefinite"
			type="rotate"
			values="0 12 12;360 12 12"
		/>
	</g>
</svg>
