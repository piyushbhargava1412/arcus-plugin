---
title: Meet the ARCUS Team
layout: page
---

<div class="comic-page">

<p class="back-link"><a href="/">← Back to the ARCUS docs</a></p>

<header class="cover">
  <span class="issue">SELF PACED COURSE</span>
  <h1>The ARCUS<br>Team</h1>
  <p class="tagline">Seven teammates who take your story from a rough idea to a reviewed pull request. Get onboarded, no prior reading required.</p>
  <svg class="cover-art" viewBox="0 0 900 240" role="img" aria-label="The seven ARCUS teammates line up in front of a kanban board">
    <path d="M0 208 Q150 190 300 206 T600 204 T900 208 L900 240 L0 240 Z" fill="#2a160c"/>
    <rect x="60" y="40" width="500" height="130" rx="6" fill="#1a120a" stroke="#4a3220" stroke-width="3"/>
    <path d="M160 40 v130 M260 40 v130 M360 40 v130 M460 40 v130" stroke="#4a3220" stroke-width="2"/>
    <g font-family="Arial Narrow, Impact" font-weight="800" font-size="9" fill="#f3c14a">
      <text x="110" y="56" text-anchor="middle">PLAN</text>
      <text x="210" y="56" text-anchor="middle">TEST</text>
      <text x="310" y="56" text-anchor="middle">BUILD</text>
      <text x="410" y="56" text-anchor="middle">REVIEW</text>
      <text x="530" y="56" text-anchor="middle">SHIP</text>
    </g>
    <CastIcon name="angelina" x="620" y="70" width="110" height="110" />
    <CastIcon name="genie" x="720" y="60" width="100" height="130" />
    <CastIcon name="lucie" x="40" y="90" width="100" height="100" />
    <g stroke="rgba(255,255,255,.5)" stroke-width="1.6" fill="none">
      <circle cx="600" cy="40" r="3.4"/><circle cx="610" cy="28" r="2.4"/>
      <circle cx="820" cy="40" r="3"/><circle cx="830" cy="26" r="2"/>
    </g>
  </svg>
</header>

<ComicChapter no="ROSTER" cmd="one team, seven jobs">Meet the ARCUS team</ComicChapter>

<ComicStrip>

<ComicPanel :span="4">
  <template #caption>Lucie — Lead</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 200 120" role="img" aria-label="Lucie, the Lead"><path d="M0 100 Q50 90 100 98 T200 96 L200 120 L0 120 Z" fill="#2a160c"/><CastIcon name="lucie" x="52" y="6" width="96" height="96" /></svg>
  </template>
  <template #talk><TalkBubble who="Lucie">I run the board — every ticket, every checkpoint, gated or AFK. I'm the only one who sees the whole roadmap.</TalkBubble></template>
</ComicPanel>

<ComicPanel :span="4">
  <template #caption>Angelina — Architect</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 200 120" role="img" aria-label="Angelina, the Architect"><path d="M0 100 Q50 90 100 98 T200 96 L200 120 L0 120 Z" fill="#2a160c"/><CastIcon name="angelina" x="52" y="6" width="96" height="96" /></svg>
  </template>
  <template #talk><TalkBubble who="Angelina">I read the codebase, ground every ambiguity in your story, and hand back a spec and a plan worth building.</TalkBubble></template>
</ComicPanel>

<ComicPanel :span="4">
  <template #caption>Quinn — QA</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 200 120" role="img" aria-label="Quinn, QA"><path d="M0 100 Q50 90 100 98 T200 96 L200 120 L0 120 Z" fill="#2a160c"/><CastIcon name="quinn" x="52" y="6" width="96" height="96" /></svg>
  </template>
  <template #talk><TalkBubble who="Quinn">Before a line of code exists, I've already found every edge case that's going to bite you.</TalkBubble></template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<ComicPanel :span="4">
  <template #caption>Diana — Developer</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 200 120" role="img" aria-label="Diana, the Developer"><path d="M0 100 Q50 90 100 98 T200 96 L200 120 L0 120 Z" fill="#2a160c"/><CastIcon name="diana" x="52" y="6" width="96" height="96" /></svg>
  </template>
  <template #talk><TalkBubble who="Diana">Hand me one ticket in a sealed room and I'll build it, test it, and clean it up. Give me three tickets and you get three of me.</TalkBubble></template>
</ComicPanel>

<ComicPanel :span="4">
  <template #caption>Steffi — Staff Engineer</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 200 120" role="img" aria-label="Steffi, the Staff Engineer"><path d="M0 100 Q50 90 100 98 T200 96 L200 120 L0 120 Z" fill="#2a160c"/><CastIcon name="steffi" x="52" y="6" width="96" height="96" /></svg>
  </template>
  <template #talk><TalkBubble who="Steffi">I read the whole diff, brutal in the hunt — but I'm fair in the verdict. One real nit never blocks a clean change.</TalkBubble></template>
</ComicPanel>

<ComicPanel :span="4">
  <template #caption>Benny — Build Bot</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 200 120" role="img" aria-label="Benny, the Build Bot"><path d="M0 100 Q50 90 100 98 T200 96 L200 120 L0 120 Z" fill="#2a160c"/><CastIcon name="benny" x="52" y="6" width="96" height="96" /></svg>
  </template>
  <template #talk><TalkBubble who="Benny">BEEP. TESTS. BUILD. SECRETS. NO OPINIONS. JUST FACTS.</TalkBubble></template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<ComicPanel :span="12">
  <template #caption>Genie — Guide</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 420 120" role="img" aria-label="Genie, the Guide, floating beside the board"><path d="M0 100 Q110 90 210 98 T420 96 L420 120 L0 120 Z" fill="#2a160c"/><CastIcon name="genie" x="24" y="6" width="96" height="112" /></svg>
  </template>
  <template #talk><TalkBubble who="Genie">I'm not on the board — I'm the one who explains the board. Ask me "where am I" or "what's this fact card mean" any time. That's my whole job, and I'll be narrating the rest of this issue.</TalkBubble></template>
