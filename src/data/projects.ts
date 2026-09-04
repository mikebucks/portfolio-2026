export type ProjectMedia =
  | {
      type: "image";
      src: string;
      alt?: string;
      caption?: string;
      width?: number;
      height?: number;
      /**
       * Per-item Tailwind classes for this block, applied to its <figure> — so
       * a frame (`bg-white p-3 border border-black/10`) encloses the caption
       * along with the image, and layout utilities (`max-w-md mx-auto`) size
       * the block as a whole. Merged with tailwind-merge, so these win over the
       * renderer's own classes rather than fighting them.
       *
       * To reach the <img> itself, use a child variant: `[&_img]:rounded-none`.
       *
       * Note `border` alone draws nothing you can see here: Tailwind v4 gives
       * it no color of its own, so it inherits the body's near-white text
       * color onto a cream panel. Pair it with a color — `border
       * border-black/10`.
       */
      className?: string;
    }
  | {
      type: "video";
      src: string;
      poster?: string;
      alt?: string;
      caption?: string;
      width?: number;
      height?: number;
      /** Per-item Tailwind classes on this block's <figure> — see above. */
      className?: string;
      /**
       * GIF-style playback: autoplays muted, loops, and hides the controls bar.
       * Use for silent looping clips (a lighter, sharper GIF replacement).
       * Omit for a normal click-to-play video with controls.
       */
      autoplay?: boolean;
      /** Loop playback. Defaults to `true` when `autoplay` is set. */
      loop?: boolean;
    }
  | {
      type: "grid";
      items: { src: string; alt?: string; width?: number; height?: number }[];
      columns?: 2 | 3;
      /**
       * Cell shape. "square" (default) crops every image to a uniform square —
       * right for a wall of mixed-ratio shots. "natural" keeps each image's own
       * ratio, for tall screenshots that must not crop; pair images with
       * matching ratios so the row's bottom edge stays level.
       */
      aspect?: "square" | "natural";
      caption?: string;
      /**
       * Per-block Tailwind classes on the grid's <figure> — same contract as
       * the image/video `className`. Most useful for capping a grid that would
       * otherwise run the full panel width: `max-w-2xl mx-auto`. The grid div
       * is the figure's direct child, so its defaults are reachable with a
       * child variant — `[&>div]:gap-2` tightens the default `gap-4`.
       */
      className?: string;
    };

/**
 * A dashboard-style row of headline numbers — the outcomes of a project read as
 * a stat grid instead of a bulleted list. Each tile is a label + a figure, so
 * only use it where the outcome really is a number; prose outcomes stay a
 * `text` block with an <ol>, where they read better.
 */
export type ProjectStats = {
  type: "stats";
  /** Eyebrow above the grid, e.g. "Outcomes". Omit for a bare row of tiles. */
  title?: string;
  items: {
    /** The figure itself — pre-formatted, since only the author knows the
     *  unit and the precision worth showing ("$921,473,361.31", "+22", "81%"). */
    value: string;
    /** What the figure counts, in sentence case. */
    label: string;
    /** Optional second reading of the same figure ("213,152 ETH"). */
    note?: string;
    /**
     * Direction the stat is moving, drawn as a small arrow beside the figure.
     * Only set it where the figure is itself a change — an absolute total has
     * no direction, and an arrow on one would claim a trend that isn't there.
     */
    trend?: "up" | "down";
  }[];
  /** Tiles per row from `sm` up. Defaults to the item count, capped at 3. */
  columns?: 2 | 3 | 4;
};

/**
 * A single ordered block of a project's detail page. `text` is rich text — its
 * `html` is rendered as trusted markup (this content is authored here in-repo,
 * never user input), so inline tags like <strong> / <em> / <a> render instead
 * of showing as literal characters. All the media block types can be freely
 * interleaved with text, letting images be peppered in amongst the copy.
 */
/**
 * A bespoke animated illustration, rendered from a component instead of an
 * image file. `id` picks the component out of the registry in ProjectDetail —
 * data stays serializable and the component code lives with the other
 * renderers under components/projects/graphics.
 */
export type ProjectGraphic = {
  type: "graphic";
  id: "chisel-process" | "chisel-stack" | "chisel-workflow";
  caption?: string;
  /** Per-item Tailwind classes for the block's wrapper — see ProjectMedia. */
  className?: string;
};

export type ProjectBlock =
  | { type: "text"; html: string }
  | ProjectStats
  | ProjectGraphic
  | ProjectMedia;

