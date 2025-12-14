import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Meo Mai Moi",
  description: "Community-driven cat rescue and rehoming.",
  // Serve docs under /docs when hosted behind the main app
  // This ensures generated links and assets resolve correctly
  base: "/docs/",
  ignoreDeadLinks: [
    // Localhost URLs are expected to be dead during build
    /^http:\/\/localhost/,
    // API endpoints that don't exist during static build
    "./api",
    // External files outside docs directory - match various patterns
    /\.\.\/.*GEMINI/,
  ],
  markdown: {
    config: (md) => {
      const shiki = md.options.highlight;
      md.options.highlight = (str, lang, attrs) => {
        if (lang === "env") {
          lang = "sh"; // or 'bash' or any other language you want to map to
        }
        return shiki(str, lang, attrs);
      };
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Examples", link: "/markdown-examples" },
    ],

    sidebar: [
      {
        text: "Examples",
        items: [
          { text: "Markdown Examples", link: "/markdown-examples" },
          { text: "Runtime API Examples", link: "/api-examples" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
