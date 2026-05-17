# NicheCopywriter: Detailed Copywriting Rules Reference

This document provides the granular rules for the NicheCopywriter module.

## Zero-Placeholder Policy

The NicheCopywriter must **never** output placeholder text. Forbidden patterns include:
- "Lorem ipsum..."
- "Your Company Name"
- "Sample Product"
- "[Insert headline here]"
- "Product Name"
- "Brand Name"
- Any bracketed placeholders like `[CITY]`, `[PRICE]`, `[FEATURE]`

If a specific value is unknown, infer a realistic, industry-appropriate value and flag it in `warnings` as `inferred_value`.

## Headline Formulas by Website Type

### Ecommerce
- **Scarcity**: "Only [N] Left — The [Product] Everyone's Talking About"
- **Quality**: "Crafted to Last. Designed to Stand Out."
- **Transformation**: "Upgrade Your [Category] in One Click."
- **Social Proof**: "The [Product] 50,000+ Customers Swear By."

### SaaS
- **Outcome First**: "[Benefit] Without the [Pain Point]"
- **Metric Lead**: "Close 30% More Deals. Automatically."
- **Time Save**: "What Used to Take Hours Now Takes Minutes."
- **Risk Reverse**: "The [Solution] That Pays for Itself."

### Portfolio
- **Identity**: "[Name] — [Discipline] for Brands That Think Different."
- **Process**: "From Sketch to Screen. Every Pixel with Purpose."
- **Results**: "Design That Drives Results, Not Just Compliments."

### Landing Page
- **Direct Promise**: "[Outcome] in [Timeframe]. Guaranteed."
- **Curiosity**: "The [Secret] Top [Audience] Use to [Outcome]."
- **Problem/Solution**: "Tired of [Pain]? Here's the [Solution]."

### Dashboard / SaaS Internal
- **Clarity**: "Everything You Need. Nothing You Don't."
- **Control**: "Your Data. Your Decisions. One Dashboard."

### Restaurant
- **Sensory**: "Where [Cuisine] Meets [Atmosphere]."
- **Story**: "Three Generations. One Recipe. Your Table."
- **Experience**: "Dining That's Worth Leaving Home For."

### Agency
- **Transformation**: "We Don't Just Build Websites. We Build Growth."
- **Partnership**: "Your Vision. Our Craft. Unstoppable Results."
- **Authority**: "The Agency [Target Audience] Trusts With Their Brand."

### Real Estate
- **Lifestyle**: "Live Where [Feature] Meets [Feature]."
- **Investment**: "Smart Living. Smarter Investment."
- **Location**: "[Location] Living, Reimagined."

### Blog
- **Authority**: "The [Topic] Guide [Audience] Actually Read."
- **Curiosity**: "What [Experts] Know About [Topic] That You Don't."
- **Practical**: "[N] Ways to [Outcome] (Starting Today)."

### Education
- **Outcome**: "Learn [Skill]. Build [Outcome]."
- **Credibility**: "Trusted by [N]+ [Professionals]."
- **Accessibility**: "World-Class [Topic]. Zero Prior Experience Needed."

## CTA Button Text Rules

### Primary CTA
- Must start with an **action verb** (Get, Start, Claim, Book, Join, Download, Buy, Try, Schedule).
- Must be **2–5 words**.
- Must create **low perceived friction** ("Free", "Now", "Instant", "In 2 Minutes").
- Must be **specific to the conversion goal** — never generic "Submit" or "Click Here".

### Secondary CTA
- Must offer a **lower-commitment alternative** ("Watch Demo", "See Pricing", "Learn More", "View Gallery").
- Must **not compete** with the primary CTA visually — smaller, lighter weight, or outlined style.

## Testimonial Rules

### Name Generation
- Use realistic but **non-trademarked** names.
- Vary gender, ethnicity, and seniority level.
- Example set: "Sarah Chen", "Marcus Johnson", "Priya Patel", "David Okafor", "Elena Volkov", "James Whitfield".

### Company Generation
- Use **generic but plausible** company names.
- Match to the industry niche.
- Examples: "Atlas Logistics" (B2B), "Bloom & Co." (consumer), "Northwind Studios" (creative), "Cedar Health" (medical).

### Quote Construction
- Must contain a **specific, believable detail** (timeframe, metric, emotion, comparison).
- Good: "We cut our reporting time by 60% in the first month."
- Bad: "Great product, highly recommend."
- Length: 20–40 words.

## FAQ Rules

### Question Construction
- Must be written in the **voice of the skeptical buyer**.
- Must anticipate real objections.
- Good: "What happens if I exceed my plan limits?"
- Bad: "How great is your product?"

### Answer Construction
- Must be **specific and honest**.
- Must include a **soft CTA** where appropriate ("You can upgrade anytime — or chat with our team to find the right fit.").
- Length: 25–60 words.

## Tone Modulation

When multiple mood tags are present in the design DNA, the NicheCopywriter must **blend tones** rather than defaulting to the first tag.

| Mood Combo | Tone Blend |
|------------|-----------|
| luxury + minimal | Understated elegance. Precise. No exclamation points. Short sentences. |
| playful + friendly | Warm, conversational, occasional humor. Contractions welcome. |
| corporate + serious | Measured, factual, evidence-forward. No hyperbole. |
| futuristic + bold | Confident, forward-looking, slightly provocative. Imperative verbs. |
| organic + friendly | Warm, inclusive, nature metaphors. "We" and "you" language. |
| editorial + luxury | Sophisticated, cultural references, opinionated. Longer, complex sentences. |

## SEO Copy

- **Meta title**: 50–60 characters. Lead with primary keyword. Brand name at end if space permits.
- **Meta description**: 150–160 characters. Include primary keyword, a benefit, and a soft CTA.
- **URL slug**: inferred from headline, lowercase, hyphenated, no stop words.
