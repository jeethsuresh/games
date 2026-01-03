const fs = require('fs');
const path = require('path');

// Simple script to generate placeholder icons
// In production, you should replace these with proper icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '..', 'public', 'icons');

// Create a simple SVG template for each size
sizes.forEach(size => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000" rx="${size * 0.1}"/>
  <text x="${size/2}" y="${size/2 + size*0.1}" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">🧩</text>
</svg>`;
  
  const svgPath = path.join(publicDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  
  // Convert SVG to PNG using sips (macOS) or provide instructions
  const pngPath = path.join(publicDir, `icon-${size}x${size}.png`);
  console.log(`Generated icon-${size}x${size}.svg`);
  console.log(`To convert to PNG, run: sips -s format png "${svgPath}" --out "${pngPath}"`);
});

console.log('\nTo convert all SVGs to PNGs, run:');
console.log(`cd ${publicDir}`);
sizes.forEach(size => {
  console.log(`sips -s format png icon-${size}x${size}.svg --out icon-${size}x${size}.png`);
});