</ComicPanel>

</ComicStrip>

<ComicChapter no="PROLOGUE" cmd="how the team actually works">The team's toolkit</ComicChapter>

<ComicStrip>

<ComicPanel :span="7" tilt="l">
  <template #caption>Exhibit A — the shared notebook</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 420 130" role="img" aria-label="Angelina keeps a shared notebook of five files describing the codebase, with an index card taped to the front">
      <path d="M0 108 Q110 96 210 106 T420 104 L420 130 L0 130 Z" fill="#2a160c"/>
      <CastIcon name="angelina" x="20" y="14" width="110" height="110" />
      <g transform="translate(180 14) rotate(-2)">
        <rect width="130" height="98" rx="4" fill="#f3e6cd" stroke="#241a10" stroke-width="3"/>
        <text x="65" y="20" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="12" fill="#241a10">.context/</text>
        <text x="10" y="36" font-family="ui-monospace, Menlo" font-size="8" fill="#6b5642">repo_scope.md</text>
        <text x="10" y="48" font-family="ui-monospace, Menlo" font-size="8" fill="#6b5642">repo_map.md</text>
        <text x="10" y="60" font-family="ui-monospace, Menlo" font-size="8" fill="#6b5642">flows/*.md</text>
        <text x="10" y="72" font-family="ui-monospace, Menlo" font-size="8" fill="#6b5642">testing-patterns.md</text>
        <text x="10" y="84" font-family="ui-monospace, Menlo" font-size="8" fill="#6b5642">design-and-coding-patterns.md</text>
      </g>
      <g transform="translate(322 78) rotate(4)">
        <rect width="76" height="40" rx="3" fill="#fffaf0" stroke="#241a10" stroke-width="2.5"/>
        <text x="38" y="16" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="9" fill="#2b1e14">AGENTS.md</text>
        <text x="38" y="30" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="7" fill="#6b5642">@ CLAUDE.md</text>
      </g>
      <path d="M296 70 q10 4 20 8" stroke="#d1372a" stroke-width="2.5" fill="none" stroke-dasharray="4 4"/>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina">Five files under <code>.context/</code> are the whole team's shared notebook: what this codebase does, how it's laid out, how the flows run, how it's tested, and the patterns worth copying. I write it once and never re-learn the codebase from scratch.</TalkBubble>
    <TalkBubble who="Genie" :right="true"><code>AGENTS.md</code> is just the index card taped to the notebook's cover — it points any teammate at the right page for the job at hand. <code>CLAUDE.md</code> is one line: <code>@AGENTS.md</code>. One notebook, every host reads it.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="5" tilt="r">
  <template #caption>Exhibit B — you can call anyone by name</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 300 130" role="img" aria-label="A speech bubble reading slash arcus colon repo-agentifier, addressed to the whole team">
      <path d="M0 108 Q80 96 160 106 T300 104 L300 130 L0 130 Z" fill="#2a160c"/>
      <CastIcon name="genie" x="20" y="6" width="90" height="106" />
      <g transform="translate(150 30)">
        <rect x="0" y="40" width="14" height="46" rx="3" fill="#4a3220"/>
        <circle cx="7" cy="18" r="13" fill="#d1372a" stroke="#241a10" stroke-width="2.5"/>
      </g>
      <text x="200" y="30" font-family="Arial Narrow, Impact" font-weight="800" font-size="15" fill="#f3c14a" transform="rotate(-6 200 30)">repo-agentifier</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Genie">A <em>skill</em> is a teammate you can ring directly — name them, like <code>repo-agentifier</code>, or just describe what you want and the right person answers. It lives in <code>plugins/arcus/skills/&lt;name&gt;/SKILL.md</code> and joins the conversation the moment you call it.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<ComicPanel :span="5" tilt="l">
  <template #caption>Exhibit C — some teammates you never call yourself</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 300 130" role="img" aria-label="Lucie quietly asks Steffi to step into a side room, out of view of the user">
      <path d="M0 108 Q80 96 160 106 T300 104 L300 130 L0 130 Z" fill="#2a160c"/>
      <CastIcon name="lucie" x="120" y="10" width="120" height="120" />
      <g transform="translate(20 60) rotate(-3)">
        <rect width="86" height="30" rx="3" fill="#fffaf0" stroke="#241a10" stroke-width="2"/>
        <text x="43" y="19" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="9" fill="#2b1e14">"psst — Steffi."</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Lucie">An <em>agent</em> never sits in the main meeting — no one types a trigger for it. I loop it in by name, it works alone in its own room, and reports back a summary. Lives flat in <code>plugins/arcus/agents/&lt;name&gt;.md</code>.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="7" tilt="r">
  <template #caption>Exhibit D — teammate vs specialist, side by side</template>
  <div class="split">
    <div class="col">
      <h4>Skill — you can call them</h4>
      <ul>
        <li>User <strong>and</strong> Lucie can ring them, by bare name: <code>repo-agentifier</code></li>
        <li>Joins the main conversation directly</li>
        <li>8 of ARCUS's 26 jobs are called this way</li>
      </ul>
    </div>
    <div class="col">
      <h4>Agent — only looped in by name</h4>
      <ul>
        <li>Never a trigger a person types themselves</li>
        <li>Works alone, in its own space</li>
        <li>18 of ARCUS's 26 jobs work this way</li>
      </ul>
    </div>
  </div>
  <template #talk>
    <TalkBubble who="Genie">You can ring Angelina yourself to ground a spec. You'd never ring the security specialist directly — Steffi loops that one in herself, during review.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<ComicPanel :span="6" tilt="r">
  <template #caption>Exhibit E — the office is ready before anyone sits down</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 130" role="img" aria-label="A doorbell wired directly to the office lights, ringing before anyone appears">
      <path d="M0 108 Q90 96 180 106 T360 104 L360 130 L0 130 Z" fill="#2a160c"/>
      <g transform="translate(40 20)">
        <circle cx="24" cy="24" r="22" fill="#f3c14a" stroke="#241a10" stroke-width="2.5"/>
        <path d="M24 12 v10 M24 26 v2" stroke="#241a10" stroke-width="3" stroke-linecap="round"/>
      </g>
      <path d="M88 44 h70" stroke="#8a5a2b" stroke-width="3" stroke-dasharray="5 4"/>
      <g transform="translate(170 16)">
        <rect width="70" height="56" rx="4" fill="#f3e6cd" stroke="#241a10" stroke-width="2.5"/>
        <text x="35" y="24" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="8" fill="#2b1e14">SessionStart</text>
        <text x="35" y="40" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="7" fill="#6b5642">bootstrap.sh</text>
      </g>
      <text x="290" y="46" font-family="Arial Narrow, Impact" font-weight="800" font-size="14" fill="#f3c14a">✨ lit!</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Genie">A <em>hook</em> isn't a teammate anyone calls — it's wired into the building itself and fires on its own event. In both Claude Code and Copilot CLI, <code>bootstrap.sh</code> runs on <code>SessionStart</code> before anyone says a word. Copilot CLI runs it from the plugin's own install directory though, not the session's — so it reads the real one off the hook's own payload. Either way Lucie never <em>relies</em> on the hook alone: she re-stages the toolbox herself at the top of every run.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="6" tilt="l">
  <template #caption>Exhibit F — the whole team, in one crate</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 130" role="img" aria-label="A crate labeled arcus-plugin arriving at a harbor sign labeled arcus marketplace">
      <path d="M0 108 Q90 96 180 106 T360 104 L360 130 L0 130 Z" fill="#2a160c"/>
      <g transform="translate(50 22) rotate(-2)">
        <rect width="96" height="60" rx="4" fill="#8a5a2b" stroke="#241a10" stroke-width="3"/>
        <path d="M0 20 h96 M32 20 v40 M64 20 v40" stroke="#241a10" stroke-width="2.5"/>
        <text x="48" y="14" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="10" fill="#fff">arcus-plugin</text>
      </g>
      <path d="M240 84 v-52" stroke="#241a10" stroke-width="4"/>
      <path d="M240 32 h74 l-9 9 9 9 h-74 Z" fill="#f3c14a" stroke="#241a10" stroke-width="2.5"/>
      <text x="248" y="45" font-family="Arial Narrow, Impact" font-weight="800" font-size="10" fill="#241a10">arcus MARKET</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Lucie">ARCUS: <em>Any Repository Can Use Spec-driven development.</em> <code>arcus-plugin</code> is the crate the whole team ships in — skills, agents, scripts, one bootstrap hook, one version. The <code>arcus</code> marketplace is where you add it from. Same crate works in Claude Code, VS Code, Copilot CLI, and OpenCode.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<FactCard :span="12" tip="-.5deg" tease="Lost mid-pipeline? There's a teammate for that — what does she answer?">
  Genie is the plugin's own help desk — always on standby, never part of the board itself. Ask her "where am I", "what stage am I in", "gated or afk", or "what's in .arcus" and she answers from wherever your session actually is. No story required to invoke her.
</FactCard>

</ComicStrip>

<ComicChapter no="CH. 0" cmd="Angelina walks the codebase · run once per repo">Day one</ComicChapter>

<ComicStrip>

<ComicPanel :span="7" tilt="l">
  <template #caption>A brand new codebase. No notebook yet.</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 420 150" role="img" aria-label="Angelina stands confused in front of a wall of unlabeled folders">
      <path d="M0 124 Q110 110 210 122 T420 120 L420 150 L0 150 Z" fill="#2a160c"/>
      <CastIcon name="angelina" x="30" y="30" width="110" height="110" />
      <g stroke="#6b5642" stroke-width="2.5" fill="none">
        <rect x="180" y="30" width="30" height="60" rx="2"/>
        <rect x="230" y="20" width="30" height="70" rx="2"/>
        <rect x="280" y="40" width="30" height="50" rx="2"/>
        <rect x="330" y="26" width="30" height="64" rx="2"/>
      </g>
      <text x="330" y="18" font-family="Arial Narrow, Impact" font-weight="800" font-size="22" fill="#f3c14a" transform="rotate(-6 330 18)">?!</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina">Four thousand files and not one of them explained to me yet. Before the team takes a single ticket, I need to know this codebase cold.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="5" tilt="r">
  <template #caption>Four passes, done together, not one at a time</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 300 150" role="img" aria-label="Four labeled note cards representing overview, flows, tests, and patterns, completed in parallel">
      <path d="M0 124 Q80 110 160 122 T300 120 L300 150 L0 150 Z" fill="#2a160c"/>
      <g font-family="Arial Narrow, Impact" font-weight="800" font-size="9" fill="#241a10">
        <g transform="translate(14 24) rotate(-3)"><rect width="60" height="70" rx="3" fill="#f3e6cd" stroke="#241a10" stroke-width="2"/><text x="30" y="40" text-anchor="middle">OVERVIEW</text></g>
        <g transform="translate(84 16) rotate(2)"><rect width="60" height="70" rx="3" fill="#f3e6cd" stroke="#241a10" stroke-width="2"/><text x="30" y="40" text-anchor="middle">FLOWS</text></g>
        <g transform="translate(154 26) rotate(-2)"><rect width="60" height="70" rx="3" fill="#f3e6cd" stroke="#241a10" stroke-width="2"/><text x="30" y="40" text-anchor="middle">TESTS</text></g>
        <g transform="translate(224 18) rotate(3)"><rect width="60" height="70" rx="3" fill="#f3e6cd" stroke="#241a10" stroke-width="2"/><text x="30" y="40" text-anchor="middle">PATTERNS</text></g>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina">Four passes at once, not queued one after another: what the repo does, how the business flows run, how it's tested, what patterns repeat. Nobody waits on anybody.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<FactCard :span="6" tip="-.8deg" tease="Three words explain Angelina's whole approach to the notebook — what are they?">
  <strong>Scan once, scope per story, sync on drift.</strong> Angelina writes the shared <code>.context/</code> notebook a single time; every story after that pulls only the page it needs into a compact pack; and after a change merges, only what actually drifted gets synced — never a full rewrite.
</FactCard>

<ComicPanel :span="6" tilt="l">
  <template #caption>Day one complete. Once per repo — or when it's gutted.</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 300 120" role="img" aria-label="Angelina pins a finished notebook on the wall, labeled">
      <path d="M0 100 Q80 88 160 98 T300 96 L300 120 L0 120 Z" fill="#2a160c"/>
      <CastIcon name="angelina" x="30" y="20" width="100" height="100" />
      <g transform="translate(180 24) rotate(2)">
        <rect width="90" height="60" rx="4" fill="#f3c14a" stroke="#241a10" stroke-width="2.5"/>
        <text x="45" y="24" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="11" fill="#241a10">CODEBASE</text>
        <text x="45" y="40" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="11" fill="#241a10">MAPPED</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina">Every later stage reads this. I only redo the whole scan after a major restructure or a tech-stack change — day to day, a small sync keeps it honest for free.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicChapter no="CH. 1" cmd="Angelina grounds the spec · Gate A">The brainstorm</ComicChapter>

<ComicStrip>

<ComicPanel :span="6" tilt="r">
  <template #caption>A ticket lands on the board</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 130" role="img" aria-label="A story ticket is pinned to the first column of the board">
      <path d="M0 108 Q90 96 180 106 T360 104 L360 130 L0 130 Z" fill="#2a160c"/>
      <g transform="translate(40 30) rotate(-4)">
        <rect width="70" height="40" rx="2" fill="#fffaf0" stroke="#241a10" stroke-width="2"/>
        <text x="35" y="18" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="9" fill="#2b1e14">story.md</text>
        <path d="M8 26 h54 M8 32 h40" stroke="#c9b896" stroke-width="1.6"/>
      </g>
      <CastIcon name="lucie" x="180" y="14" width="110" height="110" />
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Lucie">"<code>plan story.md</code>" and it's on the board — Angelina takes it from here.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="6" tilt="l">
  <template #caption>A compact pack, not the whole notebook</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 130" role="img" aria-label="Angelina builds a compact context pack rather than handing over the whole notebook">
      <path d="M0 108 Q90 96 180 106 T360 104 L360 130 L0 130 Z" fill="#2a160c"/>
      <CastIcon name="angelina" x="30" y="10" width="110" height="110" />
      <g transform="translate(200 48) rotate(3)">
        <rect width="70" height="46" rx="4" fill="#f3e6cd" stroke="#241a10" stroke-width="2.5"/>
        <text x="35" y="22" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="8" fill="#2b1e14">context-pack</text>
        <text x="35" y="34" text-anchor="middle" font-family="ui-monospace, Menlo" font-size="7" fill="#6b5642">.md</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina">I never hand a story the whole notebook — just the compact slice it actually needs. A quick first pass, plain inputs in, one bundle out.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<ComicPanel :span="7" tilt="r">
  <template #caption>Every open question, handed over in one go</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 420 130" role="img" aria-label="Angelina offers a checklist card of several open questions, each with a recommended option, a rationale, and room for a custom answer">
      <path d="M0 108 Q110 96 210 106 T420 104 L420 130 L0 130 Z" fill="#2a160c"/>
      <CastIcon name="angelina" x="20" y="10" width="110" height="110" />
      <g transform="translate(180 12) rotate(-1)">
        <rect width="180" height="100" rx="4" fill="#fffaf0" stroke="#241a10" stroke-width="2.5"/>
        <text x="12" y="18" font-family="Arial Narrow, Impact" font-weight="800" font-size="9" fill="#241a10">3 open questions</text>
        <text x="12" y="32" font-family="Arial Narrow, Impact" font-weight="800" font-size="8" fill="#241a10">SF-1 Token expiry window?</text>
        <rect x="12" y="37" width="156" height="15" rx="3" fill="#d3f2df" stroke="#2e9e5b" stroke-width="1.5"/>
        <text x="18" y="47" font-family="Comic Sans MS" font-size="7" fill="#1f5c37">✓ Recommended: 30 min (= session TTL)</text>
        <text x="12" y="66" font-family="Arial Narrow, Impact" font-weight="800" font-size="8" fill="#241a10">SF-2 Refresh on idle?</text>
        <text x="12" y="76" font-family="Comic Sans MS" font-size="7" fill="#6b5642">✓ Recommended: no</text>
        <text x="12" y="92" font-family="Comic Sans MS" font-size="7" fill="#6b5642">— answer all in one reply, your own words fine —</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina">I never actually stop and chat. I always decide everything myself, then jot the calls I was least sure about into an <b>Open Questions</b> list — each with exactly one recommended option and a one-line reason. In gated mode Lucie hands you that whole list at once, so you answer in a single reply, in your own words if you like. In AFK mode nobody reads it and my picks just stand.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="5" tilt="l">
  <template #caption>Two documents come out the other side</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 300 130" role="img" aria-label="Two documents, grounded-spec.md and plan.md, sit ready with a gate sign">
      <path d="M0 108 Q80 96 160 106 T300 104 L300 130 L0 130 Z" fill="#2a160c"/>
      <g transform="translate(30 20) rotate(-3)"><CastIcon name="doc" x="0" y="0" width="60" height="60" />
        <text x="30" y="74" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="8" fill="#f3c14a">grounded-spec.md</text>
      </g>
      <g transform="translate(140 24) rotate(3)"><CastIcon name="doc" x="0" y="0" width="60" height="60" />
        <text x="30" y="74" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="8" fill="#f3c14a">plan.md</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina"><code>grounded-spec.md</code> is every resolved ambiguity and its acceptance criteria. <code>plan.md</code> is the atomic <code>### Task N:</code> list. Gate A: say "yes", or come back later with <code>generate test plan for &lt;STORY&gt;</code>.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicChapter no="INTERLUDE" cmd="interactive vs autonomous — same Lucie, two speeds">Lucie's two speeds</ComicChapter>

<ComicStrip>

<ComicPanel :span="6" tilt="l">
  <template #caption>Careful Lucie — checks in at every gate</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 140" role="img" aria-label="Lucie pauses at a checkpoint with her hand up, waiting for a nod before proceeding">
      <path d="M0 118 Q90 106 180 116 T360 114 L360 140 L0 140 Z" fill="#2a160c"/>
      <path d="M200 30 v88" stroke="#4a3220" stroke-width="6"/>
      <CastIcon name="lucie" x="60" y="18" width="120" height="120" />
      <text x="280" y="70" font-family="Arial Narrow, Impact" font-weight="800" font-size="16" fill="#f3c14a" transform="rotate(-4 280 70)">"...yes?"</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Lucie"><strong>Interactive</strong> is my default. I stop <em>once</em> — when Angelina has questions she is not sure about — hand you the whole list, and then run all the way to the pull request. If she has no questions, I do not stop at all. Best for a new codebase, a risky change, or a story with any TBD in it.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="6" tilt="r">
  <template #caption>Turbo Lucie — one uninterrupted run</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 140" role="img" aria-label="Lucie blurs through the whole board at once with motion lines">
      <path d="M0 118 Q90 106 180 116 T360 114 L360 140 L0 140 Z" fill="#2a160c"/>
      <path d="M140 30 v88 M220 30 v88 M300 30 v88" stroke="#4a3220" stroke-width="5" stroke-dasharray="1 1" opacity=".5"/>
      <g transform="translate(30 18)"><CastIcon name="lucie" width="120" height="120" /></g>
      <path d="M20 74 h300" stroke="#f3c14a" stroke-width="3" stroke-dasharray="10 8" opacity=".7"/>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Lucie"><strong>Autonomous (AFK)</strong> is the same me, no brakes. Trigger with <code>forge</code>, <code>afk</code>, or <code>run afk on &lt;STORY&gt;</code> — every stage runs back-to-back, every gate auto-confirms, milestones only. Only for a spec I already trust.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<FactCard :span="12" tip="-.4deg" tease="Can Lucie change speed mid-story — swap gated for AFK partway through?">
  <strong>No.</strong> Mode is set once, at the very start, and persists through every stage — you cannot switch gated → AFK or AFK → gated mid-run. Both speeds are still the <em>same</em> Lucie underneath; they only differ in whether she pauses and asks you. When in doubt, the house rule is simple: start gated.
</FactCard>

</ComicStrip>

<ComicChapter no="CH. 2" cmd="Quinn designs the test matrix · Gate B">Quinn finds the edges first</ComicChapter>

<ComicStrip>

<ComicPanel :span="12" tilt="r">
  <template #caption>Before a single line of code — the test matrix</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 800 130" role="img" aria-label="Quinn tags every case under its task section: happy path, edge case, error case, or regression">
      <path d="M0 108 Q200 92 400 106 T800 104 L800 130 L0 130 Z" fill="#2a160c"/>
      <CastIcon name="quinn" x="30" y="6" width="120" height="120" />
      <g font-family="Arial Narrow, Impact" font-weight="800" font-size="11" fill="#241a10">
        <rect x="185" y="30" width="130" height="30" rx="4" fill="#d3f2df" stroke="#241a10" stroke-width="2"/>
        <text x="250" y="50" text-anchor="middle">HAPPY PATH</text>
        <rect x="325" y="30" width="130" height="30" rx="4" fill="#fdeec2" stroke="#241a10" stroke-width="2"/>
        <text x="390" y="50" text-anchor="middle">EDGE CASE</text>
        <rect x="465" y="30" width="130" height="30" rx="4" fill="#ffd8d1" stroke="#241a10" stroke-width="2"/>
        <text x="530" y="50" text-anchor="middle">ERROR CASE</text>
        <rect x="605" y="30" width="130" height="30" rx="4" fill="#e0d8f7" stroke="#241a10" stroke-width="2"/>
        <text x="670" y="50" text-anchor="middle">REGRESSION</text>
      </g>
      <text x="415" y="90" text-anchor="middle" font-family="Comic Sans MS" font-size="12" fill="#f3e6cd">→ test-plan.md, every case under its ### Task N: section</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Quinn">Happy path, boundary conditions, and every way this could fail — designed before code exists, following whatever <code>.context/testing-patterns.md</code> already established. That's TDD, not an afterthought. Gate B: <code>implement &lt;STORY&gt;</code> when you're happy with the matrix.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicChapter no="CH. 3" cmd="Diana takes the tickets · Gate C">Diana, times three</ComicChapter>

<ComicStrip>

<ComicPanel :span="6" tilt="l">
  <template #caption>The branch didn't exist until now</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 130" role="img" aria-label="A door labeled arcus slash STORY-1 is installed for the first time">
      <path d="M0 108 Q90 96 180 106 T360 104 L360 130 L0 130 Z" fill="#2a160c"/>
      <CastIcon name="lucie" x="30" y="14" width="100" height="100" />
      <g transform="translate(200 20) rotate(-2)">
        <rect width="70" height="90" rx="3" fill="#5c4326" stroke="#241a10" stroke-width="2.5"/>
        <circle cx="58" cy="48" r="3" fill="#f3c14a"/>
        <text x="35" y="16" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="7" fill="#fff">arcus/</text>
        <text x="35" y="26" text-anchor="middle" font-family="ui-monospace, Menlo" font-weight="700" font-size="7" fill="#fff">STORY-1</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Lucie">Day one only <em>planned</em> the branch name — no git branch existed yet. Only now, at the start of Implementation, do I actually create <code>arcus/&lt;STORY&gt;-N</code>, re-checking for name collisions since day one. Planning stays entirely on the base branch; we only branch once there's real code to commit. Unless the room I woke up in already <em>had</em> a door — see the card below.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="6" tilt="r">
  <template #caption>Every ticket, its own sealed room</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 140" role="img" aria-label="Three sealed rooms each with a copy of Diana inside, working independently">
      <path d="M0 118 Q90 106 180 116 T360 114 L360 140 L0 140 Z" fill="#2a160c"/>
      <g stroke="#4a3220" stroke-width="3" fill="none">
        <rect x="20" y="16" width="90" height="94" rx="4"/>
        <rect x="130" y="16" width="90" height="94" rx="4"/>
        <rect x="240" y="16" width="90" height="94" rx="4"/>
      </g>
      <CastIcon name="diana" x="34" y="34" width="60" height="72" />
      <CastIcon name="diana" x="144" y="34" width="60" height="72" />
      <CastIcon name="diana" x="254" y="34" width="60" height="72" />
      <text x="65" y="30" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="10" fill="#f3c14a">TASK 1</text>
      <text x="175" y="30" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="10" fill="#f3c14a">TASK 2</text>
      <text x="285" y="30" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="10" fill="#f3c14a">TASK 3</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Diana">Lucie parses every <code>### Task N:</code> heading and sends each one to a fresh copy of me: implementation, tests, my own tidy-up pass, and one lightweight advisory spec check. None of us can see each other's code — which is exactly why quality isn't judged per ticket.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<FactCard :span="12" tip=".5deg" tease="If no room reviews a ticket's code quality, who does?">
  <strong>Nobody — on purpose, not yet.</strong> Per-ticket work only gets one <em>advisory</em> spec-compliance pass; unresolved issues carry forward rather than hard-blocking. Full quality is owned <strong>holistically</strong> by Steffi, over the <em>whole</em> branch diff — because the Dianas never saw each other's work, only the finished change can be judged as a whole.
</FactCard>

<FactCard :span="12" tip="-.4deg" tease="What if the room already has a door?">
  <strong>Then Lucie uses it instead of cutting a new one.</strong> A <em>git worktree</em> is a workspace your session host already checked out on a dedicated branch — and it has usually bound the pull request to that branch. Installing <code>arcus/&lt;STORY&gt;-N</code> next to it would leave the story in a room nobody is watching. So on day one Lucie <strong>adopts</strong> the branch she woke up on, points the base at the repo default (a door can't open onto itself), and marks the branch stage done before Implementation ever starts. <code>--new-branch</code> overrides her if you really did want a new door.
</FactCard>

</ComicStrip>

<ComicChapter no="CH. 4" cmd="Benny's gate → Steffi's review · Gate D">Benny, then Steffi</ComicChapter>

<ComicStrip>

<ComicPanel :span="6" tilt="l">
  <template #caption>Tier 1 — no nuance, no negotiating</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 150" role="img" aria-label="Benny blocks the doorway completely, a chase halted instantly">
      <path d="M0 128 Q90 116 180 126 T360 124 L360 150 L0 150 Z" fill="#2a160c"/>
      <CastIcon name="benny" x="120" y="10" width="130" height="130" />
      <g font-family="Arial Narrow, Impact" font-weight="800" font-size="10" fill="#f3e6cd">
        <text x="30" y="30">✗ typecheck</text>
        <text x="30" y="46">✗ full test suite</text>
        <text x="30" y="62">✗ build + smoke</text>
        <text x="30" y="78">✗ secret scan</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Benny">I run the repo's <em>real</em> tooling — never a model eyeballing the diff. Any hard block on typecheck, tests, build, or a leaked secret ends it immediately: no review from Steffi, straight to <code>changes_requested</code>. Lint and format get auto-fixed and committed where possible.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="6" tilt="r">
  <template #caption>Tier 2 — five checklists, only if Benny lets it through</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 150" role="img" aria-label="Steffi holds five labeled checklists covering spec, quality, security, performance, and history">
      <path d="M0 128 Q90 116 180 126 T360 124 L360 150 L0 150 Z" fill="#2a160c"/>
      <CastIcon name="steffi" x="120" y="8" width="120" height="120" />
      <g font-family="Arial Narrow, Impact" font-weight="700" font-size="8" fill="#f3e6cd">
        <text x="30" y="40">SPEC</text>
        <text x="30" y="56">QUALITY</text>
        <text x="30" y="72">SECURITY</text>
        <text x="30" y="88">PERFORMANCE</text>
        <text x="30" y="104">HISTORY</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Steffi">Spec compliance and code quality look at the <em>whole</em> diff holistically; security and performance hunt concrete regressions; the history lens catches load-bearing complexity someone quietly deleted. That last one skips docs-only diffs and shallow history.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicStrip>

<ComicPanel :span="12" tilt="l">
  <template #caption>The verdict — and the round that resets, but not forever</template>
  <div class="loop-flow">
    <span class="chip bad">changes_requested</span>
    <span class="arrow">→</span>
    <span class="chip">fix-tasks appended to plan.md</span>
    <span class="arrow">→</span>
    <span class="chip">back to Diana</span>
    <span class="arrow">→</span>
    <span class="chip">re-review</span>
    <span class="arrow">→ up to 3× →</span>
    <span class="chip good">approved</span>
    <span class="arrow">→</span>
    <span class="chip good">notebook sync → PR</span>
  </div>
  <template #talk>
    <TalkBubble who="Steffi">No review round resets forever. This one is <strong>bounded to 3 rounds.</strong> Still failing on round 3, and it stops for a human — not because we gave up, but because a review loop that never ends helps nobody.</TalkBubble>
    <TalkBubble who="Lucie" :right="true">And if you disagree with a finding? You can override the verdict and proceed anyway. Findings get three severities — <code>critical</code> blocks, <code>warning</code> is real but survivable, <code>suggestion</code> never blocks.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicChapter no="CH. 5" cmd="Angelina syncs the notebook → Lucie ships">Notebook sync</ComicChapter>

<ComicStrip>

<ComicPanel :span="6" tilt="r">
  <template #caption>Only the pages that actually changed get synced</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 130" role="img" aria-label="Angelina relabels one file out of five, leaving the rest untouched">
      <path d="M0 108 Q90 96 180 106 T360 104 L360 130 L0 130 Z" fill="#2a160c"/>
      <CastIcon name="angelina" x="30" y="12" width="100" height="100" />
      <g stroke="#6b5642" stroke-width="2" fill="none">
        <rect x="180" y="30" width="26" height="52" rx="2"/>
        <rect x="216" y="30" width="26" height="52" rx="2" stroke="#f3c14a" stroke-width="3"/>
        <rect x="252" y="30" width="26" height="52" rx="2"/>
        <rect x="288" y="30" width="26" height="52" rx="2"/>
      </g>
      <text x="229" y="24" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="16" fill="#f3c14a">✎</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina">I assess the <em>approved</em> diff and update only the notebook pages it materially touched — facts-only, diff-driven, no full rewrite. <code>design-and-coding-patterns.md</code> is static by design: it moves only when a pattern truly recurs, ≥3 places, or gets superseded.</TalkBubble>
  </template>
</ComicPanel>

<ComicPanel :span="6" tilt="l">
  <template #caption>The ticket ships</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 360 130" role="img" aria-label="Lucie moves the ticket into the final column as a pull request forms">
      <path d="M0 108 Q90 96 180 106 T360 104 L360 130 L0 130 Z" fill="#2a160c"/>
      <g transform="translate(220 26) rotate(-3)">
        <rect width="80" height="70" rx="4" fill="#1a120a" stroke="#4a3220" stroke-width="2.5"/>
        <text x="40" y="20" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="9" fill="#f3c14a">SHIP</text>
        <rect x="10" y="30" width="60" height="26" rx="2" fill="#fffaf0" stroke="#241a10" stroke-width="1.6"/>
      </g>
      <CastIcon name="lucie" x="60" y="14" width="110" height="110" />
      <text x="260" y="118" text-anchor="middle" font-family="Arial Narrow, Impact" font-weight="800" font-size="10" fill="#f3c14a">PR OPEN</text>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Lucie">Notebook sync moves straight into Closure — no gate, no asking. I run the final suite, synthesize the PR body from the story, the grounded spec, the plan, and every review round, then push and open it for real.</TalkBubble>
  </template>
</ComicPanel>

</ComicStrip>

<ComicChapter no="ADVANCED" cmd="you don't need the whole team">Ask one teammate alone</ComicChapter>

<ComicStrip>

<ComicPanel :span="7" tilt="r">
  <template #caption>Just Angelina, no ticket, no board</template>
  <template #scene>
    <svg class="scene" viewBox="0 0 420 140" role="img" aria-label="Angelina works alone at a small desk, detached from the board, with plain inputs and outputs">
      <path d="M0 118 Q110 106 210 116 T420 114 L420 140 L0 140 Z" fill="#2a160c"/>
      <CastIcon name="angelina" x="20" y="20" width="110" height="110" />
      <g transform="translate(180 14)">
        <rect width="130" height="90" rx="4" fill="#f3e6cd" stroke="#241a10" stroke-width="2.5"/>
        <text x="65" y="20" text-anchor="middle" font-family="Comic Sans MS" font-weight="700" font-size="9" fill="#241a10">"reset my password</text>
        <text x="65" y="34" text-anchor="middle" font-family="Comic Sans MS" font-weight="700" font-size="9" fill="#241a10">from the login screen"</text>
        <text x="65" y="56" text-anchor="middle" font-family="Comic Sans MS" font-size="8" fill="#6b5642">no story ID, no branch,</text>
        <text x="65" y="68" text-anchor="middle" font-family="Comic Sans MS" font-size="8" fill="#6b5642">no checkpoint needed</text>
        <text x="65" y="84" text-anchor="middle" font-family="Comic Sans MS" font-size="8" fill="#1f5c37">out: resolved ambiguities</text>
      </g>
    </svg>
  </template>
  <template #talk>
    <TalkBubble who="Angelina">You've never run ARCUS, no notebook, no checkpoint, no branch. You can still ask me directly with a plain sentence and get back resolved ambiguities and acceptance criteria. No ARCUS filename ever enters the conversation — just plain, ordinary language.</TalkBubble>
  </template>
</ComicPanel>

<FactCard :span="5" tip="-.6deg" tease="Ask a teammate alone — where does their work land, with no board to file it on?">
  Every teammate can work solo. Filed through Lucie's board, the result lands wherever the ticket lives — <code>.arcus/specs/&lt;STORY-ID&gt;/</code>. Asked alone, with no ticket, it defaults to a plain, predictable spot — <code>.arcus/outputs/&lt;name&gt;/</code> — discoverable with no board state at all.
</FactCard>

</ComicStrip>

## Pin-up page: how to talk to the team

| Say this | You get |
| --- | --- |
| "agentify this repo" / `repo-agentifier` | **Once per repo.** Angelina scans in parallel, writes the notebook, pins up `AGENTS.md` + `CLAUDE.md`. |
| `plan <STORY>` or `implement <STORY>` | **Interactive (gated), the default.** Lucie stops once for the open questions, then runs to the PR. |
| `forge <STORY>` / `afk <STORY>` / `run afk on <STORY>` | **Autonomous.** Every stage back-to-back, milestone-only output, no pauses. |
| `generate test plan for <STORY>` | Cold-resume into **Quinn's Test Plan** at Gate A. |
| `review <STORY>` | Cold-resume into **Steffi's Code Review** at Gate C. |
| `sync context` | Standalone notebook sync, outside the board. |
| `create pull request for <STORY>` | Cold-resume into **Lucie's Closure**. |
| `resume <STORY>` | Continue from the first incomplete stage, in whatever mode the checkpoint remembers. |
| "where am I" / "arcus help" | **Genie** — the always-on help desk. |

<ClientOnly>
  <ComicQuiz />
</ClientOnly>

<p class="footer-note">Every fact in this issue is lifted from the skills and docs themselves — <code>pipeline.md</code>, <code>modes.md</code>, <code>capability-library.md</code>, <code>context-engineering.md</code>, and the SKILL.md frontmatter. To be continued in your repo. 🧑‍💻</p>

</div>

<style scoped>
.comic-page :deep(.back-link) {
  margin: 0 0 14px;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  font-size: 13px;
}
.comic-page :deep(.back-link a) {
  color: var(--comic-ink-soft);
  text-decoration: none;
  border-bottom: 2.5px dotted var(--comic-coral);
}

.comic-page {
  font-family: "Comic Sans MS", "Chalkboard SE", "Comic Neue", "Segoe Print", sans-serif;
  line-height: 1.45;
  color: var(--comic-ink);
  background: var(--comic-paper);
  background-image: radial-gradient(var(--comic-paper-dot) 1.2px, transparent 1.2px);
  background-size: 14px 14px;
  max-width: min(1600px, 94vw);
  margin: 0 auto;
  padding: 28px 20px 80px;
}
.comic-page :deep(code) {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: .88em;
  background: rgba(138, 90, 43, .14);
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}

/* ---------- Cover ---------- */
.comic-page :deep(.cover) {
  border: 4px solid var(--comic-panel-border);
  border-radius: 6px;
  background: linear-gradient(180deg, #8a4a2a 0%, #4a2818 62%, #2a160c 100%);
  color: #fff;
  padding: 34px 28px 0;
  position: relative;
  overflow: hidden;
  box-shadow: 6px 6px 0 rgba(0, 0, 0, .28);
}
.comic-page :deep(.cover .issue) {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--comic-caption-bg);
  color: var(--comic-caption-ink);
  border: 3px solid var(--comic-panel-border);
  padding: 6px 12px;
  font-weight: 800;
  letter-spacing: .08em;
  transform: rotate(3deg);
  font-size: 13px;
}
.comic-page :deep(.cover h1) {
  margin: 0;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  font-weight: 800;
  font-style: italic;
  font-size: clamp(42px, 8vw, 76px);
  line-height: .95;
  letter-spacing: .01em;
  text-transform: uppercase;
  text-shadow: 4px 4px 0 #2a160c, 6px 6px 0 rgba(209, 55, 42, .85);
  text-wrap: balance;
}
.comic-page :deep(.cover .tagline) {
  margin: 14px 0 0;
  font-size: 17px;
  max-width: 40ch;
  color: #ffe4b8;
}
.comic-page :deep(.cover .cover-art) { display: block; width: 100%; margin-top: 8px; }

