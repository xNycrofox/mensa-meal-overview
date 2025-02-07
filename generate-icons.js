const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  // Erstelle icons Ordner falls nicht vorhanden
  const iconsDir = path.join(__dirname, 'icons');
  try {
    await fs.mkdir(iconsDir);
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  // Starte Browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // Setze Viewport auf größte benötigte Größe
  await page.setViewport({ width: 512, height: 512 });
  
  // Warte auf Font Awesome
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
      <style>
        .icon-wrapper {
          width: 512px;
          height: 512px;
          background: #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 25%;
        }
        .icon {
          color: white;
          font-size: 300px;
        }
      </style>
    </head>
    <body>
      <div class="icon-wrapper">
        <i class="fa-solid fa-utensils icon"></i>
      </div>
    </body>
    </html>
  `);
  
  // Warte auf das Icon
  await page.waitForSelector('.icon');
  
  // Mache Screenshot
  const screenshot = await page.screenshot({
    clip: { x: 0, y: 0, width: 512, height: 512 }
  });
  
  // Browser schließen
  await browser.close();

  // Generiere verschiedene Größen
  for (const size of sizes) {
    await sharp(screenshot)
      .resize(size, size)
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
  }

  console.log('Icons wurden erfolgreich generiert!');
}

generateIcons().catch(console.error); 