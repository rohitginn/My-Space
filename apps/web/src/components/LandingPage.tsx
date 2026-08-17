import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Focus,
  Inbox,
  KanbanSquare,
  PlugZap,
  Target,
  Users,
} from 'lucide-react';

const capabilityGroups = [
  {
    name: 'Plan',
    description: 'Bring the day into view before it starts.',
    items: 'Today, Inbox, Tasks, Goals, Calendar',
    icon: Target,
  },
  {
    name: 'Think',
    description: 'Keep the context behind the work close by.',
    items: 'Notes, Journal, Personal Canvas, Search',
    icon: BookOpen,
  },
  {
    name: 'Build momentum',
    description: 'Make progress visible without turning life into a dashboard.',
    items: 'Habits, Routines, Focus Room, Expenses, Insights',
    icon: Focus,
  },
  {
    name: 'Work together',
    description: 'Open a focused room when a project needs more than one person.',
    items: 'Co-Spaces, shared Projects, Co-Notes, Co-Canvas, Members',
    icon: Users,
  },
  {
    name: 'Bring context in',
    description: 'Connect the services your shared work already depends on.',
    items: 'Gmail, Slack, GitHub, Google Calendar, Google Drive',
    icon: PlugZap,
  },
  {
    name: 'Stay in the loop',
    description: 'See mentions, assignments, joins, and comment activity when it matters.',
    items: 'Notifications with live updates and read states',
    icon: Bell,
  },
];

const workflow = [
  {
    name: 'Capture',
    title: 'Keep the thought.',
    description: 'Inbox, Notes, Journal, and Canvas give loose ideas somewhere safe to land.',
    icon: Inbox,
  },
  {
    name: 'Shape',
    title: 'Give it a place.',
    description: 'Today, Tasks, Projects, Calendar, and Goals turn intention into a visible next step.',
    icon: KanbanSquare,
  },
  {
    name: 'Share',
    title: 'Make room for others.',
    description: 'Co-Spaces bring shared boards, notes, canvases, roles, and integrations into focus.',
    icon: Users,
  },
];

const collaborationDetails = [
  {
    title: 'A workspace with boundaries',
    description: 'Invite people into a Co-Space without opening up your personal workspace.',
  },
  {
    title: 'Live canvas, shared notes',
    description: 'Sketch together, leave comments, resolve discussion, and keep the decision nearby.',
  },
  {
    title: 'Useful connections',
    description: 'Connect external services at the workspace level and review the context they provide.',
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
        'Daily planning, inbox capture, tasks, goals, and calendar',
        'Notes, journal, personal canvas, and search',
        'Habits, routines, focus sessions, expenses, and insights',
        'Co-Spaces with shared projects, notes, canvas, members, and roles',
        'Workspace integrations and live notifications',
      ],
      creator: { '@id': 'https://app.rohitcode.tech/#organization' },
    },
  ],
};

