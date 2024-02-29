<script lang="ts">
	import Logo from "@root/components/Logo.svelte";
	import OnMount from "@root/components/OnMount.svelte";
	import "@root/styles/app.postcss";
	import Browser from "webextension-polyfill";

	let dateOptions = {};

	const getFormattedDate = (date: string) => {
		const uiLanguage = Browser.i18n.getUILanguage();

		if (["de"].includes(uiLanguage)) {
			dateOptions = {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			};
		}

		console.info(uiLanguage, dateOptions);

		return new Date(date).toLocaleDateString(
			uiLanguage,
			//@ts-ignore
			dateOptions
		);
	};

	const changelog = [
		{
			title: "v0.0.1",
			description: "initial version",
			publish_date: getFormattedDate("2024-03-01"),
		},
	];
</script>

<header class="flex h-16 sticky top-0 z-10 items-center mb-24 justify-center">
	<div
		class="
		flex flex-wrap items-center h-max p-2 justify-between
	bg-[--header-bg] rounded-full
		w-full sm:w-[500px] md:w-[700px] lg:w-[900px] xl:w-[1100px] 2xl:w-[1300px]
	"
	>
		<OnMount>
			<h1
				class="text-base animate-fade-left animate-duration-1000 flex gap-2 bg-[--badge-bg] rounded-full items-center py-2 px-4 text-[--heading-2-color]"
			>
				<Logo class="w-6 h-6" draggable="false" />
				<span class="text-base md:text-xl">Simple Workspaces</span>
			</h1>
		</OnMount>
		<p
			class="py-2 px-4 rounded-full text-base md:text-xl bg-[--badge-bg] text-[--heading-2-color]"
		>
			v{Browser.runtime.getManifest().version}
		</p>
	</div>
</header>
<main
	class="
		flex flex-wrap gap-8 w-3/4 sm:w-[400px] md:w-[600px] lg:w-[800px] xl:w-[1000px] 2xl:w-[1200px] mx-auto mb-8
		@container
	"
>
	<h1 class="text-3xl text-[--heading-color] font-bold first-letter:uppercase mb-8">
		{Browser.i18n.getMessage("changelog")}
	</h1>
	<article class="grid gap-8 basis-full">
		{#each changelog as { title, description, publish_date }}
			<section class="grid sm:grid-cols-[auto_1fr] gap-8">
				<div class="sm:sticky top-16 self-start">
					<h1 class="text-lg font-semibold text-[--heading-2-color]">
						{title}
					</h1>
					<p class="text-black/50 dark:text-white/50">{publish_date}</p>
				</div>
				<p class="text-[--section-color]">{description}</p>
			</section>
		{/each}
	</article>
</main>

<style lang="postcss">
	:root {
		--body-bg: light-dark(#fbfbfe, #181b3e);
		--header-bg: light-dark(#ffffff, #181b3e);
		/* --body-bg: light-dark(#fbfbfecc, #181b3e); */
		/* --body-color: light-dark(#3f3777, #f6f6ff); */

		/*
		section-bg:light
		#f6f6ff -> #f1f1ff,
		#f6f5ff -> #f6f5ff,
		#f9f9ff -> #f9f9ff,
		#f2f2fd -> #f2f2fd,
	*/
		--section-bg: linear-gradient(
			to bottom,
			light-dark(#f2f2fd, #261f4a),
			light-dark(#f2f2fd, #261f4a)
		);
		--section-color: light-dark(#000026, #fff);
		/* workspace-bg:light
		#ebeafe
	*/
		--workspace-bg: light-dark(#e5e3ff, #342c59);
		--workspace-color: light-dark(#464382, #c6c4f0);
		--workspace-handle-fill: #43407d;
		--workspace-remove-fill: #43407d;
		--button-primary-bg: #625eb7;
		--button-primary-hover-bg: hsl(243, 38%, 44%);
		--button-primary-color: #ffffff;
		--button-primary-hover-color: #ffffff;
		--button-secondary-bg: #b5b3e8;
		--button-secondary-color: #ffffff;
		--kbd-bg: light-dark(#cac8ff, #a29dff);
		--kbd-color: light-dark(#02002d, #01002d);
		--badge-bg: light-dark(#f8f8fe, #282853);
		--heading-color: #8c88e3;
		--heading-2-color: light-dark(#625eb7, #aca8f9);
	}

	:global(html) {
		color-scheme: light dark;
	}

	:global(body) {
		@apply bg-[--body-bg] text-[--body-color];
	}
</style>
