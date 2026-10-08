from pathlib import Path
import json
import logging
import subprocess
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader

ROOT = Path('data/aie2040-review').resolve()
SOURCE = Path('D:/Win_Data/Desktop/AIE2040')
FILES = [
    ('introduction', '1 Introduction.pdf'),
    ('examples', '1_Why Statistics_Examples.pdf'),
    ('distributions', '2 Distributions.pdf'),
    ('ai', 'probability-statistics-ai-lecture [Repaired].pdf'),
]
ROOT.mkdir(parents=True, exist_ok=True)
logging.basicConfig(filename=ROOT / 'pdf-parser.log', level=logging.WARNING)
manifest = []
for key, filename in FILES:
    directory = ROOT / key
    directory.mkdir(exist_ok=True)
    source = SOURCE / filename
    reader = PdfReader(source)
    pages = [{'number': number, 'text': (page.extract_text() or '').strip(),
              'fileName': f'page-{number:03d}.webp'} for number, page in enumerate(reader.pages, 1)]
    material = {'key': key, 'sourceFile': filename, 'sourcePath': str(source),
                'pageCount': len(pages), 'pages': pages}
    (directory / 'materials.json').write_text(json.dumps(material, ensure_ascii=False, indent=2), encoding='utf-8')
    (directory / 'source.txt').write_text('\n\n'.join(f"### 第 {p['number']} 页\n{p['text']}" for p in pages), encoding='utf-8')
    manifest.append(material)
    print(f"EXTRACTED {key}: {len(pages)} pages, {sum(len(p['text']) for p in pages)} characters", flush=True)
(ROOT / 'sources.json').write_text(json.dumps([{k: v for k, v in m.items() if k != 'pages'} for m in manifest], ensure_ascii=False, indent=2), encoding='utf-8')

for material in manifest:
    directory = ROOT / material['key']
    prefix = directory / 'render'
    subprocess.run(['pdftoppm', '-jpeg', '-jpegopt', 'quality=95', '-scale-to', '1920',
                    material['sourcePath'], str(prefix)], check=True, stdout=subprocess.DEVNULL)
    rendered = sorted(directory.glob('render-*.jpg'))
    if len(rendered) != material['pageCount']:
        raise RuntimeError('Rendered page count differs from PDF')
    for page, source in zip(material['pages'], rendered):
        with Image.open(source) as image:
            image = image.convert('RGB')
            page['width'], page['height'] = image.size
            image.save(directory / page['fileName'], 'WEBP', quality=94, method=4)
        if ROOT not in source.resolve().parents:
            raise RuntimeError('Unsafe intermediate path')
        source.unlink()
    (directory / 'materials.json').write_text(json.dumps(material, ensure_ascii=False, indent=2), encoding='utf-8')
    for start in range(0, material['pageCount'], 16):
        canvas = Image.new('RGB', (2000, 1360), '#eeeeee')
        draw = ImageDraw.Draw(canvas)
        for index, page in enumerate(material['pages'][start:start + 16]):
            x, y = (index % 4) * 500, (index // 4) * 340
            with Image.open(directory / page['fileName']) as original:
                thumb = original.copy()
                thumb.thumbnail((488, 310))
                canvas.paste(thumb, (x + (500 - thumb.width) // 2, y + 25))
            draw.text((x + 12, y + 5), f"Page {page['number']}", fill='black')
        canvas.save(directory / f'contact-{start // 16}.jpg', quality=94)
    print(f"RENDERED {material['key']}: {material['pageCount']} complete page images", flush=True)
