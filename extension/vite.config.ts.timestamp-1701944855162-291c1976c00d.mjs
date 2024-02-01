// vite.config.ts
import { defineConfig } from "file:///C:/Users/jayp/Repositories/tab-workspaces/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///C:/Users/jayp/Repositories/tab-workspaces/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import webExtension, { readJsonFile } from "file:///C:/Users/jayp/Repositories/tab-workspaces/node_modules/vite-plugin-web-extension/dist/index.js";
function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest
  };
}
var vite_config_default = defineConfig({
  resolve: {
    alias: [
      { find: "@root", replacement: "/src" },
      { find: "@root/*", replacement: "/src/*" },
      { find: "@components", replacement: "/src/components" },
      { find: "@components/*", replacement: "/src/components/*" },
      { find: "@pages", replacement: "/src/pages" },
      { find: "@pages/*", replacement: "/src/pages/*" }
    ]
  },
  plugins: [
    svelte(),
    webExtension({
      manifest: generateManifest,
      browser: "firefox",
      watchFilePaths: ["package.json", "manifest.json"],
      webExtConfig: {
        startUrl: "https://excalidraw.com"
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqYXlwXFxcXFJlcG9zaXRvcmllc1xcXFx0YWItd29ya3NwYWNlc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcamF5cFxcXFxSZXBvc2l0b3JpZXNcXFxcdGFiLXdvcmtzcGFjZXNcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2pheXAvUmVwb3NpdG9yaWVzL3RhYi13b3Jrc3BhY2VzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIjtcclxuaW1wb3J0IHdlYkV4dGVuc2lvbiwgeyByZWFkSnNvbkZpbGUgfSBmcm9tIFwidml0ZS1wbHVnaW4td2ViLWV4dGVuc2lvblwiO1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVNYW5pZmVzdCgpIHtcclxuXHRjb25zdCBtYW5pZmVzdCA9IHJlYWRKc29uRmlsZShcInNyYy9tYW5pZmVzdC5qc29uXCIpO1xyXG5cdGNvbnN0IHBrZyA9IHJlYWRKc29uRmlsZShcInBhY2thZ2UuanNvblwiKTtcclxuXHRyZXR1cm4ge1xyXG5cdFx0bmFtZTogcGtnLm5hbWUsXHJcblx0XHRkZXNjcmlwdGlvbjogcGtnLmRlc2NyaXB0aW9uLFxyXG5cdFx0dmVyc2lvbjogcGtnLnZlcnNpb24sXHJcblx0XHQuLi5tYW5pZmVzdCxcclxuXHR9O1xyXG59XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG5cdHJlc29sdmU6IHtcclxuXHRcdGFsaWFzOiBbXHJcblx0XHRcdHsgZmluZDogXCJAcm9vdFwiLCByZXBsYWNlbWVudDogXCIvc3JjXCIgfSxcclxuXHRcdFx0eyBmaW5kOiBcIkByb290LypcIiwgcmVwbGFjZW1lbnQ6IFwiL3NyYy8qXCIgfSxcclxuXHRcdFx0eyBmaW5kOiBcIkBjb21wb25lbnRzXCIsIHJlcGxhY2VtZW50OiBcIi9zcmMvY29tcG9uZW50c1wiIH0sXHJcblx0XHRcdHsgZmluZDogXCJAY29tcG9uZW50cy8qXCIsIHJlcGxhY2VtZW50OiBcIi9zcmMvY29tcG9uZW50cy8qXCIgfSxcclxuXHRcdFx0eyBmaW5kOiBcIkBwYWdlc1wiLCByZXBsYWNlbWVudDogXCIvc3JjL3BhZ2VzXCIgfSxcclxuXHRcdFx0eyBmaW5kOiBcIkBwYWdlcy8qXCIsIHJlcGxhY2VtZW50OiBcIi9zcmMvcGFnZXMvKlwiIH0sXHJcblx0XHRdLFxyXG5cdH0sXHJcblx0cGx1Z2luczogW1xyXG5cdFx0c3ZlbHRlKCksXHJcblx0XHR3ZWJFeHRlbnNpb24oe1xyXG5cdFx0XHRtYW5pZmVzdDogZ2VuZXJhdGVNYW5pZmVzdCxcclxuXHRcdFx0YnJvd3NlcjogXCJmaXJlZm94XCIsXHJcblx0XHRcdHdhdGNoRmlsZVBhdGhzOiBbXCJwYWNrYWdlLmpzb25cIiwgXCJtYW5pZmVzdC5qc29uXCJdLFxyXG5cdFx0XHR3ZWJFeHRDb25maWc6IHtcclxuXHRcdFx0XHRzdGFydFVybDogXCJodHRwczovL2V4Y2FsaWRyYXcuY29tXCIsXHJcblx0XHRcdH0sXHJcblx0XHR9KSxcclxuXHRdLFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VCxTQUFTLG9CQUFvQjtBQUNwVixTQUFTLGNBQWM7QUFDdkIsT0FBTyxnQkFBZ0Isb0JBQW9CO0FBRTNDLFNBQVMsbUJBQW1CO0FBQzNCLFFBQU0sV0FBVyxhQUFhLG1CQUFtQjtBQUNqRCxRQUFNLE1BQU0sYUFBYSxjQUFjO0FBQ3ZDLFNBQU87QUFBQSxJQUNOLE1BQU0sSUFBSTtBQUFBLElBQ1YsYUFBYSxJQUFJO0FBQUEsSUFDakIsU0FBUyxJQUFJO0FBQUEsSUFDYixHQUFHO0FBQUEsRUFDSjtBQUNEO0FBR0EsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDM0IsU0FBUztBQUFBLElBQ1IsT0FBTztBQUFBLE1BQ04sRUFBRSxNQUFNLFNBQVMsYUFBYSxPQUFPO0FBQUEsTUFDckMsRUFBRSxNQUFNLFdBQVcsYUFBYSxTQUFTO0FBQUEsTUFDekMsRUFBRSxNQUFNLGVBQWUsYUFBYSxrQkFBa0I7QUFBQSxNQUN0RCxFQUFFLE1BQU0saUJBQWlCLGFBQWEsb0JBQW9CO0FBQUEsTUFDMUQsRUFBRSxNQUFNLFVBQVUsYUFBYSxhQUFhO0FBQUEsTUFDNUMsRUFBRSxNQUFNLFlBQVksYUFBYSxlQUFlO0FBQUEsSUFDakQ7QUFBQSxFQUNEO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUixPQUFPO0FBQUEsSUFDUCxhQUFhO0FBQUEsTUFDWixVQUFVO0FBQUEsTUFDVixTQUFTO0FBQUEsTUFDVCxnQkFBZ0IsQ0FBQyxnQkFBZ0IsZUFBZTtBQUFBLE1BQ2hELGNBQWM7QUFBQSxRQUNiLFVBQVU7QUFBQSxNQUNYO0FBQUEsSUFDRCxDQUFDO0FBQUEsRUFDRjtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
