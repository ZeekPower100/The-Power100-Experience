# Focus Area Icon Library

## Overview
Centralized icon library for consistent visual representation of focus areas across all partner landing pages.

## Icon Mappings

| Focus Area Value | Display Label | Icon | Description |
|-----------------|---------------|------|-------------|
| `greenfield_growth` | Market Expansion | 🗺️ Map | Represents geographic growth and expanding into new territories |
| `closing_higher_percentage` | Sales Conversion | 🎯 Target | Represents hitting sales goals and closing deals |
| `controlling_lead_flow` | Lead Generation & Management | 👥 Users | Represents building customer pipeline and managing leads |
| `installation_quality` | Service Delivery Excellence | 🏆 Award | Represents quality and excellence in service delivery |
| `hiring_sales_leadership` | Talent Acquisition | ➕👤 UserPlus | Represents hiring and building sales teams |
| `marketing_automation` | Marketing Systems | ⚡ Zap | Represents automation and marketing efficiency |
| `customer_retention` | Customer Success | ❤️ Heart | Represents loyalty, retention, and customer relationships |
| `operational_efficiency` | Operations Optimization | ⚙️ Settings | Represents process improvement and streamlining operations |
| `technology_integration` | Technology Solutions | 🖥️ Cpu | Represents tech implementation and digital transformation |
| `financial_management` | Financial Performance | 💲 DollarSign | Represents profitability, cash flow, and financial health |

## Component Usage

### Basic Usage
```tsx
import FocusAreaIcon from '@/components/icons/FocusAreaIcon';

// In your component
<FocusAreaIcon focusArea="greenfield_growth" className="h-7 w-7 text-green-600" />
```

### With Hover Effects
```tsx
<div className="group">
  <FocusAreaIcon
    focusArea="sales_conversion"
    className="h-7 w-7 text-green-600 group-hover:text-white transition-colors"
  />
</div>
```

### Get Icon Component (Hook)
```tsx
import { useFocusAreaIcon } from '@/components/icons/FocusAreaIcon';

const IconComponent = useFocusAreaIcon('greenfield_growth');
<IconComponent className="h-6 w-6" />
```

## Adding Custom Icons

### For New Focus Areas
1. Add the focus area to `FOCUS_AREAS` constant in `/src/components/admin/BookForm.tsx`
2. Find or create an appropriate icon (Lucide React or custom SVG)
3. Add mapping in `/src/components/icons/FocusAreaIcon.tsx`:

```tsx
const FOCUS_AREA_ICONS: Record<string, LucideIcon> = {
  // ... existing mappings
  new_focus_area: NewIconComponent,
};
```

### Creating Custom SVG Icons
If Lucide React doesn't have a suitable icon:

1. Create SVG in design tool (Figma, Illustrator, etc.)
2. Export as optimized SVG
3. Convert to React component:

```tsx
// /src/components/icons/custom/CustomIcon.tsx
export function CustomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {/* SVG path data */}
    </svg>
  );
}
```

4. Add to FOCUS_AREA_ICONS mapping

## Icon Guidelines

### Selection Criteria
- **Relevance**: Icon should visually represent the focus area concept
- **Clarity**: Must be recognizable at small sizes (24px - 48px)
- **Consistency**: Use Lucide React icons when available for style consistency
- **Simplicity**: Prefer simple, clean icons over complex illustrations

### Color Usage
- **Default**: Green (`text-green-600`) for focus area icons
- **Hover**: White (`group-hover:text-white`) on green background
- **Background**: Light green (`bg-green-100`) with rounded corners
- **Hover Background**: Solid green (`group-hover:bg-green-600`)

## File Locations

- **Icon Component**: `/tpe-front-end/src/components/icons/FocusAreaIcon.tsx`
- **Focus Areas Definition**: `/tpe-front-end/src/components/admin/BookForm.tsx` (lines 23-34)
- **Usage Example**: `/tpe-front-end/src/components/reports/PublicPCRLandingV2.tsx` (lines 467-471)
- **Custom Icons Folder**: `/tpe-front-end/src/components/icons/custom/` (create as needed)

## Benefits

✅ **Consistency**: Same icon for same focus area across all partner pages
✅ **Scalability**: Easy to add new icons as we onboard partners with unique focus areas
✅ **Maintainability**: Centralized management of all focus area icons
✅ **Flexibility**: Supports both Lucide React icons and custom SVGs
✅ **Type Safety**: TypeScript ensures correct focus area values

## Future Enhancements

- [ ] Create custom icons for focus areas that don't have perfect Lucide matches
- [ ] Add icon animations for enhanced user engagement
- [ ] Create icon variants for different contexts (light/dark mode)
- [ ] Build icon preview gallery in admin dashboard
- [ ] Add icon search/filter functionality for partners to choose icons

---

**Last Updated**: January 2025
**Maintained By**: TPX Development Team
