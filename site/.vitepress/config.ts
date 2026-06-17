import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/arcus-plugin/',
  title: 'ARCUS',
  description: 'Any Repository Can Use Spec-driven development — a Spec → Code → Pull Request agentic SDLC factory.',
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Concepts', link: '/concepts/pipeline' }
    ],
    sidebar: [
      {
        text: 'Get Started',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Quickstart', link: '/guide/quickstart' },
          { text: 'How it works', link: '/guide/how-it-works' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'The ARCUS Pipeline', link: '/concepts/pipeline' },
          { text: 'Gated vs AFK Mode', link: '/concepts/modes' }
        ]
      }
    ],
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/piyushbhargava1412/arcus-plugin' }
    ]
  }
})
