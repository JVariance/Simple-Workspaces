<script lang="ts">
	import { onMount, type Snippet } from "svelte";
	import Icon from "../Icon.svelte";
	import { Key } from "ts-key-enum";

	type Props = { children: Snippet, class?: string };
	let { children, class: classes = "", ...attributes } = $props<Props>();

	let summaryElement: HTMLElement;
	let detailsElement: HTMLDetailsElement;
	let contentElement: HTMLDivElement;

	function isOpen(){
		return detailsElement.hasAttribute('open');
	}

	function onKeyPress(event) {
		switch(event.key) {
			case Key.ArrowLeft:
				isOpen() && summaryElement.click();
				break;
			case Key.ArrowRight:
				!isOpen() && summaryElement.click();
				break;
			default:
				break;
		}
	}

	function onClick(event){
		/*
			Source: https://linkedlist.ch/animate_details_element_60/
			modified
		*/
    const onAnimationEnd = (cb: () => any) => contentElement.addEventListener(
      "animationend", cb, {once: true}
    );

    contentElement.classList.add('animation');
    onAnimationEnd(() => contentElement.classList.remove('animation'));

    if (isOpen()) {
      event.preventDefault();
      contentElement.classList.add('collapsing');
      onAnimationEnd(() => {
        detailsElement.removeAttribute('open');
        contentElement.classList.remove('collapsing');
      });
    }
	}

	onMount(() => {
		detailsElement = summaryElement.closest('details') as HTMLDetailsElement;
		contentElement = summaryElement.nextElementSibling as HTMLDivElement;
	});
</script>

<summary 
	class="flex gap-2 items-center justify-between {classes}" 
	{...attributes}
	onclick={onClick}
	onkeyup={onKeyPress}
	bind:this={summaryElement}
	style:--chevron-color="light-dark(#a3a3a3, #737373)"
>
	{@render children()}
	<Icon 
		icon="chevron-right" 
		width={20} 
		class="chevron rotate-90 transition-transform duration-200 ml-auto text-[--chevron-color]" 
	/>
</summary>