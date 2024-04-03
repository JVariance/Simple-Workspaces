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
	import Spinner from "@root/components/Spinner.svelte";
	import Layout from "@pages/Special_Pages/Layout.svelte";
	import { BackupProviderStatusNotifier, getBackupDeviceName, getBackupEnabled, setBackupEnabled, getKeepPinnedTabs, getWorkspacesState, initView, setActiveBackupProvider, getBackupInterval } from "@pages/states.svelte";
	import ThemeSwitch from "@root/components/ViewBlocks/ThemeSwitch.svelte";
	import { BrowserStorage } from "@root/background/Entities";
	import Tooltip from "@root/components/Tooltip.svelte";
	import { type ImportData } from "@root/background/helper/importData";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";
	import { debounceFunc } from "@root/utils";
	import type { BackupProvider, BackupProviderStatusProps } from "@root/background/Entities/Singletons/BackupProviders";
	import { DEFAULT_BACKUP_INTERVAL_IN_MINUTES } from "@root/background/helper/Constants";

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
	let backupEnabled = $derived(getBackupEnabled());
	let backupDeviceNames = $state<string[]>([]);
	let selectedDevice = $state<string>();
	// let selectedBackupData = $derived<ImportData |undefined>(selectedDevice && backupDataPerDevice[selectedDevice] ? backupDataPerDevice[selectedDevice]: undefined);
	let selectedBackupData = $state<Promise<ImportData> | ImportData>(new Promise(() => {}));
	let mounted = $state(false);
	// let _deviceName = $derived.by(() => {
	// 	const name = getBackupDeviceName();
	// 	deviceName = _deviceName;
	// 	editDeviceName = name ? name?.length <= 0 : false;
	// 	console.info({ name,deviceName, editDeviceName });
	// 	return name;
	// });

	let importSettingsCheckedVals = $state<boolean[]>([]);
	let importSettingsCheckAllCheckboxChecked = $derived<boolean>(!importSettingsCheckedVals.includes(false));
	let importSettingsCheckAllCheckboxUnchecked = $derived<boolean>(!importSettingsCheckedVals.includes(true));
	let importSettingsCheckAllCheckboxIndeterminate = $derived<boolean>(!importSettingsCheckAllCheckboxChecked && !importSettingsCheckAllCheckboxUnchecked);
			
	let importDefaultWorkspacesCheckedVals = $state<boolean[]>([]);
	let importDefaultWorkspacesAllChecked = $derived<boolean>(!importDefaultWorkspacesCheckedVals.includes(false));
	let importDefaultWorkspacesAllUnchecked = $derived<boolean>(!importDefaultWorkspacesCheckedVals.includes(true));
	let importDefaultWorkspacesIndeterminate = $derived<boolean>(!importDefaultWorkspacesAllChecked && !importDefaultWorkspacesAllUnchecked);

	$effect(() => {
			untrack(() => editDeviceName);
			untrack(() => deviceName);
			untrack(() => selectedDevice);

			deviceName = _deviceName;
			selectedDevice = !selectedDevice && _deviceName && backupDeviceNames.includes(_deviceName) ? _deviceName : selectedDevice;
			editDeviceName = _deviceName ? _deviceName?.length <= 0 : true;
	});

	let selectedBackupProvider = $state<BackupProvider>('Google Drive');
	let activeBackupProvider = $state<BackupProvider>('Google Drive');

	// $effect(() => {
	// 	selectedBackupProvider = activeBackupProvider;
	// });

	let backupIntervalNumber = $derived<number>(getBackupInterval());
	let backupIntervalUnit = $state<"minutes" | "hours" | "days">("minutes");

	let deviceNameInput = $state<HTMLInputElement>();
	let importDialogElem = $state<HTMLDialogElement>();
	let backupDialogElem = $state<HTMLDialogElement>();

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

	async function importData(data: ImportData) {
		importDialogElem?.close();
		backupDialogElem?.close();
		console.info({ data });
		await Browser.runtime.sendMessage({ msg: 'importData', data: unstate(data) });
		// data = undefined;
	}

	async function backupData() {
		Browser.runtime.sendMessage({ msg: 'backupData', provider: activeBackupProvider });
	}

	async function getBackupData(): Promise<ImportData> {
		return Browser.runtime.sendMessage({ msg: 'getBackupData', provider: activeBackupProvider, deviceName: selectedDevice });
	}

	async function disconnectFromProvider(){
		Browser.runtime.sendMessage({ msg: 'disconnectFromProvider', provider: activeBackupProvider });
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
		mounted = true;
		await initView();

		for(let provider of Object.keys(backupProviders) as BackupProvider[]) {
			const status = (await Browser.runtime.sendMessage({ msg: 'getBackupProviderStatus', provider })) as BackupProviderStatusProps;
			console.info({ status, provider });
			backupProviders[provider] = status;
		}
	});


	async function getAllBackupDeviceNames() {
		const names = await Browser.runtime.sendMessage({ msg: 'getAllBackupDeviceNames', provider: activeBackupProvider});
		return names;
	}

	async function backupImportDeviceChanged() {
		console.info({ selectedDevice });
		if(!selectedDevice) return;
		selectedBackupData = getBackupData();
	}

	async function selectedDeviceChanged() {
		backupImportDeviceChanged();
	}

	function submitImportData(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.stopImmediatePropagation(); 
		e.preventDefault(); 

		const formData = new FormData(e.currentTarget);

		function parseData(data: FormDataEntryValue | FormDataEntryValue[] | null){
			if(!data) return undefined;
			try {
				if(Array.isArray(data)){
					return data.map((d) => JSON.parse(d));
				}

				return JSON.parse(data as string);
			} catch(e) {
				return undefined;
			}
		}

		const data: ImportData = {
			settings: {
				backupEnabled: parseData(formData.get('backupEnabled')) || false,
				backupIntervalInMinutes: parseData(formData.get('backupInterval')),
				forceDefaultThemeIfDarkMode: parseData(formData.get('forceDefaultThemeIfDarkMode')),
				keepPinnedTabs: parseData(formData.get('keepPinnedTabs')),
				theme: parseData(formData.get('theme')),
				workspaces: {
					homeWorkspace: parseData(formData.get('homeWorkspace')),
					defaultWorkspaces: parseData(formData.getAll('defaultWorkspaces[]')) || [],
				}
			}, 
			windows: parseData(formData.getAll('windows[]')) || {}
		}!;

		console.info({ data });
		importData(data);
	}

	$effect(() => {
		untrack(() => mounted);
		if(!mounted) return;
		selectedDevice;
		selectedDeviceChanged();
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
				<h2 class="text-xl font-semibold text-[--heading-2-color] mb-4">Backup</h2>
				<div class="grid gap-1 mb-4">
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
				<div class="grid gap-1 mb-4">
					<label for="backup-interval-input" class="text-[--heading-2-color] font-semibold">
						{i18n.getMessage('backup_interval')}
					</label>
					<div class="flex gap-2 items-stretch">
						<input 
							id="backup-interval-input"
							type="number" 
							min="1" max="60" step="0.25"
							value={backupIntervalNumber}
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
				<label class="flex gap-2 items-center w-max my-4 cursor-pointer">
					<input 
						type="checkbox" 
						checked={backupEnabled} 
						disabled={!_deviceName?.length}
						onchange={(e) => setBackupEnabled(e.currentTarget.checked)}
					/>
					<span>{i18n.getMessage('enable_automatic_backup')}</span>
				</label>
				<div role="tablist" class="tabs grid gap-4 grid-rows-[auto_1fr] grid-cols-1 bg-[--table-cell-bg] p-2 rounded-md">
					{#each Object.entries(backupProviders) as [providerName, provider], i}
						<input 
							id="provider-{i}" 
							type="radio" 
							name="provider-tabs" 
							role="tab" 
							aria-label="Tab {i + 1}" 
							class="absolute pointer-events-none opacity-0" 
							checked={provider.selected}
						>
					{/each}
					<div class="flex rounded-md bg-[color-mix(in_srgb,_var(--table-cell-bg)_95%,_var(--button-primary-bg))] ">
						{#each Object.entries(backupProviders) as [providerName, provider], i}
							<label for="provider-{i}" class="row-start-1 cursor-pointer p-2 rounded-md flex gap-2 text-[--workspace-color]">
								{#if provider.selected}
									<span title={i18n.getMessage('selected')}>
										<Icon icon="check-cirlce" />
									</span>
								{/if}
								{#if provider.authorized}
									<span title={i18n.getMessage('authorized')}>
										<Icon icon="person" />
									</span>
								{/if}
								{providerName}
							</label>
						{/each}
					</div>
					<div>
						{#each Object.entries(backupProviders) as [providerName, provider], i}
							<div role="tabpanel" class="tab hidden gap-4 row-start-2 col-start-1">
								<div>
									<p>last backup: {provider?.lastBackupTimeStamp || '-'}</p>
								</div>
								{#if provider?.selected && provider.authorized}
									<button class="btn primary-btn" title={i18n.getMessage('disconnect_from_provider')} onclick={disconnectFromProvider}>
										<Icon icon="cloud-disconnect" />
										<span>{i18n.getMessage('disconnect')}</span>
									</button>
								{:else}
									<button 
										class="btn primary-btn" 
										title={i18n.getMessage('connect_to_provider')}
										onclick={openBackupProviderAuthPage}
										disabled={!_deviceName?.length && !deviceNameInput?.checkValidity()}
									>
										<Icon icon="sync" />
										<span>{i18n.getMessage('connect')}</span>
									</button>
								{/if}
								{#if provider?.authorized}
									<button class="btn primary-btn" disabled={!_deviceName?.length && !deviceNameInput?.checkValidity()} onclick={backupData}>
										<Icon icon="sync" />
										<span>{i18n.getMessage('backup')}</span>
									</button>
									<button 
										class="btn primary-btn" 
										disabled={!_deviceName?.length && !deviceNameInput?.checkValidity()} 
										onclick={async () => { 
											backupDialogElem?.showModal(); 
											const names = await getAllBackupDeviceNames();
											names && (backupDeviceNames = names);
										}}
									>
										<Icon icon="import-file" />
										<span>{i18n.getMessage('import_file')}...</span>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- <label class="grid gap-1">
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
				</label> -->
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

		{#snippet ImportDataSelection(data: typeof importedData)}
			{@const settings = data!.settings}
			{@const windowsArray = Object.entries(data!.windows)}
			{@const selectedWindowsCount = windowsArray.filter(([_, window]) => !window?.skip).length}

			<form class="grid overflow-hidden" action="javascript:void(0);" target="_self" method="post" onsubmit={submitImportData}>
				<ul class="grid grid-cols-[max-content_max-content_auto] border border-[--table-border-color] rounded-md overflow-auto [scrollbar-width:thin]" style:--table-border-color="light-dark(#eee,#43447b)">
					<li class="grid gap-2 items-center grid-cols-subgrid col-span-full py-2 px-4">
						<input 
							type="checkbox" 
							id=""
							on:change={(e) => {
								importSettingsCheckedVals = importSettingsCheckedVals.map((_) => e.currentTarget.checked);
								importDefaultWorkspacesCheckedVals = importDefaultWorkspacesCheckedVals.map((_) => e.currentTarget.checked);
							}}
							checked={importSettingsCheckAllCheckboxChecked}
							indeterminate={importSettingsCheckAllCheckboxIndeterminate}
						/>
						<span class="font-semibold ml-1">{i18n.getMessage('setting')}</span>
						<span class="font-semibold ml-4">{i18n.getMessage('value')}</span>
					</li>
					<li class="grid gap-2 items-center grid-cols-subgrid col-span-full py-2 px-4 border-t border-t-[--table-border-color] hover:bg-[light-dark(#f4f4fb,#323060)] has-[input:checked]:bg-blue-100 dark:has-[input:checked]:bg-blue-950">
						<input type="checkbox" name="theme" id="import_theme" bind:checked={importSettingsCheckedVals[0]} value={JSON.stringify(settings?.theme || '')}/>
						<label class="contents cursor-pointer" for="import_theme">
							<span class="ml-1">{i18n.getMessage('theme')}:</span>
							<span class="ml-4">{settings?.theme || i18n.getMessage('default')} </span>
						</label>
					</li>
					<li class="grid gap-2 items-center grid-cols-subgrid col-span-full py-2 px-4 border-t border-t-[--table-border-color] hover:bg-[light-dark(#f4f4fb,#323060)] has-[input:checked]:bg-blue-100 dark:has-[input:checked]:bg-blue-950">
						<input id="import_backupEnabled" name="backupEnabled" type="checkbox" bind:checked={importSettingsCheckedVals[1]} value={JSON.stringify(!!settings?.backupEnabled)}/>
						<label class="contents cursor-pointer" for="import_backupEnabled">
							<span class="ml-1">{i18n.getMessage('backup_enabled')}:</span>
							<span class="ml-4">{settings?.backupEnabled ? '✔' : '❌'}</span>
						</label>
					</li>
					{#if true}
						{@const value = settings?.backupIntervalInMinutes || DEFAULT_BACKUP_INTERVAL_IN_MINUTES}
						<li class="grid gap-2 items-center grid-cols-subgrid col-span-full py-2 px-4 border-t border-t-[--table-border-color] hover:bg-[light-dark(#f4f4fb,#323060)] has-[input:checked]:bg-blue-100 dark:has-[input:checked]:bg-blue-950">
							<input id="import_backupInterval" name="backupInterval" type="checkbox" bind:checked={importSettingsCheckedVals[2]} value={JSON.stringify(value)}/>
							<label class="contents cursor-pointer" for="import_backupInterval">
								<span class="ml-1">{i18n.getMessage('backup_interval')}:</span>
								<span class="ml-4">{value} {i18n.getMessage('minutes')}</span>
							</label>
						</li>
					{/if}
					<li class="grid gap-2 items-center grid-cols-subgrid col-span-full py-2 px-4 border-t border-t-[--table-border-color] hover:bg-[light-dark(#f4f4fb,#323060)] has-[input:checked]:bg-blue-100 dark:has-[input:checked]:bg-blue-950">
						<input type="checkbox" name="forceDefaultThemeIfDarkMode" id="import_forceDefaultThemeIfDarkMode" bind:checked={importSettingsCheckedVals[3]} value={JSON.stringify(!!settings?.forceDefaultThemeIfDarkMode)}/>
						<label class="contents cursor-pointer" for="import_forceDefaultThemeIfDarkMode">
							<span class="ml-1">{i18n.getMessage('force_default_dark_theme_in_dark_mode')}:</span>
							<span class="ml-4">{settings?.forceDefaultThemeIfDarkMode ? '✔' : '❌'}</span>
						</label>
					</li>
					<li class="grid gap-2 items-center grid-cols-subgrid col-span-full py-2 px-4 border-t border-t-[--table-border-color] hover:bg-[light-dark(#f4f4fb,#323060)] has-[input:checked]:bg-blue-100 dark:has-[input:checked]:bg-blue-950">
						<input type="checkbox" name="keepPinnedTabs" id="import_keepPinnedTabs" bind:checked={importSettingsCheckedVals[4]} value={JSON.stringify(!!settings?.keepPinnedTabs)}/>
						<label class="contents cursor-pointer" for="import_keepPinnedTabs">
							<span class="ml-1">{i18n.getMessage('keep_pinned_tabs')}:</span>
							<span class="ml-4">{settings?.keepPinnedTabs ? '✔' : '❌'}</span>
						</label>
					</li>
					{#if true}
						{@const icon = settings.workspaces.homeWorkspace.icon}
						{@const name = settings.workspaces.homeWorkspace.name}
						{@const value = `${icon} ${name}`}
						<li class="grid gap-2 items-center grid-cols-subgrid col-span-full py-2 px-4 border-t border-t-[--table-border-color] hover:bg-[light-dark(#f4f4fb,#323060)] has-[input:checked]:bg-blue-100 dark:has-[input:checked]:bg-blue-950">
							<input type="checkbox" name="homeWorkspace" id="import_homeWorkspace" bind:checked={importSettingsCheckedVals[5]} value={JSON.stringify({icon, name})}/>
							<label class="contents cursor-pointer" for="import_homeWorkspace">
								<span class="ml-1">{i18n.getMessage('home_workspace')}:</span>
								<span class="ml-4">{value}</span>
							</label>
						</li>
					{/if}
					<li class="col-span-full py-2 px-4 border-t border-t-[--table-border-color] has-[>div>input:checked]:bg-blue-100 dark:has-[>div>input:checked]:bg-blue-950 hover:bg-[light-dark(#f4f4fb,#323060)]">
						<div class="flex gap-2 items-center">
							<input 
								type="checkbox" 
								name="defaultWorkspacesAllChecked" 
								id="import_defaultWorkspaces" 
								checked={importDefaultWorkspacesAllChecked}
								onchange={(e) => {
									importSettingsCheckedVals[6] = e.currentTarget.checked;
									importDefaultWorkspacesCheckedVals = importDefaultWorkspacesCheckedVals.map((_) => e.currentTarget.checked);
								}}
								indeterminate={importDefaultWorkspacesIndeterminate}
							/>
							<label class="ml-1 w-full cursor-pointer" for="import_defaultWorkspaces">{i18n.getMessage('default_workspaces')}</label>
						</div>
						<ul class="ml-7 mt-4 grid gap-2">
							{#each settings.workspaces.defaultWorkspaces as defaultWorkspace, i}
								{@const icon = defaultWorkspace.icon}
								{@const name = defaultWorkspace.name}
								{@const value = `${icon} ${name}`}
								<li class="flex gap-2 items-center">
									<input type="checkbox" id="import_defaultWorkspace-{i}" name="defaultWorkspaces[]" value={JSON.stringify({icon, name})} bind:checked={importDefaultWorkspacesCheckedVals[i]}/>
									<label class="cursor-pointer" for="import_defaultWorkspace-{i}">{value}</label>
								</li>
								{:else}
								{i18n.getMessage('no_default_workspaces')}
							{/each}
						</ul>
					</li>
					<!------------------------------------------------------------------------------->
					<li class="grid gap-2 items-center grid-cols-subgrid col-span-full py-2 px-4 border-t border-t-[--table-border-color] border-dashed pt-6">
						<input
							id=""
							type="checkbox"
							checked={selectedWindowsCount === windowsArray.length}
							indeterminate={selectedWindowsCount > 0 && selectedWindowsCount !== windowsArray.length}
							onchange={(e) => windowsArray.forEach(([_, window]) => window.skip = !e.currentTarget.checked)}
						/>
						<span class="font-semibold ml-1">{i18n.getMessage('window')}</span>
						<span class="font-semibold ml-4">{i18n.getMessage('value')}</span>
					</li>
					{#each windowsArray as [windowUUID, window], i}
						<li
							class="group grid gap-2 items-start grid-cols-subgrid col-span-full py-2 px-4 border-t border-t-[--table-border-color] hover:bg-[light-dark(#f4f4fb,#323060)] has-[input:checked]:bg-blue-100 dark:has-[input:checked]:bg-blue-950"
						>
							<input
								id="import_window-{i}"
								type="checkbox"
								checked={window?.skip ? false : true}
								name="windows[]"
								value={JSON.stringify(window)}
								onchange={(e) => window.skip = !e.currentTarget.checked}
							/>
							<label for="import_window-{i}" class="ml-1 cursor-pointer -mt-[0.15rem]">
								{i18n.getMessage('window')} {i + 1}
							</label>
							<div class="grid gap-4 ml-4">
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
						</li>
					{/each}
				</ul>
				<div class="flex gap-2 items-center flex-wrap mt-4">
					<button 
						class="btn primary-btn disabled:pointer-events-none disabled:opacity-20" 
						disabled={selectedWindowsCount < 1 && importSettingsCheckAllCheckboxUnchecked}
					>
						<Icon icon="json-file" />
						{i18n.getMessage('import')}
					</button>
				</div>
			</form>
		{/snippet}

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
				{@render ImportDataSelection(importedData)}
			{/if}
		</dialog>
		<dialog 
			bind:this={backupDialogElem}
			class="open:grid content-start items-start gap-4 p-6 backdrop:bg-black/10 backdrop:backdrop-blur bg-[--body-bg] rounded-md w-[90dvw] h-[90dvh]"
		>
			<button
				class="btn ghost absolute right-6 top-6 w-max !p-0"
				onclick={() => backupDialogElem?.close()}
			>
				<Icon icon="cross"/>
			</button>
			<h1 class="text-xl font-semibold text-[--heading-2-color]">{i18n.getMessage('import_select_windows')}</h1>
			<div>
				<h2 class="text-lg font-semibold text-[--heading-2-color]">{i18n.getMessage('devices')}</h2>
				<div class="flex gap-2 items-center overflow-x-auto mt-1">
					{#each backupDeviceNames as deviceName}
						<label class="p-2 rounded-md border border-[--button-secondary-bg] has-[input:checked]:bg-blue-100 has-[input:checked]:border-blue-300 dark:has-[input:checked]:bg-blue-950 dark:has-[input:checked]:border-blue-800 cursor-pointer">
							<input type="radio" value={deviceName} bind:group={selectedDevice} onclick={(e) => {deviceName === selectedDevice && selectedDeviceChanged();}} name="backupDeviceNames" class="absolute pointer-events-none opacity-0" />
							{deviceName}
						</label>
						{:else}
						<p class="flex gap-2 items-center">
							<Spinner width={20} />
							{i18n.getMessage('loading_devices')}
						</p>
					{/each}
				</div>
			</div>
			{#if selectedDevice}
				{#await selectedBackupData}
					<p class="flex gap-2 items-center">
						<Spinner width={20} />
						{i18n.getMessage('loading_device_backup_data')}
					</p>
					{:then data}
						{@render ImportDataSelection(data)}
				{/await}
			{/if}
		</dialog>
	</main>
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

	[role="tab"]#provider-0 {
		&:checked ~ div > label[for="provider-0"] {
			@apply bg-[--button-primary-bg] text-[--button-primary-color];
		}

		&:checked ~ div > .tab:nth-child(1) {
			@apply grid;
		}
	}
</style>