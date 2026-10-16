import os
import re
import math
import json
from PIL import Image, ImageDraw

DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
STATES = ['Idle', 'Run', 'Attack', 'Cast']

# Color presets
COLORS = {
    'white': (255, 255, 255, 255),
    'black': (30, 32, 40, 255),
    'silver': (235, 240, 250, 255),
    'gold': (245, 195, 45, 255),
    'cyan': (56, 189, 248, 255),
    'blue': (59, 130, 246, 255),
    'purple': (168, 85, 247, 255),
    'amethyst': (192, 132, 252, 255),
    'crimson': (225, 29, 72, 255),
    'red': (239, 68, 68, 255),
    'pink': (244, 114, 182, 255),
    'emerald': (52, 211, 153, 255),
    'green': (34, 197, 94, 255),
    'blonde': (250, 205, 50, 255),
    'raven': (35, 38, 48, 255),
    'auburn': (180, 83, 9, 255),
    'navy': (30, 41, 59, 255),
    'lavender': (216, 180, 254, 255),
}

SKIN_PALETTES = {
    'pale': ((255, 248, 248, 255), (225, 215, 225, 255)),
    'warm': ((255, 235, 225, 255), (230, 195, 185, 255)),
    'tan': ((235, 185, 145, 255), (195, 145, 105, 255)),
    'dark': ((140, 95, 75, 255), (105, 65, 50, 255)),
    'demon': ((210, 170, 210, 255), (160, 120, 165, 255)),
}

