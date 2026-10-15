import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

# 8 Iso directions in counter-clockwise order from South
DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']

# Direction unit vector in 2:1 isometric space
DIR_VECTORS = {
    'south': (0.0, 1.0),
    'south-east': (0.85, 0.42),
    'east': (1.0, 0.0),
    'north-east': (0.85, -0.42),
    'north': (0.0, -1.0),
    'north-west': (-0.85, -0.42),
    'west': (-1.0, 0.0),
    'south-west': (-0.85, 0.42)
}

DIR_PALADIN_MAP = {
    'south': 'paladin_dir_0.png',
    'south-east': 'paladin_dir_1.png',
    'east': 'paladin_dir_6.png',
    'north-east': 'paladin_dir_5.png',
    'north': 'paladin_dir_4.png',
    'north-west': 'paladin_dir_3.png',
    'west': 'paladin_dir_2.png',
    'south-west': 'paladin_dir_7.png',
}

def generate_motion_frame(base_img, dir_name, anim_type, frame_idx, fx_color=(255, 215, 0)):
    w, h = base_img.size
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    vx, vy = DIR_VECTORS.get(dir_name, (0.0, 1.0))
    
    if anim_type == 'run':
        params = [
            {'dx': 0, 'dy': 0, 'sx': 1.0, 'sy': 1.0, 'rot': 0},
            {'dx': vx * 6, 'dy': 4 + vy * 2, 'sx': 1.04, 'sy': 0.96, 'rot': -vx * 3},
            {'dx': vx * 12, 'dy': -4 + vy * 4, 'sx': 0.98, 'sy': 1.03, 'rot': -vx * 4},
            {'dx': vx * 4, 'dy': -8 + vy * 2, 'sx': 1.01, 'sy': 1.04, 'rot': -vx * 1.5}
        ][frame_idx]
    elif anim_type == 'attack':
        params = [
            {'dx': -vx * 8, 'dy': 4, 'sx': 1.05, 'sy': 0.95, 'rot': vx * 4},
            {'dx': -vx * 2, 'dy': -8, 'sx': 0.95, 'sy': 1.05, 'rot': vx * 2},
            {'dx': vx * 18, 'dy': 3 + vy * 5, 'sx': 1.08, 'sy': 0.93, 'rot': -vx * 7},
            {'dx': vx * 6, 'dy': -2, 'sx': 1.0, 'sy': 1.0, 'rot': -vx * 2}
        ][frame_idx]
    else: # idle
        bob = np.sin(frame_idx * np.pi / 2) * 2.0
        params = {'dx': 0, 'dy': bob, 'sx': 1.0, 'sy': 1.0 + bob * 0.01, 'rot': 0}
        
    new_w = max(1, int(round(w * params['sx'])))
    new_h = max(1, int(round(h * params['sy'])))
    scaled = base_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    if abs(params['rot']) > 0.1:
        rotated = scaled.rotate(params['rot'], resample=Image.Resampling.BICUBIC, expand=True)
    else:
        rotated = scaled
        
    cx = (w - rotated.width) // 2 + int(round(params['dx']))
    cy = (h - rotated.height) // 2 + int(round(params['dy']))
    canvas.paste(rotated, (cx, cy), rotated)
    
    # Elemental Slash Arc VFX on Attack Frame 2
    if anim_type == 'attack' and frame_idx == 2:
        arc_canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(arc_canvas)
        slash_cx = w // 2 + int(vx * 40)
        slash_cy = h // 2 + int(vy * 22)
        r, g, b = fx_color
        
        # Outer luminous energy arc
        draw.arc([slash_cx - 42, slash_cy - 28, slash_cx + 42, slash_cy + 28], 
                 start=int(np.degrees(np.arctan2(vy, vx)) - 70),
                 end=int(np.degrees(np.arctan2(vy, vx)) + 70),
                 fill=(r, g, b, 160), width=8)
        # Inner white-hot slash core
        draw.arc([slash_cx - 40, slash_cy - 26, slash_cx + 40, slash_cy + 26],
                 start=int(np.degrees(np.arctan2(vy, vx)) - 60),
                 end=int(np.degrees(np.arctan2(vy, vx)) + 60),
                 fill=(255, 255, 255, 245), width=3)
        canvas = Image.alpha_composite(canvas, arc_canvas)
        
    return canvas

