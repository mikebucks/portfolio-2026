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
    }
  | {
      type: "grid";
      items: { src: string; alt?: string; width?: number; height?: number }[];
      columns?: 2 | 3;
      caption?: string;
    };

export type Project = {
  slug: string;
  title: string;
  role: string;
  summary: string;
  tags: string[];
  body?: string[];
  /** Used on featured cards and the projects index list. */
  thumbnail?: string;
  /** Full-sized images and videos shown on the project detail page, in order. */
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
    body: [
      "Advanced design and user experience capability shouldn't be limited to specialists or gated tools; it should be something most people can participate in, learn from, and build on. Chisel, a product design assistant combining Figment's component library, design system, analytics, customer interviews, and issue tracking, and its mission is simple: <strong>make high-quality craft more accessible, collaborative, and scalable across Figment.</strong>",
      "Chisel, a product design assistant combining Figment's component library, design system, analytics, customer interviews, and issue tracking. Chisel moves design from a step in the process available to a select few, to a layer of infrastructure anyone in the org can use.",
      "At the heart of Chisel is a set of Claude Code skills that turn a prompt into a fully functioning feature inside Figment's frontend mono-repo.",
    ],
    media: [],
  },
  // {
  //   slug: "beatvox",
  //   title: "BeatVox",
  //   role: "Solo Founder",
  //   thumbnail: "https://picsum.photos/seed/beatvox/800/600",
  //   tags: ["swiftui", "audio", "design"],
  //   summary: "TODO",
  //   body: ["TODO"],
  //   media: [],
  // },
  {
    slug: "figment",
    title: "Figment",
    role: "Product Design & Growth",
    thumbnail: "projects/figment/thumbnail.png",
    tags: ["react", "web3", "design"],
    summary: "Digital asset management for financial institutions.",
    body: ["As the sole product designer at Figment, growing a self-serve staking product from zero to over $500M in assets under stake in 14 months as the sole designer for the entire experience."],
    media: [],
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
