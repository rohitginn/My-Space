import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  Focus,
  KanbanSquare,
  PenLine,
  Target,
} from 'lucide-react';

const modules = [
  {
    name: 'Today and Inbox',
    description: 'Capture a thought in seconds, then bring the right work into today when you are ready for it.',
    icon: Target,
  },
  {
    name: 'Notes',
    description: 'Keep private notes, notebooks, and journal entries close to the work they inform.',
    icon: PenLine,
  },
  {
    name: 'Tasks',
    description: 'Turn intentions into clear tasks, with deadlines and links to the goals behind them.',
    icon: BookOpen,
  },
  {
    name: 'Projects',
    description: 'Move work across boards and keep the next step visible instead of buried in a list.',
    icon: KanbanSquare,
  },
  {
    name: 'Calendar',
    description: 'See events, deadlines, and planned work in the same view of your week.',
    icon: CalendarDays,
  },
  {
    name: 'Habits and routines',
    description: 'Build repeatable practices with streaks, routines, badges, and a record of momentum.',
    icon: BookOpen,
  },
  {
    name: 'Focus Room',
    description: 'Choose one thing, run a focused session, and earn XP for following through.',
    icon: Focus,
  },
  {
    name: 'Expenses and insights',
    description: 'Keep recurring costs and personal patterns visible without opening another system.',
    icon: CircleDollarSign,
  },
  {
    name: 'Personal Canvas',
    description: 'Sketch maps, plans, sticky notes, and loose connections on an infinite board.',
    icon: PenLine,
  },
];

const collaborationModules = [
  {
    label: 'Co-Spaces',
    title: 'Bring the right people in.',
    description: 'Create an invited workspace with its own members, roles, projects, notes, and canvases.',
  },
  {
    label: 'Co-Canvas',
    title: 'Think on the same surface.',
    description: 'Work together with live cursors, presence, sticky notes, and comments that can be resolved.',
  },
  {
    label: 'Shared work',
    title: 'Keep the handoff visible.',
    description: 'Use shared Kanban boards and Co-Notes for planning, meeting minutes, specs, and team context.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://app.rohitcode.tech/#organization',
      name: 'Rohit Code',
      url: 'https://app.rohitcode.tech/',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://app.rohitcode.tech/#website',
      url: 'https://app.rohitcode.tech/',
      name: 'MySpace by Rohit Code',
      description: 'A personal productivity and collaboration workspace for planning, focus, and meaningful work.',
      publisher: { '@id': 'https://app.rohitcode.tech/#organization' },
    },
    {
      '@type': 'WebApplication',
      '@id': 'https://app.rohitcode.tech/#application',
      name: 'MySpace',
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Web',
      url: 'https://app.rohitcode.tech/',
      description: 'Plan days, organize tasks and projects, capture notes, track habits, run focus sessions, and collaborate in Co-Spaces.',
      featureList: [
        'Daily planning and inbox capture',
        'Tasks, projects, goals, and calendar',
        'Notes, journal, and personal canvas',
        'Habit tracking and focus sessions',
        'Collaborative Co-Spaces and Co-Canvas',
      ],
      creator: { '@id': 'https://app.rohitcode.tech/#organization' },
    },
  ],
};