/* ---------- Field-guide split panel (Exhibit D) ---------- */
.comic-page :deep(.split) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px 12px 2px;
}
.comic-page :deep(.split .col) {
  background: rgba(255, 255, 255, .94);
  color: var(--comic-bubble-ink);
  border: 2.5px solid var(--comic-panel-border);
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 12.5px;
  line-height: 1.45;
}
.comic-page :deep(.split .col h4) {
  margin: 0 0 4px;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--comic-coral);
}
.comic-page :deep(.split .col:last-child h4) { color: var(--comic-purple); }
.comic-page :deep(.split .col ul) { margin: 0; padding-left: 16px; }
.comic-page :deep(.split .col li) { margin: 2px 0; }
@media (max-width: 520px) {
  .comic-page :deep(.split) { grid-template-columns: 1fr; }
}

/* ---------- The loop diagram (CH. 4) ---------- */
.comic-page :deep(.loop-flow) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
}
.comic-page :deep(.chip) {
  background: var(--comic-bubble-bg);
  color: var(--comic-bubble-ink);
  border: 3px solid var(--comic-panel-border);
  padding: 8px 13px;
  font-weight: 800;
  font-size: 13.5px;
  text-transform: uppercase;
  letter-spacing: .06em;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, .3);
}
.comic-page :deep(.chip.bad) { background: #ffd8d1; }
.comic-page :deep(.chip.good) { background: #d3f2df; }
.comic-page :deep(.arrow) { color: #f3c14a; font-weight: 800; font-size: 20px; font-family: sans-serif; }

/* ---------- Cheat-sheet table ---------- */
.comic-page :deep(table) {
  margin-top: 56px;
}

.comic-page :deep(.footer-note) {
  margin-top: 30px;
  text-align: center;
  font-size: 13px;
  color: var(--comic-ink-soft);
}

@media (prefers-reduced-motion: no-preference) {
  .comic-page :deep(.cover-art .bob) { animation: comic-bob 4.5s ease-in-out infinite; }
  @keyframes comic-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-7px); }
  }
}
</style>
