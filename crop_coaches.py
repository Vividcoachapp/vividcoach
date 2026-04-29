from PIL import Image
from pathlib import Path

project = Path("C:/Users/Chris/VividCoach")
source = project / "assets" / "coaches" / "portraits" / "full"
dest = project / "assets" / "coaches" / "portraits" / "portrait"

dest.mkdir(parents=True, exist_ok=True)

VERTICAL_START = 0.04
OUTPUT_SIZE = 1080

count = 0
for img_path in sorted(source.glob("*.png")):
    img = Image.open(img_path)
    width, height = img.size
    crop_size = width
    top = int(height * VERTICAL_START)
    if top + crop_size > height:
        top = height - crop_size
    cropped = img.crop((0, top, crop_size, top + crop_size))
    cropped = cropped.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    out_path = dest / img_path.name
    cropped.save(out_path, "PNG", optimize=True)
    count += 1
    print(f"  Cropped {img_path.name}")

print(f"\nDone — {count} images cropped to {dest}")