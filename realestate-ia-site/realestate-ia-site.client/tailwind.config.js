// tailwind.config.js (opcional no v4)
module.exports = {
  darkMode: ['class'], // para usares <html class="dark">
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
  theme: { 
    extend: {
      colors: {
        // Real Estate Premium - Tons principais
        'charcoal-deep': 'var(--charcoal-deep)',
        'charcoal-medium': 'var(--charcoal-medium)',
        'charcoal-light': 'var(--charcoal-light)',
        'charcoal-soft': 'var(--charcoal-soft)',
        
        'sand-cream': 'var(--sand-cream)',
        'sand-light': 'var(--sand-light)',
        'sand-warm': 'var(--sand-warm)',
        'sand-beige': 'var(--sand-beige)',
        'sand-tan': 'var(--sand-tan)',
        
        'gold-bright': 'var(--gold-bright)',
        'gold-rich': 'var(--gold-rich)',
        'gold-deep': 'var(--gold-deep)',
        'gold-dark': 'var(--gold-dark)',
        'gold-antique': 'var(--gold-antique)',
        
        'forest-light': 'var(--forest-light)',
        'forest-medium': 'var(--forest-medium)',
        'forest-deep': 'var(--forest-deep)',
        'forest-dark': 'var(--forest-dark)',
        'forest-darker': 'var(--forest-darker)',
        
        'terra-light': 'var(--terra-light)',
        'terra-medium': 'var(--terra-medium)',
        'terra-warm': 'var(--terra-warm)',
        'terra-deep': 'var(--terra-deep)',
        'terra-dark': 'var(--terra-dark)',
        
        'slate-blue': 'var(--slate-blue)',
        'slate-steel': 'var(--slate-steel)',
        'slate-deep': 'var(--slate-deep)',
        
        // Neutros Premium
        'pure-white': 'var(--pure-white)',
        'cream-white': 'var(--cream-white)',
        'warm-white': 'var(--warm-white)',
        'soft-cream': 'var(--soft-cream)',
        'gentle-sand': 'var(--gentle-sand)',
        'whisper-beige': 'var(--whisper-beige)',
        'cloud-gray': 'var(--cloud-gray)',
        'calm-gray': 'var(--calm-gray)',
        'soft-gray': 'var(--soft-gray)',
      }
    } 
  },
  plugins: [],
};
