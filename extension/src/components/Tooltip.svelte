<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "./Icon.svelte";
	import { intersect, type Options } from "svelte-intersection-observer-action";
	import { debounceFunc } from "@root/utils";

	type Props = { id: string; message: Snippet, class?: string, popupClasses?: string, children: Snippet };

	let { id, message, class: classes = "", popupClasses = "", children } = $props<Props>();
		
	let group: HTMLDivElement;
	let popup: HTMLDivElement;
	let open = $state(false);
	let locked = $state(false);
	let defaultWidth = 200;
	let popupWidth= $state(`${defaultWidth}px`);
	let popupPositionX = $state("right");

	function callback(entry: IntersectionObserverEntry){
		if(!entry.isIntersecting) {
			handlePositioning();
			
		}else {
			popupWidth = `${defaultWidth}px`;
		}
	}

	function handlePositioning(){
		const bodyRect = document.body.getBoundingClientRect();
		const groupRect = group.getBoundingClientRect();

		const popupButtonOnLeft = groupRect.left <= bodyRect.width / 2;

		if(popupButtonOnLeft) {
			popupPositionX = "left";
			popup.style.width = `${Math.min(defaultWidth, bodyRect.width - groupRect.left - 20)}px`;
		} else {
			popupPositionX = "right";
			popup.style.width = `${Math.min(defaultWidth, groupRect.left - 20)}px`;
		}
	}

	const options = { callback, root: null, rootMargin: "100% 0% 100% 0%", threshold: 1.00 } as Options;

	function showTooltip() {
		open = true;
	}
	
	function hideTooltip() {
		open = false;
	}
	
	function toggleTooltip() {
		open = !open;
		locked = open;
		console.info({locked});
		open && handlePositioning();
	}

	const onResize = debounceFunc(handlePositioning, 200);
</script>

<svelte:window onresize={onResize}></svelte:window>

<div class="flex gap-1 items-center" aria-describedby={id}>
	{#if children}
		<div class="contents">
			{@render children()}
		</div>
	{/if}
	<div
		class="group hover:relative focus:relative [&.open]:relative {classes}"
		class:open
		bind:this={group}
	>
		<button 
			aria-label="more info" 
			onclick={toggleTooltip} 
			onmouseover={() => !open && handlePositioning()}
			onfocus={() => !open && handlePositioning()}
			onmouseout={() => !locked && (open = false)}
			onblur={() => !locked && (open = false)}
		>
			<Icon icon="info" width={24} />
		</button>
		<div 
			{id}
			class="
				tooltip
				invisible
				popup absolute right-0 max-w-[100dvw]
				bg-white/75 dark:bg-black/75 backdrop-blur-md rounded-md p-1 {popupClasses}
				text-black dark:text-white
				group-hover:top-full group-focus:top-full
				group-hover:visible group-focus:visible
				group-[&.open]:visible
				group-[&.open]:top-full
			"
			style:left={popupPositionX === "left" ? '-8px' :'unset'}
			style:right={popupPositionX === "right" ? '0' : 'unset'}
			style:width={popupWidth}
			role="tooltip"
			bind:this={popup}
			use:intersect={options}
		>
			<div 
				class="absolute bottom-full pointer-events-none translate-x-1/2 -mb-[0.1rem] text-white/75 dark:text-black/75"
				style:left={popupPositionX === "left"? '0' : 'unset'}
				style:right={popupPositionX === "right"? '12px' : 'unset'}
			>
				<Icon icon="triangleUp" width={12} class="h-2"/>
			</div>
			<!-- onmouseover={showTooltip}
			onmouseout={hideTooltip} -->
			{@render message()}
		</div>
	</div>
</div>