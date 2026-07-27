export type ProjectMedia =
  | {
      type: "image";
      src: string;
      alt?: string;
      caption?: string;
      width?: number;
      height?: number;
    }
  | {
      type: "video";
      src: string;
      poster?: string;
      alt?: string;
      caption?: string;
      width?: number;
      height?: number;
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
      caption?: string;
    };

/**
 * A single ordered block of a project's detail page. `text` is rich text — its
 * `html` is rendered as trusted markup (this content is authored here in-repo,
 * never user input), so inline tags like <strong> / <em> / <a> render instead
 * of showing as literal characters. All the media block types can be freely
 * interleaved with text, letting images be peppered in amongst the copy.
 */
export type ProjectBlock = { type: "text"; html: string } | ProjectMedia;

export type Project = {
  slug: string;
  title: string;
  role: string;
  summary: string;
  tags: string[];
  /**
   * Preferred authoring format: an ordered mix of copy and media. When present,
   * this supersedes `body` + `media` on the detail page.
   */
  content?: ProjectBlock[];
  /** Used on featured cards and the projects index list. */
  thumbnail?: string;
  /**
   * Legacy copy paragraphs, rendered before `media`. Each string is rich text
   * (inline HTML allowed). Prefer `content` for new projects.
   */
  body?: string[];
  /**
   * Legacy trailing media stack, rendered after `body`. Prefer `content` for
   * new projects so media can be interleaved with copy.
   */
  media?: ProjectMedia[];
};

