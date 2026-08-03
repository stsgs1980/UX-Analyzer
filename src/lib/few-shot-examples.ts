/**
 * Few-shot examples for Reference Code prompt.
 * Real Pointer AI Landing Page production code fragments
 * that demonstrate key patterns: design tokens, interactivity, composition.
 *
 * Exported as a plain string (not template literal) to avoid backtick conflicts
 * with JSX code containing template literals.
 */

const BT = '```'; // backtick-triple constant to avoid escaping issues

export const fewShotExamples: string = `## Few-shot примеры (реальный production-код Pointer AI Landing)

Ниже — реальные фрагменты Pointer AI landing page (Next.js 15 + Tailwind CSS + shadcn/ui).
Используй их как референс паттернов: дизайн-токены, композиция, интерактивность.

### Пример 1: Design Tokens через Tailwind Config

${BT}typescript
// tailwind.config.ts — HSL CSS variables + shadcn/ui токены
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config
export default config
${BT}

### Пример 2: Интерактивный Client Component (Pricing с toggle)

${BT}tsx
// components/pricing-section.tsx — "use client", useState, responsive grid
"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true)

  const pricingPlans = [
    {
      name: "Free",
      monthlyPrice: "$0", annualPrice: "$0",
      description: "Perfect for individuals starting their journey.",
      features: ["Real-time code suggestions", "Basic integration logos", "Up to 2 AI coding agents"],
      buttonText: "Get Started",
      buttonClass: "bg-zinc-300 text-gray-800 hover:bg-zinc-400",
    },
    {
      name: "Pro",
      monthlyPrice: "$20", annualPrice: "$16",
      description: "Ideal for professionals.",
      features: ["Enhanced real-time previews", "Multiple MCP server connections", "Up to 10 concurrent AI coding agents"],
      buttonText: "Join now",
      buttonClass: "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
      popular: true,
    },
  ]

  return (
    <section className="w-full px-5 overflow-hidden flex flex-col justify-start items-center my-0 py-8 md:py-14">
      <div className="self-stretch relative flex flex-col justify-center items-center gap-2 py-0">
        <h2 className="text-center text-foreground text-4xl md:text-5xl font-semibold leading-tight">
          Pricing built for every developer
        </h2>
        {/* Annual/Monthly toggle */}
        <div className="pt-4">
          <div className="p-0.5 bg-muted rounded-lg outline outline-1 outline-[#0307120a] flex gap-1">
            <button onClick={() => setIsAnnual(true)} className={\`pl-2 pr-1 py-1 rounded-md \${isAnnual ? "bg-accent shadow-sm" : ""}\`}>
              <span className={\`text-sm font-medium \${isAnnual ? "text-accent-foreground" : "text-zinc-400"}\`}>Annually</span>
            </button>
            <button onClick={() => setIsAnnual(false)} className={\`px-2 py-1 rounded-md \${!isAnnual ? "bg-accent shadow-sm" : ""}\`}>
              <span className={\`text-sm font-medium \${!isAnnual ? "text-accent-foreground" : "text-zinc-400"}\`}>Monthly</span>
            </button>
          </div>
        </div>
      </div>
      {/* Plans grid */}
      <div className="self-stretch px-5 flex flex-col md:flex-row justify-start items-start gap-4 md:gap-6 mt-6 max-w-[1100px] mx-auto">
        {pricingPlans.map((plan) => (
          <div key={plan.name} className={\`flex-1 p-4 overflow-hidden rounded-xl flex flex-col gap-6 \${plan.popular ? "bg-primary shadow-lg" : "bg-gradient-to-b from-gray-50/5 to-gray-50/0"}\`}>
            <div className="self-stretch flex flex-col gap-6">
              <div className="flex justify-start items-center gap-1.5">
                <div className="relative h-10 flex items-center text-3xl font-medium">
                  <span className={\`absolute inset-0 flex items-center transition-all duration-500\${isAnnual ? " opacity-1" : " opacity-0 blur-[4px]"}\`}>{plan.annualPrice}</span>
                  <span className={\`absolute inset-0 flex items-center transition-all duration-500\${!isAnnual ? " opacity-1" : " opacity-0 blur-[4px]"}\`}>{plan.monthlyPrice}</span>
                </div>
                <div className="text-sm font-medium text-zinc-400">/month</div>
              </div>
              <Button className={\`self-stretch px-5 py-2 rounded-[40px] \${plan.buttonClass}\`}>
                {plan.buttonText}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
${BT}

### Пример 3: Композиция секций (Bento Grid)

${BT}tsx
// components/bento-section.tsx — BentoCard wrapper + grid layout
const BentoCard = ({ title, description, Component }) => (
  <div className="overflow-hidden rounded-2xl border border-white/20 flex flex-col justify-start items-start relative">
    <div className="absolute inset-0 rounded-2xl" style={{ background: "rgba(231, 236, 235, 0.08)", backdropFilter: "blur(4px)" }} />
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
    <div className="self-stretch p-6 flex flex-col justify-start items-start gap-2 relative z-10">
      <p className="self-stretch text-foreground text-lg font-normal leading-7">
        {title} <br /><span className="text-muted-foreground">{description}</span>
      </p>
    </div>
    <div className="self-stretch h-72 relative -mt-0.5 z-10"><Component /></div>
  </div>
)

export function BentoSection() {
  const cards = [
    { title: "AI-powered code reviews.", description: "Get real-time, smart suggestions.", Component: AiCodeReviews },
    { title: "Real-time coding previews", description: "Chat and preview changes together.", Component: RealtimeCodingPreviews },
  ]
  return (
    <section className="w-full px-5 flex flex-col justify-center items-center">
      <div className="w-full py-8 md:py-16 relative flex flex-col gap-6">
        <div className="self-stretch py-8 md:py-14 flex flex-col justify-center items-center gap-2 z-10">
          <h2 className="text-center text-foreground text-4xl md:text-6xl font-semibold leading-tight">
            Empower Your Workflow with AI
          </h2>
        </div>
        <div className="self-stretch grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          {cards.map((card) => <BentoCard key={card.title} {...card} />)}
        </div>
      </div>
    </section>
  )
}
${BT}`;
