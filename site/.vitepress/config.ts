import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid({
  base: '/arcus-plugin/',
  title: 'ARCUS',
  description: 'Any Repository Can Use Spec-driven development — a Spec → Code → Pull Request agentic SDLC factory.',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/arcus-plugin/favicon.ico' }]
  ],
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
          { text: 'Context Engineering', link: '/concepts/context-engineering' },
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
  },
  mermaid: {
    flowchart: {
      padding: 32,
      nodeSpacing: 60,
      rankSpacing: 90
    },
    themeVariables: {
      fontSize: '32px'
    }
  },
  vite: {
    optimizeDeps: {
      include: ['mermaid', 'dayjs', '@braintree/sanitize-url', 'debug', 'cytoscape', 'cytoscape-cose-bilkent']
    },
    ssr: {
      noExternal: ['mermaid', 'vitepress-plugin-mermaid']
    }
  }
})
