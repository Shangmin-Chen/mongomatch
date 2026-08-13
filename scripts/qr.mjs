import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.argv[2] || "https://mongomatch.vercel.app/form";
const outputPath = path.resolve(__dirname, "..", "qr.png");

async function generateQR() {
  console.log(`Generating high-res QR code for: ${url}`);
  await QRCode.toFile(outputPath, url, {
    width: 1024,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
  console.log(`QR code successfully saved to: ${outputPath}`);
}

generateQR().catch((err) => {
  console.error("Failed to generate QR code:", err);
  process.exit(1);
});
