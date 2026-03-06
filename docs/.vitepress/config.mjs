import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Meo Mai Moi",
  description:
    "Documentation for the pet care, rescue, and rehoming platform born from a cat rescue in Vietnam.",
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
      { text: "Dev App", link: "https://dev.meo-mai-moi.com" },
      { text: "Prod App", link: "https://meo-mai-moi.com" },
      { text: "Development", link: "/development" },
      { text: "Architecture", link: "/architecture" },
      { text: "Features", link: "/features" },
      { text: "Philosophy", link: "/philosophy" },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Documentation Home", link: "/" },
          { text: "Features Overview", link: "/features" },
          { text: "Development Guide", link: "/development" },
          { text: "Architecture", link: "/architecture" },
          { text: "Philosophy", link: "/philosophy" },
        ],
      },
      {
        text: "Core Guides",
        items: [
          { text: "Authentication", link: "/authentication" },
          { text: "API Integration", link: "/api-integration" },
          { text: "API Conventions", link: "/api-conventions" },
          { text: "Rate Limiting", link: "/rate-limiting" },
          { text: "Deployment", link: "/deploy" },
          { text: "Troubleshooting", link: "/troubleshooting" },
          { text: "Internationalization", link: "/i18n" },
        ],
      },
      {
        text: "Domain Features",
        items: [
          { text: "Pet Profiles", link: "/pet-profiles" },
          { text: "Pet Relationships", link: "/pet-relationship-system" },
          {
            text: "Placement Request Lifecycle",
            link: "/placement-request-lifecycle",
          },
          { text: "Helper Profiles", link: "/helper-profiles" },
          { text: "Categories", link: "/categories" },
          { text: "Notifications", link: "/notifications" },
          { text: "Push Notifications", link: "/push-notifications" },
          { text: "Invites", link: "/invites" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/troioi-vn/meo-mai-moi" },
    ],
  },
});
