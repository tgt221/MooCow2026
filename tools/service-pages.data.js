'use strict';

/**
 * Content for the four service detail pages.
 *
 * Copy is carried over from the WordPress pages (moocowtv.com/corporate/,
 * /socialmediacontent/, /construction/, /socialmedia2). Edit here, then run:
 *
 *   npm run build:pages
 *
 * PRICING IS A PROPOSAL. The `tiers`, `addons` and `notes` below were drafted
 * from 2026 market research for a small, hands-on production company and have
 * NOT been confirmed by MooCow. Review every number before publishing.
 *
 * `chip` must exactly match a "services" checkbox value in the home-page call
 * sheet — it pre-ticks that box when a visitor clicks through to contact.
 */

module.exports = [
  {
    slug: 'business-content',
    no: '01',
    name: 'Business<br>Content',
    plainName: 'Business Content',
    oldPaths: ['/corporate'],
    chip: 'Corporate Videos',
    // Pricing hidden on this page (user request, 2026-09-11). The tiers below
    // are kept so it can be switched back on by setting this to true.
    showInvestment: false,
    title: 'Business & Corporate Video',
    description: 'Company overviews, brand stories, service and sales videos, training, executive messages, recruitment films and event coverage — business and corporate video from MooCow Productions.',
    // Copy below is drawn from the "Business Video Production" and "Corporate
    // Video Production" sections of the MooCow brand playbook notes (Google Doc,
    // 2026-09-11), rewritten into the site's "we" voice.
    headline: 'Professional video that explains who you are, what you do, and why people should trust you.',
    intro: [
      'Video is one of the fastest ways to build trust. People trust what they can see.',
      'We create polished, professional video for your customers and your team — from company overviews and brand stories to training, executive messages, and recruitment. Every piece is built around a real business goal, not just to look good.'
    ],
    lanes: [
      {
        title: 'Business Video',
        lead: 'Help your business look more established, explain its value faster, and give potential customers a reason to trust you.',
        items: [
          'Company overview videos',
          '“Who we are” videos',
          'Brand story videos',
          'Service explanation videos',
          'Product & service promos',
          'Founder & CEO videos',
          'Customer-facing marketing videos',
          'Website videos',
          'Sales videos',
          'Capability videos'
        ]
      },
      {
        title: 'Corporate Video',
        lead: 'Clear, consistent, professional communication inside your company and out — video that makes complex information easier to understand and remember.',
        items: [
          'Training videos',
          'Instructional videos',
          'Executive messages',
          'Internal announcements',
          'Recap videos',
          'Staff communication videos',
          'Recruitment videos',
          'Culture videos',
          'Educational videos',
          'Process videos'
        ]
      },
      {
        // From the "Event Capture" section of the brand playbook notes.
        title: 'Event Capture',
        lead: "Events take time, money, and energy. We capture them so the value doesn't disappear once the room clears — and becomes lasting marketing, internal, and social assets.",
        items: [
          'Event recap videos',
          'Highlight reels',
          'Speaker coverage',
          'Panel coverage',
          'Interviews',
          'Testimonial capture',
          'Event photography',
          'Social media cutdowns',
          'Full-session recordings'
        ]
      }
    ],
    approach: {
      title: "You don't have to figure it out alone",
      intro: 'Most businesses know they need video but get stuck on where to start. We act as your creative production partner — not just a camera crew.',
      from: "We need a video, but we don't know where to start.",
      to: 'We have a clear plan, a professional production partner, and content we can actually use.',
      pointsTitle: 'We help you decide',
      points: [
        'What should be filmed',
        'What story to tell',
        'Which deliverables make sense',
        'What formats you need',
        'How the content can be reused',
        'How to get the most value from the shoot'
      ]
    },
    why: [
      { title: 'Video is evidence', text: "It proves you're active, that you know what you're doing, and that your business is worth trusting." },
      { title: 'Explain your value faster', text: "When people don't really understand what you do, overview, explainer, and service videos close the gap." },
      { title: 'Look as established as you are', text: 'Polished video helps you look as legitimate and trustworthy as the quality of work you already provide.' },
      { title: 'Messages people remember', text: 'Video simplifies complex information, so training, announcements, and processes actually stick.' },
      { title: 'Every video has a purpose', text: 'Attract clients, explain a service, train a team, support a proposal — we build each video around a real business goal.' },
      { title: 'One shoot, many assets', text: 'One production can become a website video, social clips, sales assets, and internal training material.' }
    ],
    tiers: [
      {
        name: 'Spotlight', price: '$2,500', prefix: 'From', unit: 'per project',
        blurb: 'One focused message, done right.',
        features: ['Half-day shoot (up to 4 hours)', 'One 60–90-second finished video', '2 vertical cutdowns for social', 'Licensed music and captions', '2 rounds of revisions']
      },
      {
        name: 'Signature', price: '$5,500', prefix: 'From', unit: 'per project', featured: true,
        blurb: 'A flagship video with the story built in.',
        features: ['Planning call plus script and interview prep', 'Full-day shoot (up to 8 hours)', 'One 2–3-minute hero video', '4 cutdowns for social and email', 'Interviews, b-roll, color and sound polish', '2 rounds of revisions']
      },
      {
        name: 'Series & Events', price: '$9,500', prefix: 'From', unit: 'per project',
        blurb: 'A training series, or an event covered end to end.',
        features: ['Two shoot days', '3–5 finished videos', 'Full scripting and creative direction', 'Motion-graphic titles and lower thirds', '3 rounds of revisions']
      }
    ],
    addons: [
      { name: 'Extra social cutdown', price: '$150 each' },
      { name: 'Aerial / drone footage', price: 'from $400' },
      { name: 'Extra shoot time', price: '$300 / hour' },
      { name: 'Rush delivery (5 business days)', price: '+25%' }
    ],
    notes: [
      'Every project starts with a free 20-minute discovery call, then a fixed written quote.',
      'Travel beyond 30 miles is quoted separately.'
    ]
  },

  {
    slug: 'social-media-content',
    no: '02',
    name: 'Social Media<br>Content',
    plainName: 'Social Media Content',
    oldPaths: ['/socialmediacontent'],
    chip: 'Content Creation',
    title: 'Social Media Content',
    description: 'Scroll-stopping reels, shorts, branded photography, graphics and campaign kits — social content with strategy baked in, from MooCow Productions.',
    headline: 'Stuck between no time, no team, and no content that actually works?',
    intro: [
      "Content is more than just visuals — it's how your brand speaks, moves, and connects. Whether you're launching a product, telling your story, or staying top-of-mind on social, we create scroll-stopping content with strategy baked in.",
      "We don't just make things look good — we make them work. From planning to production, we handle the creative heavy lifting so you don't have to. When you partner with MooCow, your content finally works as hard as you do."
    ],
    offers: [
      { title: 'Branded Video & Photography', text: 'Eye-catching, story-driven content made to showcase your product, team, or service.' },
      { title: 'Reels, Shorts & Social Clips', text: 'Platform-optimized videos built for engagement and shareability.' },
      { title: 'Graphics & Motion Design', text: 'Custom visuals that elevate your brand voice and stop the scroll.' },
      { title: 'Creative Direction & Scriptwriting', text: 'From concept to caption, we help shape ideas that land with impact.' },
      { title: 'Content Campaign Kits', text: 'Full sets of ready-to-post assets designed to launch your brand across platforms.' }
    ],
    why: [
      { title: 'Content fuels connection', text: 'The right visuals build trust, drive action, and create momentum.' },
      { title: 'You need consistency', text: 'We keep your look, voice, and vibe on point.' },
      { title: 'Speed matters', text: 'We work fast without compromising quality.' },
      { title: "It's hard to DIY", text: "We handle the creative heavy lifting so you don't have to." }
    ],
    tiers: [
      {
        name: 'Starter', price: '$1,200', prefix: '', unit: 'per month',
        blurb: 'A steady baseline of fresh, on-brand content.',
        features: ['Half-day shoot every month', '4 short-form videos (Reels, TikTok, Shorts)', '10 edited photos', 'Captions and hashtag sets']
      },
      {
        name: 'Growth', price: '$2,400', prefix: '', unit: 'per month', featured: true,
        blurb: 'Enough content to post several times a week.',
        features: ['Full-day shoot every month', '8 short-form videos', '20 edited photos', '4 branded graphics or carousels', 'Monthly creative planning call']
      },
      {
        name: 'Campaign Kit', price: '$3,500', prefix: 'From', unit: 'one time',
        blurb: 'Everything you need to launch something big.',
        features: ['Launch concept and script', 'Hero video plus 10 platform cutdowns', '15 photos and a matching graphics set', 'Delivered ready to post in every format']
      }
    ],
    addons: [
      { name: 'Extra short-form video', price: '$175 each' },
      { name: 'Extra edited photos', price: '$15 each' },
      { name: 'Animated logo sting', price: 'from $350' }
    ],
    notes: [
      'Monthly plans run on a 3-month minimum, then month to month.',
      "Posting, replies and ads aren't included here — that's Social Media Management."
    ]
  },

  {
    slug: 'construction',
    no: '03',
    name: 'Construction',
    plainName: 'Construction',
    oldPaths: ['/construction'],
    chip: 'Construction Visuals',
    // Pricing hidden on this page (user request, 2026-09-11). The tiers below
    // are kept so it can be switched back on by setting this to true.
    showInvestment: false,
    title: 'Construction Photo & Video',
    description: 'Inspection documentation, progress and milestone coverage, aerial drone visuals and stakeholder reporting for construction projects — MooCow Productions.',
    headline: 'Elevate your builds with visuals that speak volumes.',
    intro: [
      "Whether you're documenting milestones, conducting inspections, or creating marketing-ready assets, we deliver polished, professional footage and photography tailored to the construction industry.",
      'From aerial site footage to detailed visuals for compliance, our work keeps your projects transparent, professional, and on schedule.'
    ],
    offers: [
      { title: 'Inspection Documentation', text: 'High-resolution photo and video capture to support compliance, QA/QC reports, and site audits.' },
      { title: 'Progress & Milestone Coverage', text: 'From start to finish, we visually track your project — highlighting major phases with detailed imagery.' },
      { title: 'Aerial & Drone Visuals', text: "Showcase your site's scope and scale with sweeping aerial footage and photography." },
      { title: 'Client Reporting & Stakeholder Updates', text: 'Turn raw footage into clear, chronological content that keeps your team and clients in the know.' }
    ],
    why: [
      { title: 'Clear oversight', text: 'Reduce surprises with frequent visual updates.' },
      { title: 'Evidence for compliance', text: 'Build a visual timeline for permits and inspections.' },
      { title: 'Stand out in bids', text: 'Show off your precision and professionalism.' },
      { title: 'Stakeholder confidence', text: 'Keep everyone informed with transparent, on-site visuals.' }
    ],
    tiers: [
      {
        name: 'Site Visit', price: '$450', prefix: 'From', unit: 'per visit',
        blurb: 'For inspections, milestones and one-off needs.',
        features: ['Photo and video walkthrough', '60+ high-resolution photos', 'Organized, date-stamped gallery', 'Delivered within 48 hours']
      },
      {
        name: 'Monthly Progress', price: '$1,200', prefix: '', unit: 'per site / month', featured: true,
        blurb: 'A running visual record of the whole build.',
        features: ['2 site visits every month', 'Aerial / drone pass each month', 'A 60–90-second progress video every month', 'Shared, date-stamped photo archive']
      },
      {
        name: 'Build Documentary', price: '$6,500', prefix: 'From', unit: 'per project',
        blurb: 'Groundbreaking to handover, told as a story.',
        features: ['Scheduled coverage across the full build', 'Aerial time-lapse sequences', 'A 2–3-minute finished project film', '5 marketing cutdowns for bids and social']
      }
    ],
    addons: [
      { name: 'Extra site visit', price: '$400' },
      { name: 'Same-day gallery', price: '+$150' },
      { name: 'Additional site on a monthly plan', price: '15% off each' }
    ],
    notes: [
      'Drone work depends on weather and FAA airspace rules for each site.',
      'Monthly plans run on a 3-month minimum, then month to month.'
    ]
  },

  {
    slug: 'social-media-management',
    no: '04',
    name: 'Social Media<br>Management',
    plainName: 'Social Media Management',
    oldPaths: ['/socialmedia2', '/socialmedia'],
    chip: 'Social Media Management',
    title: 'Social Media Management',
    description: 'Content planning, scheduling, community management, comment and DM responses, and targeted ad campaigns — social media handled by MooCow Productions.',
    headline: 'Is social media management overwhelming you and underwhelming your clients?',
    intro: [
      'Running a business takes everything you\'ve got — and social media often ends up last on the list. But your audience doesn\'t wait. They expect timely posts, real engagement, and content that feels personal and consistent.',
      "We create and schedule on-brand content, manage your online community, respond to messages and comments, and run targeted ad campaigns that get your content in front of the right people — so you can focus on what you do best: running your business."
    ],
    offers: [
      { title: 'Content Planning & Strategy', text: 'A clear plan for what to post, where, and why — built around your goals.' },
      { title: 'Comment & DM Responses', text: 'We respond to interactions so your audience always hears back.' },
      { title: 'A Complete Content Calendar', text: 'Every post planned, approved, and scheduled ahead of time.' },
      { title: 'Posting at the Right Times', text: 'Content goes out when your audience is actually scrolling.' },
      { title: 'Promoted Posts & Targeted Ads', text: 'Boosting your best content for more reach and engagement.' },
      { title: 'Performance Tracking & Optimization', text: "We watch what's working and adjust the plan every month." }
    ],
    why: [
      { title: 'Your audience expects consistency', text: 'Regular, timely posts keep you top of mind.' },
      { title: 'Engagement builds trust', text: 'Every reply shows there is a real business behind the page.' },
      { title: 'Your time is better spent elsewhere', text: 'Hand it over and get back to running your business.' },
      { title: 'Data beats guesswork', text: 'Monthly reporting shows exactly what your content is doing.' }
    ],
    tiers: [
      {
        name: 'Essential', price: '$1,500', prefix: '', unit: 'per month',
        blurb: 'A consistent, professional presence.',
        features: ['2 platforms', '12 posts per month', 'Community management on weekdays', 'Monthly performance report']
      },
      {
        name: 'Growth', price: '$3,000', prefix: '', unit: 'per month', featured: true,
        blurb: 'Active growth with video and ads.',
        features: ['3 platforms', '20 posts per month, including 4 short-form videos', 'Daily comment and DM responses', 'Targeted ad management (ad spend separate)', 'Monthly strategy call']
      },
      {
        name: 'Full-Service', price: '$6,000', prefix: 'From', unit: 'per month',
        blurb: 'Your whole social presence, handled.',
        features: ['4+ platforms', '30+ posts per month, including 8 short-form videos', 'A content shoot on-site every month', 'Paid ads strategy and management', 'Detailed analytics and competitor reporting']
      }
    ],
    addons: [
      { name: 'One-time onboarding and strategy setup', price: '$500' },
      { name: 'Extra platform', price: '$400 / month' }
    ],
    notes: [
      'Ad spend is paid directly to the platforms, separate from your plan.',
      'Plans run on a 3-month minimum, then month to month.'
    ]
  }
];