export type Project = {
  slug: string;
  title: string;
  role: string;
  summary: string;
  tags: string[];
  /** The detail page: an ordered mix of copy and media blocks. */
  content: ProjectBlock[];
  /** Leads the project's card; optional — see projectImages for the fallback. */
  thumbnail?: string;
};

export const projects: Project[] = [
  {
    slug: "figment-dapp",
    title: "Figment dApp",
    role: "Product Design, Engineering, & Growth",
    thumbnail: "/projects/figment-dapp/thumbnail.png",
    tags: ["react", "web3", "design"],
    summary: "Turning institutional complexity into consumer trust",
    content: [
      {
        type: "text",
        html: "While leading Product Design at Figment, a proof-of-stake infrastructure company serving large financial institutions, I redesigned a nascent consumer dApp that had been hiding in Ledger Wallet's marketplace. The original design was not performing so the goal of the redesign was to <strong>dramatically simplify the UI for a non-institutional audience</strong>."
      },
      {
        type: "stats",
        items: [
          {
            value: "$500M+",
            note: "213,152 ETH",
            label: "New Ethereum staked",
          },
          {
            value: "27.45%",
            note: "Of qualified wallets (32+ ETH)",
            label: "Staking flow conversion rate",
          },
          {
            value: "22.7%",
            note: "Post redesign",
            label: "DAU increase",
            trend: "up",
          },
        ],
      },
      { 
        type: "video", 
        src: "/projects/figment-dapp/eth-flow.mp4", 
        alt: "Ethereum staking flow in Ledger dApp", 
        autoplay: true, 
      },
      { 
        type: "text",
        html: "While there were competitor dApps already claiming this territory, we knew the amount of unstaked Ethereum held on Ledger devices was massive. It was worth the swing. A team of 2 (myself and a PM) took a scrappy approach to the project. We stripped away every unnecessary piece of copy and UI, scrubbed industry jargon, and applied the same UI design system that had been proven with our institutional customers. <strong>We turned the complexity of staking crypto into trust in Figment's institutional pedigree</strong> that resonated with consumer crypto holders."
      },
      {
        type: "image",
        src: "/projects/figment-dapp/dashboard.png"
      },
      { 
        type: "text",
        html: "What started as a side quest quickly turned into a meaningful line of business for Figment. Pre-redesign the amount of staked ETH was near zero. <strong>After a year in the Ledger Wallet marketplace, that number had grown to over $500,000,000</strong>. As part of the process, it was necessary to create an entirely new product-led growth discipline within Figment's highly b2b sales-driven product team."
      },
      {
        type: "grid",
        aspect: "natural",
        className: "max-w-4xl mx-auto [&>div]:gap-12",
        items: [
          { src: "/projects/figment-dapp/mobile-stake.png", alt: "Mobile Ethereum Staking" },
          { src: "/projects/figment-dapp/mobile-cards.png", alt: "Mobile Why Figment Cards" },
        ],
      },
      { 
        type: "text",
        html: "Figment's UI component library was adopted far beyond its previous role of institutional customer dashboards. Figment now had a shared language that connected the brand with its products in a way it never had before."
      },
      {
        type: "grid",
        items: [
          { src: "/projects/figment-dapp/widget/sol.png", alt: "Solana staking widget" },
          { src: "/projects/figment-dapp/widget/avax.png", alt: "Avalanche staking widget" },
          { src: "/projects/figment-dapp/widget/near.png", alt: "NEAR staking widget" },
          { src: "/projects/figment-dapp/widget/eth.png", alt: "ETH staking widget" },
        ],
      },
      // {
      //   type: "image",
      //   src: "/projects/figment-dapp/sol.png"
      // },
      {
        type: "image",
        src: "/projects/figment-dapp/eth-stake.png"
      },
    ],
  },
  {
    slug: "figment-dashboard",
    title: "Figment Dashboard",
    role: "Product Design, Engineering, & Growth",
    thumbnail: "/projects/figment-dashboard/thumbnail.png",
    tags: ["react", "web3", "design"],
    summary: "Digital asset management for financial institutions",
    content: [
      {
        type: "text",
        html: "Figment is where the world's largest financial institutions stake their crypto holdings. Figment's dashboard is how they monitor and manage the performance of billions of dollars in staked assets.",
      },
      {
        type: "text",
        html: "The dashboard initially launched with support for the Ethereum protocol. Over the course of my tenure, the app evolved to support over 20 additional proof-of-stake protocols' mainnets and testnets, detailed rewards reporting, RBAC team management, and click-to-stake flows.",
      },
      {
        type: "stats",
        items: [
          {
            value: "$921,473,360",
            note: "213,152 ETH",
            label: "Ethereum staked",
          },
          {
            value: "22",
            note: "Beyond Ethereum",
            label: "Protocols supported",
            trend: "up",
          },
          {
            value: "81%",
            note: "From self-monitoring",
            label: "Customers migrated",
          },
        ],
      },
      {
        type: "image",
        src: "/projects/figment-dashboard/all.png",
        alt: "Figment dashboard overview"
       },
       {
        type: "text",
        html: "Prior to building the dashboard, the majority of Figment's customers managed their portfolios via spreadsheets and custom built software, making support an unpredictable and time-consuming endeavor. <strong>Support tickets regarding staking rewards and bonding/unbonding timelines went down by over 70%</strong> for customers using the dashboard. ",
      },
       {
        type: "image",
        src: "/projects/figment-dashboard/eth.png",
        alt: "Figment Ethereum dashboard"
       },
    ]
  },
  {
    slug: "chisel",
    title: "Chisel",
    role: "Systems Design & Engineering",
    thumbnail: "/projects/chisel/thumbnail-light.png",
    tags: ["design-systems", "react", "vercel", "continuous-integraion"],
    summary: "The agentic design system",
    content: [
      {
        type: "text",
        html: "<strong>Advanced design capability, rapid prototyping, and the ability to iterate on a product don't need to be limited to specialists or gated tools</strong>. These systems should be available to any qualified teammate to participate in, learn from, and build on.",
      },
      {
        type: "text",
        html: "In complex orgs it's often necessary to restrict access to domain-specific systems. But this can cause unwanted administrative overhead. Simple things like copy changes can require Linear tickets, Figma updates, and engineering sprints. Designers and PMs are forced to prototype in sandboxes disconnected from essential materials like React components, backend systems, and continuous integration pipelines. And engineers don't have access to research findings, design and product principles, and review feedback.",
      },
      {
        type: "text",
        html: `<strong>Chisel connects these formerly siloed systems and unlocks new capabilities</strong> for product, design, and eng teams. I implemented the pilot version for Figment, a crypto infrastructure company with a large engineering org and comparably tiny product and design groups.`,
      },
      // {
      //   type: "text",
      //   html: `<strong>Project goals</strong>
      //     <ol>
      //       <li>Make high-quality craft more accessible, collaborative, and scalable across Figment.</strong></li>
      //       <li>Rapid prototyping consistency and usability for PMs, Engineers, and Designers.</li>
      //       <li>Faster product iteration for simple edits like copy and layout/styling changes.</li>
      //     </ol>
      //   `,
      // },
      {
        type: "graphic",
        id: "chisel-process",
      },
      {
        type: "text",
        html: "Chisel codifies context into Claude skills that can design and build production-ready features directly in Figment's frontend mono-repo. Chisel's work is accessible enough for non-engineers and trustworthy enough to pass rigid infosec and coding standards.",
      },
      {
        type: "graphic",
        id: "chisel-stack",
      },
      {
        type: "text",
        html: "Leveraging Figment's existing CI pipeline, Chisel pushes code the same way an engineer does, keeping a human in the loop throughout.",
      },
      {
        type: "graphic",
        id: "chisel-workflow",
      },
      {
        type: "text",
        html: `
        <strong>Outcomes</strong>
          <ol>
            <li>A single source of truth. Improvement in overall quality and consistency of UIs by eliminating the need to translate static designs to code.</li>
            <li>Rapid prototyping for PMs, Engineers, and Designers. We can express design intents directly to the front end codebase instead of creating approximations in Figma that don't map 1:1 with code.</li>
            <li>Faster product iteration. Simple edits like copy changes and layout adjustments can be handled by PMs without the unnecessary overhead of Linear tickets, Figma updates, and engineering pipelines.</li>
          </ol>
        `,
      },
    ],
  },
  {
    slug: "book-of-idra",
    title: "Book of Idra",
    role: "Product Design, Engineering, Branding, Creative Coding, & Smart Contracts",
    thumbnail: "/projects/book-of-idra/thumbnail.png",
    tags: ["web3", "creative-coding", "design", "branding"],
    summary: "What does the future of creative writing look like?",
    content: [
      {
        type: "text",
        html: "Book of Idra is a web3 experiment in collaborative storytelling. Token holders work together to craft a fictional story through consensus. Characters, locations, and entire worlds await their discovery.",
      },
      { 
        type: "image", 
        className: "max-w-3xl mx-auto", 
        src: "/projects/book-of-idra/homepage.jpg", 
        alt: "Book of Idra homepage" 
      },
      
      { 
        type: "text", 
        html: "Book of Idra is a collaboration between myself and a close friend. We wanted to do something interesting with NFTs beyond the hyper-saturated profile pic investment craze. We're writing a fictional story through consensus-based collaboration on a token-gated dApp."
     },
     { 
        type: "text", 
        html: "My main roles on the project are branding, design, creative coding & frontend engineering. It's currently in the \"side project in progress\" state but we're making bits of progress every day in between our families and our day jobs."
     }, 

      {
        type: "grid",
        items: [
          { src: "/projects/book-of-idra/angel1.jpg", alt: "Angel 1" },
          { src: "/projects/book-of-idra/angel2.jpg", alt: "Angel 2" },
          { src: "/projects/book-of-idra/angel3.png", alt: "Angel 3" },
          { src: "/projects/book-of-idra/angel4.jpg", alt: "Angel 4" },
        ],
      },
      { 
        type: "image", 
        className: "max-w-lg mx-auto",
        src: "/projects/book-of-idra/logos.png", 
        alt: "Logo explorations" 
      },
      { 
        type: "video", 
        src: "/projects/book-of-idra/Pentamorph.mp4", 
        alt: "Pentamorph", 
        autoplay: true, 
      },
      { type: "image", src: "/projects/book-of-idra/bg-ring.jpg", alt: "Background ring illustration" },
    ],
  },
  // {
  //   slug: "beatvox",
  //   title: "BeatVox",
  //   role: "Solo Founder",
  //   thumbnail: "https://picsum.photos/seed/beatvox/800/600",
  //   tags: ["swiftui", "audio", "design"],
  //   summary: "The musical sketchbook",
  //   body: ["TODO"],
  //   media: [],
  // },
  {
    slug: "lyric",
    title: "Lyric",
    role: "Product Design & Design Engineering",
    tags: ["design", "react/native", ""],
    summary: "The happy path for modern travelers",
    content: [
      {
        type: "text",
        html: "As Creative Technology Principal at Lyric, a premium short term rental operator, I designed and experimented with UIs for interfacing with the Lyric brand. From booking a stay to keyless access via our native iOS app, my team and I planned, designed & built the happy paths for modern travelers. My main duties at Lyric included UI/UX design and React/RN development.",
      },
      { type: "image", src: "/projects/lyric/iosapp.png", alt: "Lyric React Native app" },
      { 
        type: "image", 
        className: "max-w-md mx-auto",
        src: "/projects/lyric/intro-amination.gif", 
        alt: "App intro animation" 
      },
      {
        type: "grid",
        columns: 3,
        items: [
          { src: "/projects/lyric/access-disconnected.png", alt: "Access — disconnected state" },
          { src: "/projects/lyric/access-locked.png", alt: "Access — locked state" },
          { src: "/projects/lyric/access-open.png", alt: "Access — open state" },
        ],
      },
      { type: "image", src: "/projects/lyric/unlock-variations.png", alt: "Unlock interaction variations" },
      { type: "image", src: "/projects/lyric/dsl.png", alt: "Lyric design system" },
    ],
  },
  {
    slug: "vori",
    title: "Vori Health",
    role: "Design Leadership, Product Design, & Engineering",
    tags: ["design", "react/native", ""],
    summary: "UI consistency for a massive digital health ecosystem",
    content: [
      {
        type: "text",
        html: "As Director of Product Design at Vori Health I oversaw the research, design, and implementation of Vori's suite of digital products. My team and I crafted a universal design system and implemented a seamless tokenization flow where values from Figma automatically update our React component styles. Vori's design system has been universally applied to internal clinical apps as well as consumer web and native mobile apps. It's had a big impact on engineering velocity since there is very little translation needed between Figma and React.",
      },
      { type: "image", src: "/projects/vori/dashboard.jpg", alt: "Clinical dashboard" },
      { type: "image", src: "/projects/vori/onboarding.jpg", alt: "Patient onboarding" },
      { type: "image", src: "/projects/vori/onboarding2.jpg", alt: "Patient onboarding — continued" },
      { type: "image", src: "/projects/vori/pt-cam.jpg", alt: "Physical therapy camera view" },
      { type: "image", src: "/projects/vori/conponents.png", alt: "Component library" },
      { type: "image", src: "/projects/vori/dsl.png", alt: "Vori design system" },
      { type: "image", src: "/projects/vori/token-automation.png", alt: "Figma-to-React token automation" },
    ],
  },
  // {
  //   slug: "verse",
  //   title: "Verse",
  //   role: "Product Design & Design Engineering",
  //   tags: ["design", "react/native", ""],
  //   summary: "A highly interactive video storytelling platform",
  //   content: [
  //     {
  //       type: "text",
  //       html: "Verse is a highly interactive video storytelling platform. As Director of Product Development, I conceptualized, designed, and implemented many features in the Verse ecosystem including; custom embeddable interactive video players, immersive 360 video, clickable hotspots, and mobile-friendly UI. Check out some of the award-winning stories built on Verse.",
  //     },
  //     { type: "image", src: "/projects/verse/editor1.jpg", alt: "Verse story editor" },
  //     { type: "image", src: "/projects/verse/editor2.jpg", alt: "Verse story editor — interaction" },
  //     { type: "image", src: "/projects/verse/pricing.jpg", alt: "Pricing page" },
  //     { type: "image", src: "/projects/verse/settings.jpg", alt: "Settings" },
  //   ],
  // },
  {
    slug: "google-pride",
    title: "Google Pride",
    role: "Design Engineering",
    tags: ["design", "react/native", ""],
    summary: "An award winning interactive documentary",
    content: [
      {
        type: "text",
        html: `Partnering with Stink Studios NY to build Google's #ShowUp platform, I led the frontend development as well as created a CSS motion design language with an extremely talented team of designers and developers. We built an interactive map taking visitors on a documentary-style journey through the LGBTQ communities in several American cities. The campaign has ended but you can read about its success and see the work <a href="https://www.stinkstudios.com/work/google-showup">here</a>, <a href="https://thefwa.com/cases/showup-p2">here</a> and <a href="https://www.awwwards.com/sites/showup">here</a>.`,
      },
      { type: "image", src: "/projects/google-pride/home.jpg", alt: "#ShowUp landing" },
      { type: "image", src: "/projects/google-pride/ny.jpg", alt: "New York chapter" },
      { type: "image", src: "/projects/google-pride/la.jpg", alt: "Los Angeles chapter" },
      { type: "image", src: "/projects/google-pride/vid.jpg", alt: "Documentary video chapter" },
    ],
  },
  // {
  //   slug: "google-open-source",
  //   title: "Google Open Source",
  //   role: "Design Engineering",
  //   tags: ["design", "react/native", ""],
  //   summary: "A home for Google's 10k+ open source projects",
  //   content: [
  //     {
  //       type: "text",
  //       html: "I had the privilege of being the sole developer on the .com offering from Google's Open Source team. It uses Angular, Canvas, and loads of CSS motion design to strike a balance between the simplicity of web standards and the modern web.",
  //     },
  //     { type: "image", src: "/projects/google-open-source/home.jpg", alt: "Google Open Source home" },
  //     { type: "image", src: "/projects/google-open-source/projects.jpg", alt: "Projects directory" },
  //     { type: "image", src: "/projects/google-open-source/cloud.jpg", alt: "Cloud chapter" },
  //   ],
  // },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

/**
 * Collect a project's image srcs, in reading order. Pulls the thumbnail first,
 * then any images from `content` (new format) or `media` (legacy) — including
 * grid items — deduped. Videos contribute their poster if present.
 *
 * The project cards ask for one: the thumbnail when there is one, otherwise
 * the first case-study image.
 */
export function projectImages(project: Project, limit = 4): string[] {
  const out: string[] = [];
  const push = (src?: string) => {
    if (!src) return;
    // Paths are authored root-absolute, but normalize anyway (leaving remote
    // http(s) URLs untouched): a relative src resolves against the CURRENT
    // document URL, so one authored without a leading slash would 404 on
    // /projects/<slug> and — since that route never remounts the page tree —
    // stay broken after navigating back home.
    const norm = /^https?:\/\//.test(src) ? src : src.startsWith("/") ? src : `/${src}`;
    if (!out.includes(norm)) out.push(norm);
  };

  push(project.thumbnail);

  const media = project.content.filter(
    (b): b is ProjectMedia =>
      b.type === "image" || b.type === "video" || b.type === "grid",
  );

  for (const m of media) {
    if (m.type === "image") push(m.src);
    else if (m.type === "video") push(m.poster);
    else for (const item of m.items) push(item.src);
  }

  return out.slice(0, limit);
}
