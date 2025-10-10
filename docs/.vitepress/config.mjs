import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Meo Mai Moi",
  description: "Community-driven cat rescue and rehoming.",
  ignoreDeadLinks: [
    // Localhost URLs are expected to be dead during build
    /^http:\/\/localhost/,
    // API endpoints that don't exist during static build
    './api',
    // External files outside docs directory
    '../GEMINI.md'
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
