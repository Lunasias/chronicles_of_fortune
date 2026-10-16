import time
import os
import shutil
from gradio_client import Client

client = Client("http://127.0.0.1:7860/")
ep = [e for e in client.endpoints.values() if e.api_name == '/txt2img'][0]

args = []
for p in ep.parameters_info:
    args.append(p.get("parameter_default"))

args[0] = "task(spellblade_lightning_art)"
# Positive Prompt strictly adhering to rules:
# No 'pixel art' in positive prompt! LoRA at end!
args[1] = "masterpiece, best quality, 1girl, solo, spellblade, magic swordsman, fair skin, porcelain skin, long loose white hair, flowing hair, blue eyes, electric glowing eyes, voluptuous curvy body, large breasts, narrow waist, micro bikini armor, dark fantasy armor, holding massive greatsword, huge glowing blue claymore, crackling lightning aura, electricity sparks surrounding body and blade, isometric view, top-down angle, dramatic lighting <lora:pixel-art-xl-v1.1:1.0>"

# Negative Prompt
args[2] = "(worst quality, low quality:1.4), (character sheet:1.5), deformed, bad anatomy, bad hands, missing fingers, extra limbs, photo, realistic"

# Batch
args[4] = 1
args[5] = 1
# CFG
args[6] = 7.0
# Resolution: 1024 x 1024
args[8] = 1024
args[9] = 1024
# Steps & Sampler
args[27] = 28
args[28] = "DPM++ 2M"
# Random seed
args[35] = -1

print("Sending generation request to local Forge WebUI...")
t0 = time.time()
result = client.predict(*args, api_name='/txt2img')
elapsed = time.time() - t0
print(f"Generated successfully in {elapsed:.1f}s!")

# Copy output to public/assets/portraits
out_dir = r"C:\chronicles_of_fortune\public\assets\portraits"
os.makedirs(out_dir, exist_ok=True)
dest_path = os.path.join(out_dir, "lightning_spellblade_portrait.png")

if isinstance(result, (list, tuple)) and len(result) > 0:
    first_item = result[0]
    if isinstance(first_item, dict) and 'image' in first_item:
        src = first_item['image']
    elif isinstance(first_item, str):
        src = first_item
    else:
        src = str(first_item)
    shutil.copy2(src, dest_path)
    print("Saved portrait to:", dest_path)
elif isinstance(result, str):
    shutil.copy2(result, dest_path)
    print("Saved portrait to:", dest_path)
