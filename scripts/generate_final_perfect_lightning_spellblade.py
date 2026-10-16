import os
import math
import numpy as np
from PIL import Image, ImageDraw

ROT_DIR = r"C:\chronicles_of_fortune\reference\spellblade\Idle\rotations"
OUT_DIR = r"C:\chronicles_of_fortune\public\assets\lightning_spellblade_8dir"
os.makedirs(OUT_DIR, exist_ok=True)

ORDER = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']

# Directional weapon anchor offsets in 64x64 frame coordinates
# (hand_x, hand_y, sword_angle_deg, length, blade_w, z_order)
# z_order: 'front' (drawn over character) or 'back' (drawn behind character)
SWORD_ANCHORS = {
    'south':      {'hx': 23, 'hy': 35, 'angle': 105, 'len': 32, 'w': 9, 'z': 'front'},
    'south-east': {'hx': 30, 'hy': 36, 'angle': 115, 'len': 30, 'w': 8, 'z': 'front'},
    'east':       {'hx': 38, 'hy': 37, 'angle': 100, 'len': 28, 'w': 8, 'z': 'front'},
    'north-east': {'hx': 40, 'hy': 35, 'angle': 70,  'len': 29, 'w': 8, 'z': 'back'},
    'north':      {'hx': 38, 'hy': 34, 'angle': 65,  'len': 30, 'w': 9, 'z': 'back'},
    'north-west': {'hx': 24, 'hy': 35, 'angle': 110, 'len': 29, 'w': 8, 'z': 'back'},
    'west':       {'hx': 24, 'hy': 37, 'angle': 80,  'len': 28, 'w': 8, 'z': 'front'},
    'south-west': {'hx': 22, 'hy': 36, 'angle': 65,  'len': 30, 'w': 8, 'z': 'front'},
}

def draw_massive_lightning_greatsword(draw, hx, hy, angle_deg, length, width):
    rad = math.radians(angle_deg)
    dx = math.cos(rad)
    dy = math.sin(rad)
    nx = -dy
    ny = dx

    # Guard position
    gx = hx + dx * 5
    gy = hy + dy * 5

    # Tip position
    tx = hx + dx * length
    ty = hy + dy * length

    # 1. Dark Crossguard
    gw = width + 4
    draw.line([gx + nx * gw, gy + ny * gw, gx - nx * gw, gy - ny * gw], fill=(30, 41, 59, 255), width=3)
    draw.line([gx + nx * gw, gy + ny * gw, gx - nx * gw, gy - ny * gw], fill=(56, 189, 248, 255), width=1)
    # Gold Pommel
    draw.ellipse([hx - 2, hy - 2, hx + 2, hy + 2], fill=(245, 158, 11, 255))

    # 2. Massive Greatsword Blade (Electric Cyan Outer Edge)
    bw = width * 0.5
    b_base_l = (gx + nx * bw, gy + ny * bw)
    b_base_r = (gx - nx * bw, gy - ny * bw)
    b_tip_l = (tx - dx * 4 + nx * (bw * 0.7), ty - dy * 4 + ny * (bw * 0.7))
    b_tip_r = (tx - dx * 4 - nx * (bw * 0.7), ty - dy * 4 - ny * (bw * 0.7))
    b_point = (tx, ty)

    blade_poly = [b_base_l, b_tip_l, b_point, b_tip_r, b_base_r]
    # Deep electric blue base
    draw.polygon(blade_poly, fill=(2, 132, 199, 240), outline=(56, 189, 248, 255))

    # 3. Radiant Glowing Cyan Plasma Fuller
    pw = bw * 0.6
    draw.polygon([
        (gx + nx * pw, gy + ny * pw),
        (tx - dx * 6 + nx * (pw * 0.6), ty - dy * 6 + ny * (pw * 0.6)),
        (tx - dx * 3, ty - dy * 3),
        (tx - dx * 6 - nx * (pw * 0.6), ty - dy * 6 - ny * (pw * 0.6)),
        (gx - nx * pw, gy - ny * pw)
    ], fill=(56, 189, 248, 255))

    # 4. White-hot Plasma Core Spine
    draw.line([gx, gy, tx - dx * 3, ty - dy * 3], fill=(255, 255, 255, 255), width=2)

    # 5. Crackling Lightning Wrapping the Blade
    for li in range(3):
        t1 = (li) / 3.0
        t2 = (li + 1) / 3.0
        p1x = gx + dx * (length - 5) * t1
        p1y = gy + dy * (length - 5) * t1
        p2x = gx + dx * (length - 5) * t2
        p2y = gy + dy * (length - 5) * t2
        mid_x = (p1x + p2x) / 2 + nx * math.sin(li * 2.3) * (bw + 2)
        mid_y = (p1y + p2y) / 2 + ny * math.sin(li * 2.3) * (bw + 2)

        draw.line([p1x, p1y, mid_x, mid_y], fill=(255, 255, 255, 255), width=1)
        draw.line([mid_x, mid_y, p2x, p2y], fill=(56, 189, 248, 255), width=1)
        draw.point([mid_x + 1, mid_y - 1], fill=(255, 255, 255, 255))

