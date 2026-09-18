const fs = require('fs');
const path = require('path');

// Source directory where the developer should place the GGUF model file
const srcDir = path.resolve(__dirname, '..', 'assets', 'models');
// Destination for Android assets
const androidDest = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'assets');
// Destination for iOS resources (inside Xcode project folder)
const iosDest = path.resolve(__dirname, '..', 'ios', 'ShopMate', 'Resources');

function copyModel() {
  if (!fs.existsSync(srcDir)) {
    console.error('Source model directory does not exist:', srcDir);
    process.exit(1);
  }
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.gguf'));
  if (files.length === 0) {
    console.error('No .gguf model files found in', srcDir);
    process.exit(1);
  }
  const preferredModel = process.env.MOBILE_LLM_MODEL;
  const modelFile = preferredModel && files.includes(preferredModel) ? preferredModel : files[0];
  const srcPath = path.join(srcDir, modelFile);

  // Ensure destination directories exist
  [androidDest, iosDest].forEach(dest => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const destPath = path.join(dest, modelFile);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${modelFile} to ${destPath}`);
  });
}

copyModel();
