export type Importance = "critical" | "high" | "medium" | "low";

export interface FeedItem {
  id: string;
  category: string;
  headline: string;
  source: string;
  time: string;
  summary: string;
  importance: Importance;
  score: number;
  url?: string;
}

export interface MarketTick {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  currency?: string;
}

export interface RegionSnapshot {
  region: string;
  flag: string;
  headline: string;
  trend: "up" | "down" | "flat";
  activity: number;
}

export interface ImportantEvent {
  id: string;
  headline: string;
  category: string;
  impact: number;
  summary: string;
}

export const breakingTicker = [
  {
    tag: "BREAKING",
    text: "Fed signals possible rate pause as inflation cools to 2.1%",
    time: "2m",
  },
  { tag: "MARKETS", text: "Nifty 50 crosses 23,300 in record-breaking session", time: "8m" },
  { tag: "AI", text: "OpenAI unveils GPT-6 with native agentic reasoning", time: "14m" },
  { tag: "SPACE", text: "ISRO's Gaganyaan crew capsule clears final abort test", time: "21m" },
  {
    tag: "GEOPOLITICS",
    text: "G20 leaders agree on global AI safety framework in Delhi",
    time: "33m",
  },
  { tag: "ENERGY", text: "Crude slips below $72 after surprise OPEC+ output hike", time: "47m" },
];

export const overviewStats = [
  { label: "Important Today", value: "248", delta: "+12%", tone: "positive" as const },
  { label: "India Updates", value: "64", delta: "+8%", tone: "positive" as const },
  { label: "Global Updates", value: "112", delta: "+3%", tone: "positive" as const },
  { label: "Market Updates", value: "38", delta: "-2%", tone: "critical" as const },
  { label: "Technology", value: "27", delta: "+19%", tone: "positive" as const },
  { label: "Science", value: "14", delta: "+4%", tone: "positive" as const },
];

export const feedItems: FeedItem[] = [
  {
    id: "f1",
    category: "Markets",
    headline: "Nifty 50 closes at all-time high as IT and banks rally",
    source: "Bloomberg",
    time: "4m ago",
    summary:
      "Heavyweight IT names led a broad-based rally as foreign inflows hit a three-week high. Analysts cite easing US yields.",
    importance: "high",
    score: 87,
  },
  {
    id: "f2",
    category: "Technology",
    headline: "Anthropic raises $8B at $180B valuation to scale Claude infrastructure",
    source: "The Information",
    time: "11m ago",
    summary:
      "The round, led by sovereign funds, will fund a new million-GPU cluster and an expanded enterprise agent platform.",
    importance: "critical",
    score: 94,
  },
  {
    id: "f3",
    category: "India",
    headline: "Cabinet approves ₹1.2 lakh crore semiconductor expansion plan",
    source: "Reuters",
    time: "23m ago",
    summary:
      "Three new fabs greenlit in Gujarat and Karnataka. The expansion targets 28nm and 14nm process nodes by 2027.",
    importance: "high",
    score: 89,
  },
  {
    id: "f4",
    category: "Science",
    headline: "JWST detects water vapor in temperate exoplanet's atmosphere",
    source: "Nature",
    time: "38m ago",
    summary:
      "K2-18b spectroscopy reveals strong H₂O and possible dimethyl sulfide signatures, hinting at habitability.",
    importance: "high",
    score: 82,
  },
  {
    id: "f5",
    category: "Cybersecurity",
    headline: "Zero-day in widely used VPN appliance under active exploitation",
    source: "Mandiant",
    time: "52m ago",
    summary:
      "CISA issues emergency directive; patches available. Roughly 18,000 internet-exposed devices remain vulnerable.",
    importance: "critical",
    score: 96,
  },
  {
    id: "f6",
    category: "Vehicles",
    headline: "Tata Motors unveils Avinya X concept with 700km solid-state range",
    source: "AutoCar",
    time: "1h ago",
    summary:
      "Production targeted for late 2026. Platform shared with JLR's next-gen Range Rover EV.",
    importance: "medium",
    score: 71,
  },
  {
    id: "f7",
    category: "Business",
    headline: "Reliance Jio files for $12B IPO, India's largest ever",
    source: "Financial Times",
    time: "1h ago",
    summary: "Listing expected on both NSE and Nasdaq. Valuation target north of $130 billion.",
    importance: "critical",
    score: 92,
  },
  {
    id: "f8",
    category: "World",
    headline: "EU finalizes AI Liability Directive, effective Q1 2027",
    source: "Politico",
    time: "2h ago",
    summary:
      "Shifts burden of proof onto AI developers for high-risk systems. Open-source models receive carve-outs.",
    importance: "high",
    score: 84,
  },
];

