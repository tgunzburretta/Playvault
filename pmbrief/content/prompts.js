// PMBrief flagship library — 15 prompts, curated and rewritten from a much larger
// raw list. Selection criteria: broad daily utility for a working PM, coverage
// across the full product lifecycle (research → definition → build → ship →
// measure), and prompts that are hard to write well from scratch (multi-step,
// format-constrained, or bias-prone if done casually).
//
// Each entry adds real value beyond the raw prompt text: why it works, and a
// concrete usage tip. That annotation is the paid product, not just the prompt.

const PROMPTS = [
  {
    id: "research-open-ended-questions",
    category: "User Research",
    title: "Open-ended interview question generator",
    prompt:
      "Generate 15 open-ended interview questions for [target user persona] about their experience with [problem area]. Avoid leading questions. Include follow-up probes for each.",
    whyItWorks:
      "Most self-written interview guides accidentally smuggle in a hypothesis ('Don't you find X frustrating?'). Forcing the model to avoid leading questions and to attach a probe to every question keeps the session exploratory instead of confirmatory.",
    usageTip:
      "Fill [target user persona] with a real behavioral description, not a job title — 'a freelance designer who invoices 5+ clients a month' beats 'a designer.' Specific input produces specific, non-generic questions.",
  },
  {
    id: "research-synthesize-themes",
    category: "User Research",
    title: "Interview synthesis to top 5 themes",
    prompt:
      "I conducted user interviews and here are my notes: [paste notes]. Synthesize the top 5 themes. For each theme, summarize the core user need, a representative quote style, and the product implication.",
    whyItWorks:
      "Turns raw, messy notes into something a design or eng partner can act on in one read. Requiring a 'product implication' per theme stops the synthesis from being a book report on what users said.",
    usageTip:
      "Paste notes from at least 4-5 interviews at once. Below that, 'themes' are really just one person's opinion restated five ways.",
  },
  {
    id: "research-hypothesis-statements",
    category: "User Research",
    title: "Testable research hypotheses",
    prompt:
      "Write 5 hypothesis statements for user research in the format: 'We believe [user type] experiences [problem] because [assumption]. We will know this is true when [signal].'",
    whyItWorks:
      "The 'we will know this is true when' clause is the part teams skip, and it's the part that makes a hypothesis falsifiable instead of just a belief restated as a sentence.",
    usageTip:
      "Run this before you write a discussion guide, not after. Let the hypotheses tell you what the guide needs to probe.",
  },
  {
    id: "persona-detailed",
    category: "Persona Development",
    title: "Evidence-based persona builder",
    prompt:
      "Create a detailed user persona for [describe user based on research]. Include: demographics, goals, frustrations, behaviors, tools they use, and a day-in-the-life summary.",
    whyItWorks:
      "The day-in-the-life summary is what makes a persona usable in a design review — it's the difference between a data sheet nobody rereads and a mental model the team actually uses when arguing about a feature.",
    usageTip:
      "Feed it your actual research synthesis output, not a guess. A persona built from vibes is a costly way to formalize your own assumptions.",
  },
  {
    id: "framing-reframe-request",
    category: "Problem Definition",
    title: "Feature request → problem statement",
    prompt:
      "Reframe this feature request as a user problem statement: '[paste request].' Use the format: [User] needs a way to [goal] because [context/constraint].",
    whyItWorks:
      "Stakeholders pitch solutions ('add a bulk-export button'). This forces the underlying need into the open, which is what lets you and the stakeholder evaluate whether their solution is actually the best one.",
    usageTip:
      "Bring the reframed problem statement back to the requester and ask 'is this the need?' before you ideate solutions. It's a five-minute alignment check that prevents a wrong build.",
  },
  {
    id: "ideation-how-might-we",
    category: "Ideation",
    title: "How Might We question set",
    prompt:
      "Generate 10 'How Might We' questions from this problem context: [paste context]. Range from incremental to bold.",
    whyItWorks:
      "Asking explicitly for a range prevents the common failure mode where every HMW is a thin rewording of the same obvious fix. The bold end of the range is often where the interesting ideas live.",
    usageTip:
      "Use the incremental ones for this quarter's roadmap and the bold ones as prompts for a single 'no constraints' brainstorm — don't grade them on the same scale.",
  },
  {
    id: "definition-feature-brief",
    category: "Feature Definition",
    title: "Feature brief in one pass",
    prompt:
      "Write a feature brief for [feature name]. Include: the problem it solves, proposed solution, user flow summary, success metrics, out of scope items, and open questions.",
    whyItWorks:
      "'Out of scope' and 'open questions' are the two sections most first drafts skip, and they're the two sections that save the most back-and-forth with engineering later.",
    usageTip:
      "Treat the model's first draft as a skeleton, not a final brief — you still own the actual scope call. Use it to make sure you didn't forget a section, not to make the decision for you.",
  },
  {
    id: "stories-acceptance-criteria",
    category: "User Stories",
    title: "User story with Given/When/Then criteria",
    prompt:
      "Write a user story for [feature/functionality] in the format: As a [persona], I want [goal], so that [benefit]. Include 5 acceptance criteria in Given/When/Then format.",
    whyItWorks:
      "Given/When/Then criteria are directly testable, which is what turns a story from 'a paragraph the team interprets differently' into something QA can actually check off.",
    usageTip:
      "Ask for edge-case criteria (empty state, permission error, network failure) as a second pass — the first pass almost always only covers the happy path.",
  },
  {
    id: "roadmap-now-next-later",
    category: "Roadmapping",
    title: "Now / Next / Later roadmap organizer",
    prompt:
      "Organize these features into a Now / Next / Later roadmap: [paste list]. Explain the reasoning for any non-obvious placements.",
    whyItWorks:
      "Requiring reasoning on the non-obvious calls is what turns this into a decision document instead of a sorting exercise — it surfaces the trade-offs you'll actually get asked about in the roadmap review.",
    usageTip:
      "Bring your own strategic themes or OKRs into the prompt context. Without them the model can only sort by apparent effort/impact, not by what your business actually needs this half.",
  },
  {
    id: "prioritization-rice",
    category: "Prioritization",
    title: "RICE scoring with flagged assumptions",
    prompt:
      "Apply RICE scoring to these features: [paste list]. Use placeholders where data is missing and flag which estimates need validation.",
    whyItWorks:
      "The 'flag which estimates need validation' instruction is the load-bearing part — it stops RICE from producing false precision on numbers nobody actually measured.",
    usageTip:
      "Don't present the raw scores to stakeholders as-is. Use the flagged assumptions list to go get 2-3 real data points before the score becomes a roadmap decision.",
  },
  {
    id: "prioritization-kano",
    category: "Prioritization",
    title: "Kano model classifier",
    prompt:
      "Apply the Kano model to these features: [paste list]. Classify each as: Basic need, Performance feature, or Delighter.",
    whyItWorks:
      "Most backlogs conflate 'table stakes' with 'differentiator.' Forcing a three-way classification makes you defend which bucket each item is really in, which is where the useful argument happens.",
    usageTip:
      "Treat 'Delighter' classifications skeptically — challenge the model (and yourself) on whether it's a genuine delighter or just a feature nobody's validated yet.",
  },
  {
    id: "stakeholder-update-email",
    category: "Stakeholder Management",
    title: "Stakeholder update email",
    prompt:
      "Write a stakeholder update email for [project/feature] covering: what we shipped, what we learned, what's next, and what we need from them.",
    whyItWorks:
      "The 'what we need from them' line is what turns a status update into a working document — it converts a passive FYI email into something that gets you an actual response.",
    usageTip:
      "Keep the 'what we learned' section honest, including the miss, not just the win. Stakeholders trust update emails more once they've seen you name a real learning, not just good news.",
  },
  {
    id: "metrics-okrs",
    category: "Metrics & Goals",
    title: "OKR set generator",
    prompt:
      "Write an OKR set for [product team] for Q[X]. Include 2-3 objectives and 3-4 key results each. Make key results measurable and time-bound.",
    whyItWorks:
      "Forcing 'measurable and time-bound' catches the most common OKR failure — key results that are actually just tasks in disguise ('ship the redesign') rather than outcomes ('increase activation rate from 34% to 42% by Sep 30').",
    usageTip:
      "Run the draft through one more pass: for every key result, ask 'could this be true even if the product got worse?' If yes, rewrite it.",
  },
  {
    id: "ai-feature-prd",
    category: "AI Features",
    title: "AI feature PRD outline",
    prompt:
      "Write a product requirements document for an AI-powered [feature type] in [product]. Include: user problem, proposed AI behavior, training data requirements, evaluation criteria, and edge case handling.",
    whyItWorks:
      "AI features fail in review most often because 'evaluation criteria' and 'edge case handling' were never written down before build started. This format forces both into the brief from day one.",
    usageTip:
      "Be specific about what a bad output looks like, not just a good one — 'edge case handling' is only useful once you've named the failure modes you're designing against.",
  },
  {
    id: "power-combo-feedback-to-story",
    category: "Power Combo",
    title: "Feedback → problem → story → criteria (chained)",
    prompt:
      "First, summarize the key user problem from this feedback: [paste]. Then write a user story for it. Then generate 3 acceptance criteria. Do this in sequence.",
    whyItWorks:
      "Chaining the steps explicitly stops the model from jumping straight to a story that doesn't actually match the problem in the feedback — each step has to visibly build on the one before it, so you can catch a wrong turn early instead of at the end.",
    usageTip:
      "Read the output of each step before letting it continue to the next if you're doing this interactively — the highest-value moment is catching a misread problem statement before it becomes a story.",
  },
];

module.exports = { PROMPTS };
