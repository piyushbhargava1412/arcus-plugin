import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import CastIcon from './components/comic/CastIcon.vue'
import ComicChapter from './components/comic/ComicChapter.vue'
import ComicStrip from './components/comic/ComicStrip.vue'
import ComicPanel from './components/comic/ComicPanel.vue'
import TalkBubble from './components/comic/TalkBubble.vue'
import FactCard from './components/comic/FactCard.vue'
import ComicQuiz from './components/comic/ComicQuiz.vue'
import './custom.css'
import './comic/tokens.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CastIcon', CastIcon)
    app.component('ComicChapter', ComicChapter)
    app.component('ComicStrip', ComicStrip)
    app.component('ComicPanel', ComicPanel)
    app.component('TalkBubble', TalkBubble)
    app.component('FactCard', FactCard)
    app.component('ComicQuiz', ComicQuiz)
  },
} satisfies Theme
