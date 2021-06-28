module.exports = {
  purge: {
    content: ["./src/**/*.svelte"],
  },
  theme: {
    fontFamily: {
      mono: ["Menlo", "monospace"],
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
  future: {
    purgeLayersByDefault: true,
    removeDeprecatedGapUtilities: true,
  },
};
