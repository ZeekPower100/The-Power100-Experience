# 🎨 The Power100 Experience - Modern Design System

**Status**: DEFAULT STANDARD
**Last Updated**: January 2025
**Reference**: `tpe-front-end/src/components/reports/PublicPCRLandingV2.tsx`

---

## 🚨 CRITICAL: This is NOT Optional

These design patterns are **THE DEFAULT STANDARD** for The Power100 Experience.
Just like our brand colors (`--power100-red`, `--power100-green`) are non-negotiable, these modern design elements must be used in ALL new development.

**Applies To**:
- ✅ Frontend (React components, pages, dashboards)
- ✅ Backend (HTML email templates, PDF generation, admin interfaces)
- ✅ All reports and public-facing pages
- ✅ Internal tools and dashboards

---

## 📖 Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Core Components](#core-components)
3. [Section Patterns](#section-patterns)
4. [Card Patterns](#card-patterns)
5. [Button Patterns](#button-patterns)
6. [Color & Gradients](#color-gradients)
7. [Typography](#typography)
8. [Spacing & Layout](#spacing-layout)
9. [Animation Standards](#animation-standards)
10. [Backend Considerations](#backend-considerations)
11. [Before/After Examples](#beforeafter-examples)

---

## Design Philosophy

### The "Pop-Out" Modern Aesthetic

We moved from **flat, lifeless designs** to a **modern, elevated aesthetic** with:

- **Depth**: Cards lift on hover (shadow + transform)
- **Life**: Subtle animations and transitions
- **Clarity**: Pill badges clearly label sections
- **Energy**: Gradient accents add visual interest
- **Professional**: Rounded corners (rounded-2xl) feel polished

### Core Principles

1. **Never Flat**: Always add shadows and hover effects
2. **Always Labeled**: Use pill badges for section headers
3. **Motion Matters**: Hover states must transform
4. **Consistency**: Same patterns everywhere
5. **Accessibility**: Maintain contrast and readability

---

## Core Components

### 1. Pill Badge (Section Labels)

**Usage**: REQUIRED for all section headers

```tsx
<div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
  Section Label
</div>
```

**Color Variations**:
- Primary: `bg-red-100 text-red-600`
- Success: `bg-green-100 text-green-600`
- Info: `bg-blue-100 text-blue-600`
- Warning: `bg-yellow-100 text-yellow-600`

**Examples**:
- "Proven Results"
- "Client Success Stories"
- "Growth Areas"
- "See It In Action"

---

### 2. Section Header Pattern

**Standard Implementation**:

```tsx
<div className="text-center mb-16">
  {/* Pill Badge */}
  <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
    Section Label
  </div>

  {/* Main Heading */}
  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
    Main Section Title
  </h2>

  {/* Supporting Text */}
  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
    Brief description or context for this section
  </p>
</div>
```

**Key Classes**:
- Heading: `text-4xl md:text-5xl` (responsive sizing)
- Subtext: `text-xl text-gray-600`
- Max Width: `max-w-3xl mx-auto` (centers and constrains)

---

## Card Patterns

### 1. Basic Modern Card

**Default Pattern** (use everywhere):

```tsx
<div className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
  {/* Card content */}
</div>
```

**What's Happening**:
- `group`: Enables child hover states
- `rounded-2xl`: Large rounded corners (modern look)
- `shadow-md`: Base shadow (subtle depth)
- `hover:shadow-2xl`: Dramatic shadow on hover
- `transform hover:-translate-y-2`: Lifts up 8px on hover
- `transition-all duration-300`: Smooth 300ms transition
- `border border-gray-100`: Subtle border definition

---

### 2. Gradient Metric Card

**For Stats/Numbers/Metrics**:

```tsx
<div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
  {/* Gradient Overlay (appears on hover) */}
  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>

  {/* Content */}
  <div className="relative">
    {/* Icon */}
    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4">
      <TrendingUp className="w-6 h-6 text-white" />
    </div>

    {/* Metric Value (gradient text) */}
    <div className="text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">
      +12%
    </div>

    {/* Label */}
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      Avg Closing Rate Increase
    </h3>
  </div>
</div>
```

**Gradient Colors** (use in rotation):
1. Green: `from-green-500 to-emerald-600`
2. Blue: `from-blue-500 to-cyan-600`
3. Purple: `from-purple-500 to-violet-600`
4. Orange/Red: `from-orange-500 to-red-600`

---

### 3. Testimonial Card

```tsx
<div className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 relative">
  {/* Decorative Quote Icon */}
  <Quote className="absolute top-6 right-6 w-12 h-12 text-red-600 opacity-10 group-hover:opacity-20 transition-opacity" />

  {/* Star Rating */}
  <div className="flex gap-1 mb-4">
    {[1,2,3,4,5].map((i) => (
      <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
    ))}
  </div>

  {/* Quote */}
  <p className="text-gray-700 text-lg leading-relaxed mb-6 relative z-10">
    "Quote text goes here"
  </p>

  {/* Author */}
  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
    {/* Avatar with Initials */}
    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
      JD
    </div>
    <div>
      <p className="font-bold text-gray-900">John Doe</p>
      <p className="text-sm text-gray-600">Company Name</p>
    </div>
  </div>
</div>
```

---

### 4. Focus Area/Feature Card

```tsx
<div className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 text-center">
  {/* Icon Container */}
  <div className="flex justify-center mb-4">
    <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-600 transition-colors">
      <TrendingUp className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
    </div>
  </div>

  {/* Label */}
  <p className="font-semibold text-gray-900">
    Feature Name
  </p>
</div>
```

**Icon Color Variations**:
- Green: `bg-green-100` → `group-hover:bg-green-600`
- Blue: `bg-blue-100` → `group-hover:bg-blue-600`
- Purple: `bg-purple-100` → `group-hover:bg-purple-600`
- Red: `bg-red-100` → `group-hover:bg-red-600`

---

## Button Patterns

### 1. Primary CTA Button

```tsx
<button className="group bg-green-500 text-white px-8 py-4 rounded-full hover:bg-green-600 transition-all duration-300 flex items-center justify-center gap-2 text-lg font-semibold shadow-xl">
  <Calendar className="w-5 h-5" />
  Schedule Introduction
  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
</button>
```

**Key Features**:
- `rounded-full`: Pill-shaped modern button
- `shadow-xl`: Prominent shadow
- `group`: Enables icon animation on hover
- `ArrowRight` animates right on hover

### 2. Secondary/Outline Button

```tsx
<button className="bg-black/40 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 rounded-full hover:bg-black/60 transition-all duration-300 flex items-center justify-center gap-2 text-lg font-semibold shadow-xl">
  <Download className="w-5 h-5" />
  Download Report
</button>
```

**Key Features**:
- `backdrop-blur-sm`: Glassmorphism effect
- `border-white/30`: Semi-transparent border
- Works on dark backgrounds

---

## Color & Gradients

### Brand Colors (Always Use These)

```css
--power100-red: #FB0401
--power100-green: #28a745
--power100-black: #000000
--power100-white: #ffffff
--power100-grey: #6c757d
--power100-bg-grey: #f8f9fa
```

### Gradient Palette

**Use these for metric cards, stat displays, and accent elements**:

```tsx
// Green (Growth, Positive)
from-green-500 to-emerald-600

// Blue (Trust, Stability)
from-blue-500 to-cyan-600

// Purple (Innovation, Premium)
from-purple-500 to-violet-600

// Orange/Red (Energy, Urgency)
from-orange-500 to-red-600

// Yellow (Warning, Attention)
from-yellow-400 to-yellow-600
```

---

## Typography

### Heading Scale

```tsx
// Hero Heading (Page titles)
text-5xl md:text-7xl font-bold

// Section Heading
text-4xl md:text-5xl font-bold

// Subsection Heading
text-3xl font-bold

// Card Heading
text-xl md:text-2xl font-bold

// Small Heading
text-lg font-semibold
```

### Body Text

```tsx
// Large body (intros, summaries)
text-xl leading-relaxed

// Standard body
text-base leading-relaxed

// Small text (meta, labels)
text-sm text-gray-600

// Tiny text (captions)
text-xs text-gray-500
```

---

## Spacing & Layout

### Section Padding

```tsx
// Standard section
py-20

// Compact section (rare)
py-16

// Hero section
py-32
```

### Container Widths

```tsx
// Full width (with padding)
max-w-7xl mx-auto px-4

// Content width (paragraphs)
max-w-3xl mx-auto

// Medium width (forms, cards)
max-w-4xl mx-auto

// Large width (grids, tables)
max-w-6xl mx-auto
```

### Grid Gaps

```tsx
// Standard gap
gap-8

// Tight gap (dense layouts)
gap-6

// Wide gap (spacious layouts)
gap-12
```

---

## Animation Standards

### Hover Transform

**Always include both shadow AND transform**:

```tsx
hover:shadow-2xl transform hover:-translate-y-2
```

### Transition Timing

```tsx
// Standard (most elements)
transition-all duration-300

// Quick (small interactions)
transition-all duration-200

// Slow (dramatic effects)
transition-all duration-500
```

### Icon Animations

```tsx
// Arrow sliding right
<ArrowRight className="group-hover:translate-x-1 transition-transform" />

// Icon scaling
<Icon className="group-hover:scale-110 transition-transform" />

// Icon rotating
<Icon className="group-hover:rotate-12 transition-transform" />
```

---

## Backend Considerations

### HTML Email Templates

Apply the same design principles to HTML emails:

```html
<!-- Pill Badge -->
<div style="display: inline-block; background: #fee2e2; color: #dc2626; padding: 8px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600; margin-bottom: 16px;">
  Section Label
</div>

<!-- Modern Card -->
<div style="background: white; border-radius: 24px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #f3f4f6;">
  <!-- Card content -->
</div>

<!-- CTA Button -->
<a href="#" style="display: inline-flex; align-items: center; gap: 8px; background: #28a745; color: white; padding: 16px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600; box-shadow: 0 10px 15px rgba(0,0,0,0.1);">
  Schedule Introduction →
</a>
```

### PDF Generation

When generating PDFs (reports, invoices, etc.):

- Use the same color palette
- Include pill badges for sections
- Use rounded corners on cards/boxes
- Apply subtle shadows (gray borders in PDF)
- Maintain consistent spacing (20px sections, 16px headers)

---

## Before/After Examples

### ❌ OLD (Flat Design)

```tsx
<div className="py-16 bg-white">
  <div className="max-w-7xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">
      What Contractors Say
    </h2>
    <div className="grid md:grid-cols-3 gap-8">
      <div className="p-6 border">
        <p>"Quote text"</p>
        <p>- Author</p>
      </div>
    </div>
  </div>
</div>
```

**Problems**:
- No pill badge
- Flat cards with simple border
- No hover effects
- Small heading
- Generic spacing

---

### ✅ NEW (Modern Design)

```tsx
<div className="py-20 bg-gradient-to-b from-gray-50 to-white">
  <div className="max-w-6xl mx-auto px-4">
    <div className="text-center mb-16">
      {/* Pill Badge */}
      <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
        Client Success Stories
      </div>

      {/* Large Heading */}
      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        What Contractors Say
      </h2>
    </div>

    <div className="grid md:grid-cols-3 gap-6 mb-12">
      {/* Modern Card */}
      <div className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 relative">
        {/* Decorative Quote Icon */}
        <Quote className="absolute top-6 right-6 w-12 h-12 text-red-600 opacity-10 group-hover:opacity-20 transition-opacity" />

        {/* Star Rating */}
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map((i) => (
            <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          ))}
        </div>

        <p className="text-gray-700 text-lg leading-relaxed mb-6 relative z-10">
          "Quote text"
        </p>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
            JD
          </div>
          <div>
            <p className="font-bold text-gray-900">John Doe</p>
            <p className="text-sm text-gray-600">Company Name</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Improvements**:
- ✅ Pill badge added
- ✅ Larger, responsive heading
- ✅ Gradient background
- ✅ Modern rounded cards
- ✅ Shadow + hover effects
- ✅ Decorative elements (Quote icon, avatars)
- ✅ Better spacing (py-20)

---

## Quick Migration Checklist

When updating existing components:

- [ ] Add pill badge to section header
- [ ] Increase heading size (`text-4xl md:text-5xl`)
- [ ] Add supporting text under heading
- [ ] Update cards to `rounded-2xl`
- [ ] Add `shadow-md hover:shadow-2xl`
- [ ] Add `transform hover:-translate-y-2`
- [ ] Add `transition-all duration-300`
- [ ] Add subtle `border border-gray-100`
- [ ] Update section padding to `py-20`
- [ ] Update buttons to `rounded-full` with icons
- [ ] Add gradient effects where appropriate
- [ ] Test hover states on all interactive elements

---

## Resources

- **Reference Component**: `tpe-front-end/src/components/reports/PublicPCRLandingV2.tsx`
- **Sample Design**: `tpe-front-end/src/app/demo/partner-lander-sample/page.tsx`
- **Brand Colors**: `tpe-front-end/src/app/globals.css`
- **Icon Library**: [Lucide React](https://lucide.dev/)

---

## Questions?

If you're unsure how to implement these patterns, always refer to:
1. `PublicPCRLandingV2.tsx` - The canonical implementation
2. This document
3. The sample design at `/demo/partner-lander-sample`

**Remember**: These are not suggestions. They are THE standard.
