import Image from "next/image";
import { LeadForm } from "@/components/lead-form";
import { Icon, PhotoPlaceholder, revealIndex, Stars, VideoPlaceholder } from "@/components/ui";

const REASONS = [
  { id: "rating", icon: "star", title: "Perfect Rating", text: "Service you can trust" },
  { id: "reporting", icon: "bar-chart", title: "Better Reporting", text: "CFO-level financial insights" },
  { id: "review", icon: "file-text", title: "Simple Review", text: "Easy-to-understand bookkeeping" },
  { id: "pricing", icon: "dollar-circle", title: "Low and Simple Pricing", text: "$270/month, no hidden fees" },
  { id: "people", icon: "users", title: "Real Humans", text: "Personal service, not software" },
  { id: "software", icon: "ledger-book", title: "Use QB, Xero and Wave", text: "Software you already use" },
  { id: "focus", icon: "calculator", title: "Just Bookkeeping", text: "Focused on bookkeeping excellence" },
  { id: "us-based", icon: "globe", title: "US Based", text: "Bookkeeping for US businesses" },
];

const REVIEW_ROWS = [
  [
    { name: "Garrett Mills", quote: "Communication has been great. Whenever I have a question, I get a quick response instead of having to chase someone down." },
    { name: "Nolan Whitaker", quote: "Onboarding was a breeze, and honestly, so is the service. Everything is simple and convenient." },
    { name: "Bryce Callahan", quote: "I was behind on my books and needed someone to get things in order. The whole process was much smoother than I expected." },
    { name: "Meredith Sloan", quote: "They’re quick to respond and actually take the time to explain things. That’s something I really appreciate." },
  ],
  [
    { name: "Preston Hayes", quote: "The reports are easy to follow, and I don’t need an accounting background to understand how my business is doing." },
    { name: "Tessa Monroe", quote: "Straightforward pricing and no unnecessary complications. Exactly what I was looking for." },
    { name: "Reid Lawson", quote: "Getting started was surprisingly easy. I shared what they needed, and they took care of the rest." },
    { name: "Camille Foster", quote: "It’s nice not having to worry about bookkeeping every month. The team keeps things moving and is easy to reach when needed." },
  ],
];

const REPORTS = [
  {
    images: [{ src: "/assets/img/site/insight-statements.webp", width: 1280, height: 954, alt: "Sample financial highlights for March: revenue, expenses, profit, margin, cash balance, forecast, equity and liabilities, each in one plain sentence with its page number." }],
    title: "CFO-Level Insights",
    lead: "See the bigger picture at a glance.",
    text: "Get a clear snapshot of your business’s financial performance, without the cost of hiring a full-time CFO.",
  },
  {
    images: [
      { src: "/assets/img/site/report-income-forecast.webp", width: 737, height: 484, alt: "Sample chart: forecast income for the year against actual income, month by month." },
      { src: "/assets/img/site/report-bank-balance.webp", width: 730, height: 484, alt: "Sample chart: monthly cash in, cash out and bank account balance." },
      { src: "/assets/img/site/report-quarterly-profit.webp", width: 741, height: 440, alt: "Sample chart: quarterly profit compared with the year before." },
      { src: "/assets/img/site/report-monthly-income.webp", width: 733, height: 448, alt: "Sample chart: this month's income against the monthly average." },
    ],
    title: "Visual Reports That Make Sense",
    lead: "Know where your money goes.",
    text: "Understand your profits, expenses, cash flow, margins, and financial trends through easy-to-follow visuals.",
  },
  {
    images: [{ src: "/assets/img/site/tax-statements.webp", width: 1529, height: 1029, alt: "Sample profit and loss statements: a yearly comparison and a 12 month comparison." }],
    title: "Financial Statements for Tax Time",
    lead: "Stay organized and prepared.",
    text: "Get the essential financial statements your accountant needs to help with tax preparation.",
  },
];

const CATCHUP_PRICE = "$220 per month of catch-up";
const CATCHUP_DISCOUNT = "18.5% discount on our regular monthly fee.";