# Load Base Slices
paladin_base = {}
paladin_dir = 'C:/Users/usEr/AppData/Local/hermes/cache/scratch/paladin_slices'
for d, fn in DIR_PALADIN_MAP.items():
    paladin_base[d] = Image.open(os.path.join(paladin_dir, fn))

spellblade_base = {}
spellblade_dir = 'C:/Users/usEr/AppData/Local/hermes/cache/scratch/spellblade_slices'
for d in DIRECTIONS:
    spellblade_base[d] = Image.open(os.path.join(spellblade_dir, f"{d}.png"))

def build_class_from_base(base_dict, color_trans, overlays=None):
    out = {}
    for d in DIRECTIONS:
        img = base_dict[d]
        arr = np.array(img).astype(np.float32)
        res_arr = color_trans(arr, d)
        res_img = Image.fromarray(np.clip(res_arr, 0, 255).astype(np.uint8), 'RGBA')
        if overlays:
            draw = ImageDraw.Draw(res_img)
            overlays(draw, res_img.width, res_img.height, d)
        out[d] = res_img
    return out

# 1. Magician Transform (Flowing violet hair, sheer translucent violet silks, magenta crystal staff)
def magician_trans(arr, dir_name):
    out = arr.copy()
    r, g, b, a = out[:, :, 0], out[:, :, 1], out[:, :, 2], out[:, :, 3]
    solid = a > 20
    is_hair = solid & (r > 130) & (g > 110) & (b < 190) & (r - b < 50)
    is_blade = solid & (b > r + 30)
    is_armor = solid & (~is_hair) & (~is_blade) & (r > 100)
    
    out[is_hair, 0] = r[is_hair] * 0.65 + 60
    out[is_hair, 1] = g[is_hair] * 0.35 + 20
    out[is_hair, 2] = b[is_hair] * 0.95 + 110
    
    out[is_blade, 0] = 236
    out[is_blade, 1] = 72
    out[is_blade, 2] = 153
    
    out[is_armor, 0] = r[is_armor] * 0.5 + 40
    out[is_armor, 1] = g[is_armor] * 0.3 + 20
    out[is_armor, 2] = b[is_armor] * 0.8 + 90
    return out

def magician_overlays(draw, w, h, dir_name):
    if 'south' in dir_name or dir_name in ['east', 'west']:
        draw.arc([118, 32, 138, 48], start=200, end=340, fill=(251, 191, 36, 230), width=3)
        draw.ellipse([125, 28, 131, 34], fill=(236, 72, 153, 240))

# 2. Assassin Transform (Midnight black hair, obsidian leather micro-straps, venomous emerald daggers)
def assassin_trans(arr, dir_name):
    out = arr.copy()
    r, g, b, a = out[:, :, 0], out[:, :, 1], out[:, :, 2], out[:, :, 3]
    solid = a > 20
    is_hair = solid & (r > 120) & (g > 100) & (b < 190)
    is_blade = solid & (b > r + 30)
    is_armor = solid & (~is_hair) & (~is_blade) & (r > 80)
    
    out[is_hair, 0] = r[is_hair] * 0.15 + 15
    out[is_hair, 1] = g[is_hair] * 0.15 + 18
    out[is_hair, 2] = b[is_hair] * 0.22 + 30
    
    out[is_blade, 0] = 16
    out[is_blade, 1] = 185
    out[is_blade, 2] = 129
    
    out[is_armor, 0] = r[is_armor] * 0.18 + 20
    out[is_armor, 1] = g[is_armor] * 0.18 + 22
    out[is_armor, 2] = b[is_armor] * 0.25 + 32
    return out