export const trendingTopics = [
  { label: "Artificial Intelligence", count: 1284, delta: 18 },
  { label: "Nifty 50", count: 942, delta: 7 },
  { label: "India", count: 873, delta: 12 },
  { label: "ISRO", count: 612, delta: 41 },
  { label: "Electric Vehicles", count: 588, delta: 9 },
  { label: "Cybersecurity", count: 491, delta: 22 },
  { label: "Quantum Computing", count: 312, delta: 31 },
  { label: "OPEC+", count: 287, delta: -4 },
];

export const globalSnapshots: RegionSnapshot[] = [
  {
    region: "India",
    flag: "🇮🇳",
    headline: "Cabinet clears ₹1.2L cr semiconductor plan",
    trend: "up",
    activity: 92,
  },
  {
    region: "United States",
    flag: "🇺🇸",
    headline: "Fed minutes hint at extended pause",
    trend: "up",
    activity: 88,
  },
  {
    region: "China",
    flag: "🇨🇳",
    headline: "PBoC injects ¥800B liquidity into markets",
    trend: "down",
    activity: 74,
  },
  {
    region: "Europe",
    flag: "🇪🇺",
    headline: "AI Liability Directive cleared for 2027",
    trend: "flat",
    activity: 66,
  },
  {
    region: "Middle East",
    flag: "🌍",
    headline: "UAE inks $50B sovereign AI compute pact",
    trend: "up",
    activity: 71,
  },
  {
    region: "Russia",
    flag: "🇷🇺",
    headline: "Energy exports rerouted via Arctic corridor",
    trend: "down",
    activity: 58,
  },
  {
    region: "Japan",
    flag: "🇯🇵",
    headline: "BOJ holds rates, eyes Q2 normalization",
    trend: "flat",
    activity: 62,
  },
];

export const marketTicks: MarketTick[] = [
  { symbol: "NIFTY", name: "Nifty 50", price: 23290.15, change: 120.4, changePct: 0.52 },
  { symbol: "SENSEX", name: "Sensex", price: 76693.36, change: 393.2, changePct: 0.51 },
  { symbol: "NDX", name: "Nasdaq", price: 19000.5, change: -45.1, changePct: -0.24 },
  { symbol: "DJI", name: "Dow Jones", price: 38886.17, change: 75.5, changePct: 0.19 },
  { symbol: "GOLD", name: "Gold", price: 2325.2, change: 12.1, changePct: 0.52, currency: "$/oz" },
  {
    symbol: "SILVER",
    name: "Silver",
    price: 29.45,
    change: -0.15,
    changePct: -0.51,
    currency: "$/oz",
  },
  {
    symbol: "CRUDE",
    name: "Crude Oil",
    price: 75.53,
    change: -0.85,
    changePct: -1.11,
    currency: "$/bbl",
  },
  { symbol: "USDINR", name: "USD / INR", price: 83.52, change: 0.04, changePct: 0.05 },
];

export const techItems = [
  {
    title: "GPT-6 launches with native agentic reasoning",
    tag: "AI",
    time: "14m",
    desc: "OpenAI debuts multi-step planning, persistent memory, and tool autonomy in a single model.",
  },
  {
    title: "Apple ships Vision Pro 2 with 40% lighter chassis",
    tag: "Hardware",
    time: "1h",
    desc: "Second-gen M5 spatial computer cuts weight to 380g and adds eye-tracked typing.",
  },
  {
    title: "Perplexity acquires browser startup for $400M",
    tag: "Startup",
    time: "2h",
    desc: "Move signals agentic-browser race with OpenAI and Anthropic.",
  },
  {
    title: "Figma releases AI design agent, free for teams",
    tag: "Software",
    time: "3h",
    desc: "Generates production-grade components from Figma boards and screenshots.",
  },
];

export const scienceItems = [
  {
    title: "Chandrayaan-4 sample return mission cleared for 2027",
    tag: "Space",
    time: "30m",
    desc: "ISRO confirms two-rocket architecture with NASA's lunar gateway support.",
  },
  {
    title: "CRISPR therapy reverses early Alzheimer's markers",
    tag: "Medicine",
    time: "2h",
    desc: "Phase II trial shows 38% reduction in tau tangles across 240 patients.",
  },
  {
    title: "Fusion startup achieves Q=2.4 in commercial reactor",
    tag: "Energy",
    time: "4h",
    desc: "Commonwealth Fusion's SPARC milestone moves grid-ready fusion closer to 2030.",
  },
  {
    title: "Quantum chip hits 1,200 logical qubits at room temp",
    tag: "Quantum",
    time: "5h",
    desc: "PsiQuantum's photonic architecture sidesteps cryogenic constraints.",
  },
];

export const vehicleItems = [
  { title: "Tata Avinya X concept: 700km solid-state range", tag: "EV", time: "1h" },
  { title: "Royal Enfield Himalayan EV teased for Auto Expo", tag: "Bike", time: "3h" },
  { title: "Boeing 777-9 receives FAA certification", tag: "Aerospace", time: "5h" },
  { title: "Hyperloop India clears 600 km/h pod test", tag: "Transport", time: "7h" },
  { title: "BYD overtakes Tesla in global EV deliveries", tag: "EV", time: "9h" },
  { title: "Porsche Mission X enters production for 2026", tag: "Car", time: "11h" },
];

