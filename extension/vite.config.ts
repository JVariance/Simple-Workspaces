import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { enhancedImages } from "@sveltejs/enhanced-img";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
	const manifest = readJsonFile("src/manifest.json");
	const pkg = readJsonFile("package.json");
	return {
		name: pkg.name,
		description: pkg.description,
		version: pkg.version,
		...manifest,
	};
}

// https://vitejs.dev/config/
export default defineConfig({
	resolve: {
		alias: [
			{ find: "@root", replacement: "/src" },
			{ find: "@root/*", replacement: "/src/*" },
			{ find: "@background", replacement: "/src/background" },
			{ find: "@background/*", replacement: "/src/background/*" },
			{ find: "@components", replacement: "/src/components" },
			{ find: "@components/*", replacement: "/src/components/*" },
			{ find: "@pages", replacement: "/src/pages" },
			{ find: "@pages/*", replacement: "/src/pages/*" },
		],
	},
	esbuild: {
		// drop: ["console", "debugger"],
	},
	plugins: [
		enhancedImages(),
		svelte(),
		webExtension({
			manifest: generateManifest,
			browser: "firefox",
			watchFilePaths: ["package.json", "manifest.json"],
			additionalInputs: [
				"src/pages/Welcome/welcome.html",
				"src/pages/Welcome/welcome.ts",
			],
			webExtConfig: {
				startUrl: "https://excalidraw.com",
			},
		}),
	],
});