def draw_body_lightning_aura(draw, frame_idx):
    np.random.seed(frame_idx * 17 + 99)
    # Draw 4-5 dynamic lightning sparks around the body
    cx, cy = 32, 34
    for i in range(5):
        angle = (i / 5.0) * math.pi * 2 + frame_idx * 0.4
        dist = 18 + np.random.uniform(-3, 6)
        x1 = cx + math.cos(angle) * dist
        y1 = cy + math.sin(angle) * dist

        # Branching bolt
        x2 = x1 + np.random.uniform(-5, 5)
        y2 = y1 + np.random.uniform(-6, 6)
        x3 = x2 + np.random.uniform(-4, 4)
        y3 = y2 + np.random.uniform(-5, 5)

        draw.line([x1, y1, x2, y2], fill=(56, 189, 248, 220), width=1)
        draw.line([x2, y2, x3, y3], fill=(255, 255, 255, 255), width=1)
        draw.point([x2, y2], fill=(255, 255, 255, 255))
        draw.point([x3, y3], fill=(186, 230, 253, 255))

processed_frames = []

for idx, dir_name in enumerate(ORDER):
    src_file = os.path.join(ROT_DIR, f"{dir_name}.png")
    char_img = Image.open(src_file).convert("RGBA")

    # Layer 1: Back sword (if behind character)
    back_layer = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    back_draw = ImageDraw.Draw(back_layer)

    # Layer 2: Front sword (if in front)
    front_layer = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    front_draw = ImageDraw.Draw(front_layer)

    # Layer 3: Lightning aura
    aura_layer = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    aura_draw = ImageDraw.Draw(aura_layer)

    cfg = SWORD_ANCHORS[dir_name]
    if cfg['z'] == 'back':
        draw_massive_lightning_greatsword(back_draw, cfg['hx'], cfg['hy'], cfg['angle'], cfg['len'], cfg['w'])
    else:
        draw_massive_lightning_greatsword(front_draw, cfg['hx'], cfg['hy'], cfg['angle'], cfg['len'], cfg['w'])

    draw_body_lightning_aura(aura_draw, idx)

    # Composite layers: Back Sword -> Character -> Front Sword -> Lightning Aura
    frame = Image.alpha_composite(back_layer, char_img)
    frame = Image.alpha_composite(frame, front_layer)
    frame = Image.alpha_composite(frame, aura_layer)

    # Save individual 64x64 frame
    frame.save(os.path.join(OUT_DIR, f"{dir_name}.png"))

    # Also make a crisp 4x integer scale 256x256 version
    frame_256 = frame.resize((256, 256), Image.Resampling.NEAREST)
    frame_256.save(os.path.join(OUT_DIR, f"{dir_name}_256.png"))

    processed_frames.append(frame_256)

# Save 8-direction horizontal turnaround strip (256x256 per frame = 2048x256)
strip_256 = Image.new("RGBA", (256 * 8, 256), (0, 0, 0, 0))
for i, f256 in enumerate(processed_frames):
    strip_256.paste(f256, (i * 256, 0))

strip_path = os.path.join(OUT_DIR, "lightning_spellblade_8dir_turnaround.png")
strip_256.save(strip_path)

# Save animated GIF
gif_path = os.path.join(OUT_DIR, "lightning_spellblade_8dir_turnaround.gif")
processed_frames[0].save(gif_path, save_all=True, append_images=processed_frames[1:], duration=150, loop=0)

print("Saved 8-direction turnaround strip to:", strip_path)
print("Saved animated turnaround GIF to:", gif_path)
