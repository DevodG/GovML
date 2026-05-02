# GovChain Design System

## Overview

This document defines the design system used across the GovChain frontend. All components should follow these patterns to ensure consistency across the application.

---

## Color Palette

### Role Accent Colors
- **Government (Gov)**: `#3B8BD4` - Blue
- **Contractor**: `#1D9E75` - Green
- **Public**: `#EF9F27` - Orange
- **Auditor**: `#7F77DD` - Purple

### Semantic Colors
- **Success**: `#1D9E75` - Green
- **Warning**: `#EF9F27` - Orange
- **Danger**: `#D85A30` - Red
- **Info**: `#3B8BD4` - Blue
- **Text Primary**: `#E8EDF5` - Light gray
- **Text Secondary**: `#8B95A8` - Medium gray
- **Text Muted**: `#4A5568` - Dark gray
- **Disabled**: `#2D3748` - Very dark gray
- **Border**: `#1B2332` - Medium gray
- **Hover**: `rgba(255, 255, 255, 0.04)` - Light gray
- **Active**: `rgba(255, 255, 255, 0.06)` - Medium gray

### Background Colors
- **Primary**: `#07090D` - Very dark blue-gray
- **Secondary**: `#0D1117` - Dark blue-gray
- **Card**: `#111820` - Dark gray
- **Elevated**: `#161D27` - Medium gray
- **Hover**: `rgba(255, 255, 255, 0.04)` - Light gray

---

## Typography

### Font Families
- **Sans**: `Inter` - Primary font for UI text
- **Mono**: `JetBrains Mono` - Monospace for code, addresses, hashes

### Font Sizes
- **Display**: 24px, 20px, 16px, 14px, 13px, 12px, 11px
- **Heading**: 24px, 20px, 16px
- **Body**: 14px, 13px, 12px
- **Small**: 12px, 11px
- **Tiny**: 10px

### Font Weights
- **Bold**: 700, 600, 500
- **Medium**: 500, 400
- **Regular**: 400, 300
- **Light**: 300

### Letter Spacing
- **Tight**: -0.02em
- **Normal**: 0em
- **Wide**: 0.02em

---

## Spacing System

### Scale
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px
- **2xl**: 32px
- **3xl**: 48px

### Padding
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px
- **2xl**: 32px

### Margin
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px
- **2xl**: 32px

---

## Border Radius

- **xs**: 6px
- **sm**: 10px
- **md**: 10px
- **lg**: 16px
- **xl**: 24px
- **full**: 9999px

---

## Shadows

### Box Shadows
- **Small**: `0 1px 3px rgba(0, 0, 0, 0.1)`
- **Medium**: `0 4px 12px rgba(0, 0, 0, 0.08)`
- **Large**: `0 8px 24px rgba(0, 0, 0, 0.12)`

### Glow Effects
- **Primary Glow**: `0 0 20px 4px rgba(59, 139, 212, 0.15)`
- **Success Glow**: `0 0 20px 4px rgba(29, 158, 117, 0.15)`
- **Warning Glow**: `0 0 20px 4px rgba(239, 159, 39, 0.15)`
- **Danger Glow**: `0 0 20px 4px rgba(216, 90, 48, 0.15)`

---

## Transitions

### Duration
- **Fast**: 150ms
- **Normal**: 250ms
- **Slow**: 400ms

### Easing
- **Out**: `cubic-bezier(0.16, 1, 0.3, 1)`
- **In**: `cubic-bezier(0.16, 1, 0.3, 1)`

---

## Animations

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Slide In
```css
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### Pulse Glow
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 139, 212, 0); }
  50% { box-shadow: 0 0 20px 4px rgba(59, 139, 212, 0.15); }
```

### Float
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
 50% { transform: translateY(-8px); }
```

---

## Component Patterns

### Card
```tsx
<div className="card" style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 'var(--lg)' }}>
  {/* Card content */}
</div>
```

### Button
```tsx
<button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
  {/* Button content */}