def assassin_overlays(draw, w, h, dir_name):
    if 'south' in dir_name:
        draw.line([120, 52, 136, 52], fill=(16, 185, 129, 220), width=2)

# 3. Cleric Transform (Champagne blonde hair, radiant golden halo, holy white silk micro-vestments)
def cleric_trans(arr, dir_name):
    out = arr.copy()
    r, g, b, a = out[:, :, 0], out[:, :, 1], out[:, :, 2], out[:, :, 3]
    solid = a > 20
    is_hair = solid & (r > 120) & (g > 100) & (b < 190)
    is_blade = solid & (b > r + 30)
    is_armor = solid & (~is_hair) & (~is_blade) & (r > 90)
    
    out[is_hair, 0] = np.clip(r[is_hair] * 1.05 + 25, 0, 255)
    out[is_hair, 1] = np.clip(g[is_hair] * 1.02 + 20, 0, 255)
    out[is_hair, 2] = np.clip(b[is_hair] * 0.75 + 50, 0, 255)
    
    out[is_blade, 0] = 250
    out[is_blade, 1] = 204
    out[is_blade, 2] = 21
    
    out[is_armor, 0] = np.clip(r[is_armor] * 1.25 + 40, 0, 255)
    out[is_armor, 1] = np.clip(g[is_armor] * 1.25 + 40, 0, 255)
    out[is_armor, 2] = np.clip(b[is_armor] * 1.25 + 40, 0, 255)
    return out

def cleric_overlays(draw, w, h, dir_name):
    draw.ellipse([116, 18, 140, 28], outline=(253, 224, 71, 230), width=3)
    draw.ellipse([118, 20, 138, 26], outline=(250, 204, 21, 180), width=2)

# Save suite (8 Idle + 32 Run + 32 Attack)
def save_full_suite(target_dir, base_dir_dict, fx_color=(255, 215, 0)):
    os.makedirs(os.path.join(target_dir, 'Idle/rotations'), exist_ok=True)
    os.makedirs(os.path.join(target_dir, 'Run/rotations'), exist_ok=True)
    os.makedirs(os.path.join(target_dir, 'Attack/rotations'), exist_ok=True)
    
    for d in DIRECTIONS:
        img = base_dir_dict[d]
        img.save(os.path.join(target_dir, 'Idle/rotations', f"{d}.png"))
        
    for d in DIRECTIONS:
        base_img = base_dir_dict[d]
        for f in range(4):
            run_frame = generate_motion_frame(base_img, d, 'run', f, fx_color)
            run_frame.save(os.path.join(target_dir, 'Run/rotations', f"{d}_{f}.png"))
            
    for d in DIRECTIONS:
        base_img = base_dir_dict[d]
        for f in range(4):
            atk_frame = generate_motion_frame(base_img, d, 'attack', f, fx_color)
            atk_frame.save(os.path.join(target_dir, 'Attack/rotations', f"{d}_{f}.png"))

print("=== GENERATING 5 HEROINE CLASSES (HIGH-RES 256x256) ===")

save_full_suite('public/assets/A_female_warrior_knight', paladin_base, (251, 191, 36))
print("  ✓ Completed Warrior / Paladin (Valeria): 72 high-res frames")

save_full_suite('public/assets/A_female_magic_swordsman_with', spellblade_base, (56, 189, 248))
print("  ✓ Completed Spellblade (Jaxine): 72 high-res frames")

magician_base = build_class_from_base(spellblade_base, magician_trans, magician_overlays)
save_full_suite('public/assets/A_fair-skinned_sorceress_with_long', magician_base, (236, 72, 153))
print("  ✓ Completed Magician / Archmage (Lyra): 72 high-res frames")