export const projects: Project[] = [
  {
    slug: "chisel",
    title: "Chisel",
    role: "Design & Engineering",
    thumbnail: "projects/chisel/thumbnail.png",
    tags: ["design-systems", "react", "vercel", "continuous-integraion"],
    summary: "More than a design system.",
    content: [
      {
        type: "text",
        html: "Advanced design and user experience capability shouldn't be limited to specialists or gated tools; it should be something most people can participate in, learn from, and build on. Chisel is a product design assistant combining Figment's component library, design system, analytics, customer interviews, and issue tracking, and its mission is simple:",
      },
      {
        type: "text",
        html: "<strong>Make high-quality craft more accessible, collaborative, and scalable across Figment.</strong>",
      },
      {
        type: "text",
        html: "Chisel moves design from a step in the process available to a select few, to an infrastructure layer anyone in the org can use.",
      },
      { type: "image", src: "/projects/chisel/chisel-process.png", alt: "Chisel process then vs now" },
      {
        type: "text",
        html: "At the heart of Chisel is a set of Claude Code skills that turn a prompt into a fully functioning feature inside Figment's frontend mono-repo. Leveraging Figment's existing CI pipeline, Chisel pushes code the same way an engineer does.",
      },
      { type: "image", src: "/projects/chisel/chisel-workflow.png", alt: "Chisel workflow" },
      {
        type: "text",
        html: `
        <strong>Outcomes</strong>
          <ol>
            <li>A single source of truth for all UI components and patterns. Improvement in overall quality and consistency of UIs by eliminating the need to translate static designs to code.</li>
            <li>Rapid prototyping for PMs, Engineers, and Designers. We can express design intents directly to the front end codebase instead of creating approximations in Figma that don't map 1:1 with code.</li>
            <li>Faster product iteration. Simple edits like copy changes and layout adjustments can be handled by PMs without the unnecessary overhead of Linear tickets, Figma updates, and engineering pipelines.</li>
          </ol>
        `,
      },
    ],
  },
  {
    slug: "figment-dapp",
    title: "Figment dApp",
    role: "Product Design & Growth",
    thumbnail: "projects/figment-dapp/thumbnail.png",
    tags: ["react", "web3", "design"],
    summary: "$500m in Ethereum staked in 12 months",
    // body: ["As the sole product designer at Figment, growing a self-serve staking product from zero to over $500M in assets under stake in 14 months as the sole designer for the entire experience."],
    // media: [],
    content: [
      {
        type: "text",
        html: ""
      },
      { type: "video", src: "/projects/figment-dapp/eth-flow.mp4", alt: "Ethereum staking flow in Ledger dApp", autoplay: true, },
    ],
  },
  {
    slug: "book-of-idra",
    title: "Book of Idra",
    role: "Design Engineering",
    thumbnail: "projects/book-of-idra/thumbnail.png",
    tags: ["web3", "creative-coding", "design", "branding"],
    summary: "What does the future of creative writing look like?",
    body: [
      "Book of Idra is a web3 experiment in collaborative storytelling. Token holders work together to craft a fictional story through consensus. Characters, locations, and entire worlds await their discovery.",
    ],
    media: [
      { type: "image", src: "/projects/book-of-idra/homepage.jpg", alt: "Book of Idra homepage" },
      { type: "image", src: "/projects/book-of-idra/angel-descriptions.jpg", alt: "The four celestial orders" },
      {
        type: "grid",
        items: [
          { src: "/projects/book-of-idra/angel1.jpg", alt: "Angel 1" },
          { src: "/projects/book-of-idra/angel2.jpg", alt: "Angel 2" },
          { src: "/projects/book-of-idra/angel3.png", alt: "Angel 3" },
          { src: "/projects/book-of-idra/angel4.jpg", alt: "Angel 4" },
        ],
      },
      { type: "image", src: "/projects/book-of-idra/logos.png", alt: "Logo explorations" },
      { type: "image", src: "/projects/book-of-idra/pentamorph.jpg", alt: "Pentamorph app" },
      { type: "image", src: "/projects/book-of-idra/bg-ring.jpg", alt: "Background ring illustration" },
    ],
  },
  {
    slug: "beatvox",
    title: "BeatVox",
    role: "Solo Founder",
    thumbnail: "https://picsum.photos/seed/beatvox/800/600",
    tags: ["swiftui", "audio", "design"],
    summary: "TODO",
    body: ["TODO"],
    media: [],
  },
  {
    slug: "figment-dashboard",
    title: "Figment Dashboard",
    role: "Product Design & Growth",
    thumbnail: "projects/figment-dapp/thumbnail.png",
    tags: ["react", "web3", "design"],
    summary: "Digital asset management for financial institutions.",
    body: ["As the sole product designer at Figment, growing a self-serve staking product from zero to over $500M in assets under stake in 14 months as the sole designer for the entire experience."],
    media: [],
  },
  {
    slug: "lyric",
    title: "Lyric",
    role: "Design Engineering",
    tags: ["design", "react/native", ""],
    summary: "The happy path for modern travelers.",
    body: [
      "As Creative Technology Principal at Lyric, a premium short term rental operator, I designed and experimented with UIs for interfacing with the Lyric brand. From booking a stay to keyless access via our native iOS app, my team and I planned, designed & built the happy paths for modern travelers. My main duties at Lyric included UI/UX design and React/RN development.",
    ],
    media: [
      { type: "image", src: "/projects/lyric/iosapp.png", alt: "Lyric React Native app" },
      { type: "image", src: "/projects/lyric/intro-amination.gif", alt: "App intro animation" },
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
    role: "Design Engineering",
    tags: ["design", "react/native", ""],
    summary: "UI consistency for a massive digital health ecosystem.",
    body: [
      "As Director of Product Design at Vori Health I oversaw the research, design, and implementation of Vori's suite of digital products. My team and I crafted a universal design system and implemented a seamless tokenization flow where values from Figma automatically update our React component styles. Vori's design system has been universally applied to internal clinical apps as well as consumer web and native mobile apps. It's had a big impact on engineering velocity since there is very little translation needed between Figma and React.",
    ],
    media: [
      { type: "image", src: "/projects/vori/dashboard.jpg", alt: "Clinical dashboard" },
      { type: "image", src: "/projects/vori/onboarding.jpg", alt: "Patient onboarding" },
      { type: "image", src: "/projects/vori/onboarding2.jpg", alt: "Patient onboarding — continued" },
      { type: "image", src: "/projects/vori/pt-cam.jpg", alt: "Physical therapy camera view" },
      { type: "image", src: "/projects/vori/conponents.png", alt: "Component library" },
      { type: "image", src: "/projects/vori/dsl.png", alt: "Vori design system" },
      { type: "image", src: "/projects/vori/token-automation.png", alt: "Figma-to-React token automation" },
    ],
  },
  {
    slug: "verse",
    title: "Verse",
    role: "Design Engineering",
    tags: ["design", "react/native", ""],
    summary: "A highly interactive video storytelling platform.",
    body: [
      "Verse is a highly interactive video storytelling platform. As Director of Product Development, I conceptualized, designed, and implemented many features in the Verse ecosystem including; custom embeddable interactive video players, immersive 360 video, clickable hotspots, and mobile-friendly UI. Check out some of the award-winning stories built on Verse.",
    ],
    media: [
      { type: "image", src: "/projects/verse/editor1.jpg", alt: "Verse story editor" },
      { type: "image", src: "/projects/verse/editor2.jpg", alt: "Verse story editor — interaction" },
      { type: "image", src: "/projects/verse/pricing.jpg", alt: "Pricing page" },
      { type: "image", src: "/projects/verse/settings.jpg", alt: "Settings" },
    ],
  },
  {
    slug: "google-pride",
    title: "Google Pride",
    role: "Design Engineering",
    tags: ["design", "react/native", ""],
    summary: "A highly interactive video storytelling platform.",
    body: [
      "Partnering with Stink Studios NY to build Google's #ShowUp platform, I lead the frontend development as well as created a CSS motion design language with an extremely talented team of designers and developers. We built an interactive map taking visitors on a documentary-style journey through the LGBTQ communities in several American cities. The campaign has ended but you can read about its success and see the work here, here and here.",
    ],
    media: [
      { type: "image", src: "/projects/google-pride/home.jpg", alt: "#ShowUp landing" },
      { type: "image", src: "/projects/google-pride/ny.jpg", alt: "New York chapter" },
      { type: "image", src: "/projects/google-pride/la.jpg", alt: "Los Angeles chapter" },
      { type: "image", src: "/projects/google-pride/vid.jpg", alt: "Documentary video chapter" },
    ],
  },
  {
    slug: "google-open-source",
    title: "Google Open Source",
    role: "Design Engineering",
    tags: ["design", "react/native", ""],
    summary: "A home for Google's 10k+ open source projects.",
    body: [
      "I had the privilege of being the sole developer on the .com offering from Google's Open Source team. It uses Angular, Canvas, and loads of CSS motion design to strike a balance between the simplicity of web standards and the modern web.",
    ],
    media: [
      { type: "image", src: "/projects/google-open-source/home.jpg", alt: "Google Open Source home" },
      { type: "image", src: "/projects/google-open-source/projects.jpg", alt: "Projects directory" },
      { type: "image", src: "/projects/google-open-source/cloud.jpg", alt: "Cloud chapter" },
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

/** How many leading projects are treated as "featured" cards. */
export const FEATURED_COUNT = 3;

/** The featured cards shown up top under "Recently shipped". */
export const featuredProjects = projects.slice(0, FEATURED_COUNT);

/**
 * Everything else — the long index. Excludes the featured projects so they
 * aren't immediately repeated now that both live on the same page.
 */
export const otherProjects = projects.slice(FEATURED_COUNT);

/**
 * Collect a project's image srcs, in reading order, for the hover-reveal strip
 * and the click Flip. Pulls the thumbnail first, then any images from `content`
 * (new format) or `media` (legacy) — including grid items — deduped. Videos
 * contribute their poster if present.
 */
export function projectImages(project: Project, limit = 5): string[] {
  const out: string[] = [];
  const push = (src?: string) => {
    if (!src) return;
    // Thumbnails are authored without a leading slash; media with one. Normalize
    // to root-absolute (leave remote http(s) URLs untouched) so both work as
    // background-image / <img> srcs from any route.
    const norm = /^https?:\/\//.test(src) ? src : src.startsWith("/") ? src : `/${src}`;
    if (!out.includes(norm)) out.push(norm);
  };

  push(project.thumbnail);

  const media: ProjectMedia[] = project.content
    ? project.content.filter((b): b is ProjectMedia => b.type !== "text")
    : (project.media ?? []);

  for (const m of media) {
    if (m.type === "image") push(m.src);
    else if (m.type === "video") push(m.poster);
    else for (const item of m.items) push(item.src);
  }

  return out.slice(0, limit);
}
