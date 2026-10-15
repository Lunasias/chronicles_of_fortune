import os
import sys
import argparse
import time
from PIL import Image
from gradio_client import Client

FORGE_URL = "http://127.0.0.1:7860/"
OUTPUT_DIR = r"C:\chronicles_of_fortune\public\assets\portraits"

def generate_pixel_asset(name, prompt_desc, lora_weight=1.35, snap_grid=True):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Connecting to WebUI Forge at {FORGE_URL}...")
    client = Client(FORGE_URL)
    ep = [e for e in client.endpoints.values() if e.api_name == '/txt2img'][0]

    args = []
    for p in ep.parameters_info:
        args.append(p.get("parameter_default"))

    # Positive prompt crafted for crisp pixel art
    positive = f"masterpiece, best quality, 1girl, solo, {prompt_desc}, full body, standing, clean outlines, 16-bit sprite, simple solid background <lora:pixel-art-xl-v1.1:{lora_weight}>"
    negative = "(worst quality, low quality:1.4), (character sheet:1.5), deformed, bad anatomy, bad hands, missing fingers, extra limbs, photo, realistic, smooth gradient, 3d render"

    args[0] = f"task({name})"
    args[1] = positive
    args[2] = negative
    args[4] = 1 # batch count
    args[5] = 1 # batch size
    args[6] = 7.0 # cfg
    args[8] = 1216 # height
    args[9] = 832 # width
    args[27] = 28 # steps
    args[28] = "DPM++ 2M" # sampler
    args[35] = -1 # seed

    print(f"Generating '{name}' with LoRA weight {lora_weight}...")
    t0 = time.time()
    result = client.predict(*args, api_name='/txt2img')
    print(f"Generated in {time.time() - t0:.1f}s!")

    # Get generated image path
    img_info = result[0]['value'][0]
    raw_img_path = img_info['image']

    raw_dest = os.path.join(OUTPUT_DIR, f"{name}_raw.png")
    pixel_dest = os.path.join(OUTPUT_DIR, f"{name}_pixel.png")

    # Load and save raw
    im = Image.open(raw_img_path)
    im.save(raw_dest)
    print(f"Saved raw generation: {raw_dest}")

    if snap_grid:
        # Snap to mathematical 100% crisp pixel grid (128x192 base canvas, 32 indexed colors)
        small = im.convert('RGB').resize((128, 192), Image.Resampling.NEAREST)
        quantized = small.convert('P', palette=Image.Palette.ADAPTIVE, colors=32).convert('RGB')
        crisp = quantized.resize((512, 768), Image.Resampling.NEAREST)
        crisp.save(pixel_dest)
        print(f"Saved 100% crisp true pixel grid: {pixel_dest}")
        return pixel_dest

    return raw_dest

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", default="spellblade", help="Asset identifier")
    parser.add_argument("--prompt", default="spellblade, magic swordsman, gorgeous anime girl, glowing cyan eyes, silver hair, voluptuous, micro-armor", help="Description")
    parser.add_argument("--weight", type=float, default=1.35, help="LoRA weight")
    parser.add_argument("--no-snap", action="store_true", help="Disable grid snapping")
    args = parser.parse_args()

    out = generate_pixel_asset(args.name, args.prompt, lora_weight=args.weight, snap_grid=not args.no_snap)
    print("FINISHED:", out)
