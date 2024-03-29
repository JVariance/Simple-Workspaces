// vite.config.ts
import { defineConfig } from "file:///C:/Users/jayp/Repositories/simple-workspaces-for-firefox/extension/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///C:/Users/jayp/Repositories/simple-workspaces-for-firefox/extension/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import { enhancedImages } from "file:///C:/Users/jayp/Repositories/simple-workspaces-for-firefox/extension/node_modules/@sveltejs/enhanced-img/src/index.js";
import webExtension, { readJsonFile } from "file:///C:/Users/jayp/Repositories/simple-workspaces-for-firefox/extension/node_modules/vite-plugin-web-extension/dist/index.js";
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
      { find: "@background", replacement: "/src/background" },
      { find: "@background/*", replacement: "/src/background/*" },
      { find: "@components", replacement: "/src/components" },
      { find: "@components/*", replacement: "/src/components/*" },
      { find: "@pages", replacement: "/src/pages" },
      { find: "@pages/*", replacement: "/src/pages/*" }
    ]
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
        "src/pages/Changelog/changelog.html",
        "src/pages/Changelog/changelog.ts"
      ],
      webExtConfig: {
        startUrl: "https://excalidraw.com"
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqYXlwXFxcXFJlcG9zaXRvcmllc1xcXFxzaW1wbGUtd29ya3NwYWNlcy1mb3ItZmlyZWZveFxcXFxleHRlbnNpb25cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGpheXBcXFxcUmVwb3NpdG9yaWVzXFxcXHNpbXBsZS13b3Jrc3BhY2VzLWZvci1maXJlZm94XFxcXGV4dGVuc2lvblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvamF5cC9SZXBvc2l0b3JpZXMvc2ltcGxlLXdvcmtzcGFjZXMtZm9yLWZpcmVmb3gvZXh0ZW5zaW9uL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIjtcclxuaW1wb3J0IHsgZW5oYW5jZWRJbWFnZXMgfSBmcm9tIFwiQHN2ZWx0ZWpzL2VuaGFuY2VkLWltZ1wiO1xyXG5pbXBvcnQgd2ViRXh0ZW5zaW9uLCB7IHJlYWRKc29uRmlsZSB9IGZyb20gXCJ2aXRlLXBsdWdpbi13ZWItZXh0ZW5zaW9uXCI7XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZU1hbmlmZXN0KCkge1xyXG5cdGNvbnN0IG1hbmlmZXN0ID0gcmVhZEpzb25GaWxlKFwic3JjL21hbmlmZXN0Lmpzb25cIik7XHJcblx0Y29uc3QgcGtnID0gcmVhZEpzb25GaWxlKFwicGFja2FnZS5qc29uXCIpO1xyXG5cdHJldHVybiB7XHJcblx0XHRuYW1lOiBwa2cubmFtZSxcclxuXHRcdGRlc2NyaXB0aW9uOiBwa2cuZGVzY3JpcHRpb24sXHJcblx0XHR2ZXJzaW9uOiBwa2cudmVyc2lvbixcclxuXHRcdC4uLm1hbmlmZXN0LFxyXG5cdH07XHJcbn1cclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcblx0cmVzb2x2ZToge1xyXG5cdFx0YWxpYXM6IFtcclxuXHRcdFx0eyBmaW5kOiBcIkByb290XCIsIHJlcGxhY2VtZW50OiBcIi9zcmNcIiB9LFxyXG5cdFx0XHR7IGZpbmQ6IFwiQHJvb3QvKlwiLCByZXBsYWNlbWVudDogXCIvc3JjLypcIiB9LFxyXG5cdFx0XHR7IGZpbmQ6IFwiQGJhY2tncm91bmRcIiwgcmVwbGFjZW1lbnQ6IFwiL3NyYy9iYWNrZ3JvdW5kXCIgfSxcclxuXHRcdFx0eyBmaW5kOiBcIkBiYWNrZ3JvdW5kLypcIiwgcmVwbGFjZW1lbnQ6IFwiL3NyYy9iYWNrZ3JvdW5kLypcIiB9LFxyXG5cdFx0XHR7IGZpbmQ6IFwiQGNvbXBvbmVudHNcIiwgcmVwbGFjZW1lbnQ6IFwiL3NyYy9jb21wb25lbnRzXCIgfSxcclxuXHRcdFx0eyBmaW5kOiBcIkBjb21wb25lbnRzLypcIiwgcmVwbGFjZW1lbnQ6IFwiL3NyYy9jb21wb25lbnRzLypcIiB9LFxyXG5cdFx0XHR7IGZpbmQ6IFwiQHBhZ2VzXCIsIHJlcGxhY2VtZW50OiBcIi9zcmMvcGFnZXNcIiB9LFxyXG5cdFx0XHR7IGZpbmQ6IFwiQHBhZ2VzLypcIiwgcmVwbGFjZW1lbnQ6IFwiL3NyYy9wYWdlcy8qXCIgfSxcclxuXHRcdF0sXHJcblx0fSxcclxuXHRlc2J1aWxkOiB7XHJcblx0XHQvLyBkcm9wOiBbXCJjb25zb2xlXCIsIFwiZGVidWdnZXJcIl0sXHJcblx0fSxcclxuXHRwbHVnaW5zOiBbXHJcblx0XHRlbmhhbmNlZEltYWdlcygpLFxyXG5cdFx0c3ZlbHRlKCksXHJcblx0XHR3ZWJFeHRlbnNpb24oe1xyXG5cdFx0XHRtYW5pZmVzdDogZ2VuZXJhdGVNYW5pZmVzdCxcclxuXHRcdFx0YnJvd3NlcjogXCJmaXJlZm94XCIsXHJcblx0XHRcdHdhdGNoRmlsZVBhdGhzOiBbXCJwYWNrYWdlLmpzb25cIiwgXCJtYW5pZmVzdC5qc29uXCJdLFxyXG5cdFx0XHRhZGRpdGlvbmFsSW5wdXRzOiBbXHJcblx0XHRcdFx0XCJzcmMvcGFnZXMvV2VsY29tZS93ZWxjb21lLmh0bWxcIixcclxuXHRcdFx0XHRcInNyYy9wYWdlcy9XZWxjb21lL3dlbGNvbWUudHNcIixcclxuXHRcdFx0XHRcInNyYy9wYWdlcy9DaGFuZ2Vsb2cvY2hhbmdlbG9nLmh0bWxcIixcclxuXHRcdFx0XHRcInNyYy9wYWdlcy9DaGFuZ2Vsb2cvY2hhbmdlbG9nLnRzXCIsXHJcblx0XHRcdF0sXHJcblx0XHRcdHdlYkV4dENvbmZpZzoge1xyXG5cdFx0XHRcdHN0YXJ0VXJsOiBcImh0dHBzOi8vZXhjYWxpZHJhdy5jb21cIixcclxuXHRcdFx0fSxcclxuXHRcdH0pLFxyXG5cdF0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9ZLFNBQVMsb0JBQW9CO0FBQ2phLFNBQVMsY0FBYztBQUN2QixTQUFTLHNCQUFzQjtBQUMvQixPQUFPLGdCQUFnQixvQkFBb0I7QUFFM0MsU0FBUyxtQkFBbUI7QUFDM0IsUUFBTSxXQUFXLGFBQWEsbUJBQW1CO0FBQ2pELFFBQU0sTUFBTSxhQUFhLGNBQWM7QUFDdkMsU0FBTztBQUFBLElBQ04sTUFBTSxJQUFJO0FBQUEsSUFDVixhQUFhLElBQUk7QUFBQSxJQUNqQixTQUFTLElBQUk7QUFBQSxJQUNiLEdBQUc7QUFBQSxFQUNKO0FBQ0Q7QUFHQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMzQixTQUFTO0FBQUEsSUFDUixPQUFPO0FBQUEsTUFDTixFQUFFLE1BQU0sU0FBUyxhQUFhLE9BQU87QUFBQSxNQUNyQyxFQUFFLE1BQU0sV0FBVyxhQUFhLFNBQVM7QUFBQSxNQUN6QyxFQUFFLE1BQU0sZUFBZSxhQUFhLGtCQUFrQjtBQUFBLE1BQ3RELEVBQUUsTUFBTSxpQkFBaUIsYUFBYSxvQkFBb0I7QUFBQSxNQUMxRCxFQUFFLE1BQU0sZUFBZSxhQUFhLGtCQUFrQjtBQUFBLE1BQ3RELEVBQUUsTUFBTSxpQkFBaUIsYUFBYSxvQkFBb0I7QUFBQSxNQUMxRCxFQUFFLE1BQU0sVUFBVSxhQUFhLGFBQWE7QUFBQSxNQUM1QyxFQUFFLE1BQU0sWUFBWSxhQUFhLGVBQWU7QUFBQSxJQUNqRDtBQUFBLEVBQ0Q7QUFBQSxFQUNBLFNBQVM7QUFBQTtBQUFBLEVBRVQ7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNSLGVBQWU7QUFBQSxJQUNmLE9BQU87QUFBQSxJQUNQLGFBQWE7QUFBQSxNQUNaLFVBQVU7QUFBQSxNQUNWLFNBQVM7QUFBQSxNQUNULGdCQUFnQixDQUFDLGdCQUFnQixlQUFlO0FBQUEsTUFDaEQsa0JBQWtCO0FBQUEsUUFDakI7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNEO0FBQUEsTUFDQSxjQUFjO0FBQUEsUUFDYixVQUFVO0FBQUEsTUFDWDtBQUFBLElBQ0QsQ0FBQztBQUFBLEVBQ0Y7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