export function LandingPage() {
  return (
    <div className="landing-page min-h-full overflow-x-hidden bg-[#171713] text-[#f0ede5] selection:bg-[#8d9971] selection:text-[#171713]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="landing-nav sticky top-0 z-30 border-b border-[#f0ede5]/10 bg-[#171713]/95 px-5 backdrop-blur-sm sm:px-8 lg:px-12">
        <div className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.03em] text-[#f0ede5]">
            <span aria-hidden="true" className="grid h-5 w-5 grid-cols-2 gap-[3px]">
              <span className="bg-[#8d9971]" />
              <span className="bg-[#d9d1c2]" />
              <span className="bg-[#d9d1c2]" />
              <span className="bg-[#aa583f]" />
            </span>
            MySpace
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#c7c1b5] md:flex" aria-label="Primary navigation">
            <a className="transition-colors hover:text-[#f0ede5]" href="#workflow">How it works</a>
            <a className="transition-colors hover:text-[#f0ede5]" href="#tools">Tools</a>
            <a className="transition-colors hover:text-[#f0ede5]" href="#collaboration">Co-Spaces</a>
            <a className="transition-colors hover:text-[#f0ede5]" href="#focus">Focus</a>
          </nav>
          <Link
            href="/login"
            className="border border-[#f0ede5]/25 px-3.5 py-2 text-sm font-medium text-[#f0ede5] transition-colors hover:border-[#f0ede5]/60 hover:bg-[#f0ede5] hover:text-[#171713]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto min-h-[calc(100dvh-68px)] max-w-[1360px] px-5 py-12 sm:px-8 lg:px-12 lg:py-14">
          <div className="relative z-10 max-w-[590px] lg:pt-20">
            <p className="mb-7 text-sm font-medium text-[#aeb89a]">Your life has more than one list.</p>
            <h1 className="max-w-[620px] text-[clamp(3.3rem,7vw,6.65rem)] font-semibold leading-[0.91] tracking-[-0.075em] text-[#f0ede5]">
              One space. Every day.
            </h1>
            <p className="mt-7 max-w-[455px] text-lg leading-8 text-[#c7c1b5]">
              MySpace is a personal productivity workspace for planning your day, organizing tasks and projects, capturing ideas, and collaborating with a small team.
            </p>
            <div className="mt-9 flex items-center gap-5">
              <Link
                href="/register"
                className="landing-cta inline-flex items-center gap-2 bg-[#d9d1c2] px-5 py-3.5 text-sm font-semibold text-[#171713] transition-colors hover:bg-[#f0ede5]"
              >
                Start your space <ArrowUpRight className="landing-cta-arrow" size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
              <a href="#workflow" className="text-sm font-medium text-[#c7c1b5] transition-colors hover:text-[#f0ede5]">
                See the flow
              </a>
            </div>
          </div>

          <div className="landing-image-frame landing-scroll-image relative mt-10 w-full sm:ml-auto lg:absolute lg:bottom-70 lg:right-0 lg:mt-0 lg:w-[min(57%,760px)]">
            <Image
              src="/images/myspace-planning-collage.png"
              alt="A tactile planning sheet bringing notes, a habit grid, calendar, and focus timer into one view"
              width={1568}
              height={1003}
              priority
              className="h-auto w-full object-cover"
            />
            <span aria-hidden="true" className="absolute -bottom-3 -left-3 h-16 w-16 border-b border-l border-[#aa583f] sm:-bottom-5 sm:-left-5 sm:h-28 sm:w-28" />
          </div>
        </section>

        <section id="workflow" className="border-y border-[#f0ede5]/10 bg-[#202019] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[1360px]">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <h2 className="max-w-[590px] text-[clamp(2.35rem,4.6vw,4.8rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[#f0ede5]">
                Your tools should hand work to each other.
              </h2>
              <p className="max-w-[530px] text-lg leading-8 text-[#c7c1b5]">
                MySpace turns a scattered day into a connected loop, from the first thought to the work that actually gets done, alone or with a small team.
              </p>
            </div>

            <div className="mt-16 grid gap-0 border-l border-[#f0ede5]/15 md:grid-cols-[1.05fr_0.85fr_1.15fr]">
              <article className="border-r border-[#f0ede5]/15 px-6 pb-10 pt-2 md:px-8">
                <span className="text-sm font-medium text-[#aeb89a]">Capture</span>
                <h3 className="mt-10 text-3xl font-semibold tracking-[-0.05em] text-[#f0ede5]">Keep the thought.</h3>
                <p className="mt-4 max-w-[260px] leading-7 text-[#c7c1b5]">Quick Capture, Inbox, Notes, Journal, and Canvas give every loose idea a safe place to land.</p>
              </article>
              <article className="border-r border-[#f0ede5]/15 px-6 pb-10 pt-2 md:px-8">
                <span className="text-sm font-medium text-[#aeb89a]">Shape</span>
                <h3 className="mt-10 text-3xl font-semibold tracking-[-0.05em] text-[#f0ede5]">Give it a place.</h3>
                <p className="mt-4 max-w-[260px] leading-7 text-[#c7c1b5]">Today, Tasks, Projects, Calendar, and Goals turn good intentions into a plan you can see.</p>
              </article>
              <article className="border-r border-[#f0ede5]/15 px-6 pb-10 pt-2 md:px-8">
                <span className="text-sm font-medium text-[#aeb89a]">Share</span>
                <h3 className="mt-10 text-3xl font-semibold tracking-[-0.05em] text-[#f0ede5]">Make room for others.</h3>
                <p className="mt-4 max-w-[260px] leading-7 text-[#c7c1b5]">Co-Spaces add live canvases, shared projects, and team notes without opening up your personal space.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="tools" className="relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto grid max-w-[1360px] gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.7fr)] lg:items-start">
            <div>
              <h2 className="max-w-[690px] text-[clamp(2.35rem,5.1vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.065em] text-[#f0ede5]">
                The small systems that make a day work.
              </h2>
              <div className="landing-tools-list mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <article key={module.name} className="max-w-[270px]">
                      <Icon size={25} strokeWidth={1.45} className="text-[#aeb89a]" aria-hidden="true" />
                      <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em] text-[#f0ede5]">{module.name}</h3>
                      <p className="mt-3 leading-7 text-[#c7c1b5]">{module.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="landing-tools-image relative lg:pt-12">
              <span aria-hidden="true" className="absolute -right-3 top-5 hidden h-[92%] w-[70%] border-r border-t border-[#8d9971]/60 lg:block" />
              <Image
                src="/images/myspace-weekly-kit.png"
                alt="Paper notes, a weekly planning sheet, and a visual notebook on a dark desk"
                width={1122}
                height={1402}
                className="relative z-10 h-auto w-full max-w-[520px] object-cover lg:ml-auto"
              />
            </div>
          </div>
        </section>

        <section id="collaboration" className="border-y border-[#f0ede5]/10 bg-[#202019] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[1360px]">
            <div className="max-w-[720px]">
              <p className="text-sm font-medium text-[#aeb89a]">When work becomes shared.</p>
              <h2 className="mt-7 text-[clamp(2.35rem,5vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.065em] text-[#f0ede5]">
                Private by default. Collaborative by choice.
              </h2>
              <p className="mt-7 max-w-[560px] text-lg leading-8 text-[#c7c1b5]">
                Co-Spaces give a small team a focused room to plan, draw, document, and move work forward together.
              </p>
            </div>

            <div className="mt-14 grid gap-0 border-l border-[#f0ede5]/15 md:grid-cols-[1.15fr_0.85fr] md:grid-rows-2">
              {collaborationModules.map((module, index) => (
                <article key={module.label} className={`border-r border-[#f0ede5]/15 px-6 pb-8 pt-2 md:px-8 ${index === 0 ? 'md:row-span-2 md:pb-10' : ''}`}>
                  <span className="text-sm font-medium text-[#aeb89a]">{module.label}</span>
                  <h3 className="mt-9 max-w-[260px] text-2xl font-semibold tracking-[-0.045em] text-[#f0ede5]">{module.title}</h3>
                  <p className="mt-4 max-w-[290px] leading-7 text-[#c7c1b5]">{module.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="focus" className="bg-[#8d9971] px-5 py-20 text-[#171713] sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="relative border-l-2 border-[#171713] pl-6 sm:pl-9">
              <Focus size={32} strokeWidth={1.35} aria-hidden="true" />
              <h2 className="mt-11 max-w-[590px] text-[clamp(2.5rem,5vw,5.5rem)] font-semibold leading-[0.94] tracking-[-0.07em]">
                Plan a fuller life. Protect the work inside it.
              </h2>
            </div>
            <div className="grid gap-8 text-lg leading-8 sm:grid-cols-2">
              <p>
                Use the focus room to choose what matters now. The timer makes a session tangible, and completing it earns XP.
              </p>
              <p>
                Track habits, routines, goals, recurring expenses, and your calendar beside that session. The small systems stay visible together.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <h2 className="max-w-[760px] text-[clamp(2.7rem,6vw,6.5rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-[#f0ede5]">
                One clear place. A more workable day.
              </h2>
            </div>
            <Link
              href="/register"
              className="landing-cta inline-flex items-center gap-3 border border-[#d9d1c2] px-5 py-3.5 text-sm font-semibold text-[#f0ede5] transition-colors hover:bg-[#d9d1c2] hover:text-[#171713]"
            >
              Start your space <ArrowUpRight className="landing-cta-arrow" size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#f0ede5]/10 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 text-sm text-[#979287] sm:flex-row sm:items-center sm:justify-between">
          <span>MySpace by Rohit Code brings your personal systems together.</span>
          <div className="flex items-center gap-5">
            <Link className="transition-colors hover:text-[#f0ede5]" href="/login">Sign in</Link>
            <Link className="transition-colors hover:text-[#f0ede5]" href="/register">Start your space</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