</button>
```

### Badge
```tsx
<div className="badge badge-{variant}" style={{ padding: '2px 8px', borderRadius: 'var(--full)', fontSize: '11px', fontWeight: 600' }}>
  {/* Badge content */}
</div>
```

### Table
```tsx
<div className="table-container">
  <table>
    <th>Header</th>
    <td>Data</td>
  </tr>
  </table>
</div>
```

---

## Layout Patterns

### Dashboard Layout
- **Header**: Fixed height (56px), border-bottom
- **Sidebar**: Fixed width (256px), right border-right
- **Main**: Flex-1, overflow-y-auto, padding: 24px

### Form Layout
- **Label**: 12px, color: var(--text-muted), margin-bottom: 6px
- **Input**: 14px, padding: 10px 14px, border: 1px solid var(--border)
- **Button**: 14px, padding: 10px 20px, display: flex, align-items: center, gap: 8

### Detail View Layout
- **Title**: 24px, font-weight: 700, letter-spacing: -0.02em
- **Subtitle**: 13px, color: var(--text-secondary)
- **Section Header**: 16px, font-weight: 600, margin-bottom: 16px

---

## Utility Classes

### Glass
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}
```

### Skeleton
```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--sm);
}
```

---

## Responsive Breakpoints

### Mobile
- **Font Size**: 14px base
- **Padding**: 12px
- **Grid**: Single column

### Tablet
- **Font Size**: 14px base
- **Padding**: 16px
- **Grid**: 2 columns

### Desktop
- **Font Size**: 14px base
- **Padding**: 24px
- **Grid**: 4+ columns

---

## Accessibility

### Color Contrast
- All text meets WCAG AA standard on dark backgrounds
- Interactive elements have 3:1 contrast ratio minimum

### Focus States
- Focus rings: 2px solid var(--gov)
- Focus offset: 2px

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order is logical
- Skip links are provided

---

## Icon Usage

### Icon Sizes
- **Small**: 12px
- **Medium**: 14px
- **Large**: 16px
- **XLarge**: 20px

### Icon Colors
- **Primary**: var(--text-primary)
- **Secondary**: var(--text-secondary)
- **Muted**: var(--text-muted)
- **Disabled**: var(--text-disabled)

---

## State Indicators

### Loading
- Skeleton animation with shimmer effect
- Spinner for inline loading

### Success
- Green checkmark icon
- Green background with 12% opacity

### Error
- Red X icon
- Red background with 12% opacity

### Warning
- Yellow clock icon
- Yellow background with 12% opacity

### Information
- Blue info icon
- Blue background with 12% opacity

---

## Dark Mode Specifics

### Text Colors
- **Primary**: `#E8EDF5` - Light gray
- **Secondary**: `#8B95A8` - Medium gray
- **Muted**: `#4A5568` - Dark gray

### Background Colors
- **Primary**: `#07090D` - Very dark blue-gray
- **Secondary**: `#0D1117` - Dark blue-gray
- **Card**: `#111820` - Dark gray
- **Elevated**: `#161D27` - Medium gray

### Border Colors
- **Default**: `#1B2332` - Medium gray
- **Hover**: `rgba(255, 255,255,0.12)` - Light gray
- **Active**: `rgba(59,139,212,0.15)` - Blue glow

---

## Component-Specific Guidelines

### Status Badge
- **Size**: sm (12px), md (14px), lg (16px)
- **Colors**: Use role-specific accent colors
- **Icons**: CheckCircle (success), Clock (pending), AlertTriangle (danger)

### Transaction Toast
- **Pending**: Spinner animation
- **Confirmed**: Green checkmark with block explorer link
- **Failed**: Red X icon with error message

### Data Table
- **Header**: 11px, uppercase, letter-spacing 0.05em, dark gray
- **Row**: 13px, dark gray, hover: var(--bg-hover)
- **Pagination**: 12px, dark gray

### Filter Bar
- **Input**: 14px, dark gray background, light gray text
- **Select**: 14px, dark gray background, light gray text
- **Button**: 13px, ghost style

### Form Elements
- **Label**: 12px, dark gray, margin-bottom: 6px
- **Input**: 14px, dark gray background, light gray text
- **Error**: Red border, red text
- **Success**: Green border, green text

---

## Design Tokens Summary

| Token | Value | Usage |
|-------|-------|
| `--bg-primary` | #07090D | Main background |
| `--bg-secondary` | #0D1117 | Secondary background |
| `--bg-card` | #111820 | Card background |
| `--bg-elevated` | #161D27 | Elevated background |
| `--bg-hover` | rgba(255,255,255,0.04) | Hover state |
| `--border` | #1B2332 | Default border |
| `--border-hover` | rgba(255,255,255,0.12) | Hover border |
| `--border-active` | rgba(255,255,255,0.18) | Active border |
| `--text-primary` | #E8EDF5 | Primary text |
| `--text-secondary` | #8B95A8 | Secondary text |
| `--text-muted` | #4A5568 | Muted text |
| `--text-disabled` | #2D3748 | Disabled text |
| `--gov` | #3B8BD4 | Government accent |
| `--contractor` | #1D9E75 | Contractor accent |
| `--public` | #EF9F27 | Public accent |
| `--auditor` | #7F77DD | Auditor accent |
| `--success` | #1D9E75 | Success color |
| `--warning` | #EF9F27 | Warning color |
| `--danger` | #D85A30 | Danger color |
| `--info` | #3B8BD4 | Info color |

---

## Implementation Notes

### Consistency Checklist
- ✅ All pages use PortalLayout for consistent layout
- ✅ All tables use DataTable component
- ✅ All forms use consistent input styling
- ✅ All status badges use StatusBadge component
- ✅ All loading states use LoadingState component
- ✅ All modals use ConfirmModal component
- ✅ Role-specific accent colors used throughout
- ✅ Consistent spacing and typography across all pages
- ✅ Consistent animation timing and easing
- ✅ Glass effect used on navigation and modals
- ✅ Hover states on all interactive elements

### Browser Compatibility
- All CSS uses standard CSS properties
- No vendor prefixes required
- Fallbacks for older browsers
- Responsive design works on all screen sizes

### Accessibility
- All interactive elements have focus states
- Color contrast meets WCAG AA
- Keyboard navigation is supported
- Screen reader friendly
- Touch targets are at least 44x44px

---

## Future Enhancements

### Dark Mode Toggle
- Add toggle in PortalLayout to switch between light/dark modes
- Update color tokens via CSS variables

### Theme Customization
- Allow admin to customize accent colors
- Support custom color schemes

### Animation Preferences
- Allow users to disable animations
- Support reduced motion preferences