assassin_base = build_class_from_base(paladin_base, assassin_trans, assassin_overlays)
save_full_suite('public/assets/A_fair-skinned_female_assassin_wearing', assassin_base, (16, 185, 129))
print("  ✓ Completed Thief / Assassin: 72 high-res frames")

cleric_base = build_class_from_base(paladin_base, cleric_trans, cleric_overlays)
save_full_suite('public/assets/A_young_priestess_with_blonde', cleric_base, (250, 204, 21))
print("  ✓ Completed Cleric / Saint: 72 high-res frames")

print("\n=== GENERATING 18 MONSTER ARCHETYPES (HIGH-RES 256x256) ===")

MONSTER_CONFIGS = {
    'slime_princess': {
        'base': spellblade_base,
        'fx': (34, 197, 94),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.2 + 20,
            arr[:, :, 1] * 0.85 + 100,
            arr[:, :, 2] * 0.85 + 90,
            arr[:, :, 3] * 0.85
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(120, 26), (128, 16), (136, 26)], fill=(250, 204, 21, 255)),
            draw.ellipse([126, 14, 130, 18], fill=(34, 197, 94, 255))
        )
    },
    'goblin_girl': {
        'base': paladin_base,
        'fx': (74, 222, 128),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.45 + 30,
            arr[:, :, 1] * 0.85 + 50,
            arr[:, :, 2] * 0.3 + 20,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(110, 42), (98, 38), (108, 48)], fill=(74, 222, 128, 255)),
            draw.polygon([(146, 42), (158, 38), (148, 48)], fill=(74, 222, 128, 255))
        )
    },
    'beast_maiden': {
        'base': paladin_base,
        'fx': (245, 158, 11),
        'trans': lambda arr, d: np.dstack([
            np.clip(arr[:, :, 0] * 1.1 + 35, 0, 255),
            arr[:, :, 1] * 0.85 + 20,
            arr[:, :, 2] * 0.5,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(112, 34), (116, 20), (124, 32)], fill=(245, 158, 11, 255)),
            draw.polygon([(132, 32), (140, 20), (144, 34)], fill=(245, 158, 11, 255)),
            draw.arc([88, 120, 112, 160], start=60, end=240, fill=(245, 158, 11, 255), width=6)
        )
    },
    'dark_knightress': {
        'base': paladin_base,
        'fx': (239, 68, 68),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.25 + 30,
            arr[:, :, 1] * 0.2 + 10,
            arr[:, :, 2] * 0.3 + 35,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.arc([106, 22, 122, 42], start=160, end=320, fill=(185, 28, 28, 255), width=4),
            draw.arc([134, 22, 150, 42], start=220, end=380, fill=(185, 28, 28, 255), width=4),
            draw.line([122, 54, 134, 54], fill=(239, 68, 68, 240), width=2)
        )
    },
    'dragon_princess_ignis': {
        'base': spellblade_base,
        'fx': (249, 115, 22),
        'trans': lambda arr, d: np.dstack([
            np.clip(arr[:, :, 0] * 1.25 + 60, 0, 255),
            arr[:, :, 1] * 0.5 + 15,
            arr[:, :, 2] * 0.3,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(114, 30), (104, 16), (122, 28)], fill=(239, 68, 68, 255)),
            draw.polygon([(134, 28), (152, 16), (142, 30)], fill=(239, 68, 68, 255)),
            draw.arc([80, 110, 110, 170], start=40, end=200, fill=(249, 115, 22, 255), width=7)
        )
    },
    'sakura_kitsune': {
        'base': spellblade_base,
        'fx': (244, 114, 182),
        'trans': lambda arr, d: np.dstack([
            np.clip(arr[:, :, 0] * 1.1 + 45, 0, 255),
            arr[:, :, 1] * 0.8 + 20,
            arr[:, :, 2] * 0.85 + 30,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(112, 32), (116, 18), (124, 30)], fill=(254, 205, 211, 255)),
            draw.polygon([(132, 30), (140, 18), (144, 32)], fill=(254, 205, 211, 255)),
            draw.ellipse([80, 115, 110, 165], fill=(253, 230, 138, 220)),
            draw.ellipse([146, 115, 176, 165], fill=(253, 230, 138, 220))
        )
    },
    'clockwork_maid': {
        'base': paladin_base,
        'fx': (217, 119, 6),
        'trans': lambda arr, d: np.dstack([
            np.clip(arr[:, :, 0] * 1.1 + 60, 0, 255),
            arr[:, :, 1] * 0.8 + 35,
            arr[:, :, 2] * 0.4,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.ellipse([116, 18, 140, 28], outline=(217, 119, 6, 240), width=3),
            draw.line([128, 14, 128, 32], fill=(217, 119, 6, 240), width=2)
        )
    },
    'vampire_countess': {
        'base': spellblade_base,
        'fx': (225, 29, 72),
        'trans': lambda arr, d: np.dstack([
            np.clip(arr[:, :, 0] * 1.15 + 50, 0, 255),
            arr[:, :, 1] * 0.35,
            arr[:, :, 2] * 0.5 + 20,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(104, 46), (92, 34), (108, 40)], fill=(159, 18, 57, 255)),
            draw.polygon([(152, 46), (164, 34), (148, 40)], fill=(159, 18, 57, 255))
        )
    },
    'siren_demoness': {
        'base': spellblade_base,
        'fx': (168, 85, 247),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.7 + 70,
            arr[:, :, 1] * 0.3 + 15,
            np.clip(arr[:, :, 2] * 1.05 + 80, 0, 255),
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.arc([108, 20, 124, 40], start=140, end=300, fill=(168, 85, 247, 255), width=4),
            draw.arc([132, 20, 148, 40], start=240, end=400, fill=(168, 85, 247, 255), width=4)
        )
    },
    'arachne_weaver': {
        'base': spellblade_base,
        'fx': (129, 140, 248),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.35 + 20,
            arr[:, :, 1] * 0.3 + 15,
            arr[:, :, 2] * 0.7 + 80,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.line([(96, 120), (74, 105), (60, 130)], fill=(99, 102, 241, 255), width=4),
            draw.line([(96, 135), (70, 140), (62, 165)], fill=(99, 102, 241, 255), width=4),
            draw.line([(160, 120), (182, 105), (196, 130)], fill=(99, 102, 241, 255), width=4),
            draw.line([(160, 135), (186, 140), (194, 165)], fill=(99, 102, 241, 255), width=4)
        )
    },
    'ghost_maiden': {
        'base': spellblade_base,
        'fx': (103, 232, 249),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.5 + 80,
            np.clip(arr[:, :, 1] * 0.9 + 110, 0, 255),
            np.clip(arr[:, :, 2] * 1.1 + 120, 0, 255),
            arr[:, :, 3] * 0.72
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.ellipse([98, 48, 106, 56], fill=(103, 232, 249, 210)),
            draw.ellipse([150, 48, 158, 56], fill=(103, 232, 249, 210))
        )
    },
    'skeletal_maid': {
        'base': paladin_base,
        'fx': (148, 163, 184),
        'trans': lambda arr, d: (
            lambda gray: np.dstack([
                np.where(gray > 130, np.clip(gray + 40, 0, 255), gray * 0.35),
                np.where(gray > 130, np.clip(gray + 40, 0, 255), gray * 0.35),
                np.where(gray > 130, np.clip(gray + 40, 0, 255), gray * 0.4),
                arr[:, :, 3]
            ])
        )(arr[:, :, 0] * 0.3 + arr[:, :, 1] * 0.59 + arr[:, :, 2] * 0.11),
        'overlay': lambda draw, w, h, d: (
            draw.ellipse([124, 28, 132, 36], fill=(241, 245, 249, 255)),
            draw.point([(126, 31), (130, 31)], fill=(15, 23, 42, 255))
        )
    },
    'yeti_maiden': {
        'base': paladin_base,
        'fx': (56, 189, 248),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.7 + 60,
            arr[:, :, 1] * 0.85 + 90,
            np.clip(arr[:, :, 2] * 1.1 + 100, 0, 255),
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(112, 30), (104, 18), (120, 26)], fill=(56, 189, 248, 255)),
            draw.polygon([(136, 26), (152, 18), (144, 30)], fill=(56, 189, 248, 255))
        )
    },
    'sphinx_queen': {
        'base': paladin_base,
        'fx': (234, 179, 8),
        'trans': lambda arr, d: np.dstack([
            np.clip(arr[:, :, 0] * 1.15 + 40, 0, 255),
            np.clip(arr[:, :, 1] * 1.05 + 25, 0, 255),
            arr[:, :, 2] * 0.5,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(112, 28), (128, 14), (144, 28)], fill=(234, 179, 8, 255)),
            draw.ellipse([126, 20, 130, 24], fill=(59, 130, 246, 255))
        )
    },
    'dragon_wyrm': {
        'base': spellblade_base,
        'fx': (16, 185, 129),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.35 + 20,
            np.clip(arr[:, :, 1] * 1.1 + 40, 0, 255),
            arr[:, :, 2] * 0.5 + 30,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.polygon([(112, 28), (102, 14), (122, 26)], fill=(16, 185, 129, 255)),
            draw.polygon([(134, 26), (154, 14), (144, 28)], fill=(16, 185, 129, 255))
        )
    },
    'dryad_nymph': {
        'base': spellblade_base,
        'fx': (132, 204, 22),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.65 + 30,
            np.clip(arr[:, :, 1] * 1.15 + 50, 0, 255),
            arr[:, :, 2] * 0.45 + 15,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.ellipse([116, 26, 122, 32], fill=(244, 114, 182, 255)),
            draw.ellipse([134, 26, 140, 32], fill=(244, 114, 182, 255))
        )
    },
    'bandit_pirate': {
        'base': paladin_base,
        'fx': (234, 88, 12),
        'trans': lambda arr, d: np.dstack([
            np.clip(arr[:, :, 0] * 1.1 + 35, 0, 255),
            arr[:, :, 1] * 0.75 + 15,
            arr[:, :, 2] * 0.4,
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.arc([114, 28, 142, 44], start=180, end=360, fill=(225, 29, 72, 255), width=5),
            draw.ellipse([130, 48, 136, 54], fill=(15, 23, 42, 255))
        )
    },
    'kraken_maiden': {
        'base': spellblade_base,
        'fx': (6, 182, 212),
        'trans': lambda arr, d: np.dstack([
            arr[:, :, 0] * 0.4 + 20,
            np.clip(arr[:, :, 1] * 0.85 + 60, 0, 255),
            np.clip(arr[:, :, 2] * 1.2 + 80, 0, 255),
            arr[:, :, 3]
        ]),
        'overlay': lambda draw, w, h, d: (
            draw.arc([85, 120, 115, 170], start=30, end=210, fill=(6, 182, 212, 255), width=6),
            draw.arc([141, 120, 171, 170], start=330, end=510, fill=(6, 182, 212, 255), width=6)
        )
    }
}

os.makedirs('public/assets/monsters', exist_ok=True)

for arch, cfg in MONSTER_CONFIGS.items():
    arch_base = build_class_from_base(cfg['base'], cfg['trans'], cfg['overlay'])
    target_dir = f"public/assets/monsters/{arch}"
    save_full_suite(target_dir, arch_base, cfg['fx'])
    arch_base['south'].save(f"public/assets/monsters/{arch}.png")
    print(f"  ✓ Completed Monster [{arch}]: 72 high-res frames + portrait")

print("\n=== ALL 5 HERO CLASSES AND 18 MONSTERS FULLY GENERATED (1,674 HIGH-RES FRAMES)! ===")
