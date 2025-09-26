// tailwind.config.js (opcional no v4)
module.exports = {
  darkMode: ['class'], // para usares <html class="dark">
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
  theme: { 
    extend: {
      colors: {
        // Clay Base - Tons principais da paleta
        'porcelain': 'var(--porcelain)',
        'porcelain-light': 'var(--porcelain-light)',
        'porcelain-soft': 'var(--porcelain-soft)',
        'porcelain-breath': 'var(--porcelain-breath)',
        
        'pale-clay': 'var(--pale-clay)',
        'pale-clay-light': 'var(--pale-clay-light)',
        'pale-clay-medium': 'var(--pale-clay-medium)',
        'pale-clay-deep': 'var(--pale-clay-deep)',
        'pale-clay-darker': 'var(--pale-clay-darker)',
        
        'burnt-peach': 'var(--burnt-peach)',
        'burnt-peach-lighter': 'var(--burnt-peach-lighter)',
        'burnt-peach-light': 'var(--burnt-peach-light)',
        'burnt-peach-soft': 'var(--burnt-peach-soft)',
        'burnt-peach-medium': 'var(--burnt-peach-medium)',
        'burnt-peach-deep': 'var(--burnt-peach-deep)',
        'burnt-peach-dark': 'var(--burnt-peach-dark)',
        'burnt-peach-darker': 'var(--burnt-peach-darker)',
        
        'cocoa-taupe': 'var(--cocoa-taupe)',
        'cocoa-taupe-lighter': 'var(--cocoa-taupe-lighter)',
        'cocoa-taupe-light': 'var(--cocoa-taupe-light)',
        'cocoa-taupe-soft': 'var(--cocoa-taupe-soft)',
        'cocoa-taupe-medium': 'var(--cocoa-taupe-medium)',
        'cocoa-taupe-deep': 'var(--cocoa-taupe-deep)',
        'cocoa-taupe-dark': 'var(--cocoa-taupe-dark)',
        'cocoa-taupe-darker': 'var(--cocoa-taupe-darker)',
        
        'deep-mocha': 'var(--deep-mocha)',
        'deep-mocha-lighter': 'var(--deep-mocha-lighter)',
        'deep-mocha-light': 'var(--deep-mocha-light)',
        'deep-mocha-medium': 'var(--deep-mocha-medium)',
        'deep-mocha-dark': 'var(--deep-mocha-dark)',
        'deep-mocha-darker': 'var(--deep-mocha-darker)',
        
        'warm-taupe': 'var(--warm-taupe)',
        'warm-taupe-lighter': 'var(--warm-taupe-lighter)',
        'warm-taupe-light': 'var(--warm-taupe-light)',
        'warm-taupe-medium': 'var(--warm-taupe-medium)',
        'warm-taupe-dark': 'var(--warm-taupe-dark)',
        'warm-taupe-darker': 'var(--warm-taupe-darker)',
        
        // Neutros
        'pure-white': 'var(--pure-white)',
        'clay-white': 'var(--clay-white)',
        'warm-white': 'var(--warm-white)',
        'soft-white': 'var(--soft-white)',
        'gentle-clay': 'var(--gentle-clay)',
        'whisper-clay': 'var(--whisper-clay)',
        'cloud-clay': 'var(--cloud-clay)',
        'calm-clay': 'var(--calm-clay)',
        'soft-clay': 'var(--soft-clay)',
      }
    } 
  },
  plugins: [],
};
