# Mapbox Dashboard MVP

A modern, interactive dashboard built with Next.js 15, TypeScript, Tailwind CSS, and Mapbox GL. This MVP features a clean, cohesive design system with placeholder components ready for data integration.

## Features

- **Interactive Mapbox Map**: Central map component with navigation controls, geolocation, and scale
- **Modern Dashboard Layout**: Sidebar navigation with a responsive grid layout
- **Unified Design System**: Consistent theming using CSS variables across all components
- **ShadCN UI Components**: Pre-built, accessible UI components (Cards, Tables, Buttons, Badges)
- **Placeholder Components**: Ready-to-populate stat cards, data tables, and chart areas
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Utility-first styling with custom theme configuration

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Map**: Mapbox GL JS + react-map-gl
- **UI Components**: ShadCN UI
- **Icons**: Lucide React

## Project Structure

```
hackathon/
├── app/
│   ├── globals.css          # Global styles and CSS variables
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main dashboard page
├── components/
│   ├── ui/                  # ShadCN UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   └── separator.tsx
│   ├── mapbox-map.tsx       # Interactive Mapbox component
│   ├── sidebar.tsx          # Navigation sidebar
│   ├── stat-cards.tsx       # Dashboard statistics cards
│   ├── data-table.tsx       # Data table with placeholder data
│   └── chart-placeholder.tsx # Placeholder for future charts
├── lib/
│   └── utils.ts             # Utility functions (cn helper)
└── public/                  # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Component Overview

### MapboxMap
The central component featuring an interactive Mapbox GL map with:
- Dark theme styling
- Navigation controls (zoom, rotate)
- Geolocation support
- Scale indicator
- Pre-configured with public Mapbox token

### StatCards
Displays four key metrics:
- Total Locations
- Active Users
- Activity Rate
- Growth

Each card shows a value, trend indicator, and icon.

### DataTable
A responsive table showing recent location data with:
- Location ID and name
- Status badges (active/inactive)
- User counts
- Last update timestamps

### ChartPlaceholder
A placeholder component ready for chart library integration (e.g., Recharts, Chart.js).

### Sidebar
Navigation sidebar with:
- Dashboard branding
- Menu items (Dashboard, Map View, Analytics, Users, Settings)
- Version information

## Customization

### Theme Colors
Modify the CSS variables in `app/globals.css` to customize the color scheme:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  /* ... other colors */
}
```

### Mapbox Token
The Mapbox token is configured in `components/mapbox-map.tsx`. Replace with your own token for production use.

### Map Style
Change the map style in `components/mapbox-map.tsx`:
```typescript
mapStyle="mapbox://styles/mapbox/dark-v11"
```

Available styles: `streets-v12`, `light-v11`, `dark-v11`, `satellite-v9`, `satellite-streets-v12`

## Next Steps

This MVP is ready for data integration. Consider adding:

1. **Real Data Integration**: Connect APIs to populate stat cards, tables, and charts
2. **Map Markers**: Add location markers and popups to the Mapbox component
3. **Authentication**: Implement user authentication
4. **Real-time Updates**: Add WebSocket or polling for live data
5. **Chart Library**: Integrate Recharts or Chart.js for the placeholder
6. **Filters & Search**: Add filtering and search functionality
7. **Responsive Mobile**: Enhance mobile navigation (collapsible sidebar)

## License

This project was created as an MVP for demonstration purposes.