function ArrowLink({ href, children, inverted = false }: { href: string; children: React.ReactNode; inverted?: boolean }) {
  return (
    <Link
      href={href}
      className={`landing-arrow-link inline-flex items-center gap-2 text-sm font-semibold ${inverted ? 'text-[#171713]' : 'text-[#f0ede5]'}`}
    >
      {children}
      <ArrowUpRight className="landing-arrow" size={16} strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="landing-page min-h-full overflow-x-hidden bg-[#171713] text-[#f0ede5] selection:bg-[#aeb89a] selection:text-[#171713]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <header className="landing-nav sticky top-0 z-30 border-b border-[#f0ede5]/10 bg-[#171713]/95 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.03em] text-[#f0ede5]">
            <span aria-hidden="true" className="landing-mark grid h-5 w-5 grid-cols-2 gap-[3px]">
              <span className="bg-[#aeb89a]" />
              <span className="bg-[#d9d1c2]" />
              <span className="bg-[#d9d1c2]" />
              <span className="bg-[#aeb89a]" />
            </span>
            MySpace
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-[#c7c1b5] md:flex" aria-label="Primary navigation">
            <a className="transition-colors hover:text-[#f0ede5]" href="#workflow">How it works</a>
            <a className="transition-colors hover:text-[#f0ede5]" href="#tools">Tools</a>
            <a className="transition-colors hover:text-[#f0ede5]" href="#collaboration">Co-Spaces</a>
            <a className="transition-colors hover:text-[#f0ede5]" href="#focus">Focus</a>
          </nav>

          <div className="flex items-center gap-3">
            <details className="relative md:hidden">
              <summary className="landing-menu-summary list-none cursor-pointer border border-[#f0ede5]/20 px-3 py-2 text-sm font-medium text-[#f0ede5]">Menu</summary>
              <div className="absolute right-0 top-[calc(100%+10px)] w-48 border border-[#f0ede5]/15 bg-[#202019] p-2 shadow-[0_18px_30px_rgb(0_0_0/0.24)]">
                <a className="block px-3 py-2.5 text-sm text-[#c7c1b5] hover:bg-[#f0ede5]/5 hover:text-[#f0ede5]" href="#workflow">How it works</a>
                <a className="block px-3 py-2.5 text-sm text-[#c7c1b5] hover:bg-[#f0ede5]/5 hover:text-[#f0ede5]" href="#tools">Tools</a>
                <a className="block px-3 py-2.5 text-sm text-[#c7c1b5] hover:bg-[#f0ede5]/5 hover:text-[#f0ede5]" href="#collaboration">Co-Spaces</a>
                <a className="block px-3 py-2.5 text-sm text-[#c7c1b5] hover:bg-[#f0ede5]/5 hover:text-[#f0ede5]" href="#focus">Focus</a>
              </div>
            </details>
            <Link
              href="/login"
              className="landing-nav-action border border-[#f0ede5]/25 px-3.5 py-2 text-sm font-medium text-[#f0ede5] transition-colors hover:border-[#f0ede5]/60 hover:bg-[#f0ede5] hover:text-[#171713]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[calc(100dvh-68px)] max-w-[1360px] grid-cols-1 items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:px-12 lg:py-16">
          <div className="relative z-10 max-w-[590px]">
            <p className="landing-kicker mb-7 text-sm font-medium text-[#aeb89a]">A home for the systems behind your day.</p>
            <h1 className="max-w-[620px] text-[clamp(3.2rem,7vw,6.6rem)] font-semibold leading-[0.91] tracking-[-0.075em] text-[#f0ede5]">
              Make space for what comes next.
            </h1>
            <p className="mt-7 max-w-[455px] text-lg leading-8 text-[#c7c1b5]">
              MySpace connects your day, ideas, goals, focus, and shared work in one calm workspace.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/register"
                className="landing-cta inline-flex items-center gap-2 bg-[#d9d1c2] px-5 py-3.5 text-sm font-semibold text-[#171713] transition-colors hover:bg-[#f0ede5]"
              >
                Start your space <ArrowUpRight className="landing-cta-arrow" size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
              <a href="#workflow" className="landing-arrow-link inline-flex items-center gap-2 text-sm font-semibold text-[#c7c1b5] hover:text-[#f0ede5]">
                See how it fits <ArrowUpRight className="landing-arrow" size={16} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="landing-image-frame landing-scroll-image relative w-full max-w-[760px] lg:justify-self-end">
            <Image
              src="/images/myspace-planning-collage.png"
              alt="A tactile planning sheet bringing notes, a habit grid, calendar, and focus timer into one view"
              width={1568}
              height={1003}
              priority
              className="h-auto w-full object-cover"
            />
            <span aria-hidden="true" className="absolute -bottom-3 -left-3 h-16 w-16 border-b border-l border-[#aeb89a]/60 sm:-bottom-5 sm:-left-5 sm:h-28 sm:w-28" />
          </div>
        </section>

        <section id="workflow" className="border-y border-[#f0ede5]/10 bg-[#202019] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[1360px]">
            <div className="max-w-[720px]">
              <h2 className="max-w-[620px] text-[clamp(2.35rem,4.6vw,4.8rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[#f0ede5]">
                Your tools should hand work to each other.
              </h2>
              <p className="mt-7 max-w-[560px] text-lg leading-8 text-[#c7c1b5]">
                Start with a thought, turn it into a plan, give it your attention, then share the part that needs other people.
              </p>
            </div>

            <div className="mt-16 grid gap-0 border-l border-[#f0ede5]/15 lg:grid-cols-[1.35fr_1fr_1.1fr]">
              {workflow.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.name} className="landing-process-item border-r border-[#f0ede5]/15 px-6 pb-10 pt-2 md:px-8">
                    <Icon size={25} strokeWidth={1.45} className="text-[#aeb89a]" aria-hidden="true" />
                    <span className="mt-10 block text-sm font-medium text-[#aeb89a]">{item.name}</span>
                    <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#f0ede5]">{item.title}</h3>
                    <p className="mt-4 max-w-[300px] leading-7 text-[#c7c1b5]">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="tools" className="relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto grid max-w-[1360px] gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.7fr)] lg:items-start">
            <div>
              <h2 className="max-w-[680px] text-[clamp(2.35rem,5.1vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.065em] text-[#f0ede5]">
                Every part of the day has somewhere to go.
              </h2>
              <div className="landing-capability-grid mt-14 grid gap-x-10 gap-y-0 sm:grid-cols-2">
                {capabilityGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <article key={group.name} className="landing-capability border-t border-[#f0ede5]/15 py-7 first:pt-0 sm:nth-[2]:pt-0">
                      <div className="flex items-center gap-3">
                        <Icon size={20} strokeWidth={1.5} className="text-[#aeb89a]" aria-hidden="true" />
                        <h3 className="text-lg font-semibold tracking-[-0.035em] text-[#f0ede5]">{group.name}</h3>
                      </div>
                      <p className="mt-3 max-w-[290px] leading-7 text-[#c7c1b5]">{group.description}</p>
                      <p className="mt-4 max-w-[320px] text-sm leading-6 text-[#aeb89a]">{group.items}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="landing-tools-image relative lg:pt-12">
              <span aria-hidden="true" className="absolute -right-3 top-5 hidden h-[92%] w-[70%] border-r border-t border-[#aeb89a]/50 lg:block" />
              <Image
                src="/images/myspace-weekly-kit.png"
                alt="Paper notes, a weekly planning sheet, and a visual notebook on a dark desk"
                width={1122}
                height={1402}
                className="relative z-10 h-auto w-full max-w-[520px] object-cover lg:ml-auto"
              />
              <p className="relative z-10 mt-5 max-w-[360px] text-sm leading-6 text-[#979287] lg:ml-auto">
                Capture the small things. Keep the larger picture close.
              </p>
            </div>
          </div>
        </section>

        <section id="collaboration" className="border-y border-[#f0ede5]/10 bg-[#202019] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="landing-collaboration-image relative order-2 lg:order-1">
              <Image
                src="/images/myspace-collaboration-table.png"
                alt="Two people planning together around a shared green board with paper notes and a focus timer"
                width={1536}
                height={1024}
                className="h-auto w-full object-cover"
              />
              <span aria-hidden="true" className="absolute -bottom-4 -right-4 h-24 w-24 border-b border-r border-[#aeb89a]/60 sm:-bottom-6 sm:-right-6 sm:h-32 sm:w-32" />
            </div>

            <div className="order-1 lg:order-2 lg:pl-8">
              <h2 className="max-w-[620px] text-[clamp(2.35rem,5vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.065em] text-[#f0ede5]">
                Private by default. Collaborative by choice.
              </h2>
              <p className="mt-7 max-w-[560px] text-lg leading-8 text-[#c7c1b5]">
                Co-Spaces give a small team a focused room to plan, draw, document, and move work forward together.
              </p>

              <div className="mt-12 border-t border-[#f0ede5]/15">
                {collaborationDetails.map((detail) => (
                  <article key={detail.title} className="grid gap-3 border-b border-[#f0ede5]/15 py-5 sm:grid-cols-[0.9fr_1.1fr] sm:gap-8">
                    <h3 className="text-base font-semibold tracking-[-0.025em] text-[#f0ede5]">{detail.title}</h3>
                    <p className="max-w-[340px] text-sm leading-6 text-[#c7c1b5]">{detail.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="focus" className="bg-[#aeb89a] px-5 py-20 text-[#171713] sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="relative border-l-2 border-[#171713] pl-6 sm:pl-9">
              <Focus size={32} strokeWidth={1.35} aria-hidden="true" />
              <h2 className="mt-11 max-w-[590px] text-[clamp(2.5rem,5vw,5.5rem)] font-semibold leading-[0.94] tracking-[-0.07em]">
                Protect the work inside a fuller life.
              </h2>
            </div>
            <div className="grid gap-8 text-lg leading-8 sm:grid-cols-2">
              <p>
                Choose what matters now. The Focus Room makes one session tangible, then keeps the rest of the day in view.
              </p>
              <p>
                Habits, routines, goals, recurring expenses, and calendar events stay close without competing for your attention.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <p className="max-w-[300px] text-sm leading-6 text-[#aeb89a]">The system stays quiet so the work can be clear.</p>
              <h2 className="mt-6 max-w-[760px] text-[clamp(2.7rem,6vw,6.5rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-[#f0ede5]">
                One clear place. A more workable day.
              </h2>
            </div>
            <ArrowLink href="/register">Start your space</ArrowLink>
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