function Review({ name, quote, clone }: { name: string; quote: string; clone?: boolean }) {
  return (
    <figure className="v2-review" aria-hidden={clone || undefined} data-clone={clone || undefined}>
      <Stars />
      <blockquote>{quote}</blockquote>
      <figcaption>{name}</figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <main id="main">
      <section className="v2-wrap v2-hero" aria-labelledby="hero-title">
        <div>
          <h1 id="hero-title" data-reveal="">8 Reasons to Choose Anoglobe</h1>
          <ul className="v2-tiles" role="list" aria-label="Reasons to choose Anoglobe">
            {REASONS.map(({ id, icon, title, text }, index) => (
              <li data-reveal="" style={revealIndex(index)} key={id}>
                <a className="v2-tile" href={`#${id}`}>
                  <Icon name={`${icon}-duo`} />
                  <span><strong>{title}</strong><span>{text}</span></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <figure className="v2-portrait" data-reveal="right" style={revealIndex(2)}>
          <PhotoPlaceholder label="the Anoglobe founders" />
          <figcaption><strong>[Founder names]</strong><span>Founders of Anoglobe Bookkeeping</span></figcaption>
        </figure>
      </section>

      <nav className="v2-nav" aria-label="Reasons to choose Anoglobe" data-toc="">
        <div className="v2-wrap">
          <p className="v2-nav__title">8 Reasons to Choose Anoglobe</p>
          <ul role="list">
            {REASONS.map(({ id, icon, title }) => (
              <li key={id}><a href={`#${id}`}><Icon name={icon} />{title}</a></li>
            ))}
          </ul>
        </div>
        <span className="v2-progress" aria-hidden="true" />
      </nav>

      <section className="v2-band v2-band--sky" id="how" aria-labelledby="how-title">
        <div className="v2-wrap v2-how">
          <h2 id="how-title" data-reveal="">How It Works?</h2>
          <VideoPlaceholder label="How Anoglobe works, video coming soon" index={1} />
        </div>
      </section>

      <section className="v2-band v2-band--cream" id="rating" aria-labelledby="rating-title">
        <div className="v2-wrap">
          <div className="v2-rating-head">
            <div className="v2-card" data-reveal="left">
              <span className="v2-badge" aria-hidden="true"><Icon name="star" /></span>
              <h2 id="rating-title">Perfect Rating</h2>
              <Stars />
              <p>Our focus is simple: reliable bookkeeping, clear reports, and service you can count on.</p>
            </div>
            <div className="v2-videos">
              {[1, 2, 3].map((n) => <VideoPlaceholder label={`Client video testimonial ${n}`} index={n} key={n} />)}
            </div>
          </div>
        </div>
        <div className="v2-marquee" data-marquee="" aria-label="Client reviews" role="region">
          {REVIEW_ROWS.map((row, rowIndex) => (
            <div className="v2-marquee__row" key={rowIndex}>
              <div className="v2-marquee__track">
                {row.map((review) => <Review {...review} key={review.name} />)}
                {row.map((review) => <Review {...review} clone key={`${review.name}-clone`} />)}
              </div>
            </div>
          ))}
          <button type="button" className="a-btn a-btn--outline a-btn--sm v2-marquee__toggle" data-marquee-toggle="" aria-pressed="false">
            <Icon name="paused" /><span>Pause reviews</span>
          </button>
        </div>
      </section>

      <section className="v2-band" id="reporting" aria-labelledby="reporting-title">
        <div className="v2-wrap">
          <div className="v2-card v2-card--center" data-reveal="zoom">
            <span className="v2-badge" aria-hidden="true"><Icon name="bar-chart" /></span>
            <h2 id="reporting-title">Better Reporting</h2>
            <p className="v2-lead">Get the financial clarity you need to grow your business.</p>
            <p>You shouldn’t need an accounting background to understand your numbers. Our reports turn your financial data into clear insights, helping you see how your business is doing and where it may need attention.</p>
          </div>
          <div className="v2-reports">
            {REPORTS.map(({ images, title, lead, text }, index) => (
              <div className="v2-report" key={title}>
                <div className={images.length > 1 ? "v2-shots" : undefined} data-reveal={index % 2 ? "right" : "left"}>
                  {images.map((image) => (
                    <Image className="v2-shot" {...image} key={image.src} sizes={images.length > 1 ? "(min-width: 640px) 29vw, 100vw" : "(min-width: 1024px) 58vw, 100vw"} />
                  ))}
                </div>
                <div className="v2-report__card" data-reveal={index % 2 ? "left" : "right"}>
                  <p className="v2-step">Report {index + 1} of 3</p>
                  <h3>{title}</h3>
                  <p className="v2-lead">{lead}</p>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="v2-band v2-band--sky" id="review" aria-labelledby="review-title">
        <div className="v2-wrap v2-two">
          <Image className="v2-shot" src="/assets/img/site/review-checklist.webp" width={1254} height={1254} alt="Sample review sheet: a spreadsheet of categorized transactions next to a review checklist for income, meals, travel, new vendors and uncategorized items." sizes="(min-width: 1024px) 50vw, 100vw" data-reveal="left" />
          <div className="v2-card" data-reveal="right">
            <span className="v2-badge" aria-hidden="true"><Icon name="file-text" /></span>
            <h2 id="review-title">Easy Bookkeeping Review</h2>
            <p className="v2-lead">Review your books without the accounting headache.</p>
            <p>You don’t need to be an accountant or learn complicated software to review your books.</p>
            <p>We make the process simple with an easy-to-follow review format that helps you understand your financial records and check our work.</p>
            <p className="v2-lead">No accounting experience needed. Just a simple, clear review.</p>
          </div>
        </div>
      </section>

      <section className="v2-band v2-band--mint" id="pricing" aria-labelledby="pricing-title">
        <div className="v2-wrap">
          <div className="v2-card v2-card--center" data-reveal="zoom">
            <span className="v2-badge" aria-hidden="true"><Icon name="dollar-circle" /></span>
            <h2 id="pricing-title">Simple Pricing. No Surprises.</h2>
            <p className="v2-lead">Don’t let our pricing surprise you. We’re a top-quality bookkeeping service!</p>
            <p>We’ve developed smarter ways of working, and we pass those savings directly on to you through one simple, affordable monthly fee.</p>
            <p>Great bookkeeping, great value. Everyone’s happy!</p>
            <div className="v2-price">
              <p className="v2-price__amount"><span className="v2-price__figure" data-count-to="270" data-count-prefix="$">$270</span><span>per month</span></p>
              <ul className="a-check-list" role="list">
                {["One flat monthly fee", "No hidden charges", "No confusing pricing tiers"].map((item) => (
                  <li key={item}><Icon name="check-circle-fill" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="v2-catchup">
              <h3>Behind on your books?</h3>
              <p>No worries. We offer discounted catch-up bookkeeping to help you get your records up to date.</p>
              <button type="button" className="a-btn a-btn--primary a-btn--lg" data-dialog-open="catchup-dialog">Explore Catch-Up Pricing</button>
            </div>
          </div>
        </div>
        <dialog className="a-dialog" id="catchup-dialog" aria-labelledby="catchup-title">
          <div className="a-dialog__header">
            <div>
              <h2 className="a-dialog__title" id="catchup-title">Catch-up pricing</h2>
            </div>
            <button type="button" className="a-btn a-btn--ghost a-btn--icon a-dialog__close" data-dialog-close="" aria-label="Close"><Icon name="close" /></button>
          </div>
          <div className="a-dialog__body v2-catchup__options">
            <article className="v2-catchup__option">
              <h3>I’m Starting Without Existing Books</h3>
              <p>We’ll set up your bookkeeping file and bring your records up to date.</p>
              <p className="v2-catchup__price">{CATCHUP_PRICE}</p>
              <p className="a-small a-muted">{CATCHUP_DISCOUNT}</p>
            </article>
            <article className="v2-catchup__option">
              <h3>I Already Have a Bookkeeping File</h3>
              <p>Already have a bookkeeping file? We’ll review your existing records, identify what needs attention, and bring your books up to date.</p>
              <p className="v2-catchup__price">{CATCHUP_PRICE}</p>
              <p className="a-small a-muted">{CATCHUP_DISCOUNT}</p>
            </article>
            <div className="v2-catchup__option v2-catchup__option--dashed">
              <h3>Additional Discount</h3>
              <p>If a month is already mostly complete and needs fewer than 20 transactions entered, we’ll charge just <strong>$120 for that month’s catch-up work</strong>, subject to review.</p>
            </div>
          </div>
          <div className="a-dialog__footer">
            <button type="button" className="a-btn a-btn--ghost" data-dialog-close="">Close</button>
            <a className="a-btn a-btn--primary" href="#get-started" data-dialog-close="">Get Started</a>
          </div>
        </dialog>
      </section>

      <section className="v2-band v2-band--cream" id="people" aria-labelledby="people-title">
        <div className="v2-wrap">
          <div className="v2-card v2-card--center" data-reveal="zoom">
            <span className="v2-badge" aria-hidden="true"><Icon name="users" /></span>
            <h2 id="people-title">Real Humans</h2>
            <p className="v2-lead">Personal Service. Real People.</p>
            <p>We’re here to do your bookkeeping, not just give you software to figure out.</p>
            <p>Our team handles your books, answers your questions, and works with your accountant when needed. You get real people who care about getting things right.</p>
            <figure className="v2-team">
              <PhotoPlaceholder label="the Anoglobe team" wide />
              <figcaption>The Anoglobe Team</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="v2-band v2-band--sky" id="software" aria-labelledby="software-title">
        <div className="v2-wrap v2-two">
          <div className="v2-card" data-reveal="left">
            <span className="v2-badge" aria-hidden="true"><Icon name="ledger-book" /></span>
            <h2 id="software-title">Use QuickBooks, Xero and Wave</h2>
            <p className="v2-lead">The software you already use.</p>
            <p>We work with QuickBooks, Xero, and Wave to keep your bookkeeping simple and convenient.</p>
          </div>
          <ul className="v2-software" role="list" aria-label="Supported software">
            {["QuickBooks", "Xero", "Wave"].map((name, index) => (
              <li data-reveal="right" style={revealIndex(index)} key={name}><Icon name="ledger-book-duo" className="a-icon--32" />{name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="v2-band" id="focus" aria-labelledby="focus-title">
        <div className="v2-wrap v2-two v2-two--flip">
          <div className="v2-card" data-reveal="right">
            <span className="v2-badge" aria-hidden="true"><Icon name="calculator" /></span>
            <h2 id="focus-title">Just Bookkeeping</h2>
            <p className="v2-lead">Our focus is bookkeeping. Your focus is growing your business.</p>
            <p>We specialize in bookkeeping to deliver organized records, clear reports, and a smoother experience.</p>
            <p>Already have a CPA? Great! We’ll help keep your books in order so your accountant can focus on tax and advisory work.</p>
          </div>
          <div className="v2-mark" aria-hidden="true" data-reveal="zoom"><Icon name="calculator-duo" /></div>
        </div>
      </section>

      <section className="v2-band v2-band--mint" id="us-based" aria-labelledby="us-based-title">
        <div className="v2-wrap">
          <div className="v2-card v2-card--center" data-reveal="zoom">
            <span className="v2-badge" aria-hidden="true"><Icon name="globe" /></span>
            <h2 id="us-based-title">US Based</h2>
            <p>Proudly US-based, we help small businesses across the United States manage their finances with reliable, affordable, and professional bookkeeping services.</p>
            <p className="v2-lead">Our goal is to make bookkeeping simpler, so you can focus on running your business.</p>
          </div>
        </div>
      </section>

      <section className="v2-lead-band" id="get-started" aria-labelledby="lead-title" data-theme="dark">
        <div className="v2-wrap">
          <div className="v2-lead-box" data-reveal="zoom">
            <h2 id="lead-title">Ready to Work With Us?</h2>
            <p>Tell us how to reach you and we’ll get right back to you.</p>
            <LeadForm />
          </div>
        </div>
      </section>
    </main>
  );
}
