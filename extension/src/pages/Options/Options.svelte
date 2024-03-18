<script lang="ts">
	import Icon from "@root/components/Icon.svelte";
	import { mount, onMount, unstate, untrack } from "svelte";
	import Browser, { i18n } from "webextension-polyfill";
	import Accordion from "@components/Accordion/Accordion.svelte";
	import Summary from "@components/Accordion/Summary.svelte";
	import DefaultWorkspaces from "@root/components/ViewBlocks/DefaultWorkspaces.svelte";
	import Info from "@root/components/Info.svelte";
	import SimpleWorkspace from "@root/components/SimpleWorkspace.svelte";
	import Toast from "@root/components/Toast.svelte";
	import ButtonLink from "@root/components/ButtonLink.svelte";
	import Shortcuts from "@root/components/ViewBlocks/Shortcuts.svelte";
	import Logo from "@root/components/Logo.svelte";
	import HomeWorkspace from "@root/components/ViewBlocks/HomeWorkspace.svelte";
	import Layout from "@pages/Special_Pages/Layout.svelte";
	import { BackupProviderStatusNotifier, getBackupDeviceName, getKeepPinnedTabs, getWorkspacesState, initView, setActiveBackupProvider } from "@pages/states.svelte";
	import ThemeSwitch from "@root/components/ViewBlocks/ThemeSwitch.svelte";
	import { BrowserStorage } from "@root/background/Entities";
	import Tooltip from "@root/components/Tooltip.svelte";
	import { type ImportData } from "@root/background/helper/importData";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";
	import { DEFAULT_BACKUP_INTERVAL_IN_MINUTES } from "@root/background/helper/Constants";
	import { debounceFunc } from "@root/utils";
	import type { BackupProvider, BackupProviderStatusProps } from "@root/background/Entities/Singletons/BackupProviders";

	BackupProviderStatusNotifier.subscribe(({ provider, newStatus }: { provider: BackupProvider; newStatus: BackupProviderStatusProps }) => {
		backupProviders[provider] = newStatus;
		if(newStatus.selected) {
			activeBackupProvider = provider;
		}
	});

	let windowWorkspaces = $derived(getWorkspacesState()?.filter(({ UUID }) => UUID !== "HOME") || []);
	let keepPinnedTabs = $derived(getKeepPinnedTabs());
	let deviceName = $state<string>();
	let editDeviceName = $state<boolean>();
	let _deviceName = $derived(getBackupDeviceName());
	// let _deviceName = $derived.by(() => {
	// 	const name = getBackupDeviceName();
	// 	deviceName = _deviceName;
	// 	editDeviceName = name ? name?.length <= 0 : false;
	// 	console.info({ name,deviceName, editDeviceName });
	// 	return name;
	// });

	$effect(() => {
			untrack(() => editDeviceName);
			untrack(() => deviceName);
			deviceName = _deviceName;
			editDeviceName = _deviceName ? _deviceName?.length <= 0 : true;
	});

	let selectedBackupProvider = $state<BackupProvider>('Google Drive');
	let activeBackupProvider = $state<BackupProvider>('Google Drive');

	// $effect(() => {
	// 	selectedBackupProvider = activeBackupProvider;
	// });

	let backupIntervalNumber = $state<number>(DEFAULT_BACKUP_INTERVAL_IN_MINUTES);
	let backupIntervalUnit = $state<"minutes" | "hours" | "days">("minutes");

	let deviceNameInput = $state<HTMLInputElement>();
	let importDialogElem = $state<HTMLDialogElement>();

	let clearExtensionDataConfirmed = $state(false);

	const backupProviders = $state<Record<BackupProvider, BackupProviderStatusProps>>({
		'Google Drive': {
			authorized: false,
			selected: false,
			lastBackupTimeStamp: 0,
		}
	});

	async function applyCurrentWorkspacesChanges() {
		const props = $state({
				state: "loading",
				loadingMessage: i18n.getMessage("applying_changes"),
				successMessage: i18n.getMessage("applied_changes"),
				errorMessage: "something went wrong",
			});
		mount(Toast, {
			target: document.getElementById('toaster') ?? document.body,
			props
		});

		await persistCurrentWorkspaces();
		props.state = 'success';
	}

	function persistCurrentWorkspaces() {
		return Browser.runtime.sendMessage({
			msg: "setCurrentWorkspaces",
			currentWorkspaces: windowWorkspaces.map((workspace) => (({UUID, name, icon}) => ({UUID, name, icon}))(workspace))
		});
	}

	function clearExtensionData(e) {
		e.stopImmediatePropagation();
		Browser.runtime.sendMessage({
			msg: "clearExtensionData",
		});
	}

	function keepPinnedTabsChanged(e) {
		BrowserStorage.setKeepPinnedTabs(e.target.checked);
	}

	function createAndDownloadExportFile(content: string, download = "download.txt", type = "text/plain"){
		const file = new Blob([content], { type });
		const href = URL.createObjectURL(file);
		const anchor = document.createElement("a");
		anchor.href = href;
		anchor.download = download;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(href);
	}

	let exportOptions = $state({ homeWorkspace: true, defaultWorkspaces: true, tabs: true });

	async function getExportData() {
		// homeWorkspace, defaultWorkspaces, windows with workspaces and tabs (urls)
		const data = {} as { homeWorkspace: Ext.SimpleWorkspace, defaultWorkspaces: Ext.SimpleWorkspace[], windows: any };
		if(exportOptions.homeWorkspace) {
			const { homeWorkspace } = await BrowserStorage.getHomeWorkspace();
			data.homeWorkspace = homeWorkspace;
		}

		if(exportOptions.defaultWorkspaces) {
			const { defaultWorkspaces } = await BrowserStorage.getDefaultWorkspaces();
			data.defaultWorkspaces = defaultWorkspaces;
		}

		if(exportOptions.tabs) {
			const fullExportData = await Browser.runtime.sendMessage({ msg: "getFullExportData" });
			data.windows = fullExportData;
		}

		return data;
	}

	async function exportData() {
		const [dateString, timeString] = new Date().toLocaleDateString('en', {day: '2-digit', month: '2-digit',year:'2-digit', time: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).split(', ');
		const date = dateString.split('/').reverse().join('') + '-' + timeString.replaceAll(':', '_');
		const data = await getExportData();
		createAndDownloadExportFile(JSON.stringify(data, null, 2), `simple-workspaces-${date}.json`, "application/json");
	}

	let importedData  = $state<ImportData<{skip?: boolean}>>();

	function importDataRequest(e: Event & { currentTarget: HTMLInputElement }) {
		const files = e.currentTarget.files;
		if(files?.length === 0){
		} else {
			const file = files![0];

			if(file.type === "application/json") {
				const reader = new FileReader();
				reader.onload = async (e) => {
					try {
						const data = JSON.parse(e.target!.result as string) as ImportData;
						if(data) {
							importedData = data;
							importDialogElem?.showModal();
						}
					} catch(e){}
				};
				reader.readAsText(file);
			}
		}
	}

	async function importData() {
		importDialogElem?.close();
		console.info({importedData});
		await Browser.runtime.sendMessage({ msg: 'importData', data: unstate(importedData) });
		importedData = undefined;
	}

	async function backupData() {
		Browser.runtime.sendMessage({ msg: 'backupData', provider: activeBackupProvider });
	}

	async function getBackupData() {
		const _backupData = await Browser.runtime.sendMessage({ msg: 'getBackupData', provider: activeBackupProvider });
		console.info({ _backupData });
	}

	async function openBackupProviderAuthPage() {
		setActiveBackupProvider(selectedBackupProvider);
		Browser.runtime.sendMessage({ msg: 'openBackupProviderAuthPage', provider: selectedBackupProvider });
	}

	const changedBackupInterval = debounceFunc(_changedBackupInterval, 500);

	function _changedBackupInterval() {
		Browser.runtime.sendMessage({ msg: 'changedBackupInterval', val: backupIntervalNumber, unit: backupIntervalUnit });
	}

	function applyDeviceName() {
		Browser.runtime.sendMessage({ msg: 'applyBackupDeviceName', deviceName });
		editDeviceName = false;
	}

	onMount(async () => {
		await initView();

		for(let provider of Object.keys(backupProviders) as BackupProvider[]) {
			const status = (await Browser.runtime.sendMessage({ msg: 'getBackupProviderStatus', provider })) as BackupProviderStatusProps;
			console.info({ status, provider });
			backupProviders[provider] = status;
		}
	});
</script>

{#snippet Section(content: Snippet, {class: classes, ...props}: HTMLAttributes<HTMLElement>)}
	<section class="[background:_var(--section-bg)] p-4 rounded-md grid gap-4 basis-full max-w-[100cqw] overflow-auto md:overflow-visible {classes}" {...props}>
		{@render content()}
	</section>
{/snippet}

<Layout>
	<header class="flex h-16 sticky top-0 z-10 items-center mb-8 justify-center">
		<div
			class="
			flex flex-wrap items-center h-max p-2 justify-between
		bg-[--header-bg] rounded-full
			w-full sm:w-[500px] md:w-[700px] lg:w-[900px] xl:w-[1100px] 2xl:w-[1300px]
		"
		>
			<h1
				class="text-base animate-fade-left animate-duration-1000 flex gap-2 bg-[--badge-bg] rounded-full items-center py-2 px-4 text-[--heading-2-color]"
			>
				<Logo class="w-6 h-6" draggable="false" />
				<span class="text-base md:text-xl">Simple Workspaces</span>
			</h1>
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
		{#snippet Section_Theme()}
			<h1 class="text-xl font-semibold text-[--heading-2-color] first-letter:uppercase">{i18n.getMessage('theme')}</h1>
			<ThemeSwitch />
		{/snippet}
		{#snippet Section_HomeWorkspace()}
			<h1 class="text-xl font-semibold text-[--heading-2-color] first-letter:uppercase">{i18n.getMessage('home_workspace')}</h1>
			<HomeWorkspace />
		{/snippet}
		{#snippet Section_CurrentWorkspaces()}
			<h1 class="text-xl font-semibold text-[--heading-2-color] first-letter:uppercase">{i18n.getMessage('current_workspaces')}</h1>
			<ul class="current-workspaces grid gap-4">
				{#each windowWorkspaces as workspace}
					<li class="flex items-stretch gap-2">
						<SimpleWorkspace 
							{workspace} 
							updatedName={(name) => {workspace.name = name;}}
							updatedIcon={(icon) => {workspace.icon = icon;}}
						/>
					</li>
				{/each}
			</ul>

			{#if windowWorkspaces?.length}
				<button class="btn justify-center mt-4" style:width="-moz-available" onclick={applyCurrentWorkspacesChanges}>
					<Icon icon="check" />
					<span class="">{i18n.getMessage('apply_changes')}</span>
				</button>
				{:else}
				{i18n.getMessage('There_are_no_current_workspaces_in_this_window')}.
			{/if}
		{/snippet}
		{#snippet Section_DefaultWorkspaces()}
			<h1 class="text-xl font-semibold text-[--heading-2-color] first-letter:uppercase">{i18n.getMessage('default_workspaces')}</h1>
			<Info class="mb-4">
				{i18n.getMessage('changes_will_apply_for_new_windows')}
			</Info>
			<DefaultWorkspaces />
		{/snippet}
		{#snippet Section_TabPinning()}
			<h1 class="text-xl font-semibold text-[--heading-2-color] first-letter:uppercase">{i18n.getMessage('tab_pinning')}</h1>
			<div class="flex gap-4 items-center w-full">
				<input
					type="checkbox"
					id="keep-pinned-tabs"
					checked={keepPinnedTabs}
					onchange={keepPinnedTabsChanged}
				/>
				<label for="keep-pinned-tabs" class="-mt-[0.2rem]">{i18n.getMessage("keep_pinned_tabs")}</label>
			</div>
		{/snippet}
		{#snippet Section_Shortcuts()}
			<h1 class="text-xl font-semibold text-[--heading-2-color]">
				<span class="first-letter:uppercase">{i18n.getMessage('shortcuts')}</span>
			</h1>
			<Info>
				<Tooltip id="shortcuts-info" class="[&_svg]:w-4 [&_svg]:h-4" popupClasses="absolute top-0 right-0 w-max">
					{@html i18n.getMessage('you_can_edit_shortcuts_for_commands_in_the_addons_page')}
					{#snippet message()}
						<ButtonLink href={i18n.getMessage('shortcuts.help.link')} target="_blank" class="ghost flex flex-nowrap items-center gap-1">
							{i18n.getMessage('read_more')}
						</ButtonLink>
					{/snippet}
				</Tooltip>
			</Info>
			<Shortcuts />
		{/snippet}
		{#snippet Section_ClearExtensionData()}
			<Accordion class="border-none">
				{#snippet summary()}
					<Summary class="border-none">
						<h1 class="text-xl font-semibold text-[--heading-2-color] flex gap-2 items-center">
							<Icon icon="clear" />
							<span class="-mt-[0rem] first-letter:uppercase">{i18n.getMessage('clear')}</span>
						</h1>
					</Summary>
				{/snippet}
				<label class="flex gap-2 items-center mt-4 cursor-pointer">
					<input type="checkbox" bind:checked={clearExtensionDataConfirmed} />
					{i18n.getMessage('clear_extension_data_are_you_sure')}
				</label>
				<button 
					class="btn mt-4 !bg-red-500 disabled:opacity-20 disabled:pointer-events-none" 
					onclick={clearExtensionData} 
					disabled={!clearExtensionDataConfirmed}
				>
					<Icon icon="clear" />
					<span class="-mt-[0rem] first-letter:uppercase">{i18n.getMessage('clear')}</span>
				</button>
			</Accordion>
		{/snippet}
		{#snippet Section_WelcomePage()}
			<h1 class="text-xl font-semibold text-[--heading-2-color]">{i18n.getMessage('want_to_see_the_welcome_page_again')}</h1>
			<ButtonLink class="btn w-max" href="{Browser.runtime.getURL('src/pages/Welcome/welcome.html')}" target="_blank">{i18n.getMessage('open_welcome_page')}</ButtonLink>
		{/snippet}
		{#snippet Section_FurtherLinks()}
			<h1 class="text-xl font-semibold text-[--heading-2-color]">{i18n.getMessage("feedback_and_feature_requests_heading")}</h1>
			<ButtonLink href="https://github.com/JVariance/Simple-Workspaces" target="_blank" class="btn w-max">
				<img src="/images/github-mark/github-mark-white.svg" alt="GitHub Logo" class="w-6 aspect-square">
				{i18n.getMessage('github_repository')}
			</ButtonLink>
		{/snippet}
		{#snippet Section_ImportExport()}
			{@const provider = backupProviders[selectedBackupProvider]}
			<h1 class="text-xl font-semibold text-[--heading-2-color]">Import/Export</h1>
			<div class="flex gap-4 flex-wrap">
				<button class="btn primary-btn" onclick={exportData}>
					<Icon icon="json-file" />
					<span class="first-letter:uppercase text-left">{i18n.getMessage('export')}</span>
				</button>
				<label class="btn primary-btn cursor-pointer" for="import-data">
					<Icon icon="json-file" />	
					<span class="first-letter:uppercase">{i18n.getMessage('import')}...</span>
				</label>
				<input id="import-data" class="opacity-0 absolute pointer-events-none" type="file" accept="application/json" onchange={importDataRequest} />
			</div>
			<!-- <a href={Browser.identity.getRedirectURL()}>Link</a> -->
			<div>
				<h2 class="text-xl font-semibold text-[--heading-2-color]">Backup</h2>
				<div class="mt-4 grid gap-4">
					<label class="grid gap-1">
						<span class="text-[--heading-2-color] font-semibold first-letter:uppercase">
							{i18n.getMessage('provider')}
						</span>
						<select 
							id="select-backup-provider"
							name="select-backup-provider"
							bind:value={selectedBackupProvider}
						>
							{#each ["Google Drive"] as provider}
								<option value={provider}>{provider}</option>
							{/each}
						</select>
					</label>
					<div class="grid gap-1">
						<label for="device-name-input" class="text-[--heading-2-color] font-semibold first-letter:uppercase">
							{i18n.getMessage('device_name')} ({i18n.getMessage('required')})
						</label>
						<div class="flex gap-2 items-center">
							<div class="relative flex items-start w-max">
								<input 
									id="device-name-input"
									type="text" 
									class="
										rounded-md p-2 placeholder:text-[color-mix(in_srgb,_var(--heading-color)_50%,_transparent)] w-[37ch]
										[&:user-invalid]:!bg-red-200
									"
									placeholder="Win10 Nightly @Home"
									value={deviceName || ''} 
									oninput={(e) => deviceName = e.currentTarget.value}
									required
									minlength="1" maxlength="32"
									disabled={!editDeviceName}
									bind:this={deviceNameInput}
								/>
								<span class="absolute right-1 text-[13px] text-[color-mix(in_srgb,_var(--heading-color)_50%,_transparent)]">
									{deviceName?.length || 0}/32
								</span>
							</div>
							{#if editDeviceName}	
								<button 
									class="btn primary-btn !p-1 h-max w-max disabled:pointer-events-none disabled:opacity-50" 
									onclick={applyDeviceName} 
									title={i18n.getMessage('apply_device_name')}
									disabled={deviceName?.length ? !deviceNameInput.checkValidity() : true}
								>
									<Icon icon="check" />
								</button>
								{:else}
									<button 
										class="btn primary-btn !p-2 h-max w-max" 
										onclick={() => editDeviceName = !editDeviceName} 
										title={i18n.getMessage('edit_device_name')}
									>
										<Icon icon="edit" width={18} />
									</button>
							{/if}
						</div>
					</div>
					<div>
						<p>authorized: {provider?.authorized}</p>
						<p>selected: {provider?.selected}</p>
						<p>last backup: {provider?.lastBackupTimeStamp || '-'}</p>
					</div>
					<div class="grid gap-1">
						<label for="backup-interval-input" class="text-[--heading-2-color] font-semibold">
							{i18n.getMessage('backup_interval')}
						</label>
						<div class="flex gap-2 items-stretch">
							<input 
								id="backup-interval-input"
								type="number" 
								min="1" max="60" step="0.25"
								bind:value={backupIntervalNumber}
								class="rounded-md p-2 invalid:!bg-red-300 max-w-[8ch]" 
								onchange={changedBackupInterval}
							/>
							<select 
								name="select-backup-interval-unit" 
								id="select-backup-interval-unit" 
								bind:value={backupIntervalUnit}
								onchange={changedBackupInterval}
							>
								{#each ['minutes', 'hours', 'days'] as unit}
									<option value={unit}>{i18n.getMessage(unit)}</option>
								{/each}
							</select>
						</div>
					</div>
					{#if provider?.selected && provider.authorized}
						<button class="btn primary-btn" title={i18n.getMessage('disconnect_from_provider')}>
							<Icon icon="sync" />
							<span>{i18n.getMessage('disconnect')}</span>
						</button>
					{:else}
						<button 
							class="btn primary-btn disabled:pointer-events-none disabled:opacity-50" 
							title={i18n.getMessage('connect_to_provider')}
							onclick={openBackupProviderAuthPage}
							disabled={!deviceName?.length && !deviceNameInput?.checkValidity()}
						>
							<Icon icon="sync" />
							<span>{i18n.getMessage('connect')}</span>
						</button>
					{/if}
					{#if provider?.authorized}
						<button class="btn primary-btn" disabled={!deviceName?.length && !deviceNameInput?.checkValidity()} onclick={backupData}>
							<Icon icon="sync" />
							<span>{i18n.getMessage('backup')}</span>
						</button>
						<button class="btn primary-btn" disabled={!deviceName?.length && !deviceNameInput?.checkValidity()} onclick={getBackupData}>
							<Icon icon="sync" />
							<span>download</span>
						</button>
					{/if}
				</div>
			</div>
		{/snippet}

		{@render Section(Section_Theme, {class: "basis-full flex-1"})}
		{@render Section(Section_HomeWorkspace, {class: "flex-1"})}
		{@render Section(Section_CurrentWorkspaces, {class: "flex-1"})}
		{@render Section(Section_DefaultWorkspaces, {class: "flex-1 overflow-auto scrollbar-gutter:_stable] sm:scrollbar-gutter:_unset] @container"})}
		{@render Section(Section_TabPinning, {class: "basis-full"})}
		{@render Section(Section_Shortcuts, {class: "basis-full"})}
		{@render Section(Section_ImportExport, {class: "basis-full"})}
		{@render Section(Section_ClearExtensionData, {class: "basis-full"})}
		{@render Section(Section_WelcomePage, {class: "flex-1"})}
		{@render Section(Section_FurtherLinks, {class: "flex-1"})}
	</main>
	<dialog 
		bind:this={importDialogElem}
		class="open:grid grid-rows-[auto_1fr_auto] content-start gap-4 p-6 backdrop:bg-black/10 backdrop:backdrop-blur bg-[--body-bg] rounded-md w-[90dvw] h-[90dvh]"
	>
		<button
			class="btn ghost absolute right-6 top-6 w-max !p-0"
		 	onclick={() => importDialogElem?.close()}
		>
			<Icon icon="cross"/>
		</button>
		<h1 class="text-xl font-semibold text-[--heading-2-color]">{i18n.getMessage('import_select_windows')}</h1>
		{#if importedData}
			{@const windowsArray = Object.entries(importedData.windows)}
			{@const selectedWindowsCount = windowsArray.filter(([_, window]) => !window?.skip).length}
			<label class="flex gap-3 items-center w-max ml-4 cursor-pointer">
				<input 
					type="checkbox" 
					class="rounded-full"
					checked={selectedWindowsCount === windowsArray.length}
					onchange={(e) => windowsArray.forEach(([_, window]) => window.skip = !e.currentTarget.checked)}
				/>
				{#if selectedWindowsCount === windowsArray.length}
					{i18n.getMessage('deselect_all')}
					{:else}
						{i18n.getMessage('select_all')}
				{/if}
			</label>
			<div class="overflow-auto [scrollbar-width:thin] pr-2 grid gap-2 overscroll-contain">
				{#each windowsArray as [_, window], i}
					<div 
						class="
							group relative grid gap-4 border has-[input:checked]:bg-blue-100 has-[input:checked]:border-blue-300 px-12 py-4 rounded-md
							dark:has-[input:checked]:bg-blue-950 dark:has-[input:checked]:border-blue-800 dark:border-white/25
						"
					>
						<h2 class="font-thin leading-tight">{i18n.getMessage('window')} {i + 1}</h2>
						<label class="absolute inset-0 cursor-pointer z-[1]">
							<input 
								type="checkbox" 
								checked={window?.skip ? false : true}
								class="absolute top-4 left-4 !rounded-full"
								onchange={(e) => window.skip = !e.currentTarget.checked}
							/>
						</label>
						<div class="grid gap-4">
							{#each Object.entries(window.w) as [_, [__, workspace]]}
								<div>
									<p><span class="[font-family:_Noto_Color_Emoji]">{workspace.i}</span> <span class="font-semibold">{workspace.n}</span></p>
									<div class="tabs-wrapper grid gap-1 relative pl-2">
										{#each workspace.t as tab}
											{@const url = new URL(tab.u)}
											{#if url.protocol !== 'about:'}
												<p class="ml-4 overflow-x-auto whitespace-nowrap font-thin">{url.hostname.replace('www.', '')}</p>
											{/if}
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			<div class="flex gap-2 items-center flex-wrap">
				<button 
					class="btn primary-btn disabled:pointer-events-none disabled:opacity-20" 
					onclick={importData} 
					disabled={selectedWindowsCount < 1}
				>
					<Icon icon="json-file" />
					{i18n.getMessage('import')}
				</button>
				<p class="text-black/50 dark:text-white/50">
					{selectedWindowsCount}/{windowsArray.length} {i18n.getMessage('selected')}
				</p>
			</div>
		{/if}
	</dialog>
</Layout>

<style lang="postcss">
	.tabs-wrapper::before {
		content: "";
		@apply rounded-full w-px absolute top-2 left-[9px] bottom-[5px] border;
		@apply group-has-[input:checked]:border-blue-300 dark:group-has-[input:checked]:border-blue-800 dark:border-white/25;
	}

	select {
		@apply p-1 rounded-md bg-[--workspace-bg] text-[--workspace-color] w-max;
	}

	option {
		@apply bg-[--workspace-bg] text-[--workspace-color];
	}
</style>