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
      { text: 'Concepts', link: '/concepts/pipeline' },
      { text: 'Meet the Team 🧑‍💻', link: '/comic/' }
    ],
    sidebar: [
      {
        text: 'Get Started',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Quickstart', link: '/guide/quickstart' },
          { text: 'How it works', link: '/guide/how-it-works' },
          { text: 'Meet the ARCUS Team 🧑‍💻', link: '/comic/' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'The ARCUS Pipeline', link: '/concepts/pipeline' },
          { text: 'The Capability Library', link: '/concepts/capability-library' },
          { text: 'Context Engineering', link: '/concepts/context-engineering' },
          { text: 'Three Modes, One Pipeline', link: '/concepts/modes' },
          { text: 'Running Across Hosts', link: '/concepts/cross-host' }
        ]
      }
    ],
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/piyushbhargava1412/arcus-plugin' }
    ],
    footer: {
      message:
        'Released under the <a href="https://github.com/piyushbhargava1412/arcus-plugin/blob/main/LICENSE">Apache-2.0 License</a>. ' +
        '"ARCUS" and the ARCUS logo are marks of Piyush Bhargava — see the <a href="https://github.com/piyushbhargava1412/arcus-plugin/blob/main/TRADEMARK.md">trademark policy</a>.',
      copyright: 'Copyright © 2025 Piyush Bhargava'
    }
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
