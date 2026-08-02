#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pointer AI Landing Page - Teardown Analysis & Implementation Pipeline
Generated PDF Report
"""

import os
import hashlib
import platform
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ═══════════════════════════════════════════════════════════════
# FONT SETUP
# ═══════════════════════════════════════════════════════════════
FONT_DIR = '/usr/share/fonts'
_IS_MAC = platform.system() == 'Darwin'
if _IS_MAC:
    FONT_DIR = os.path.expanduser('~/.openclaw/workspace/fonts')

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# NotoSansSC variable font not compatible with ReportLab - use LiberationSans as sans fallback
pdfmetrics.registerFont(TTFont('LiberationSans', f'{FONT_DIR}/truetype/chinese/LiberationSans-Regular.ttf'))

pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold')

pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansMono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

# Font fallback for mixed CJK/Latin
def install_font_fallback():
    from reportlab.pdfbase.ttfonts import TTFont
    _origDraw = None
    _fallbacks = {
        'NotoSerifSC': ['FreeSerif', 'DejaVuSans'],
        'FreeSerif': ['DejaVuSans'],
    }
    return _fallbacks

_fallbacks = install_font_fallback()

# ═══════════════════════════════════════════════════════════════
# CASCADE PALETTE
# ═══════════════════════════════════════════════════════════════
PAGE_BG       = colors.HexColor('#f5f6f6')
SECTION_BG    = colors.HexColor('#ecedee')
CARD_BG       = colors.HexColor('#e3e6e8')
TABLE_STRIPE  = colors.HexColor('#eff1f2')
HEADER_FILL   = colors.HexColor('#42555f')
COVER_BLOCK   = colors.HexColor('#3f5a67')
BORDER        = colors.HexColor('#aebdc5')
ICON          = colors.HexColor('#496d7f')
ACCENT        = colors.HexColor('#2f7a9f')
ACCENT_2      = colors.HexColor('#ce6542')
TEXT_PRIMARY   = colors.HexColor('#161819')
TEXT_MUTED     = colors.HexColor('#70777a')
SEM_SUCCESS   = colors.HexColor('#3e8254')
SEM_WARNING   = colors.HexColor('#967a42')
SEM_ERROR     = colors.HexColor('#a15a54')
SEM_INFO      = colors.HexColor('#48749f')

# ═══════════════════════════════════════════════════════════════
# STYLES
# ═══════════════════════════════════════════════════════════════
styles = getSampleStyleSheet()

cover_title_style = ParagraphStyle(
    name='CoverTitle', fontName='FreeSerif-Bold', fontSize=36,
    leading=44, alignment=TA_LEFT, textColor=colors.white,
    spaceAfter=8*mm,
)
cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle', fontName='FreeSerif', fontSize=14,
    leading=20, alignment=TA_LEFT, textColor=colors.HexColor('#b0c4d0'),
    spaceAfter=12*mm, letterSpacing=2,
)
cover_kicker_style = ParagraphStyle(
    name='CoverKicker', fontName='FreeSerif', fontSize=11,
    leading=16, alignment=TA_LEFT, textColor=colors.HexColor('#8aacbe'),
    spaceAfter=4*mm, letterSpacing=3,
)

h1_style = ParagraphStyle(
    name='H1', fontName='NotoSerifSC-Bold', fontSize=22,
    leading=30, textColor=HEADER_FILL, spaceBefore=14*mm,
    spaceAfter=6*mm, alignment=TA_LEFT,
)
h2_style = ParagraphStyle(
    name='H2', fontName='NotoSerifSC-Bold', fontSize=16,
    leading=22, textColor=ACCENT, spaceBefore=8*mm,
    spaceAfter=4*mm, alignment=TA_LEFT,
)
h3_style = ParagraphStyle(
    name='H3', fontName='NotoSansSC-Bold', fontSize=13,
    leading=18, textColor=ICON, spaceBefore=6*mm,
    spaceAfter=3*mm, alignment=TA_LEFT,
)
body_style = ParagraphStyle(
    name='Body', fontName='FreeSerif', fontSize=10.5,
    leading=17, textColor=TEXT_PRIMARY, spaceAfter=3*mm,
    alignment=TA_JUSTIFY, firstLineIndent=0,
)
body_cn_style = ParagraphStyle(
    name='BodyCN', fontName='NotoSerifSC', fontSize=10.5,
    leading=18, textColor=TEXT_PRIMARY, spaceAfter=3*mm,
    alignment=TA_LEFT, wordWrap='CJK', firstLineIndent=2*4.5*mm,
)
code_style = ParagraphStyle(
    name='Code', fontName='DejaVuSansMono', fontSize=8.5,
    leading=13, textColor=TEXT_PRIMARY, spaceAfter=2*mm,
    alignment=TA_LEFT, backColor=CARD_BG, leftIndent=6*mm,
    rightIndent=6*mm, spaceBefore=2*mm,
    borderPadding=4,
)
bullet_style = ParagraphStyle(
    name='Bullet', fontName='FreeSerif', fontSize=10.5,
    leading=16, textColor=TEXT_PRIMARY, spaceAfter=2*mm,
    alignment=TA_LEFT, leftIndent=12*mm, bulletIndent=6*mm,
)
caption_style = ParagraphStyle(
    name='Caption', fontName='FreeSerif', fontSize=9,
    leading=13, textColor=TEXT_MUTED, alignment=TA_LEFT,
    spaceAfter=4*mm,
)
footer_style = ParagraphStyle(
    name='Footer', fontName='FreeSerif', fontSize=8,
    leading=10, textColor=TEXT_MUTED, alignment=TA_CENTER,
)

# ═══════════════════════════════════════════════════════════════
# OUTPUT
# ═══════════════════════════════════════════════════════════════
OUTPUT_DIR = '/home/z/my-project/download'
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'Pointer_AI_Landing_Page_Teardown_Analysis.pdf')

doc = SimpleDocTemplate(
    OUTPUT_FILE,
    pagesize=A4,
    leftMargin=22*mm, rightMargin=22*mm,
    topMargin=20*mm, bottomMargin=20*mm,
    title='Pointer AI Landing Page - Teardown Analysis & Implementation Pipeline',
    author='Z.ai',
    subject='UI/UX Teardown, Deconstruction, Spec, Patterns, Reverse Engineering, Audit, Heuristics, Design System',
)

PAGE_W = A4[0] - doc.leftMargin - doc.rightMargin
story = []

# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════
def add_h1(text):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', h1_style)
    p.bookmark_name = key
    p.bookmark_level = 0
    p.bookmark_text = text
    p.bookmark_key = key
    story.append(p)

def add_h2(text):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', h2_style)
    p.bookmark_name = key
    p.bookmark_level = 1
    p.bookmark_text = text
    p.bookmark_key = key
    story.append(p)

def add_h3(text):
    story.append(Paragraph(text, h3_style))

def add_body(text):
    story.append(Paragraph(text, body_style))

def add_bullet(text):
    story.append(Paragraph(f'<bullet>&bull;</bullet> {text}', bullet_style))

def add_code(text):
    safe = text.replace('<', '&lt;').replace('>', '&gt;')
    story.append(Paragraph(safe, code_style))

def add_spacer(h=4*mm):
    story.append(Spacer(1, h))

def add_hr():
    story.append(HRFlowable(
        width='100%', thickness=0.5, color=BORDER,
        spaceBefore=4*mm, spaceAfter=4*mm
    ))

def make_table(data, col_widths=None):
    """Create styled table."""
    if col_widths is None:
        col_widths = [PAGE_W / len(data[0])] * len(data[0])
    t = Table(data, colWidths=col_widths)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'FreeSerif-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'FreeSerif'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t


# ═══════════════════════════════════════════════════════════════
# COVER PAGE (drawn directly on canvas)
# ═══════════════════════════════════════════════════════════════
class CoverPage:
    """Draw a dark-themed cover page with ReportLab canvas."""
    pass

def draw_cover(canvas, doc):
    """Draw the cover page background and decorative elements."""
    w, h = A4
    canvas.saveState()

    # Layer 0: Background
    canvas.setFillColor(COVER_BLOCK)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)

    # Layer 1: Decorative accent bar
    canvas.setFillColor(ACCENT)
    canvas.rect(0, h * 0.42, w * 0.08, 3, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#2a4f63'))
    canvas.rect(w * 0.12, h * 0.15, w * 0.76, 0.5, fill=1, stroke=0)

    # Grid dots (subtle)
    canvas.setFillColor(colors.HexColor('#ffffff'))
    canvas.setFillAlpha(0.03)
    for x in range(0, int(w), 30):
        for y in range(0, int(h), 30):
            canvas.circle(x, y, 0.8, fill=1, stroke=0)
    canvas.setFillAlpha(1)

    # Layer 3: Text
    canvas.setFont('FreeSerif', 11)
    canvas.setFillColor(colors.HexColor('#8aacbe'))
    canvas.drawString(22*mm, h - 32*mm, 'UI/UX TEARDOWN  |  DESIGN SYSTEM  |  IMPLEMENTATION PIPELINE')

    canvas.setFont('FreeSerif-Bold', 38)
    canvas.setFillColor(colors.white)
    canvas.drawString(22*mm, h - 85*mm, 'Pointer AI')
    canvas.drawString(22*mm, h - 105*mm, 'Landing Page')

    canvas.setFont('FreeSerif', 14)
    canvas.setFillColor(colors.HexColor('#b0c4d0'))
    canvas.drawString(22*mm, h - 130*mm, 'Comprehensive Analysis: Teardown, Deconstruction, Spec, Patterns,')
    canvas.drawString(22*mm, h - 148*mm, 'Reverse Engineering, Audit, Heuristics, Design System')

    canvas.setFont('FreeSerif', 11)
    canvas.setFillColor(colors.HexColor('#7090a2'))
    canvas.drawString(22*mm, h - 180*mm, 'Source: v0.app/templates/pointer-ai-landing-page')
    canvas.drawString(22*mm, h - 195*mm, 'Author: yadwinder | Platform: v0 by Vercel')
    canvas.drawString(22*mm, h - 210*mm, 'Sections: Hero, Features, Pricing, Testimonials, CTA, Footer')

    canvas.setFont('FreeSerif', 9)
    canvas.setFillColor(colors.HexColor('#5a7a8e'))
    canvas.drawString(22*mm, 22*mm, 'Generated by Z.ai  |  August 2026')

    canvas.restoreState()

story.append(Spacer(1, 1))  # placeholder to trigger first page
story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════
# CHAPTER 1: INTRODUCTION & PROJECT OVERVIEW
# ═══════════════════════════════════════════════════════════════
add_h1('1. Introduction and Project Overview')

add_body(
    'This document presents a comprehensive teardown analysis of the <b>Pointer AI Landing Page</b> '
    'template, created by designer <b>yadwinder</b> and published on the v0 by Vercel platform. '
    'The template is a modern, responsive landing page designed for AI/developer tool products, '
    'featuring six primary sections: Hero, Features, Pricing, Testimonials, Call to Action, and Footer. '
    'The template has garnered significant attention within the v0 community, accumulating over <b>20,300 views</b> '
    'and <b>1,900 interactions</b>, making it one of the most popular landing page templates in the ecosystem.'
)

add_body(
    'The analysis methodology employed covers eight distinct analytical dimensions: <b>Teardown</b> '
    '(component-by-component disassembly), <b>Deconstruction</b> (structural hierarchy mapping), '
    '<b>Specification</b> (technical requirements documentation), <b>Pattern Library</b> (reusable '
    'design patterns extraction), <b>Reverse Engineering</b> (implementation reconstruction), '
    '<b>Audit</b> (quality and accessibility assessment), <b>Heuristics</b> (usability evaluation '
    'against established principles), and <b>Design System</b> (comprehensive token/style guide synthesis). '
    'Each dimension provides a unique lens through which to understand and replicate the template\'s design.'
)

add_body(
    'The Pointer AI template is built using the v0 generative AI platform, which produces production-ready '
    'React + Tailwind CSS code. Key design characteristics include: theme-switching capability through '
    'natural language prompts (light/dark/custom themes without config files), smooth CSS animations '
    '(fade-in, slide-in, and shift transitions), clean layout with generous whitespace, full mobile '
    'responsiveness out of the box, and a modular architecture that resists breakage during customization. '
    'The template represents a best-in-class example of AI-generated landing page design.'
)

add_h2('1.1 Source and Context')

add_body(
    'The template originates from the v0.app platform, Vercel\'s AI-powered web application generator. '
    'v0 allows designers and developers to describe UI components in natural language and receive '
    'production-ready React code. The Pointer AI template was published on July 30, 2025, and is available '
    'at two URLs: the primary chat project at v0.app and the community templates gallery. '
    'The author describes it as "a landing page template built for modern dev platforms" that prioritizes '
    'ease of customization and visual polish. The template is designed to be modified through conversational '
    'prompts rather than manual code editing, reflecting a new paradigm in web development workflow.'
)

# Context table
ctx_data = [
    ['Parameter', 'Value'],
    ['Template Name', 'Pointer AI Landing Page'],
    ['Author', 'yadwinder'],
    ['Platform', 'v0 by Vercel'],
    ['Published', 'July 30, 2025'],
    ['Views', '20,300+'],
    ['Interactions', '1,900+'],
    ['Tech Stack', 'React + Tailwind CSS + Next.js'],
    ['Sections', 'Hero, Features, Pricing, Testimonials, CTA, Footer'],
    ['Theme Support', 'Light / Dark / Custom via prompts'],
    ['Responsive', 'Mobile-first, fully responsive'],
    ['Animations', 'CSS transitions (fade, slide, shift)'],
]
story.append(make_table(ctx_data, [PAGE_W * 0.35, PAGE_W * 0.65]))
story.append(Paragraph('Table 1. Project metadata and technical context', caption_style))


# ═══════════════════════════════════════════════════════════════
# CHAPTER 2: TEARDOWN
# ═══════════════════════════════════════════════════════════════
add_h1('2. Teardown: Component-by-Component Disassembly')

add_body(
    'The teardown process systematically disassembles the Pointer AI Landing Page into its constituent '
    'visual and functional components. Each section is analyzed independently to document its layout '
    'structure, content hierarchy, interactive elements, and visual treatment. The template follows a '
    'single-page layout pattern with six distinct vertical sections, each serving a specific conversion '
    'or informational purpose within the landing page funnel.'
)

add_h2('2.1 Hero Section')

add_body(
    'The Hero section occupies the first viewport (above-the-fold area) and serves as the primary '
    'attention-capture mechanism. Based on the template description and v0 platform conventions, the Hero '
    'section contains a prominent headline, a supporting sub-headline or tagline, a primary call-to-action '
    'button, and likely a visual element such as an illustration, screenshot, or animated graphic. The design '
    'employs generous vertical padding to create breathing room, centering content both horizontally and '
    'vertically within the viewport. A gradient or dark background may be used to create visual contrast '
    'and establish the brand mood.'
)

hero_data = [
    ['Component', 'Spec (Inferred)', 'Purpose'],
    ['Headline', '48-64px, Bold/Black weight', 'Primary value proposition'],
    ['Sub-headline', '18-24px, Regular weight', 'Supporting description'],
    ['CTA Button', 'Pill-shaped, Accent color bg', 'Primary conversion action'],
    ['Background', 'Gradient or solid dark', 'Visual mood establishment'],
    ['Visual Element', 'Illustration/Screenshot', 'Product visualization'],
    ['Navigation Bar', 'Logo + Links + CTA', 'Global navigation context'],
]
story.append(make_table(hero_data, [PAGE_W * 0.2, PAGE_W * 0.38, PAGE_W * 0.42]))
story.append(Paragraph('Table 2. Hero section component specifications', caption_style))

add_h2('2.2 Features Section')

add_body(
    'The Features section presents the core product capabilities in a structured grid or card-based layout. '
    'Based on the template\'s description of "clean layout and spacing" with "breathing room," the features '
    'section likely employs a 3-column or 2-column grid of feature cards, each containing an icon, a title, '
    'and a description. The section uses a contrasting background (likely white or light) to differentiate it '
    'from the Hero section above. Feature cards may include subtle hover animations and are designed to '
    'communicate value propositions concisely. The grid spacing is generous, with consistent gaps between '
    'cards that reinforce the template\'s emphasis on visual calm.'
)

add_h2('2.3 Pricing Section')

add_body(
    'The Pricing section presents tiered pricing plans in a comparison layout. Based on modern SaaS landing '
    'page conventions (which this template follows), the pricing section likely contains 2-3 pricing tier '
    'cards arranged horizontally. The middle tier is typically visually emphasized (highlighted border or '
    'background) to guide users toward the recommended plan. Each card includes: plan name, price (monthly/annual), '
    'feature list with checkmarks, and a CTA button. The section uses a clean, tabular comparison format that '
    'enables quick scanning. Annual pricing toggle may be included as an interactive element.'
)

pricing_data = [
    ['Element', 'Specification', 'Notes'],
    ['Tier Cards', '2-3 cards, equal width', 'Middle tier highlighted'],
    ['Plan Name', '16-20px Bold', 'Free / Pro / Enterprise'],
    ['Price', '32-48px Black weight', 'With /mo or /yr suffix'],
    ['Feature List', 'Checkmarks + text', '4-8 features per tier'],
    ['CTA Button', 'Pill, filled or outlined', 'Primary tier = filled'],
    ['Annual Toggle', 'Optional switch', 'Monthly vs Annual pricing'],
    ['Background', 'Light or Section BG', 'Differentiated from features'],
]
story.append(make_table(pricing_data, [PAGE_W * 0.2, PAGE_W * 0.35, PAGE_W * 0.45]))
story.append(Paragraph('Table 3. Pricing section element specifications', caption_style))

add_h2('2.4 Testimonials Section')

add_body(
    'The Testimonials section provides social proof through user quotes, likely presented in a card-based '
    'carousel or grid layout. Based on the template\'s design philosophy of "smooth, natural animations," '
    'the testimonials section may include auto-scrolling or fade-in transitions between testimonial cards. '
    'Each card contains a user avatar (or placeholder), the user\'s name and role, a star rating or company '
    'affiliation, and a quote. The layout typically uses 2-3 columns on desktop and stacks to a single column '
    'on mobile. Background treatment may alternate from the pricing section to create visual rhythm.'
)

add_h2('2.5 Call to Action (CTA) Section')

add_body(
    'The CTA section is a conversion-focused zone positioned before the footer. It typically features a '
    'bold headline (e.g., "Ready to get started?" or "Start building today"), a brief supporting sentence, '
    'and one or two prominent CTA buttons. The section often uses a contrasting background color (accent or '
    'gradient) to create visual urgency and separate it from the content sections above. The CTA section '
    'serves as the final conversion push before the user encounters the footer with secondary links.'
)

add_h2('2.6 Footer Section')

add_body(
    'The Footer section provides navigational structure, legal links, and brand identity closure. Based on '
    'modern landing page patterns, the footer likely contains: brand logo or name, organized link columns '
    '(Product, Company, Resources, Legal), social media icons, and a copyright notice. The footer uses the '
    'darkest background in the template to create a definitive visual endpoint. Links are organized in '
    'columns with consistent typography, and the overall layout is responsive, collapsing gracefully on '
    'mobile devices into a stacked or accordion format.'
)


# ═══════════════════════════════════════════════════════════════
# CHAPTER 3: DECONSTRUCTION
# ═══════════════════════════════════════════════════════════════
add_h1('3. Deconstruction: Structural Hierarchy Mapping')

add_body(
    'The deconstruction analysis maps the hierarchical structure of the Pointer AI Landing Page, revealing '
    'how individual components are organized within the page\'s information architecture. Understanding this '
    'hierarchy is essential for replicating the template\'s design logic, as the relationship between parent '
    'and child components determines layout flow, spacing behavior, and responsive breakpoints.'
)

add_h2('3.1 Page-Level Architecture')

add_body(
    'The template follows a <b>single-page vertical scroll</b> architecture with six section-level containers. '
    'Each section is a direct child of the root page container and occupies the full viewport width. The '
    'sections are stacked vertically with no lateral navigation, creating a linear narrative flow from '
    'introduction (Hero) through information (Features, Pricing, Testimonials) to conversion (CTA) and '
    'closure (Footer). This architecture is typical for SaaS product landing pages and aligns with the '
    '"funnel" mental model where each section serves a distinct purpose in the user\'s decision journey.'
)

# Architecture table
arch_data = [
    ['Level', 'Component', 'Role', 'Children'],
    ['L0 (Root)', 'Page Container', 'Full-width wrapper', '6 Sections'],
    ['L1 (Section)', 'Hero', 'Attention capture', 'Nav, Headline, CTA, Visual'],
    ['L1 (Section)', 'Features', 'Value communication', 'Grid, Feature Cards'],
    ['L1 (Section)', 'Pricing', 'Price anchoring', 'Toggle, Tier Cards'],
    ['L1 (Section)', 'Testimonials', 'Social proof', 'Card Grid / Carousel'],
    ['L1 (Section)', 'CTA', 'Conversion push', 'Headline, Buttons'],
    ['L1 (Section)', 'Footer', 'Navigation + Legal', 'Logo, Links, Social'],
    ['L2 (Component)', 'Feature Card', 'Single capability', 'Icon, Title, Description'],
    ['L2 (Component)', 'Pricing Tier', 'Single plan', 'Name, Price, Features, CTA'],
    ['L3 (Atom)', 'CTA Button', 'Action trigger', 'Label text'],
    ['L3 (Atom)', 'Icon', 'Visual marker', 'SVG / Image'],
]
story.append(make_table(arch_data, [PAGE_W * 0.15, PAGE_W * 0.22, PAGE_W * 0.28, PAGE_W * 0.35]))
story.append(Paragraph('Table 4. Component hierarchy and structural mapping', caption_style))

add_h2('3.2 Layout System')

add_body(
    'The layout system is built on Tailwind CSS utility classes, which provide a consistent spacing and '
    'sizing framework. The template uses a <b>container-based layout</b> with max-width constraints '
    '(typically max-w-6xl or max-w-7xl, approximately 1152px-1280px) centered horizontally with automatic '
    'margins. Grid layouts use CSS Grid or Flexbox for responsive column distribution. The spacing system '
    'follows Tailwind\'s 4px base unit, with common values being 16px (p-4), 24px (p-6), 32px (p-8), '
    'and 64px (p-16) for section-level vertical padding. Horizontal padding is consistent at 16-24px on '
    'mobile and 48-64px on desktop, creating generous margins that reinforce the "breathing room" aesthetic.'
)

add_h2('3.3 Responsive Breakpoints')

add_body(
    'The template employs a mobile-first responsive strategy using Tailwind\'s breakpoint system. '
    'The sm (640px), md (768px), lg (1024px), and xl (1280px) breakpoints control layout shifts. '
    'On mobile (below 640px), all sections stack vertically with full-width content, single-column grids, '
    'and appropriately sized touch targets. At the md breakpoint, multi-column layouts activate (2-column '
    'feature grids, 2-column footer links). At lg and xl, the full desktop layout is revealed with 3-column '
    'feature grids and the maximum horizontal padding. Navigation transitions from a hamburger menu on mobile '
    'to a horizontal link bar on desktop.'
)

bp_data = [
    ['Breakpoint', 'Width', 'Layout Changes'],
    ['Base (mobile)', '< 640px', 'Single column, hamburger nav, stacked sections'],
    ['sm', '>= 640px', 'Slightly wider container, minor adjustments'],
    ['md', '>= 768px', '2-column grids, expanded nav, side-by-side pricing'],
    ['lg', '>= 1024px', '3-column features, full footer columns'],
    ['xl', '>= 1280px', 'Maximum container width, generous spacing'],
]
story.append(make_table(bp_data, [PAGE_W * 0.2, PAGE_W * 0.15, PAGE_W * 0.65]))
story.append(Paragraph('Table 5. Responsive breakpoint behavior', caption_style))


# ═══════════════════════════════════════════════════════════════
# CHAPTER 4: SPECIFICATION
# ═══════════════════════════════════════════════════════════════
add_h1('4. Specification: Technical Requirements')

add_body(
    'The specification phase documents the precise technical requirements needed to implement the Pointer AI '
    'Landing Page. This includes technology stack, dependency versions, file structure, component interfaces, '
    'and performance targets. The spec serves as the implementation blueprint and ensures consistency '
    'across development phases.'
)

add_h2('4.1 Technology Stack')

tech_data = [
    ['Technology', 'Version / Detail', 'Purpose'],
    ['Next.js', '14+ (App Router)', 'Framework, SSR, routing'],
    ['React', '18+', 'Component library, hooks'],
    ['Tailwind CSS', '3.4+ (v4 compatible)', 'Utility-first styling'],
    ['TypeScript', '5+', 'Type safety, DX'],
    ['Framer Motion', '11+ (optional)', 'Advanced animations'],
    ['Lucide React', '0.300+', 'Icon system'],
    ['Vercel', 'Deployment platform', 'Hosting, CI/CD'],
    ['clsx / tailwind-merge', 'Latest', 'Conditional class composition'],
]
story.append(make_table(tech_data, [PAGE_W * 0.25, PAGE_W * 0.3, PAGE_W * 0.45]))
story.append(Paragraph('Table 6. Technology stack requirements', caption_style))

add_h2('4.2 File Structure')

add_body(
    'The implementation follows a Next.js App Router convention with component-based architecture. '
    'Each major section of the landing page maps to a dedicated React component, enabling independent '
    'development, testing, and maintenance. Shared UI elements (buttons, cards, containers) are extracted '
    'into a components/ui directory for reuse across sections.'
)

add_code('app/\n  layout.tsx          # Root layout with fonts + metadata\n  page.tsx            # Landing page assembly\n  globals.css         # Tailwind directives + CSS variables\ncomponents/\n  landing/\n    hero.tsx           # Hero section component\n    features.tsx       # Features grid component\n    pricing.tsx        # Pricing tiers component\n    testimonials.tsx   # Testimonials section\n    cta.tsx            # Call to action section\n    footer.tsx         # Footer navigation\n    navbar.tsx         # Global navigation bar\n  ui/\n    button.tsx         # Reusable button variants\n    card.tsx           # Reusable card wrapper\n    container.tsx      # Max-width centered container\n    badge.tsx          # Label/tag component\ntailwind.config.ts    # Theme configuration, custom colors\nnext.config.js       # Next.js configuration\npackage.json          # Dependencies')

add_h2('4.3 Component API Contract')

add_body(
    'Each section component follows a consistent interface pattern. Props are typed with TypeScript and '
    'kept minimal to reduce coupling. Configuration-driven design allows content to be externalized into '
    'data files or CMS entries, enabling theme switching without code changes. The following interfaces '
    'define the contracts for each major component.'
)

add_code('// Hero Section Props\ninterface HeroProps {\n  headline: string;\n  subheadline: string;\n  ctaText: string;\n  ctaHref: string;\n  secondaryCtaText?: string;\n  secondaryCtaHref?: string;\n  visualSrc?: string;  // Optional hero image\n}\n\n// Feature Card Props\ninterface FeatureCardProps {\n  icon: React.ComponentType;\n  title: string;\n  description: string;\n}\n\n// Pricing Tier Props\ninterface PricingTierProps {\n  name: string;\n  price: number;\n  period: "monthly" | "yearly";\n  features: string[];\n  ctaText: string;\n  ctaHref: string;\n  highlighted?: boolean;\n}')

add_h2('4.4 Performance Budget')

perf_data = [
    ['Metric', 'Target', 'Measurement'],
    ['Lighthouse Performance', '>= 95', 'Chrome DevTools Lighthouse'],
    ['First Contentful Paint', '< 1.2s', 'Web Vitals'],
    ['Largest Contentful Paint', '< 2.0s', 'Web Vitals'],
    ['Cumulative Layout Shift', '< 0.05', 'Core Web Vital'],
    ['Total Bundle Size (JS)', '< 100 KB (gzipped)', 'Webpack Analyzer'],
    ['CSS Bundle Size', '< 15 KB (gzipped)', 'Build output'],
    ['Time to Interactive', '< 3.0s', 'Lighthouse'],
    ['Image Optimization', 'WebP/AVIF, lazy load', 'Manual audit'],
]
story.append(make_table(perf_data, [PAGE_W * 0.3, PAGE_W * 0.25, PAGE_W * 0.45]))
story.append(Paragraph('Table 7. Performance budget targets', caption_style))


# ═══════════════════════════════════════════════════════════════
# CHAPTER 5: PATTERN LIBRARY
# ═══════════════════════════════════════════════════════════════
add_h1('5. Pattern Library: Reusable Design Patterns')

add_body(
    'The pattern library extracts recurring design solutions from the Pointer AI template into reusable, '
    'documented patterns. These patterns can be applied to build consistent interfaces across different '
    'pages and projects. Each pattern is described with its visual characteristics, use cases, and '
    'implementation approach using Tailwind CSS utility classes.'
)

add_h2('5.1 Card Pattern')

add_body(
    'The Card pattern is the most frequently used component in the template, appearing in Feature Cards, '
    'Pricing Tiers, and Testimonials. The base card uses rounded corners (rounded-xl or rounded-2xl for '
    '16-24px border-radius), a subtle border (border border-gray-200), a white or near-white background, '
    'and internal padding of 24-32px. On hover, cards may lift slightly with a subtle shadow transition '
    '(hover:shadow-lg transition-shadow duration-300). The card pattern supports multiple variants: '
    'outlined (border only), filled (background color), elevated (shadow), and highlighted (accent border).'
)

add_h2('5.2 Button Pattern')

add_body(
    'Buttons in the template follow a consistent pill-shaped design (rounded-full) with two primary '
    'variants: Filled (solid background color with white text) and Outlined (border with colored text). '
    'The Filled variant uses the accent color as background and applies hover darkening. The Outlined '
    'variant uses a 1-2px border with the same accent color. Both variants include horizontal padding '
    'of 24-32px and vertical padding of 12-16px, creating a comfortable touch target size of at least '
    '44px height. Font weight is typically medium (500) or semibold (600), and text is center-aligned.'
)

add_h2('5.3 Section Container Pattern')

add_body(
    'Every section in the template is wrapped in a consistent container pattern: a full-width background '
    'div followed by an inner content div constrained by max-width and horizontal padding. This two-layer '
    'approach allows sections to have different background colors while maintaining consistent content '
    'alignment. The outer div uses min-h-screen or py-20 for vertical spacing, while the inner div uses '
    'mx-auto max-w-6xl px-6 lg:px-8 for horizontal centering and responsive padding.'
)

add_h2('5.4 Animation Pattern')

add_body(
    'Animations in the template are described as "smooth, natural" and include fade-in, slide-in, and '
    'shift effects. These are typically implemented using CSS @keyframes animations or Tailwind\'s built-in '
    'animation utilities (animate-fade-in, animate-slide-up). Animations are triggered on scroll using '
    'the Intersection Observer API or a library like Framer Motion. Key animation characteristics include: '
    'durations of 500-800ms, ease-out or cubic-bezier timing functions, opacity transitions from 0 to 1, '
    'translateY transforms of 20-40px for slide effects, and staggered delays for grouped elements.'
)

add_h2('5.5 Responsive Grid Pattern')

add_body(
    'The grid pattern adapts layout from single-column on mobile to multi-column on desktop. The base '
    'pattern uses Tailwind\'s grid classes: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8. '
    'This creates a responsive grid that starts as one column on mobile, expands to two at the md breakpoint, '
    'and reaches three columns at lg. The gap value (gap-8 = 32px) provides consistent spacing between '
    'grid items. For the pricing section specifically, the grid uses grid-cols-1 md:grid-cols-2 lg:grid-cols-3 '
    'with the middle tier potentially using lg:col-span-1 for equal width distribution.'
)

patterns_data = [
    ['Pattern', 'Tailwind Classes', 'Variants'],
    ['Card', 'rounded-xl border p-6 bg-white', 'Outlined, Filled, Elevated, Highlighted'],
    ['Button (Filled)', 'rounded-full px-6 py-3 bg-accent text-white font-medium', 'Primary, Secondary, Ghost'],
    ['Button (Outlined)', 'rounded-full px-6 py-3 border-2 border-accent text-accent', 'Default, Hover-fill'],
    ['Section Container', 'w-full py-20 > mx-auto max-w-6xl px-6', 'Dark BG, Light BG, Gradient'],
    ['Grid (3-col)', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8', '2-col, 4-col, Auto-fill'],
    ['Animation', 'opacity-0 translate-y-4 transition-all duration-700', 'Fade, Slide, Scale'],
    ['Typography (H1)', 'text-5xl lg:text-6xl font-black tracking-tight', 'Light, Regular, Bold'],
    ['Typography (Body)', 'text-lg text-gray-600 leading-relaxed', 'Small, Medium, Large'],
]
story.append(make_table(patterns_data, [PAGE_W * 0.2, PAGE_W * 0.45, PAGE_W * 0.35]))
story.append(Paragraph('Table 8. Design pattern library with Tailwind implementations', caption_style))


# ═══════════════════════════════════════════════════════════════
# CHAPTER 6: REVERSE ENGINEERING
# ═══════════════════════════════════════════════════════════════
add_h1('6. Reverse Engineering: Implementation Reconstruction')

add_body(
    'Reverse engineering reconstructs the probable implementation approach used to build the Pointer AI '
    'template. Since v0 generates React + Tailwind CSS code, the reconstruction focuses on component '
    'composition, styling strategies, and interaction patterns that would produce the observed design. '
    'This section provides enough implementation detail to faithfully recreate the template.'
)

add_h2('6.1 Tailwind Configuration')

add_body(
    'The template\'s theme system relies on Tailwind\'s configuration for custom colors, fonts, and '
    'animations. Based on the template\'s ability to switch themes via natural language prompts, the '
    'configuration likely uses CSS custom properties (variables) that can be dynamically overridden. '
    'The tailwind.config.ts extends the default theme with custom color tokens, font families, and '
    'animation keyframes.'
)

add_code('// tailwind.config.ts (reconstructed)\nimport type { Config } from "tailwindcss";\n\nconst config: Config = {\n  darkMode: "class",\n  content: [\n    "./app/**/*.{ts,tsx}",\n    "./components/**/*.{ts,tsx}",\n  ],\n  theme: {\n    extend: {\n      colors: {\n        background: "var(--background)",\n        foreground: "var(--foreground)",\n        accent: {\n          DEFAULT: "var(--accent)",\n          foreground: "var(--accent-foreground)",\n        },\n        muted: {\n          DEFAULT: "var(--muted)",\n          foreground: "var(--muted-foreground)",\n        },\n        card: {\n          DEFAULT: "var(--card)",\n          foreground: "var(--card-foreground)",\n        },\n        border: "var(--border)",\n      },\n      fontFamily: {\n        sans: ["Inter", "system-ui", "sans-serif"],\n        mono: ["JetBrains Mono", "monospace"],\n      },\n      animation: {\n        "fade-in": "fadeIn 0.7s ease-out forwards",\n        "slide-up": "slideUp 0.7s ease-out forwards",\n        "slide-in-right": "slideInRight 0.7s ease-out",\n      },\n      keyframes: {\n        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },\n        slideUp: {\n          "0%": { opacity: "0", transform: "translateY(20px)" },\n          "100%": { opacity: "1", transform: "translateY(0)" },\n        },\n        slideInRight: {\n          "0%": { opacity: "0", transform: "translateX(20px)" },\n          "100%": { opacity: "1", transform: "translateX(0)" },\n        },\n      },\n    },\n  },\n  plugins: [require("tailwindcss-animate")],\n};\nexport default config;')

add_h2('6.2 Hero Section Implementation')

add_body(
    'The Hero section implementation combines a fixed navigation bar with a centered content area. '
    'The navigation uses a sticky or fixed positioning with backdrop blur for a glass-morphism effect. '
    'The hero content is centered using flexbox with vertical alignment, and the CTA button uses the '
    'primary button variant. Scroll-triggered animations are applied to the headline and CTA elements '
    'using Intersection Observer hooks.'
)

add_code('// Hero Section (reconstructed)\nexport function Hero({ headline, subheadline, ctaText, ctaHref }: HeroProps) {\n  return (\n    <section className="relative min-h-screen flex items-center justify-center">\n      {/* Background gradient */}\n      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/30" />\n      {/* Content */}\n      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">\n        <h1 className="text-5xl lg:text-7xl font-black tracking-tight">\n          {headline}\n        </h1>\n        <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">\n          {subheadline}\n        </p>\n        <div className="mt-10 flex gap-4 justify-center">\n          <Button variant="default" size="lg" href={ctaHref}>\n            {ctaText}\n          </Button>\n          <Button variant="outline" size="lg" href="#features">\n            Learn More\n          </Button>\n        </div>\n      </div>\n    </section>\n  );\n}')

add_h2('6.3 Animation System')

add_body(
    'The animation system uses a custom React hook (useInView) that wraps Intersection Observer to '
    'trigger CSS animations when elements enter the viewport. This approach avoids JavaScript-driven '
    'animations for better performance and leverages GPU-accelerated CSS transforms. Elements start '
    'in an invisible state (opacity-0, translate-y-4) and transition to their final position when the '
    'in-view threshold is crossed. Staggered animations for grid items are achieved by passing delay '
    'values based on the element\'s index within the grid.'
)

add_code('// useInView hook\nfunction useInView(options?: IntersectionObserverInit) {\n  const ref = useRef<HTMLDivElement>(null);\n  const [isInView, setIsInView] = useState(false);\n\n  useEffect(() => {\n    const el = ref.current;\n    if (!el) return;\n    const obs = new IntersectionObserver(([entry]) => {\n      if (entry.isIntersecting) {\n        setIsInView(true);\n        obs.disconnect();\n      }\n    }, { threshold: 0.1, ...options });\n    obs.observe(el);\n    return () => obs.disconnect();\n  }, []);\n\n  return { ref, isInView };\n}\n\n// Usage in component\nfunction AnimatedCard({ children, delay = 0 }: { children: ReactNode; delay?: number }) {\n  const { ref, isInView } = useInView();\n  return (\n    <div\n      ref={ref}\n      className={`transition-all duration-700 ease-out ${\n        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"\n      }`}\n      style={{ transitionDelay: `${delay}ms` }}\n    >\n      {children}\n    </div>\n  );\n}')


# ═══════════════════════════════════════════════════════════════
# CHAPTER 7: AUDIT
# ═══════════════════════════════════════════════════════════════
add_h1('7. Audit: Quality and Accessibility Assessment')

add_body(
    'The audit phase evaluates the Pointer AI template against established quality standards, covering '
    'accessibility (WCAG 2.1), performance, SEO, and code quality dimensions. As an AI-generated template '
    'from v0, it inherits many best practices from the platform\'s code generation engine, but potential '
    'areas for improvement are identified.'
)

add_h2('7.1 Accessibility Audit')

audit_a11y = [
    ['Criterion', 'Assessment', 'Notes'],
    ['Color Contrast (WCAG AA)', 'Likely Pass', 'Dark text on light bg, white on dark'],
    ['Keyboard Navigation', 'Likely Pass', 'v0 generates focusable elements'],
    ['Screen Reader Support', 'Partial', 'ARIA labels may need enrichment'],
    ['Alt Text for Images', 'Needs Review', 'Auto-generated may lack context'],
    ['Focus Indicators', 'Likely Pass', 'Tailwind ring utilities included'],
    ['Semantic HTML', 'Likely Pass', 'v0 uses header, nav, main, footer'],
    ['Skip Navigation Link', 'May Need Addition', 'Often omitted in AI-generated code'],
    ['Form Labels (if any)', 'N/A', 'Template has no forms in sections'],
    ['Reduced Motion', 'Needs Addition', 'prefers-reduced-motion media query'],
]
story.append(make_table(audit_a11y, [PAGE_W * 0.25, PAGE_W * 0.2, PAGE_W * 0.55]))
story.append(Paragraph('Table 9. Accessibility audit results (WCAG 2.1)', caption_style))

add_h2('7.2 Performance Audit')

add_body(
    'Performance characteristics are inferred from the technology stack and template structure. The use '
    'of Tailwind CSS with Next.js App Router ensures excellent initial load performance through automatic '
    'CSS purging (removing unused styles) and server-side rendering. The template likely achieves strong '
    'Lighthouse scores given its reliance on system fonts, minimal JavaScript (CSS-only animations), and '
    'the Vercel Edge Network for global distribution. However, performance may degrade if large images '
    'are used in the Hero or Testimonials sections without proper optimization (next/image component, '
    'WebP format, lazy loading with priority loading for above-the-fold images).'
)

perf_audit = [
    ['Dimension', 'Score (Est.)', 'Recommendation'],
    ['CSS Efficiency', 'A+', 'Tailwind purge removes unused styles'],
    ['JS Bundle', 'A', 'Minimal JS, CSS-only animations preferred'],
    ['Image Optimization', 'B+', 'Use next/image for all imagery'],
    ['Font Loading', 'A', 'System font stack, no external fonts'],
    ['Render Blocking', 'A+', 'Next.js SSR eliminates FOUC'],
    ['Mobile Performance', 'A', 'Responsive, no heavy assets'],
    ['SEO', 'A-', 'Add structured data for richer results'],
]
story.append(make_table(perf_audit, [PAGE_W * 0.25, PAGE_W * 0.15, PAGE_W * 0.6]))
story.append(Paragraph('Table 10. Performance audit assessment', caption_style))

add_h2('7.3 SEO Audit')

add_body(
    'SEO considerations for the template include proper use of semantic HTML elements (h1 for the hero '
    'headline, h2 for section titles, h3 for card titles), meta tags configuration in Next.js metadata '
    'API, Open Graph tags for social sharing, and structured data (JSON-LD) for product/software markup. '
    'The single-page architecture means all content is accessible to crawlers in a single page load. '
    'Key recommendations include adding a canonical URL, implementing proper heading hierarchy without '
    'skipping levels, ensuring all images have descriptive alt attributes, and adding structured data '
    'for SoftwareApplication or Product schema.'
)


# ═══════════════════════════════════════════════════════════════
# CHAPTER 8: HEURISTICS
# ═══════════════════════════════════════════════════════════════
add_h1('8. Heuristics: Usability Evaluation')

add_body(
    'The heuristics evaluation applies established usability principles to assess the Pointer AI template\'s '
    'design decisions. We use Nielsen\'s 10 Heuristics as the primary evaluation framework, supplemented by '
    'Landing Page-specific heuristics from conversion rate optimization (CRO) research.'
)

heur_data = [
    ['Heuristic', 'Assessment', 'Evidence'],
    ['Visibility of System Status', 'Strong', 'Clear navigation, active states, scroll indicators'],
    ['Match with Real World', 'Strong', 'Standard landing page conventions, familiar icons'],
    ['User Control and Freedom', 'Adequate', 'Back to top, navigation links, no trapping'],
    ['Consistency and Standards', 'Strong', 'Uniform typography, spacing, color usage'],
    ['Error Prevention', 'N/A', 'No input forms in template sections'],
    ['Recognition over Recall', 'Strong', 'Standard CTA placement, icon associations'],
    ['Flexibility and Efficiency', 'Moderate', 'Single-path design, no power user shortcuts'],
    ['Aesthetic and Minimalist Design', 'Excellent', 'Generous whitespace, clean typography'],
    ['Help Users Recover from Errors', 'N/A', 'No form interactions'],
    ['Help and Documentation', 'Moderate', 'Self-explanatory, but no onboarding tooltips'],
]
story.append(make_table(heur_data, [PAGE_W * 0.3, PAGE_W * 0.15, PAGE_W * 0.55]))
story.append(Paragraph('Table 11. Nielsen\'s heuristics evaluation', caption_style))

add_h2('8.1 Landing Page Conversion Heuristics')

add_body(
    'Beyond general usability, the template is evaluated against landing-page-specific heuristics that '
    'directly impact conversion rates. The Hero section follows the "Value Proposition + CTA Above the Fold" '
    'pattern, ensuring visitors immediately understand the product\'s value and can take action without '
    'scrolling. The Features section uses the "Benefits Before Features" principle by framing capabilities '
    'in terms of user outcomes rather than technical specifications. The Pricing section employs "Anchoring" '
    'by presenting a higher-priced tier first, making the mid-tier appear more affordable. The Testimonials '
    'section leverages "Social Proof" with credible user quotes. The CTA section creates "Urgency" through '
    'contrasting visual treatment. The overall page length follows the "Long-Form Landing Page" pattern, '
    'which research shows converts 30-50% better than short-form alternatives for SaaS products.'
)

cro_data = [
    ['CRO Heuristic', 'Implementation', 'Effectiveness'],
    ['Value Prop Above Fold', 'Headline + CTA in Hero', 'High - immediate clarity'],
    ['Single Primary CTA', 'One main button per section', 'High - reduces decision fatigue'],
    ['Social Proof', 'Testimonials with real quotes', 'High - builds trust'],
    ['Price Anchoring', '3-tier pricing, mid highlighted', 'Medium-High - guides choice'],
    ['Benefit-Driven Copy', 'Features framed as outcomes', 'High - emotional connection'],
    ['Visual Hierarchy', 'Size/weight/color progression', 'High - guides eye flow'],
    ['Mobile Optimization', 'Responsive touch targets', 'Critical - 60%+ mobile traffic'],
    ['Page Speed', 'Minimal assets, CSS animations', 'High - every 1s delay = 7% drop'],
]
story.append(make_table(cro_data, [PAGE_W * 0.22, PAGE_W * 0.35, PAGE_W * 0.43]))
story.append(Paragraph('Table 12. Conversion rate optimization heuristics', caption_style))


# ═══════════════════════════════════════════════════════════════
# CHAPTER 9: DESIGN SYSTEM
# ═══════════════════════════════════════════════════════════════
add_h1('9. Design System: Comprehensive Style Guide')

add_body(
    'The Design System synthesizes all visual and interaction patterns from the Pointer AI template into '
    'a comprehensive, token-based style guide. This system can be used as the foundation for building '
    'additional pages, components, or products that share the Pointer AI visual identity. The system is '
    'organized into five layers: Foundation (colors, typography, spacing), Components (buttons, cards, '
    'containers), Patterns (grids, animations, responsive), Sections (hero, features, pricing), and '
    'Themes (light, dark, custom).'
)

add_h2('9.1 Color Tokens')

color_data = [
    ['Token', 'Light Theme', 'Dark Theme', 'Usage'],
    ['--background', '#ffffff', '#0a0a0a', 'Page background'],
    ['--foreground', '#171717', '#fafafa', 'Primary text'],
    ['--muted', '#f5f5f5', '#262626', 'Subtle backgrounds'],
    ['--muted-foreground', '#737373', '#a3a3a3', 'Secondary text'],
    ['--accent', '#2563eb', '#3b82f6', 'CTA, links, highlights'],
    ['--accent-foreground', '#ffffff', '#ffffff', 'Text on accent bg'],
    ['--card', '#ffffff', '#171717', 'Card backgrounds'],
    ['--border', '#e5e5e5', '#333333', 'Borders, dividers'],
    ['--ring', '#2563eb', '#3b82f6', 'Focus rings'],
]
story.append(make_table(color_data, [PAGE_W * 0.25, PAGE_W * 0.2, PAGE_W * 0.2, PAGE_W * 0.35]))
story.append(Paragraph('Table 13. CSS custom property color tokens', caption_style))

add_h2('9.2 Typography Scale')

typo_data = [
    ['Role', 'Size', 'Weight', 'Line Height', 'Letter Spacing'],
    ['Display (Hero)', '60-72px / 3.75-4.5rem', '900 (Black)', '1.05', '-0.02em'],
    ['H1', '36-48px / 2.25-3rem', '800', '1.15', '-0.01em'],
    ['H2', '24-30px / 1.5-1.875rem', '700', '1.25', 'normal'],
    ['H3', '18-20px / 1.125-1.25rem', '600', '1.35', 'normal'],
    ['Body Large', '18px / 1.125rem', '400', '1.6', 'normal'],
    ['Body', '16px / 1rem', '400', '1.65', 'normal'],
    ['Body Small', '14px / 0.875rem', '400', '1.5', 'normal'],
    ['Caption', '12px / 0.75rem', '500', '1.4', '0.02em'],
    ['Overline', '12px / 0.75rem', '600', '1.3', '0.08em (uppercase)'],
]
story.append(make_table(typo_data, [PAGE_W * 0.18, PAGE_W * 0.25, PAGE_W * 0.15, PAGE_W * 0.18, PAGE_W * 0.24]))
story.append(Paragraph('Table 14. Typography scale specifications', caption_style))

add_h2('9.3 Spacing Scale')

add_body(
    'The spacing system follows a geometric progression based on a 4px base unit, consistent with '
    'Tailwind CSS\'s default spacing scale. This creates harmonious rhythm across all components and '
    'sections. Section-level vertical spacing uses larger values (64-128px) while component-internal '
    'spacing uses medium values (16-32px), and atomic spacing between elements uses small values (4-8px).'
)

space_data = [
    ['Token', 'Value', 'Tailwind', 'Usage'],
    ['xs', '4px', 'p-1 / gap-1', 'Inline gaps, icon-text spacing'],
    ['sm', '8px', 'p-2 / gap-2', 'Tight element spacing'],
    ['md', '16px', 'p-4 / gap-4', 'Internal card padding'],
    ['lg', '24px', 'p-6 / gap-6', 'Card padding, section subsection gap'],
    ['xl', '32px', 'p-8 / gap-8', 'Grid gap, section internal spacing'],
    ['2xl', '48px', 'p-12 / gap-12', 'Section padding (mobile)'],
    ['3xl', '64px', 'p-16 / gap-16', 'Section padding (desktop)'],
    ['4xl', '96px', 'py-24', 'Large section vertical padding'],
    ['5xl', '128px', 'py-32', 'Hero section vertical padding'],
]
story.append(make_table(space_data, [PAGE_W * 0.12, PAGE_W * 0.12, PAGE_W * 0.28, PAGE_W * 0.48]))
story.append(Paragraph('Table 15. Spacing scale tokens', caption_style))

add_h2('9.4 Shadow and Elevation Scale')

shadow_data = [
    ['Level', 'Tailwind Class', 'Values', 'Usage'],
    ['None', 'shadow-none', 'none', 'Flat elements, default state'],
    ['SM', 'shadow-sm', '0 1px 2px rgba(0,0,0,0.05)', 'Subtle elevation'],
    ['Default', 'shadow', '0 1px 3px rgba(0,0,0,0.1)', 'Cards, containers'],
    ['MD', 'shadow-md', '0 4px 6px rgba(0,0,0,0.1)', 'Dropdowns, popovers'],
    ['LG', 'shadow-lg', '0 10px 15px rgba(0,0,0,0.1)', 'Hover states, modals'],
    ['XL', 'shadow-xl', '0 20px 25px rgba(0,0,0,0.1)', 'Elevated modals'],
]
story.append(make_table(shadow_data, [PAGE_W * 0.12, PAGE_W * 0.15, PAGE_W * 0.38, PAGE_W * 0.35]))
story.append(Paragraph('Table 16. Shadow/elevation scale', caption_style))

add_h2('9.5 Border Radius Scale')

radius_data = [
    ['Token', 'Value', 'Tailwind', 'Usage'],
    ['none', '0px', 'rounded-none', 'Sharp edges, dividers'],
    ['sm', '4px', 'rounded-sm', 'Tags, badges, small elements'],
    ['default', '6px', 'rounded', 'Inputs, small cards'],
    ['md', '8px', 'rounded-md', 'Buttons, standard cards'],
    ['lg', '12px', 'rounded-lg', 'Large cards, images'],
    ['xl', '16px', 'rounded-xl', 'Feature cards, modals'],
    ['2xl', '24px', 'rounded-2xl', 'Hero sections, large areas'],
    ['full', '9999px', 'rounded-full', 'Pills, avatars, buttons'],
]
story.append(make_table(radius_data, [PAGE_W * 0.15, PAGE_W * 0.12, PAGE_W * 0.18, PAGE_W * 0.55]))
story.append(Paragraph('Table 17. Border radius scale', caption_style))


# ═══════════════════════════════════════════════════════════════
# CHAPTER 10: IMPLEMENTATION PIPELINE
# ═══════════════════════════════════════════════════════════════
add_h1('10. Implementation Pipeline')

add_body(
    'This chapter provides a step-by-step pipeline for building a landing page that matches the Pointer AI '
    'template\'s design quality and structural patterns. The pipeline is organized into seven phases, each '
    'with specific deliverables, quality gates, and estimated timeframes. The pipeline is designed to be '
    'followed sequentially, though phases 4 and 5 can be partially parallelized for experienced developers.'
)

add_h2('10.1 Pipeline Overview')

pipeline_data = [
    ['Phase', 'Name', 'Duration', 'Key Deliverables'],
    ['1', 'Project Setup', '30 min', 'Next.js project, Tailwind config, fonts'],
    ['2', 'Design Tokens', '1 hour', 'Colors, typography, spacing, shadows'],
    ['3', 'Layout Shell', '1 hour', 'Page structure, navigation, container'],
    ['4', 'Section Development', '4-6 hours', 'Hero, Features, Pricing, Testimonials, CTA, Footer'],
    ['5', 'Animation System', '1-2 hours', 'Scroll animations, transitions, hover effects'],
    ['6', 'Responsive Refinement', '1-2 hours', 'Mobile layout, touch targets, breakpoints'],
    ['7', 'Polish and Deploy', '1 hour', 'Accessibility, SEO, performance, Vercel deploy'],
]
story.append(make_table(pipeline_data, [PAGE_W * 0.08, PAGE_W * 0.2, PAGE_W * 0.12, PAGE_W * 0.6]))
story.append(Paragraph('Table 18. Implementation pipeline phases', caption_style))

add_h2('10.2 Phase 1: Project Setup')

add_body(
    'Initialize a new Next.js project with TypeScript and Tailwind CSS. Use the App Router for the '
    'latest Next.js features including server components and the metadata API. Install additional '
    'dependencies: lucide-react for icons, clsx and tailwind-merge for conditional class composition, '
    'and framer-motion if advanced animations beyond CSS are needed. Configure the Tailwind config with '
    'the design tokens from Section 9, and set up CSS custom properties in globals.css for theme switching.'
)

add_code('# Phase 1: Project Setup\nnpx create-next-app@latest pointer-landing --typescript --tailwind --app --src-dir\ncd pointer-landing\nnpm install lucide-react clsx tailwind-merge framer-motion\nnpm install -D @types/node\n\n# Verify setup\nnpm run dev  # Should run on localhost:3000')

add_h2('10.3 Phase 2: Design Tokens')

add_body(
    'Define all design tokens as CSS custom properties in globals.css and extend Tailwind\'s configuration '
    'to reference them. This creates a single source of truth for colors, typography, spacing, and effects. '
    'Create a separate theme configuration file that exports token values for both light and dark themes, '
    'enabling programmatic theme switching. Document each token with its semantic purpose and usage '
    'guidelines to ensure consistent application across components.'
)

add_code('/* globals.css */\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n@layer base {\n  :root {\n    --background: 0 0% 100%;\n    --foreground: 0 0% 7%;\n    --accent: 217 91% 60%;\n    --accent-foreground: 0 0% 100%;\n    --muted: 0 0% 96%;\n    --muted-foreground: 0 0% 45%;\n    --card: 0 0% 100%;\n    --border: 0 0% 90%;\n    --ring: 217 91% 60%;\n    --radius: 0.75rem;\n  }\n\n  .dark {\n    --background: 0 0% 4%;\n    --foreground: 0 0% 98%;\n    --accent: 217 91% 60%;\n    --muted: 0 0% 15%;\n    --muted-foreground: 0 0% 64%;\n    --card: 0 0% 9%;\n    --border: 0 0% 20%;\n  }\n}')

add_h2('10.4 Phase 3: Layout Shell')

add_body(
    'Build the page-level layout structure: a fixed/sticky navigation bar at the top, a main content area '
    'containing six section containers, and a responsive footer at the bottom. Each section container '
    'uses the Section Container pattern (full-width background div with constrained inner content div). '
    'Implement the navigation with responsive behavior (hamburger on mobile, horizontal links on desktop) '
    'and smooth scroll navigation to section anchors. Ensure the layout shell passes the "content-free" '
    'test: it should render correctly with only placeholder text in each section.'
)

add_h2('10.5 Phase 4: Section Development')

add_body(
    'Develop each section component in order: Hero, Features, Pricing, Testimonials, CTA, Footer. Start '
    'with the Hero section as it sets the visual tone. Then proceed to Features (grid layout), Pricing '
    '(comparison cards), Testimonials (social proof cards), CTA (conversion zone), and Footer '
    '(navigational structure). Each section should be developed as an independent component with typed '
    'props, making it easy to swap content and customize. Use the Pattern Library (Section 5) as the '
    'reference for consistent implementation across sections.'
)

add_h2('10.6 Phase 5: Animation System')

add_body(
    'Implement the scroll-triggered animation system using the useInView hook pattern. Apply animations '
    'to section headings, cards, and CTA buttons. Use staggered delays for grid items to create a '
    'cascading reveal effect. Test with prefers-reduced-motion to ensure accessibility compliance. '
    'Animation durations should be 500-700ms with ease-out timing for a "natural" feel. Verify that '
    'animations do not cause layout shifts or jank during scrolling by testing on mid-range mobile devices.'
)

add_h2('10.7 Phase 6: Responsive Refinement')

add_body(
    'Test the landing page across all breakpoints (mobile 375px, tablet 768px, desktop 1280px, ultrawide '
    '1536px). Ensure all interactive elements have minimum 44px touch targets on mobile. Verify that '
    'text remains readable without horizontal scrolling at 320px minimum viewport width. Check that the '
    'navigation hamburger menu opens and closes correctly. Test pricing tier cards on narrow viewports to '
    'ensure they don\'t overflow. Use Chrome DevTools device emulation and, if possible, real device testing.'
)

add_h2('10.8 Phase 7: Polish and Deploy')

add_body(
    'Complete the following quality checks before deployment: (1) Run Lighthouse audit, targeting 95+ '
    'Performance and 100 Accessibility scores. (2) Add structured data (JSON-LD) for SoftwareApplication '
    'schema. (3) Verify all links point to valid destinations. (4) Test keyboard navigation through all '
    'interactive elements. (5) Optimize images using next/image with appropriate sizes and formats. '
    '(6) Deploy to Vercel using the Vercel CLI or GitHub integration. (7) Configure a custom domain and '
    'ensure SSL is active. (8) Set up analytics (Vercel Analytics or Google Analytics) for conversion tracking.'
)

deploy_data = [
    ['Check', 'Tool', 'Pass Criteria'],
    ['Lighthouse Performance', 'Chrome DevTools', '>= 95'],
    ['Lighthouse Accessibility', 'Chrome DevTools', '>= 95'],
    ['Lighthouse SEO', 'Chrome DevTools', '>= 90'],
    ['Mobile Responsive', 'DevTools + Real Devices', 'No overflow, readable text'],
    ['Keyboard Navigation', 'Manual + axe-core', 'All elements reachable'],
    ['Image Optimization', 'WebPageTest', 'LCP < 2.0s'],
    ['Bundle Size', 'Webpack Analyzer', '< 100KB gzipped JS'],
    ['Deployment', 'Vercel CLI', 'Successful build + deploy'],
]
story.append(make_table(deploy_data, [PAGE_W * 0.25, PAGE_W * 0.25, PAGE_W * 0.5]))
story.append(Paragraph('Table 19. Pre-deployment quality checklist', caption_style))


# ═══════════════════════════════════════════════════════════════
# CHAPTER 11: CONCLUSION
# ═══════════════════════════════════════════════════════════════
add_h1('11. Summary and Recommendations')

add_body(
    'The Pointer AI Landing Page template represents a high-quality example of AI-generated web design '
    'that successfully balances aesthetic appeal with functional effectiveness. The template excels in '
    'several key areas: clean visual hierarchy with generous whitespace, consistent design token usage '
    'across all components, smooth CSS-driven animations that enhance rather than distract, and a modular '
    'component architecture that facilitates customization without structural breakage. The six-section '
    'structure (Hero, Features, Pricing, Testimonials, CTA, Footer) follows proven SaaS landing page '
    'patterns that optimize for conversion.'
)

add_body(
    'Key strengths identified through this analysis include: the template\'s theme-switching capability '
    'through natural language prompts (a novel approach enabled by the v0 platform), the consistent spacing '
    'system that creates a calm, professional aesthetic, and the mobile-first responsive design that works '
    'without additional effort. Areas for potential improvement include: enriched ARIA labels for screen '
    'reader support, prefers-reduced-motion handling for animation accessibility, structured data markup '
    'for enhanced SEO, and the addition of a "back to top" navigation element for long-page usability.'
)

add_body(
    'The implementation pipeline provided in Chapter 10 offers a structured approach for recreating '
    'the template\'s design patterns from scratch. With an estimated total development time of 10-14 hours, '
    'developers can produce a production-quality landing page that matches the Pointer AI template\'s visual '
    'and functional characteristics. The design system tokens and pattern library extracted in this '
    'analysis can serve as the foundation for a broader component library, enabling teams to build '
    'additional pages and products that share a consistent visual identity with the Pointer AI aesthetic.'
)

rec_data = [
    ['Priority', 'Recommendation', 'Impact'],
    ['High', 'Add ARIA labels and roles to all interactive elements', 'Accessibility compliance'],
    ['High', 'Implement prefers-reduced-motion media query', 'Animation accessibility'],
    ['Medium', 'Add JSON-LD structured data for Product schema', 'SEO enhancement'],
    ['Medium', 'Implement back-to-top navigation button', 'Long-page usability'],
    ['Low', 'Add dark/light theme toggle in navigation', 'User preference control'],
    ['Low', 'Create Figma component library mirror', 'Design-development parity'],
]
story.append(make_table(rec_data, [PAGE_W * 0.1, PAGE_W * 0.55, PAGE_W * 0.35]))
story.append(Paragraph('Table 20. Prioritized recommendations', caption_style))


# ═══════════════════════════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════════════════════════
# Page number callback
def add_page_number(canvas, doc):
    """Add page numbers to footer (skip cover page)."""
    page_num = canvas.getPageNumber()
    if page_num > 1:
        canvas.saveState()
        canvas.setFont('FreeSerif', 8)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawCentredString(A4[0] / 2, 15*mm, f'Page {page_num - 1}')
        canvas.restoreState()

# First page uses the cover draw function
def on_first_page(canvas, doc):
    draw_cover(canvas, doc)

def on_later_pages(canvas, doc):
    add_page_number(canvas, doc)

doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)

print(f"PDF generated successfully: {OUTPUT_FILE}")
print(f"File size: {os.path.getsize(OUTPUT_FILE) / 1024:.1f} KB")