def parse_prompt_to_spec(prompt: str, name: str | None = None) -> dict:
    p = prompt.lower()
    
    # 1. Name
    if not name:
        words = re.findall(r'[a-zA-Z0-9]+', p)
        name = "_".join(words[:3]) if words else "custom_heroine"
    
    spec = {
        'name': name,
        'skin': 'warm',
        'hair_color': COLORS['silver'],
        'hair_style': 'twin_tails',
        'eye_color': COLORS['cyan'],
        'ears': 'none',
        'tail': 'none',
        'wings': 'none',
        'horns': 'none',
        'outfit_style': 'micro_bikini',
        'outfit_color': COLORS['black'],
        'outfit_trim': COLORS['gold'],
        'weapon_type': 'greatsword',
        'weapon_aura': 'cyan_lightning'
    }

    # Skin
    if any(k in p for k in ['pale', 'fair', 'white skin', 'porcelain', 'vampire', 'ghost']):
        spec['skin'] = 'pale'
    elif any(k in p for k in ['tan', 'gyaru', 'bronze', 'dark skin', 'sun-kissed', 'desert']):
        spec['skin'] = 'tan'
    elif any(k in p for k in ['succubus', 'demon', 'lilac skin', 'purple skin']):
        spec['skin'] = 'demon'

    # Ears / Beast traits
    if any(k in p for k in ['cat', 'neko', 'catgirl', 'feline']):
        spec['ears'] = 'cat'
        spec['tail'] = 'cat'
    elif any(k in p for k in ['fox', 'kitsune']):
        spec['ears'] = 'fox'
        spec['tail'] = 'kitsune_9'
    elif any(k in p for k in ['bunny', 'rabbit', 'usagi']):
        spec['ears'] = 'bunny'
        spec['tail'] = 'bunny'
    elif any(k in p for k in ['dragon', 'draconic']):
        spec['horns'] = 'dragon'
        spec['wings'] = 'dragon'
        spec['tail'] = 'dragon'
    elif any(k in p for k in ['demon', 'succubus', 'devil']):
        spec['horns'] = 'demon'
        spec['wings'] = 'bat'
        spec['tail'] = 'demon'
    elif any(k in p for k in ['valkyrie', 'angel', 'celestial']):
        spec['wings'] = 'valkyrie'

    # Hair Color
    if any(k in p for k in ['silver hair', 'white hair', 'platinum']):
        spec['hair_color'] = COLORS['silver']
    elif any(k in p for k in ['black hair', 'dark hair', 'raven']):
        spec['hair_color'] = COLORS['raven']
    elif any(k in p for k in ['blonde hair', 'gold hair', 'yellow hair']):
        spec['hair_color'] = COLORS['blonde']
    elif any(k in p for k in ['purple hair', 'violet hair', 'amethyst']):
        spec['hair_color'] = COLORS['purple']
    elif any(k in p for k in ['red hair', 'crimson hair', 'scarlet']):
        spec['hair_color'] = COLORS['crimson']
    elif any(k in p for k in ['pink hair', 'sakura']):
        spec['hair_color'] = COLORS['pink']
    elif any(k in p for k in ['blue hair', 'cyan hair']):
        spec['hair_color'] = COLORS['cyan']
    elif any(k in p for k in ['green hair', 'emerald']):
        spec['hair_color'] = COLORS['emerald']

    # Hair Style
    if any(k in p for k in ['twin tails', 'twintails', 'pigtails']):
        spec['hair_style'] = 'twin_tails'
    elif any(k in p for k in ['short hair', 'bob cut']):
        spec['hair_style'] = 'bob'
    elif any(k in p for k in ['ponytail']):
        spec['hair_style'] = 'ponytail'
    else:
        spec['hair_style'] = 'flowing'

    # Eye Color
    if any(k in p for k in ['cyan eye', 'blue eye']):
        spec['eye_color'] = COLORS['cyan']
    elif any(k in p for k in ['amber eye', 'gold eye', 'yellow eye']):
        spec['eye_color'] = COLORS['gold']
    elif any(k in p for k in ['red eye', 'crimson eye', 'ruby eye']):
        spec['eye_color'] = COLORS['crimson']
    elif any(k in p for k in ['purple eye', 'violet eye']):
        spec['eye_color'] = COLORS['amethyst']
    elif any(k in p for k in ['green eye', 'emerald eye']):
        spec['eye_color'] = COLORS['emerald']

    # Outfit
    if any(k in p for k in ['armor', 'plate', 'knight', 'paladin', 'plate-kini']):
        spec['outfit_style'] = 'plate_kini'
        spec['outfit_color'] = COLORS['gold']
        spec['outfit_trim'] = COLORS['white']
    elif any(k in p for k in ['harness', 'assassin', 'ninja', 'strappy', 'leather']):
        spec['outfit_style'] = 'strappy_harness'
        spec['outfit_color'] = COLORS['black']
        spec['outfit_trim'] = COLORS['emerald']
    elif any(k in p for k in ['sorceress', 'mage', 'witch', 'silk', 'halter']):
        spec['outfit_style'] = 'sheer_halter'
        spec['outfit_color'] = COLORS['purple']
        spec['outfit_trim'] = COLORS['amethyst']
    elif any(k in p for k in ['corset', 'gothic', 'maid', 'steampunk']):
        spec['outfit_style'] = 'gothic_corset'
        spec['outfit_color'] = COLORS['black']
        spec['outfit_trim'] = COLORS['gold']
    else:
        spec['outfit_style'] = 'micro_bikini'
        spec['outfit_color'] = COLORS['white']
        spec['outfit_trim'] = COLORS['cyan']

    # Custom outfit color overrides
    if 'black bikini' in p or 'black outfit' in p or 'black micro' in p:
        spec['outfit_color'] = COLORS['black']
    elif 'white bikini' in p or 'white outfit' in p or 'white micro' in p:
        spec['outfit_color'] = COLORS['white']
    elif 'red bikini' in p or 'crimson outfit' in p:
        spec['outfit_color'] = COLORS['crimson']
    elif 'purple bikini' in p or 'violet outfit' in p:
        spec['outfit_color'] = COLORS['purple']

    # Weapon
    if any(k in p for k in ['dagger', 'assassin', 'dual blade', 'knives']):
        spec['weapon_type'] = 'dual_daggers'
        spec['weapon_aura'] = 'emerald_poison'
    elif any(k in p for k in ['staff', 'scepter', 'wand', 'orb', 'mage', 'priestess']):
        spec['weapon_type'] = 'magic_staff'
        spec['weapon_aura'] = 'violet_arcane'
    elif any(k in p for k in ['bow', 'archer']):
        spec['weapon_type'] = 'bow'
        spec['weapon_aura'] = 'golden_holy'
    elif any(k in p for k in ['gun', 'rifle', 'pistol']):
        spec['weapon_type'] = 'steam_gun'
        spec['weapon_aura'] = 'crimson_fire'
    elif any(k in p for k in ['lightning', 'spellblade', 'rune blade']):
        spec['weapon_type'] = 'greatsword'
        spec['weapon_aura'] = 'cyan_lightning'
    else:
        spec['weapon_type'] = 'greatsword'
        spec['weapon_aura'] = 'cyan_lightning'

    return spec

