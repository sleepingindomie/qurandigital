# PWA Icons Generation Guide

Aplikasi ini membutuhkan icon untuk PWA (Progressive Web App) functionality.

## Required Icon Sizes

Buat icon dengan ukuran berikut dan simpan di folder `assets/icons/`:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Desain Icon

### Konsep Desain:
- **Warna Background**: Islamic Green (#1a7f5a)
- **Icon**: Simbol masjid (🕌) atau kaligrafi "قرآن"
- **Style**: Simple, minimalist, modern
- **Format**: PNG dengan background color

### Rekomendasi Tools:

#### 1. Online Icon Generators (Paling Mudah)
- **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
  - Upload single image (512x512)
  - Auto-generate all sizes

- **Favicon.io**: https://favicon.io/
  - Generate dari text, image, atau emoji

- **RealFaviconGenerator**: https://realfavicongenerator.net/
  - Comprehensive favicon & PWA icons

#### 2. Design Tools
- **Canva**: https://www.canva.com/
  - Template → App Icon
  - Resize untuk semua ukuran

- **Figma** (Free)
  - Create artboard 512x512
  - Design icon
  - Export as PNG untuk semua ukuran

#### 3. Photoshop/GIMP
- Create new document 512x512
- Design icon
- Save as PNG
- Resize untuk ukuran lain

## Quick Setup dengan Emoji

Untuk testing cepat, gunakan emoji sebagai icon:

1. Buka https://favicon.io/emoji-favicons/
2. Pilih emoji 🕌 (Masjid) atau 📖 (Buku)
3. Download generated icons
4. Extract ke folder `assets/icons/`
5. Rename sesuai format: icon-{size}.png

## Manual Creation dengan Code

Jika ingin generate programmatically, gunakan HTML Canvas:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator</title>
</head>
<body>
    <canvas id="canvas"></canvas>
    <button onclick="generateIcon(512)">Generate 512x512</button>
    <a id="download" style="display:none">Download</a>

    <script>
        function generateIcon(size) {
            const canvas = document.getElementById('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#1a7f5a';
            ctx.fillRect(0, 0, size, size);

            // Icon (emoji)
            ctx.font = `${size * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🕌', size / 2, size / 2);

            // Download
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.getElementById('download');
                a.href = url;
                a.download = `icon-${size}x${size}.png`;
                a.click();
            });
        }
    </script>
</body>
</html>
```

## Verifikasi Icons

Setelah generate icons, verify dengan:

1. Cek semua ukuran ada di `assets/icons/`
2. Open `manifest.json` - pastikan path sesuai
3. Test PWA installation di Chrome DevTools:
   - F12 → Application → Manifest
   - Check icons muncul

## Temporary Placeholder

Untuk sementara, aplikasi akan tetap berjalan tanpa icons, tetapi PWA installation mungkin tidak optimal.

Setelah icons ready, hapus file ini dan update `.gitignore` jika perlu.
