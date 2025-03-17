import os
from PIL import Image

INPUT_FOLDER = "gallery/photos"
OUTPUT_FOLDER = "test_output"
# MAX_SIZE = (3000, 3000)  # optional resizing, adjust as needed

if not os.path.exists(OUTPUT_FOLDER):
    os.makedirs(OUTPUT_FOLDER)

for filename in os.listdir(INPUT_FOLDER):
    # Only process common image extensions
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff')):
        filepath = os.path.join(INPUT_FOLDER, filename)
        with Image.open(filepath) as img:
            # (Optional) Resize if your source is huge
            # img.thumbnail(MAX_SIZE)  
            
            # Convert to WebP
            # For photography: "quality=90" is near-lossless 
            # For line-art/PNG-like images: you could try lossless=True (Pillow 9.5+)
            webp_name = os.path.splitext(filename)[0] + ".webp"
            outpath = os.path.join(OUTPUT_FOLDER, webp_name)
            img.save(outpath, format="webp", quality=90, method=6)
            
            print(f"Saved {outpath}")