def render_8dir_frame(spec: dict, dir_name: str, anim_state: str, frame_idx: int, w=256, h=256):
    W, H = w * 2, h * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = W // 2
    cy = H // 2 + 50

    is_back = "north" in dir_name
    is_side = "east" in dir_name or "west" in dir_name
    is_west = "west" in dir_name
    vec_x = -1 if is_west else (1 if "east" in dir_name else 0)

    # Frame dynamics
    bob = math.sin((frame_idx / 4) * math.pi * 2) * 6
    stride_l, stride_r = 0, 0
    arm_l, arm_r = 0, 0
    weapon_arc = 0
    lean_x = 0

    if anim_state == "Run":
        strides = [-26, 0, 26, 0]
        stride_l = strides[frame_idx % 4]
        stride_r = -strides[frame_idx % 4]
        arm_l = -stride_l * 0.75
        arm_r = -stride_r * 0.75
        bob = -abs(strides[frame_idx % 4]) * 0.35
        lean_x = vec_x * 8
    elif anim_state == "Attack":
        if frame_idx == 0:
            weapon_arc, arm_r, lean_x = -45, -35, -vec_x * 12
        elif frame_idx == 1:
            weapon_arc, arm_r, lean_x, bob = 20, 45, vec_x * 24, 8
        elif frame_idx == 2:
            weapon_arc, arm_r, lean_x, bob = 60, 60, vec_x * 32, 12
        else:
            weapon_arc, arm_r, lean_x = 15, 20, vec_x * 8
    elif anim_state == "Cast":
        bob = math.sin(frame_idx * math.pi) * 8 - 6
        arm_l = -35 - frame_idx * 6
        arm_r = -35 - frame_idx * 6

    cx += lean_x
    cy += bob

    # 1. Ground Shadow
    draw.ellipse([cx - 120, cy + 120 - 45, cx + 120, cy + 120 + 45], fill=(12, 16, 28, 110))

    skin_tone, skin_shadow = SKIN_PALETTES.get(spec['skin'], SKIN_PALETTES['warm'])

    # 2. Behind-body items: Wings & Tails
    if spec['wings'] == 'valkyrie':
        wing_pulse = math.sin(frame_idx * 0.8) * 6
        w_fill = (180, 240, 255, 175)
        w_out = (120, 215, 255, 230)
        draw.polygon([(cx - 20, cy - 30), (cx - 95, cy - 110 + wing_pulse), (cx - 130, cy - 60 + wing_pulse), (cx - 40, cy + 10)], fill=w_fill, outline=w_out, width=3)
        draw.polygon([(cx + 20, cy - 30), (cx + 95, cy - 110 + wing_pulse), (cx + 130, cy - 60 + wing_pulse), (cx + 40, cy + 10)], fill=w_fill, outline=w_out, width=3)
    elif spec['wings'] == 'dragon':
        draw.polygon([(cx - 25, cy - 25), (cx - 105, cy - 105), (cx - 135, cy - 35), (cx - 35, cy + 20)], fill=(180, 30, 40, 230), outline=(235, 80, 50, 255), width=3)
        draw.polygon([(cx + 25, cy - 25), (cx + 105, cy - 105), (cx + 135, cy - 35), (cx + 35, cy + 20)], fill=(180, 30, 40, 230), outline=(235, 80, 50, 255), width=3)
    
    if spec['tail'] == 'kitsune_9':
        tail_pulse = math.sin(frame_idx * 0.7) * 8
        for t in range(5):
            tang = -0.8 + (t * 0.4)
            tx = cx + math.sin(tang) * 85 + tail_pulse * 0.5
            ty = cy + 30 - math.cos(tang) * 70
            draw.ellipse([tx - 28, ty - 50, tx + 28, ty + 50], fill=(255, 250, 245, 255), outline=(245, 160, 180, 255), width=3)
    elif spec['tail'] == 'cat':
        # Curled animated cat tail
        tail_wave = math.sin(frame_idx * 1.5) * 8
        tx_dir = 1 if not is_west else -1
        draw.arc([cx - 10 + tx_dir * 30, cy - 20, cx + 70 + tx_dir * 30, cy + 70 + tail_wave], start=45, end=260, fill=spec['hair_color'], width=10)
    elif spec['tail'] == 'dragon':
        draw.arc([cx - 90, cy + 40, cx + 50, cy + 130], start=45, end=240, fill=(190, 35, 45, 255), width=12)

    # 3. Voluptuous Body (Legs, Hips, Waist, Cleavage)
    leg_l_x = cx - 22 + stride_l
    leg_r_x = cx + 22 + stride_r
    thigh_top = cy + 28
    thigh_bot = cy + 95
    foot_bot = cy + 140

    # Legs & Thighs
    draw.polygon([(leg_l_x - 14, thigh_top), (leg_l_x + 14, thigh_top), (leg_l_x + 11, thigh_bot), (leg_l_x + 8, foot_bot), (leg_l_x - 8, foot_bot), (leg_l_x - 11, thigh_bot)], fill=skin_tone, outline=skin_shadow)
    draw.polygon([(leg_r_x - 14, thigh_top), (leg_r_x + 14, thigh_top), (leg_r_x + 11, thigh_bot), (leg_r_x + 8, foot_bot), (leg_r_x - 8, foot_bot), (leg_r_x - 11, thigh_bot)], fill=skin_tone, outline=skin_shadow)

    # Curvaceous Hips
    hip_w = 46
    draw.ellipse([cx - hip_w, cy + 10, cx + hip_w, cy + 48], fill=skin_tone, outline=skin_shadow)

    # Narrow Hourglass Waist
    draw.polygon([(cx - 25, cy - 14), (cx + 25, cy - 14), (cx + 38, cy + 22), (cx - 38, cy + 22)], fill=skin_tone)
    if not is_back:
        draw.ellipse([cx - 2, cy + 12, cx + 2, cy + 18], fill=skin_shadow)

    # Voluptuous Bust (Cleavage)
    bust_y = cy - 35
    if not is_back:
        bw, bh = 34, 36
        draw.ellipse([cx - bw - 2, bust_y - 10, cx + 2, bust_y + bh], fill=skin_tone, outline=skin_shadow)
        draw.ellipse([cx - 2, bust_y - 10, cx + bw + 2, bust_y + bh], fill=skin_tone, outline=skin_shadow)
        draw.line([cx, bust_y - 4, cx, bust_y + bh - 8], fill=skin_shadow, width=2)
    else:
        draw.polygon([(cx - 34, bust_y - 12), (cx + 34, bust_y - 12), (cx + 26, cy - 12), (cx - 26, cy - 12)], fill=skin_tone, outline=skin_shadow)

    # 4. Outfits
    o_col = spec['outfit_color']
    o_trim = spec['outfit_trim']

    if spec['outfit_style'] == 'plate_kini':
        if not is_back:
            draw.arc([cx - 34, bust_y - 6, cx - 2, bust_y + 32], start=0, end=180, fill=o_col, width=8)
            draw.arc([cx + 2, bust_y - 6, cx + 34, bust_y + 32], start=0, end=180, fill=o_col, width=8)
        draw.polygon([(cx - 24, cy + 16), (cx + 24, cy + 16), (cx, cy + 44)], fill=o_col, outline=o_trim, width=2)
        draw.rectangle([leg_l_x - 12, foot_bot - 45, leg_l_x + 12, foot_bot], fill=o_col, outline=o_trim, width=2)
        draw.rectangle([leg_r_x - 12, foot_bot - 45, leg_r_x + 12, foot_bot], fill=o_col, outline=o_trim, width=2)

    elif spec['outfit_style'] == 'strappy_harness':
        if not is_back:
            draw.line([cx - 36, bust_y + 12, cx + 36, bust_y + 12], fill=o_col, width=8)
            draw.line([cx - 25, bust_y - 15, cx, bust_y + 12], fill=o_col, width=4)
            draw.line([cx + 25, bust_y - 15, cx, bust_y + 12], fill=o_col, width=4)
        draw.polygon([(cx - 28, cy + 16), (cx + 28, cy + 16), (cx, cy + 42)], fill=o_col, outline=o_trim, width=2)
        # Thigh straps
        draw.rectangle([leg_l_x - 14, thigh_bot - 20, leg_l_x + 14, thigh_bot - 10], fill=o_col)
        draw.rectangle([leg_r_x - 14, thigh_bot - 20, leg_r_x + 14, thigh_bot - 10], fill=o_col)

    elif spec['outfit_style'] == 'sheer_halter':
        if not is_back:
            draw.polygon([(cx - 32, bust_y + 2), (cx, bust_y - 24), (cx + 32, bust_y + 2), (cx, bust_y + 22)], fill=o_col, outline=o_trim, width=2)
        draw.polygon([(cx - 38, cy + 18), (cx + 38, cy + 18), (cx + 46, cy + 42), (cx - 46, cy + 42)], fill=o_col, outline=o_trim, width=2)

    elif spec['outfit_style'] == 'gothic_corset':
        draw.polygon([(cx - 36, bust_y - 10), (cx + 36, bust_y - 10), (cx + 28, cy + 20), (cx - 28, cy + 20)], fill=o_col, outline=o_trim, width=3)
        draw.polygon([(cx - 45, cy + 24), (cx + 45, cy + 24), (cx + 52, cy + 46), (cx - 52, cy + 46)], fill=(35, 40, 50, 255), outline=o_trim, width=2)

    else: # micro_bikini default
        if not is_back:
            draw.polygon([(cx - 32, bust_y + 4), (cx - 18, bust_y - 22), (cx - 4, bust_y + 12)], fill=o_col, outline=o_trim, width=2)
            draw.polygon([(cx + 32, bust_y + 4), (cx + 18, bust_y - 22), (cx + 4, bust_y + 12)], fill=o_col, outline=o_trim, width=2)
            draw.line([cx - 18, bust_y - 22, cx, bust_y - 34], fill=o_col, width=2)
            draw.line([cx + 18, bust_y - 22, cx, bust_y - 34], fill=o_col, width=2)
        else:
            draw.line([cx - 30, cy - 14, cx + 30, cy - 14], fill=o_col, width=2)
        draw.polygon([(cx - 20, cy + 16), (cx + 20, cy + 16), (cx, cy + 42)], fill=o_col, outline=o_trim, width=2)
        draw.line([cx - 38, cy + 18, cx - 20, cy + 18], fill=o_col, width=2)
        draw.line([cx + 38, cy + 18, cx + 20, cy + 18], fill=o_col, width=2)
        # Garters & stockings
        draw.line([cx - 16, cy + 26, leg_l_x - 6, thigh_bot - 14], fill=o_col, width=2)
        draw.line([cx + 16, cy + 26, leg_r_x + 6, thigh_bot - 14], fill=o_col, width=2)
        draw.rectangle([leg_l_x - 14, thigh_bot - 16, leg_l_x + 14, foot_bot], fill=(252, 253, 255, 240), outline=o_trim, width=2)
        draw.rectangle([leg_r_x - 14, thigh_bot - 16, leg_r_x + 14, foot_bot], fill=(252, 253, 255, 240), outline=o_trim, width=2)

    # 5. Head & Anime Face
    hx, hy = cx, cy - 90
    draw.ellipse([hx - 34, hy - 36, hx + 34, hy + 36], fill=skin_tone)

    if not is_back:
        eye_y = hy - 4
        eye_c = spec['eye_color']
        # Left eye
        draw.ellipse([hx - 24, eye_y - 8, hx - 8, eye_y + 12], fill=eye_c)
        draw.ellipse([hx - 20, eye_y - 6, hx - 12, eye_y + 4], fill=(255, 255, 255, 255))
        # Right eye
        draw.ellipse([hx + 8, eye_y - 8, hx + 24, eye_y + 12], fill=eye_c)
        draw.ellipse([hx + 12, eye_y - 6, hx + 20, eye_y + 4], fill=(255, 255, 255, 255))
        # Eyelashes
        draw.arc([hx - 26, eye_y - 12, hx - 6, eye_y], start=180, end=360, fill=(35, 20, 25, 255), width=3)
        draw.arc([hx + 6, eye_y - 12, hx + 26, eye_y], start=180, end=360, fill=(35, 20, 25, 255), width=3)
        # Blush & Mouth
        draw.ellipse([hx - 28, eye_y + 10, hx - 12, eye_y + 18], fill=(255, 160, 175, 140))
        draw.ellipse([hx + 12, eye_y + 10, hx + 28, eye_y + 18], fill=(255, 160, 175, 140))
        draw.arc([hx - 6, hy + 14, hx + 6, hy + 22], start=0, end=180, fill=(225, 100, 120, 255), width=2)

    # 6. Hair
    h_col = spec['hair_color']
    sway = math.sin((frame_idx / 4) * math.pi * 2) * 8
    draw.polygon([(hx - 36, hy - 25), (hx - 18, hy + 4), (hx, hy + 8), (hx + 18, hy + 4), (hx + 36, hy - 25), (hx, hy - 46)], fill=h_col)

    if spec['hair_style'] == 'twin_tails':
        # Flowing High Twin Tails
        draw.polygon([(hx - 32, hy - 20), (hx - 70 + sway * 1.5, hy + 40), (hx - 55 + sway * 1.5, hy + 150), (hx - 24, hy + 10)], fill=h_col, outline=spec['outfit_trim'], width=2)
        draw.polygon([(hx + 32, hy - 20), (hx + 70 - sway * 1.5, hy + 40), (hx + 55 - sway * 1.5, hy + 150), (hx + 24, hy + 10)], fill=h_col, outline=spec['outfit_trim'], width=2)
    elif spec['hair_style'] == 'bob':
        draw.polygon([(hx - 36, hy - 10), (hx - 48 + sway * 0.5, hy + 45), (hx + 48 - sway * 0.5, hy + 45), (hx + 36, hy - 10)], fill=h_col)
    else: # flowing long
        draw.polygon([(hx - 34, hy - 10), (hx - 60 + sway, hy + 50), (hx - 50 + sway, hy + 160), (hx - 24, hy + 20)], fill=h_col)
        draw.polygon([(hx + 34, hy - 10), (hx + 60 - sway, hy + 50), (hx + 50 - sway, hy + 160), (hx + 24, hy + 20)], fill=h_col)

    # 7. Animal Ears & Horns
    if spec['ears'] in ('cat', 'fox'):
        ear_h = 35 if spec['ears'] == 'cat' else 45
        draw.polygon([(hx - 32, hy - 25), (hx - 38, hy - 25 - ear_h), (hx - 14, hy - 32)], fill=h_col)
        draw.polygon([(hx - 30, hy - 25), (hx - 34, hy - 20 - ear_h), (hx - 18, hy - 28)], fill=(255, 215, 225, 255))
        draw.polygon([(hx + 32, hy - 25), (hx + 38, hy - 25 - ear_h), (hx + 14, hy - 32)], fill=h_col)
        draw.polygon([(hx + 30, hy - 25), (hx + 34, hy - 20 - ear_h), (hx + 18, hy - 28)], fill=(255, 215, 225, 255))
    elif spec['horns'] in ('dragon', 'demon'):
        draw.polygon([(hx - 26, hy - 30), (hx - 55, hy - 75), (hx - 20, hy - 42)], fill=(40, 20, 25, 255), outline=(225, 40, 50, 255), width=2)
        draw.polygon([(hx + 26, hy - 30), (hx + 55, hy - 75), (hx + 20, hy - 42)], fill=(40, 20, 25, 255), outline=(225, 40, 50, 255), width=2)

    # 8. Weapons & FX
    wx = cx + 55 + (arm_r * 0.8)
    wy = cy - 10 + arm_r

    if spec['weapon_type'] == 'dual_daggers':
        draw.polygon([(wx - 5, wy), (wx + 15, wy - 45), (wx - 10, wy - 40)], fill=spec['outfit_trim'], outline=(255, 255, 255, 255), width=2)
        draw.polygon([(cx - 45, cy), (cx - 65, cy - 45), (cx - 40, cy - 40)], fill=spec['outfit_trim'], outline=(255, 255, 255, 255), width=2)
        if anim_state == "Attack" and frame_idx in (1, 2):
            draw.arc([cx - 40, cy - 60, cx + 80, cy + 40], start=220, end=380, fill=spec['outfit_trim'], width=8)

    elif spec['weapon_type'] == 'magic_staff':
        draw.line([wx, wy - 95, wx, wy + 55], fill=(130, 85, 45, 255), width=8)
        draw.ellipse([wx - 22, wy - 115, wx + 22, wy - 75], fill=spec['outfit_trim'], outline=(255, 255, 255, 255), width=3)
        if anim_state == "Cast" and frame_idx in (1, 2):
            draw.ellipse([cx - 100, cy + 80, cx + 100, cy + 140], outline=spec['outfit_trim'], width=4)

    else: # Greatsword
        sword_angle = math.radians(weapon_arc - 25)
        sw_len = 135
        sw_w = 26
        tip_x = wx + math.sin(sword_angle) * sw_len * (vec_x if vec_x != 0 else 1)
        tip_y = wy - math.cos(sword_angle) * sw_len

        draw.rectangle([wx - 20, wy + 15, wx + 20, wy + 26], fill=(217, 119, 6, 255), outline=(251, 191, 36, 255), width=2)
        blade_poly = [
            (wx - sw_w // 2, wy + 15),
            (wx + sw_w // 2, wy + 15),
            (tip_x + sw_w // 2, tip_y + 20),
            (tip_x, tip_y),
            (tip_x - sw_w // 2, tip_y + 20)
        ]
        draw.polygon(blade_poly, fill=(40, 48, 68, 255), outline=spec['outfit_trim'], width=5)
        draw.line([(wx, wy + 15), (tip_x, tip_y)], fill=(255, 255, 255, 255), width=2)
        if anim_state == "Attack" and frame_idx in (1, 2):
            draw.arc([cx - 70, cy - 130, cx + 180, cy + 90], start=270, end=430, fill=spec['outfit_trim'], width=16)

    # 9. Pixel quantization downsample & nearest upsample (True 100% crisp pixel art)
    small = img.resize((w // 2, h // 2), Image.Resampling.NEAREST)
    return small.resize((w, h), Image.Resampling.NEAREST)

def build_character_package(prompt: str, custom_name: str | None = None, export_game: bool = True):
    spec = parse_prompt_to_spec(prompt, custom_name)
    name = spec['name']
    
    # Target directories
    package_dir = os.path.join(r"C:\chronicles_of_fortune\public\assets\pixellab_studio", name)
    os.makedirs(package_dir, exist_ok=True)
    
    print(f"Generating 8-direction sprite suite for: {name}...")
    print(f"Spec: Hair={spec['hair_style']}, Ears={spec['ears']}, Outfit={spec['outfit_style']}, Weapon={spec['weapon_type']}")

    all_frames = {}
    turnaround_frames = []

    # 1. Generate all states and directions
    for state in STATES:
        all_frames[state] = {}
        state_dir = os.path.join(package_dir, state)
        os.makedirs(state_dir, exist_ok=True)
        
        for d in DIRECTIONS:
            d_frames = []
            for f in range(4):
                f_img = render_8dir_frame(spec, d, state, f)
                f_path = os.path.join(state_dir, f"{d}_{f}.png")
                f_img.save(f_path)
                d_frames.append(f_img)
            
            # Save base direction image
            d_frames[0].save(os.path.join(state_dir, f"{d}.png"))
            all_frames[state][d] = d_frames
            
            # Save animated state GIF for this direction
            gif_path = os.path.join(state_dir, f"{d}_anim.gif")
            d_frames[0].save(gif_path, save_all=True, append_images=d_frames[1:], duration=150, loop=0)

    # 2. Build 360-degree Turnaround GIF (South -> South-East -> East -> ... -> South-West)
    for d in DIRECTIONS:
        turnaround_frames.append(all_frames['Idle'][d][0])
    
    turnaround_path = os.path.join(package_dir, "turnaround_360.gif")
    turnaround_frames[0].save(turnaround_path, save_all=True, append_images=turnaround_frames[1:], duration=180, loop=0)
    print(f"Saved 360 Turnaround GIF: {turnaround_path}")

    # 3. Build Run Cycle GIF (South view)
    run_gif_path = os.path.join(package_dir, "run_cycle_south.gif")
    all_frames['Run']['south'][0].save(run_gif_path, save_all=True, append_images=all_frames['Run']['south'][1:], duration=140, loop=0)
    print(f"Saved Run Cycle GIF: {run_gif_path}")

    # 4. Build Sprite Sheet Grid (16 columns x 8 rows)
    frame_w, frame_h = 256, 256
    sheet = Image.new("RGBA", (frame_w * 8, frame_h * 4), (0, 0, 0, 0))
    for r, state in enumerate(STATES):
        for c, d in enumerate(DIRECTIONS):
            # Take frame 0 of each
            sheet.paste(all_frames[state][d][0], (c * frame_w, r * frame_h))
    
    sheet_path = os.path.join(package_dir, "spritesheet_8dir.png")
    sheet.save(sheet_path)
    print(f"Saved Master Spritesheet: {sheet_path}")

    # 5. Optionally export to game's character roster
    if export_game:
        game_char_dir = os.path.join(r"C:\chronicles_of_fortune\public\assets", name)
        for state in STATES:
            game_rot_dir = os.path.join(game_char_dir, state, "rotations")
            os.makedirs(game_rot_dir, exist_ok=True)
            for d in DIRECTIONS:
                all_frames[state][d][0].save(os.path.join(game_rot_dir, f"{d}.png"))
                for f in range(4):
                    all_frames[state][d][f].save(os.path.join(game_rot_dir, f"{d}_{f}.png"))
        print(f"EXPORTED directly into game: {game_char_dir}")

    # Write metadata JSON
    spec_path = os.path.join(package_dir, "spec.json")
    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2, ensure_ascii=False)

    return {
        'name': name,
        'package_dir': package_dir,
        'turnaround_gif': turnaround_path,
        'run_gif': run_gif_path,
        'spritesheet': sheet_path,
        'spec': spec
    }

if __name__ == "__main__":
    test_prompt = "gorgeous mature catgirl assassin, black ears, voluptuous hourglass figure, micro bikini, dual glowing venom daggers, raven hair, emerald eyes"
    res = build_character_package(test_prompt, "catgirl_assassin")
    print("SUCCESS:", res)
