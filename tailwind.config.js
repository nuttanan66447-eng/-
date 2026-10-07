// ธีมจากไฟล์ตัวอย่าง (design/DESIGN.md — Civic Architectural Glass) • ฟอนต์ไทยใช้ Sarabun
module.exports = {
  content: ['./index.html', './assets/js/**/*.js'],
  darkMode: 'class',
  theme: { extend: {
  "colors": {
    "surface-container-lowest": "#ffffff",
    "surface-container-high": "#dce9ff",
    "secondary-fixed-dim": "#bec6e0",
    "surface-container": "#e5eeff",
    "secondary-fixed": "#dae2fd",
    "primary": "#006194",
    "on-tertiary-fixed": "#001e2c",
    "primary-fixed": "#cce5ff",
    "inverse-surface": "#213145",
    "on-secondary-container": "#5c647a",
    "on-primary-container": "#fdfcff",
    "on-background": "#0b1c30",
    "tertiary-container": "#007da9",
    "tertiary-fixed": "#c4e7ff",
    "on-tertiary": "#ffffff",
    "inverse-on-surface": "#eaf1ff",
    "outline-variant": "#bfc7d2",
    "on-secondary-fixed": "#131b2e",
    "on-error": "#ffffff",
    "inverse-primary": "#93ccff",
    "on-primary-fixed-variant": "#004b73",
    "tertiary-fixed-dim": "#7bd0ff",
    "on-surface": "#0b1c30",
    "surface-variant": "#d3e4fe",
    "surface-container-low": "#eff4ff",
    "on-primary": "#ffffff",
    "error-container": "#ffdad6",
    "outline": "#707881",
    "background": "#f8f9ff",
    "primary-fixed-dim": "#93ccff",
    "error": "#ba1a1a",
    "secondary": "#565e74",
    "primary-container": "#007bb9",
    "on-secondary": "#ffffff",
    "surface-container-highest": "#d3e4fe",
    "on-primary-fixed": "#001d31",
    "on-secondary-fixed-variant": "#3f465c",
    "surface-dim": "#cbdbf5",
    "on-tertiary-container": "#fcfcff",
    "surface": "#f8f9ff",
    "tertiary": "#006387",
    "surface-tint": "#006398",
    "on-tertiary-fixed-variant": "#004c69",
    "on-surface-variant": "#3f4850",
    "on-error-container": "#93000a",
    "surface-bright": "#f8f9ff",
    "secondary-container": "#dae2fd"
  },
  "borderRadius": {
    "DEFAULT": "1rem",
    "lg": "2rem",
    "xl": "3rem",
    "full": "9999px"
  },
  "spacing": {
    "gutter-mobile": "1rem",
    "space-md": "1rem",
    "space-xl": "2.5rem",
    "margin": "2.5rem",
    "margin-mobile": "1rem",
    "gutter": "1.5rem",
    "space-xs": "0.25rem",
    "space-sm": "0.5rem",
    "space-lg": "1.5rem"
  },
  "fontFamily": {
    "label-sm": [
      "Hanken Grotesk",
      "Sarabun",
      "sans-serif"
    ],
    "body-xl": [
      "Hanken Grotesk",
      "Sarabun",
      "sans-serif"
    ],
    "headline-sm": [
      "Manrope",
      "Sarabun",
      "sans-serif"
    ],
    "headline-lg": [
      "Manrope",
      "Sarabun",
      "sans-serif"
    ],
    "body-md": [
      "Hanken Grotesk",
      "Sarabun",
      "sans-serif"
    ],
    "label-md": [
      "Hanken Grotesk",
      "Sarabun",
      "sans-serif"
    ],
    "headline-xl-mobile": [
      "Manrope",
      "Sarabun",
      "sans-serif"
    ],
    "body-sm": [
      "Hanken Grotesk",
      "Sarabun",
      "sans-serif"
    ],
    "display-lg": [
      "Manrope",
      "Sarabun",
      "sans-serif"
    ],
    "headline-lg-mobile": [
      "Manrope",
      "Sarabun",
      "sans-serif"
    ],
    "display-lg-mobile": [
      "Manrope",
      "Sarabun",
      "sans-serif"
    ],
    "headline-md": [
      "Manrope",
      "Sarabun",
      "sans-serif"
    ],
    "label-lg": [
      "Hanken Grotesk",
      "Sarabun",
      "sans-serif"
    ],
    "headline-xl": [
      "Manrope",
      "Sarabun",
      "sans-serif"
    ],
    "body-lg": [
      "Hanken Grotesk",
      "Sarabun",
      "sans-serif"
    ],
    "sans": [
      "Hanken Grotesk",
      "Sarabun",
      "sans-serif"
    ],
    "doc": [
      "TH Sarabun PSK",
      "TH Sarabun New",
      "Sarabun",
      "serif"
    ]
  },
  "fontSize": {
    "label-sm": [
      "11px",
      {
        "lineHeight": "14px",
        "letterSpacing": "0.04em",
        "fontWeight": "600"
      }
    ],
    "body-xl": [
      "18px",
      {
        "lineHeight": "28px",
        "letterSpacing": "-0.005em",
        "fontWeight": "400"
      }
    ],
    "headline-sm": [
      "20px",
      {
        "lineHeight": "28px",
        "letterSpacing": "-0.01em",
        "fontWeight": "500"
      }
    ],
    "headline-lg": [
      "32px",
      {
        "lineHeight": "40px",
        "letterSpacing": "-0.02em",
        "fontWeight": "600"
      }
    ],
    "body-md": [
      "14px",
      {
        "lineHeight": "20px",
        "letterSpacing": "0.005em",
        "fontWeight": "400"
      }
    ],
    "label-md": [
      "12px",
      {
        "lineHeight": "16px",
        "letterSpacing": "0.02em",
        "fontWeight": "500"
      }
    ],
    "headline-xl-mobile": [
      "28px",
      {
        "lineHeight": "36px",
        "letterSpacing": "-0.02em",
        "fontWeight": "600"
      }
    ],
    "body-sm": [
      "12px",
      {
        "lineHeight": "16px",
        "letterSpacing": "0.01em",
        "fontWeight": "400"
      }
    ],
    "display-lg": [
      "56px",
      {
        "lineHeight": "64px",
        "letterSpacing": "-0.03em",
        "fontWeight": "600"
      }
    ],
    "headline-lg-mobile": [
      "24px",
      {
        "lineHeight": "32px",
        "letterSpacing": "-0.015em",
        "fontWeight": "600"
      }
    ],
    "display-lg-mobile": [
      "36px",
      {
        "lineHeight": "44px",
        "letterSpacing": "-0.02em",
        "fontWeight": "600"
      }
    ],
    "headline-md": [
      "24px",
      {
        "lineHeight": "32px",
        "letterSpacing": "-0.015em",
        "fontWeight": "500"
      }
    ],
    "label-lg": [
      "14px",
      {
        "lineHeight": "20px",
        "letterSpacing": "0.01em",
        "fontWeight": "500"
      }
    ],
    "headline-xl": [
      "40px",
      {
        "lineHeight": "48px",
        "letterSpacing": "-0.025em",
        "fontWeight": "600"
      }
    ],
    "body-lg": [
      "16px",
      {
        "lineHeight": "24px",
        "letterSpacing": "0em",
        "fontWeight": "400"
      }
    ]
  }
} }
};
