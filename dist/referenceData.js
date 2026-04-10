"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deckModes = exports.jarvisCapabilities = exports.g0dm0d3Modes = exports.skillClusters = exports.sourceProjects = exports.atlasStats = void 0;
exports.atlasStats = [
    {
        label: 'Curated skills',
        value: '5,211+',
        detail: 'OpenClaw skills catalog size surfaced in the uploaded README.',
    },
    {
        label: 'Registry entries',
        value: '13,729',
        detail: 'The larger registry behind the curated list and category index.',
    },
    {
        label: 'Model modes',
        value: '5',
        detail: 'The G0DM0D3 stack exposes multiple routing and prompt modes.',
    },
    {
        label: 'Legacy assistant verbs',
        value: '10+',
        detail: 'JARVIS covers speech, OCR, news, weather, email, and control flows.',
    },
];
exports.sourceProjects = [
    {
        title: 'OpenClaw Skills Atlas',
        source: 'awesome-openclaw-skills-main',
        summary: 'A curated registry with install guidance, category maps, and explicit safety curation for agent workflows.',
        highlights: ['5,211 curated skills', 'Security-first index language', 'Browser, DevOps, research, and IDE lanes'],
        accent: '#4fc3f7',
    },
    {
        title: 'Paperclip Orchestration',
        source: 'paperclipai/paperclip',
        summary: 'Open-source orchestration for zero-human companies, combining goals, org charts, budgets, and governance for multi-agent teams.',
        highlights: ['Bring your own agents', 'Heartbeat scheduling and task routing', 'Budget controls with audit trails'],
        accent: '#58d68d',
    },
    {
        title: 'G0DM0D3 Cockpit',
        source: 'G0DM0D3-main',
        summary: 'A single-file style control surface for multi-model routing, AutoTune, Parseltongue, STM, and feedback loops.',
        highlights: ['50+ model targets', 'Privacy-first localStorage', 'OpenAI SDK-compatible API layer'],
        accent: '#9b87f5',
    },
    {
        title: 'JARVIS Assistant',
        source: 'J.A.R.V.I.S-master',
        summary: 'A Python voice assistant that mixes speech, browser control, OCR, email, weather, news, and memory tasks.',
        highlights: ['Voice switching', 'Face recognition', 'YouTube, maps, and dictionary utilities'],
        accent: '#ff7a59',
    },
];
exports.skillClusters = [
    {
        title: 'Coding Agents & IDEs',
        countLabel: '1,200+',
        summary: 'High-volume agent scaffolding, editor helpers, and repository-aware coding workflows.',
        bullets: ['Direct repo editing', 'Prompt-driven code generation', 'Agent orchestration in the editor'],
        accent: '#8bd3ff',
    },
    {
        title: 'Browser & Automation',
        countLabel: '322',
        summary: 'Web interaction, form filling, device control, and automation surfaces.',
        bullets: ['Browser control', 'UI testing', 'Multi-step task sequencing'],
        accent: '#58d68d',
    },
    {
        title: 'DevOps & Cloud',
        countLabel: '392',
        summary: 'Infrastructure, deployment, observability, and cloud management tooling.',
        bullets: ['Cloud APIs', 'Monitoring', 'Deployment and rollback'],
        accent: '#f4c542',
    },
    {
        title: 'Search & Research',
        countLabel: '352',
        summary: 'Source discovery, feed digestion, academic search, and evidence gathering.',
        bullets: ['Feed readers', 'Paper digests', 'Research workflows'],
        accent: '#ff9f7f',
    },
    {
        title: 'Productivity & Planning',
        countLabel: 'Featured',
        summary: 'Task tracking, planning loops, and memory systems that keep work moving.',
        bullets: ['Daily planners', 'Goal tracking', 'Persistent memory'],
        accent: '#9b87f5',
    },
    {
        title: 'Voice & Media',
        countLabel: 'Featured',
        summary: 'Speech, transcription, TTS, audio generation, and media workflows.',
        bullets: ['Voice assistants', 'OCR', 'Audio pipelines'],
        accent: '#ff7a59',
    },
];
exports.g0dm0d3Modes = [
    {
        title: 'Multi-model routing',
        countLabel: '50+',
        summary: 'Races or routes between frontier models instead of binding to one backend.',
        bullets: ['OpenRouter-style model access', 'Tiered fallback logic', 'Response selection by score'],
        accent: '#4fc3f7',
    },
    {
        title: 'AutoTune',
        countLabel: 'Context aware',
        summary: 'Detects message shape and adjusts generation parameters before the call lands.',
        bullets: ['Context scoring', 'Parameter deltas', 'Adaptive temperature and sampling'],
        accent: '#58d68d',
    },
    {
        title: 'Parseltongue',
        countLabel: 'Prompt layer',
        summary: 'Transforms prompt structure and trigger phrases into a more steerable control layer.',
        bullets: ['Trigger detection', 'Prompt mutation', 'Pipeline metadata'],
        accent: '#f4c542',
    },
    {
        title: 'STM modules',
        countLabel: 'Stateful',
        summary: 'Bundles short-term memory modules so context can persist across turns and tasks.',
        bullets: ['Module stacks', 'Conversation state', 'Reusable context packs'],
        accent: '#9b87f5',
    },
    {
        title: 'Dataset loop',
        countLabel: 'Opt-in',
        summary: 'Captures anonymized feedback and exported traces for research and iteration.',
        bullets: ['PII scrubber', 'Feedback ratings', 'Exportable dataset'],
        accent: '#ff7a59',
    },
];
exports.jarvisCapabilities = [
    {
        title: 'Voice control',
        countLabel: 'Hands-free',
        summary: 'Speech recognition, voice switching, and spoken responses drive the experience.',
        bullets: ['Wake-and-listen flow', 'Voice toggling', 'Speech output'],
        accent: '#4fc3f7',
    },
    {
        title: 'Knowledge lookup',
        countLabel: 'Research',
        summary: 'Wikipedia, dictionary, news, and web search are all available from one command loop.',
        bullets: ['Wikipedia summaries', 'Dictionary translation', 'News reading'],
        accent: '#58d68d',
    },
    {
        title: 'System control',
        countLabel: 'Actions',
        summary: 'Open websites, launch apps, play music, capture screenshots, and manage shutdowns.',
        bullets: ['Browser launch', 'App launch', 'System power commands'],
        accent: '#f4c542',
    },
    {
        title: 'Memory & workflow',
        countLabel: 'Stateful',
        summary: 'Notes, to-dos, and remembered messages keep the assistant useful across sessions.',
        bullets: ['Remember notes', 'Todo-style prompts', 'Persistent text file state'],
        accent: '#ff7a59',
    },
];
exports.deckModes = [
    {
        title: 'Legacy alias',
        countLabel: 'clawbot',
        summary: 'Compatibility layer that keeps the old entry point available while forwarding into the modern deck.',
        bullets: ['Legacy namespace', 'Same command surface', 'Migration-friendly'],
        accent: '#8bd3ff',
    },
    {
        title: 'Modern deck',
        countLabel: 'ARIA',
        summary: 'Primary command surface with prompt, registry, and source exploration actions.',
        bullets: ['Prompt-first workflow', 'Registry lanes', 'Extension host'],
        accent: '#9b87f5',
    },
];