export const importantEvents: ImportantEvent[] = [
  {
    id: "e1",
    headline: "G20 leaders sign global AI safety framework in Delhi",
    category: "Geopolitics",
    impact: 96,
    summary:
      "Binding standards on frontier model evaluation, redteaming, and incident disclosure across 20 economies.",
  },
  {
    id: "e2",
    headline: "Fed pauses rate cuts, signals data-dependent 2026 path",
    category: "Markets",
    impact: 93,
    summary:
      "Chair Powell cites sticky services inflation; markets reprice June 2026 cut odds to 42%.",
  },
  {
    id: "e3",
    headline: "Reliance Jio files for $12B dual IPO",
    category: "Business",
    impact: 92,
    summary:
      "Largest Indian listing on record, with concurrent Nasdaq tranche targeting global retail.",
  },
  {
    id: "e4",
    headline: "Critical VPN zero-day actively exploited",
    category: "Cybersecurity",
    impact: 91,
    summary:
      "CISA emergency directive; 18,000 exposed devices, multiple Fortune 500 breaches confirmed.",
  },
  {
    id: "e5",
    headline: "OpenAI ships GPT-6 with agentic reasoning",
    category: "Technology",
    impact: 90,
    summary: "Native multi-step planning collapses the gap between chatbot and autonomous worker.",
  },
  {
    id: "e6",
    headline: "India clears ₹1.2L cr semiconductor expansion",
    category: "India",
    impact: 88,
    summary: "Three fabs greenlit; targets 14nm domestic production by 2027.",
  },
  {
    id: "e7",
    headline: "EU AI Liability Directive finalized",
    category: "Regulation",
    impact: 85,
    summary: "Shifts burden of proof onto developers of high-risk systems beginning Q1 2027.",
  },
  {
    id: "e8",
    headline: "JWST finds water vapor on K2-18b",
    category: "Science",
    impact: 83,
    summary: "Strongest habitability signal yet from a temperate sub-Neptune exoplanet.",
  },
  {
    id: "e9",
    headline: "OPEC+ surprise output hike sends crude below $72",
    category: "Energy",
    impact: 80,
    summary: "Saudi-led group adds 1.1M bpd to defend market share against US shale.",
  },
  {
    id: "e10",
    headline: "BYD overtakes Tesla in global EV deliveries",
    category: "Vehicles",
    impact: 78,
    summary: "Q3 figures show 28% YoY growth vs Tesla's 4% decline; price war intensifies.",
  },
];

export const notifications = {
  critical: [
    {
      title: "VPN zero-day actively exploited",
      time: "12m ago",
      desc: "Emergency CISA directive — patch within 24 hours.",
    },
    {
      title: "Sensex plunges 1.8% on opening",
      time: "1h ago",
      desc: "Triggered by overnight Nasdaq selloff and weak Asian cues.",
    },
  ],
  important: [
    {
      title: "GPT-6 released to enterprise tier",
      time: "30m ago",
      desc: "Native agentic reasoning, 2M token context window.",
    },
    {
      title: "Reliance Jio files $12B IPO",
      time: "2h ago",
      desc: "India's largest listing, dual NSE / Nasdaq.",
    },
    {
      title: "Fed signals possible rate pause",
      time: "4h ago",
      desc: "Markets reprice June 2026 cut odds to 42%.",
    },
  ],
  general: [
    {
      title: "Your weekly intelligence digest is ready",
      time: "Today, 7:00",
      desc: "248 important stories, 12 critical alerts this week.",
    },
    {
      title: "New trending topic: Quantum Computing",
      time: "Yesterday",
      desc: "Mentions up 31% over the last 24 hours.",
    },
    {
      title: "5 new articles saved across your interests",
      time: "Yesterday",
      desc: "AI, Markets, Science — review your reading queue.",
    },
  ],
};

export const interestCategories = [
  { id: "ai", label: "Artificial Intelligence", desc: "Frontier models, agents, research" },
  { id: "technology", label: "Technology", desc: "Software, hardware, platforms" },
  { id: "markets", label: "Markets", desc: "Equities, commodities, FX, rates" },
  { id: "science", label: "Science", desc: "Space, medicine, physics, biology" },
  { id: "ev", label: "Electric Vehicles", desc: "EVs, charging, battery tech" },
  { id: "startups", label: "Startups", desc: "Funding, IPOs, founders" },
  { id: "business", label: "Business", desc: "Earnings, deals, leadership" },
  { id: "sports", label: "Sports", desc: "Cricket, F1, football, Olympics" },
  { id: "politics", label: "Politics", desc: "Policy, elections, geopolitics" },
];

export const savedArticles = feedItems.slice(0, 5);
