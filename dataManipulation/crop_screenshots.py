import os
from PIL import Image

# -------------------------------
# CONFIG
# -------------------------------
INPUT_DIR = "input/map_screenshots/"
OUTPUT_DIR = "output/"
THUMB_SIZE = 256      # sluttstørrelse (px)
CROP_SCALE = 0.60     # hvor mye av bildet som beholdes (0.60 = 60%)

# Flytt senterpunktet:
CENTER_OFFSET_X = 0.05  # 25% til høyre
CENTER_OFFSET_Y = 0.05   # 25% ned


# -------------------------------
# Ensure output folder exists
# -------------------------------
os.makedirs(OUTPUT_DIR, exist_ok=True)


# -------------------------------
# Helper: crop shifted center
# -------------------------------
def crop_shifted_center(img, scale, shift_x, shift_y):
    w, h = img.size

    crop_w = int(w * scale)
    crop_h = int(h * scale)

    # originalt sentrum er (0.5, 0.5)
    cx = 0.5 + shift_x
    cy = 0.5 + shift_y

    # begrens senteret så crop ikke går utenfor bildet
    cx = min(max(cx, crop_w / (2 * w)), 1 - crop_w / (2 * w))
    cy = min(max(cy, crop_h / (2 * h)), 1 - crop_h / (2 * h))

    center_x = int(cx * w)
    center_y = int(cy * h)

    left   = center_x - crop_w // 2
    top    = center_y - crop_h // 2
    right  = left + crop_w
    bottom = top + crop_h

    return img.crop((left, top, right, bottom))


# -------------------------------
# Main loop
# -------------------------------
def main():
    files = [f for f in os.listdir(INPUT_DIR)
             if f.lower().endswith((".png", ".jpg", ".jpeg"))]

    if not files:
        print("❌ Fant ingen bilder i:", INPUT_DIR)
        return

    print(f"📸 Cropper {len(files)} screenshots...")

    for filename in files:
        input_path = os.path.join(INPUT_DIR, filename)
        output_path = os.path.join(OUTPUT_DIR, f"thumb_{filename}")

        try:
            img = Image.open(input_path)

            cropped = crop_shifted_center(
                img,
                CROP_SCALE,
                CENTER_OFFSET_X,
                CENTER_OFFSET_Y
            )

            thumb = cropped.resize((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
            thumb.save(output_path)

            print(f"✔ Laget thumbnail: {output_path}")

        except Exception as e:
            print(f"❌ Feil ved {filename}: {e}")

    print("\n🎉 Ferdig! Se output-mappen.")


if __name__ == "__main__":
    main()
