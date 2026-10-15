import os
import math
from PIL import Image, ImageDraw

DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
STATES = ['Idle', 'Run', 'Attack', 'Cast']

SKIN_WARM = (255, 235, 225, 255)
SKIN_WARM_SHADOW = (230, 195, 185, 255)
SKIN_PALE = (255, 248, 248, 255)
SKIN_PALE_SHADOW = (225, 215, 225, 255)
SKIN_TAN = (235, 185, 145, 255)
SKIN_TAN_SHADOW = (195, 145, 105, 255)

def render_character_frame(char_key, dir_name, anim_state, frame_idx, w=256, h=256):
    W, H = w * 2, h * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = W // 2
    cy = H // 2 + 50

    is_back = "north" in dir_name
    is_side = "east" in dir_name or "west" in dir_name
    is_west = "west" in dir_name
    vec_x = -1 if is_west else (1 if "east" in dir_name else 0)

    # Frame motion dynamics
    bob = math.sin((frame_idx / 4) * math.pi * 2) * 5
    stride_l, stride_r = 0, 0
    arm_l, arm_r = 0, 0
    weapon_arc = 0
    lean_x = 0

    if anim_state == "Run":
        strides = [-26, 0, 26, 0]
        stride_l = strides[frame_idx % 4]
        stride_r = -strides[frame_idx % 4]
        arm_l = -stride_l * 0.7
        arm_r = -stride_r * 0.7
        bob = -abs(strides[frame_idx % 4]) * 0.35
        lean_x = vec_x * 8
    elif anim_state == "Attack":
        if frame_idx == 0: # Windup
            weapon_arc = -45
            arm_r = -35
            lean_x = -vec_x * 12
        elif frame_idx == 1: # Slash strike
            weapon_arc = 20
            arm_r = 45
            lean_x = vec_x * 24
            bob = 8
        elif frame_idx == 2: # Full extension / impact
            weapon_arc = 60
            arm_r = 60
            lean_x = vec_x * 32
            bob = 12
        else: # Follow-through
            weapon_arc = 15
            arm_r = 20
            lean_x = vec_x * 8
    elif anim_state == "Cast":
        bob = math.sin(frame_idx * math.pi) * 8 - 6
        arm_l = -35 - frame_idx * 6
        arm_r = -35 - frame_idx * 6

    cx += lean_x
    cy += bob

    # 1. Ground Shadow
    sw, sh = 125, 45
    draw.ellipse([cx - sw, cy + 125 - sh, cx + sw, cy + 125 + sh], fill=(12, 16, 28, 110))

    # Determine Character Specific Attributes
    skin_tone = SKIN_WARM
    skin_shadow = SKIN_WARM_SHADOW

    if char_key in ('A_female_magic_swordsman_with', 'A_fair-skinned_sorceress_with_long', 'A_young_priestess_with_blonde', 'clockwork_maid', 'vampire_countess', 'ghost_maiden'):
        skin_tone = SKIN_PALE
        skin_shadow = SKIN_PALE_SHADOW
    elif char_key in ('bandit_pirate', 'beast_maiden', 'goblin_girl', 'dryad_nymph'):
        skin_tone = SKIN_TAN
        skin_shadow = SKIN_TAN_SHADOW

    # Pre-render Special Wings / Tails / Elemental Aura (Drawn behind body)
    if char_key == 'A_female_magic_swordsman_with':
        # Crackling Electric Aura & Floating Lightning Arcs around body
        spark_f = (frame_idx * 1.57)
        sp_x1 = cx - 55 + math.sin(spark_f) * 15
        sp_y1 = cy - 20 + math.cos(spark_f) * 35
        draw.line([sp_x1, sp_y1, sp_x1 + 18, sp_y1 - 24, sp_x1 + 6, sp_y1 - 42], fill=(56, 189, 248, 240), width=4)
        draw.line([sp_x1, sp_y1, sp_x1 + 18, sp_y1 - 24, sp_x1 + 6, sp_y1 - 42], fill=(240, 250, 255, 255), width=2)

        sp_x2 = cx + 60 - math.cos(spark_f) * 15
        sp_y2 = cy - 10 + math.sin(spark_f) * 40
        draw.line([sp_x2, sp_y2, sp_x2 - 16, sp_y2 - 28, sp_x2 + 8, sp_y2 - 50], fill=(56, 189, 248, 240), width=4)
        draw.line([sp_x2, sp_y2, sp_x2 - 16, sp_y2 - 28, sp_x2 + 8, sp_y2 - 50], fill=(240, 250, 255, 255), width=2)
    elif char_key == 'sakura_kitsune':
        # 9 Plush Fox Tails fanning out
        tail_pulse = math.sin(frame_idx * 0.7) * 8
        for t in range(5):
            tang = -0.8 + (t * 0.4)
            tx = cx + math.sin(tang) * 85 + tail_pulse * 0.5
            ty = cy + 30 - math.cos(tang) * 70
            draw.ellipse([tx - 28, ty - 50, tx + 28, ty + 50], fill=(255, 250, 245, 255), outline=(245, 160, 180, 255), width=3)
    elif char_key == 'arachne_weaver':
        # 4 Gothic Jointed Spider Legs
        for s in (-1, 1):
            draw.line([cx + s * 25, cy - 15, cx + s * 95, cy - 75, cx + s * 135, cy + 65], fill=(45, 20, 60, 255), width=7)
            draw.line([cx + s * 25, cy + 10, cx + s * 110, cy + 20, cx + s * 145, cy + 125], fill=(45, 20, 60, 255), width=7)
    elif char_key == 'dragon_princess_ignis':
        # Draconic Horned Wings & Sweeping Tail
        draw.polygon([(cx - 25, cy - 25), (cx - 105, cy - 105), (cx - 135, cy - 35), (cx - 35, cy + 20)], fill=(180, 30, 40, 230), outline=(235, 80, 50, 255), width=3)
        draw.polygon([(cx + 25, cy - 25), (cx + 105, cy - 105), (cx + 135, cy - 35), (cx + 35, cy + 20)], fill=(180, 30, 40, 230), outline=(235, 80, 50, 255), width=3)
        # Dragon Tail
        draw.arc([cx - 90, cy + 40, cx + 50, cy + 130], start=45, end=240, fill=(190, 35, 45, 255), width=12)

    # 2. Voluptuous Body (Legs, Hips, Waist, Cleavage)
    # Legs & Thighs
    leg_l_x = cx - 22 + stride_l
    leg_r_x = cx + 22 + stride_r
    thigh_top = cy + 28
    thigh_bot = cy + 95
    foot_bot = cy + 140

    # Left Leg
    draw.polygon([(leg_l_x - 14, thigh_top), (leg_l_x + 14, thigh_top), (leg_l_x + 11, thigh_bot), (leg_l_x + 8, foot_bot), (leg_l_x - 8, foot_bot), (leg_l_x - 11, thigh_bot)], fill=skin_tone, outline=skin_shadow)
    # Right Leg
    draw.polygon([(leg_r_x - 14, thigh_top), (leg_r_x + 14, thigh_top), (leg_r_x + 11, thigh_bot), (leg_r_x + 8, foot_bot), (leg_r_x - 8, foot_bot), (leg_r_x - 11, thigh_bot)], fill=skin_tone, outline=skin_shadow)

    # Curvaceous Hips & Butt
    hip_w = 46
    draw.ellipse([cx - hip_w, cy + 10, cx + hip_w, cy + 48], fill=skin_tone, outline=skin_shadow)

    # Narrow Hourglass Midriff & Navel
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

    # 3. Micro-Clothing Unique to Each Class / Monster
    if char_key in ('A_female_warrior_knight', 'dark_knightress'):
        # Ornate Gold / Obsidian Plate-Kini
        p_col = (245, 195, 45, 255) if char_key == 'A_female_warrior_knight' else (50, 45, 55, 255)
        p_trim = (255, 235, 130, 255) if char_key == 'A_female_warrior_knight' else (225, 40, 50, 255)
        # Cups
        if not is_back:
            draw.arc([cx - 34, bust_y - 6, cx - 2, bust_y + 32], start=0, end=180, fill=p_col, width=8)
            draw.arc([cx + 2, bust_y - 6, cx + 34, bust_y + 32], start=0, end=180, fill=p_col, width=8)
        # Micro plate thong
        draw.polygon([(cx - 24, cy + 16), (cx + 24, cy + 16), (cx, cy + 44)], fill=p_col, outline=p_trim, width=2)
        # Steel greaves
        draw.rectangle([leg_l_x - 12, foot_bot - 45, leg_l_x + 12, foot_bot], fill=p_col, outline=p_trim, width=2)
        draw.rectangle([leg_r_x - 12, foot_bot - 45, leg_r_x + 12, foot_bot], fill=p_col, outline=p_trim, width=2)

    elif char_key in ('A_fair-skinned_sorceress_with_long', 'siren_demoness'):
        # Sheer Lilac / Amethyst Micro-Halter & Violet Hip Wrap
        s_col = (195, 85, 235, 210) if char_key == 'A_fair-skinned_sorceress_with_long' else (140, 30, 85, 230)
        s_trim = (245, 180, 255, 255)
        if not is_back:
            draw.polygon([(cx - 32, bust_y + 2), (cx, bust_y - 24), (cx + 32, bust_y + 2), (cx, bust_y + 22)], fill=s_col, outline=s_trim, width=2)
        draw.polygon([(cx - 38, cy + 18), (cx + 38, cy + 18), (cx + 46, cy + 42), (cx - 46, cy + 42)], fill=s_col, outline=s_trim, width=2)

    elif char_key == 'A_female_magic_swordsman_with':
        # Pure White Micro Bikini & Thigh-High Garters
        w_col = (255, 255, 255, 255)
        w_shadow = (218, 228, 245, 255)
        if not is_back:
            # Sexy white micro triangle cups
            draw.polygon([(cx - 32, bust_y + 4), (cx - 18, bust_y - 22), (cx - 4, bust_y + 12)], fill=w_col, outline=w_shadow, width=2)
            draw.polygon([(cx + 32, bust_y + 4), (cx + 18, bust_y - 22), (cx + 4, bust_y + 12)], fill=w_col, outline=w_shadow, width=2)
            # Neck ties
            draw.line([cx - 18, bust_y - 22, cx, bust_y - 34], fill=w_col, width=2)
            draw.line([cx + 18, bust_y - 22, cx, bust_y - 34], fill=w_col, width=2)
        else:
            # Backless bikini thin strap
            draw.line([cx - 30, cy - 14, cx + 30, cy - 14], fill=w_col, width=2)
        # Micro white thong
        draw.polygon([(cx - 20, cy + 16), (cx + 20, cy + 16), (cx, cy + 42)], fill=w_col, outline=w_shadow, width=2)
        draw.line([cx - 38, cy + 18, cx - 20, cy + 18], fill=w_col, width=2)
        draw.line([cx + 38, cy + 18, cx + 20, cy + 18], fill=w_col, width=2)
        # White garters and stockings
        draw.line([cx - 16, cy + 26, leg_l_x - 6, thigh_bot - 14], fill=w_col, width=2)
        draw.line([cx + 16, cy + 26, leg_r_x + 6, thigh_bot - 14], fill=w_col, width=2)
        draw.rectangle([leg_l_x - 14, thigh_bot - 16, leg_l_x + 14, foot_bot], fill=(252, 253, 255, 240), outline=w_shadow, width=2)
        draw.rectangle([leg_r_x - 14, thigh_bot - 16, leg_r_x + 14, foot_bot], fill=(252, 253, 255, 240), outline=w_shadow, width=2)

    elif char_key in ('A_fair-skinned_female_assassin_wearing', 'bandit_pirate'):
        # Black Leather Strap Harness Micro-Bikini
        b_col = (35, 35, 42, 255)
        b_trim = (16, 185, 129, 255) if char_key == 'A_fair-skinned_female_assassin_wearing' else (225, 45, 60, 255)
        if not is_back:
            draw.line([cx - 36, bust_y + 12, cx + 36, bust_y + 12], fill=b_col, width=8)
            draw.line([cx - 25, bust_y - 15, cx, bust_y + 12], fill=b_col, width=4)
            draw.line([cx + 25, bust_y - 15, cx, bust_y + 12], fill=b_col, width=4)
        draw.polygon([(cx - 28, cy + 16), (cx + 28, cy + 16), (cx, cy + 42)], fill=b_col, outline=b_trim, width=2)

    elif char_key == 'A_young_priestess_with_blonde':
        # Pure White Holy Silk Micro-Bandeau & Sacred Pleated Miniskirt
        w_col = (255, 255, 255, 255)
        w_trim = (245, 200, 50, 255)
        if not is_back:
            draw.rectangle([cx - 34, bust_y + 2, cx + 34, bust_y + 20], fill=w_col, outline=w_trim, width=2)
        draw.polygon([(cx - 38, cy + 20), (cx + 38, cy + 20), (cx + 44, cy + 44), (cx - 44, cy + 44)], fill=w_col, outline=w_trim, width=2)

    elif char_key == 'clockwork_maid':
        # Steampunk Brass Corset & Frilled Micro Skirt
        draw.polygon([(cx - 36, bust_y - 10), (cx + 36, bust_y - 10), (cx + 28, cy + 20), (cx - 28, cy + 20)], fill=(185, 125, 30, 255), outline=(245, 205, 50, 255), width=3)
        draw.polygon([(cx - 45, cy + 24), (cx + 45, cy + 24), (cx + 52, cy + 46), (cx - 52, cy + 46)], fill=(35, 40, 50, 255), outline=(245, 205, 50, 255), width=2)

    elif char_key == 'slime_princess':
        # Translucent Emerald Gel Bikini & Rippling Slime Puddle
        draw.ellipse([cx - 65, cy + 85, cx + 65, cy + 135], fill=(34, 197, 94, 160), outline=(134, 239, 172, 230), width=3)
        if not is_back:
            draw.arc([cx - 34, bust_y - 4, cx - 2, bust_y + 28], start=0, end=180, fill=(34, 197, 94, 220), width=6)
            draw.arc([cx + 2, bust_y - 4, cx + 34, bust_y + 28], start=0, end=180, fill=(34, 197, 94, 220), width=6)
        draw.polygon([(cx - 26, cy + 18), (cx + 26, cy + 18), (cx, cy + 44)], fill=(34, 197, 94, 220))

    # 4. Anime Head, Eyes, and Hair
    hx, hy = cx, cy - 90
    draw.ellipse([hx - 34, hy - 36, hx + 34, hy + 36], fill=skin_tone)

    if not is_back:
        # Anime eyes
        eye_y = hy - 4
        eye_c = (56, 189, 248, 255) # default blue
        if char_key == 'A_fair-skinned_sorceress_with_long': eye_c = (192, 132, 252, 255)
        elif char_key == 'A_fair-skinned_female_assassin_wearing': eye_c = (52, 211, 153, 255)
        elif char_key == 'dragon_princess_ignis': eye_c = (248, 113, 113, 255)

        draw.ellipse([hx - 24, eye_y - 8, hx - 8, eye_y + 12], fill=eye_c)
        draw.ellipse([hx - 20, eye_y - 6, hx - 12, eye_y + 4], fill=(255, 255, 255, 255))
        draw.ellipse([hx + 8, eye_y - 8, hx + 24, eye_y + 12], fill=eye_c)
        draw.ellipse([hx + 12, eye_y - 6, hx + 20, eye_y + 4], fill=(255, 255, 255, 255))
        draw.arc([hx - 26, eye_y - 12, hx - 6, eye_y], start=180, end=360, fill=(35, 20, 25, 255), width=3)
        draw.arc([hx + 6, eye_y - 12, hx + 26, eye_y], start=180, end=360, fill=(35, 20, 25, 255), width=3)
        draw.ellipse([hx - 28, eye_y + 10, hx - 12, eye_y + 18], fill=(255, 160, 175, 140))
        draw.ellipse([hx + 12, eye_y + 10, hx + 28, eye_y + 18], fill=(255, 160, 175, 140))
        draw.arc([hx - 6, hy + 14, hx + 6, hy + 22], start=0, end=180, fill=(225, 100, 120, 255), width=2)

    # Hair Geometry & Color
    h_col = (250, 205, 50, 255) # Blonde default
    if char_key == 'A_fair-skinned_sorceress_with_long': h_col = (175, 75, 220, 255) # Amethyst
    elif char_key == 'A_female_magic_swordsman_with': h_col = (252, 253, 255, 255) # Pure White / Silver
    elif char_key == 'A_fair-skinned_female_assassin_wearing': h_col = (40, 42, 52, 255) # Raven
    elif char_key == 'A_young_priestess_with_blonde': h_col = (245, 245, 255, 255) # Silver
    elif char_key == 'clockwork_maid': h_col = (195, 95, 45, 255) # Auburn
    elif char_key == 'slime_princess': h_col = (74, 222, 128, 230) # Emerald Slime
    elif char_key == 'dragon_princess_ignis': h_col = (220, 38, 38, 255) # Crimson

    sway = math.sin((frame_idx / 4) * math.pi * 2) * 8
    draw.polygon([(hx - 36, hy - 25), (hx - 18, hy + 4), (hx, hy + 8), (hx + 18, hy + 4), (hx + 36, hy - 25), (hx, hy - 46)], fill=h_col)
    # Flowing side hair
    if char_key == 'A_female_magic_swordsman_with':
        # Long flowing loose white hair past hips
        draw.polygon([(hx - 34, hy - 10), (hx - 65 + sway * 1.2, hy + 50), (hx - 55 + sway * 1.2, hy + 160), (hx - 24, hy + 20)], fill=h_col, outline=(215, 225, 248, 255), width=2)
        draw.polygon([(hx + 34, hy - 10), (hx + 65 - sway * 1.2, hy + 50), (hx + 55 - sway * 1.2, hy + 160), (hx + 24, hy + 20)], fill=h_col, outline=(215, 225, 248, 255), width=2)
        if is_back:
            # Back locks framing shoulders and arched waist
            draw.polygon([(hx - 26, hy + 10), (hx - 36 + sway * 0.5, cy + 30), (hx + 36 - sway * 0.5, cy + 30), (hx + 26, hy + 10)], fill=h_col, outline=(215, 225, 248, 255))
    else:
        draw.polygon([(hx - 34, hy - 10), (hx - 58 + sway, hy + 45), (hx - 48 + sway, hy + 120), (hx - 28, hy + 20)], fill=h_col)
        draw.polygon([(hx + 34, hy - 10), (hx + 58 - sway, hy + 45), (hx + 48 - sway, hy + 120), (hx + 28, hy + 20)], fill=h_col)

    # Headgear
    if char_key == 'A_young_priestess_with_blonde':
        # Halo
        draw.ellipse([hx - 42, hy - 65, hx + 42, hy - 35], outline=(255, 215, 60, 255), width=4)
    elif char_key == 'clockwork_maid':
        # Goggles
        draw.rectangle([hx - 30, hy - 28, hx + 30, hy - 12], fill=(70, 40, 20, 255))
        draw.ellipse([hx - 26, hy - 32, hx - 4, hy - 8], fill=(245, 195, 40, 255), outline=(130, 85, 15, 255), width=3)
        draw.ellipse([hx + 4, hy - 32, hx + 26, hy - 8], fill=(245, 195, 40, 255), outline=(130, 85, 15, 255), width=3)
    elif char_key == 'slime_princess':
        # Golden Tiara
        draw.polygon([(hx - 18, hy - 38), (hx - 9, hy - 52), (hx, hy - 42), (hx + 9, hy - 52), (hx + 18, hy - 38)], fill=(255, 215, 60, 255), outline=(190, 130, 15, 255), width=2)
    elif char_key == 'dragon_princess_ignis':
        # Dragon Horns
        draw.polygon([(hx - 26, hy - 30), (hx - 55, hy - 75), (hx - 20, hy - 42)], fill=(40, 20, 25, 255), outline=(225, 40, 50, 255), width=2)
        draw.polygon([(hx + 26, hy - 30), (hx + 55, hy - 75), (hx + 20, hy - 42)], fill=(40, 20, 25, 255), outline=(225, 40, 50, 255), width=2)

    # 5. Signature Weapon & Action FX
    wx = cx + 55 + (arm_r * 0.8)
    wy = cy - 10 + arm_r

    if char_key in ('A_female_warrior_knight', 'dark_knightress', 'dragon_princess_ignis'):
        # Massive Claymore Sword
        blade_col = (235, 240, 250, 255) if char_key == 'A_female_warrior_knight' else ((80, 75, 85, 255) if char_key == 'dark_knightress' else (255, 120, 60, 255))
        # Draw broadsword
        draw.polygon([(wx - 8, wy + 25), (wx + 8, wy + 25), (wx + 10, wy - 95), (wx, wy - 115), (wx - 10, wy - 95)], fill=blade_col, outline=(245, 195, 50, 255), width=3)
        # Gold crossguard
        draw.rectangle([wx - 26, wy + 25, wx + 26, wy + 35], fill=(245, 195, 50, 255))
        if anim_state == "Attack" and frame_idx in (1, 2):
            # Dynamic Slash Arc
            draw.arc([cx - 40, cy - 110, cx + 160, cy + 70], start=280, end=420, fill=(255, 230, 120, 230), width=10)

    elif char_key in ('A_fair-skinned_sorceress_with_long', 'A_young_priestess_with_blonde'):
        # Crystal Magic Staff / Scepter
        draw.line([wx, wy - 95, wx, wy + 55], fill=(130, 85, 45, 255), width=8)
        # Glowing Orb
        orb_col = (192, 132, 252, 240) if char_key == 'A_fair-skinned_sorceress_with_long' else (255, 235, 120, 240)
        draw.ellipse([wx - 22, wy - 115, wx + 22, wy - 75], fill=orb_col, outline=(255, 255, 255, 255), width=3)
        if anim_state == "Cast" and frame_idx in (1, 2):
            # Magic Circle on ground
            draw.ellipse([cx - 100, cy + 80, cx + 100, cy + 140], outline=orb_col, width=4)

    elif char_key == 'A_female_magic_swordsman_with':
        # Massive Glowing Cyan Greatsword with Electric Lightning Arcs
        sword_angle = math.radians(weapon_arc - 25)
        sw_len = 135
        sw_w = 26
        tip_x = wx + math.sin(sword_angle) * sw_len * (vec_x if vec_x != 0 else 1)
        tip_y = wy - math.cos(sword_angle) * sw_len

        # Base Crossguard (Gold/Bronze)
        draw.rectangle([wx - 20, wy + 15, wx + 20, wy + 26], fill=(217, 119, 6, 255), outline=(251, 191, 36, 255), width=2)
        draw.ellipse([wx - 7, wy + 13, wx + 7, wy + 27], fill=(56, 189, 248, 255), outline=(255, 255, 255, 255), width=2)

        # Colossal Slab Blade - Dark metallic core with blazing cyan plasma edges
        blade_poly = [
            (wx - sw_w // 2, wy + 15),
            (wx + sw_w // 2, wy + 15),
            (tip_x + sw_w // 2, tip_y + 20),
            (tip_x, tip_y),
            (tip_x - sw_w // 2, tip_y + 20)
        ]
        draw.polygon(blade_poly, fill=(40, 48, 68, 255), outline=(56, 189, 248, 255), width=5)
        # Inner plasma line
        draw.line([(wx, wy + 15), (tip_x, tip_y)], fill=(186, 230, 253, 255), width=6)
        draw.line([(wx, wy + 15), (tip_x, tip_y)], fill=(255, 255, 255, 255), width=2)

        # Crackling Lightning Arcs wrapping around the blade
        l_phase = frame_idx * 1.8
        for arc_i in range(3):
            t_ratio = (arc_i + 1) / 4.0
            lx = wx + (tip_x - wx) * t_ratio + math.sin(l_phase + arc_i) * 18
            ly = wy + (tip_y - wy) * t_ratio + math.cos(l_phase + arc_i) * 12
            draw.line([lx - 12, ly + 8, lx, ly, lx + 14, ly - 10], fill=(56, 189, 248, 255), width=3)
            draw.line([lx - 12, ly + 8, lx, ly, lx + 14, ly - 10], fill=(255, 255, 255, 255), width=1)

        # Attack Anim: Colossal Lightning Slash Blade Arc & Impact Shockwaves
        if anim_state == "Attack" and frame_idx in (1, 2):
            draw.arc([cx - 70, cy - 130, cx + 180, cy + 90], start=270, end=430, fill=(56, 189, 248, 250), width=16)
            draw.arc([cx - 65, cy - 125, cx + 175, cy + 85], start=275, end=425, fill=(240, 252, 255, 255), width=6)
            draw.polygon([(wx + 80, wy - 30), (wx + 130, wy - 60), (wx + 110, wy - 10)], fill=(56, 189, 248, 255))
            draw.polygon([(wx + 90, wy + 20), (wx + 140, wy + 40), (wx + 115, wy)], fill=(255, 255, 255, 255))

        # Cast Anim: Ground Lightning Circle & Skyward Electric Pillar
        elif anim_state == "Cast" and frame_idx in (1, 2):
            draw.ellipse([cx - 120, cy + 70, cx + 120, cy + 145], outline=(56, 189, 248, 255), width=5)
            draw.ellipse([cx - 95, cy + 85, cx + 95, cy + 130], outline=(224, 242, 254, 220), width=3)
            draw.line([cx - 40, cy + 100, cx - 30, cy - 80, cx - 45, cy - 160], fill=(56, 189, 248, 255), width=4)
            draw.line([cx + 40, cy + 100, cx + 30, cy - 80, cx + 45, cy - 160], fill=(56, 189, 248, 255), width=4)

    elif char_key in ('A_fair-skinned_female_assassin_wearing', 'bandit_pirate'):
        # Dual Venom Daggers
        draw.polygon([(wx - 5, wy), (wx + 15, wy - 45), (wx - 10, wy - 40)], fill=(52, 211, 153, 255), outline=(255, 255, 255, 255), width=2)
        draw.polygon([(cx - 45, cy), (cx - 65, cy - 45), (cx - 40, cy - 40)], fill=(52, 211, 153, 255), outline=(255, 255, 255, 255), width=2)

    elif char_key == 'clockwork_maid':
        # Heavy Twin-Barrel Steam Gun
        draw.rectangle([wx - 20, wy - 16, wx + 65, wy + 16], fill=(95, 85, 80, 255), outline=(245, 195, 50, 255), width=3)
        draw.rectangle([wx + 20, wy - 12, wx + 85, wy - 2], fill=(235, 180, 35, 255))
        draw.rectangle([wx + 20, wy + 2, wx + 85, wy + 12], fill=(235, 180, 35, 255))
        if anim_state == "Attack" and frame_idx in (1, 2):
            draw.ellipse([wx + 70, wy - 25, wx + 130, wy + 25], fill=(255, 220, 90, 240))

    # Downsample to 256x256 for smooth crisp high-resolution pixel art
    return img.resize((w, h), Image.Resampling.LANCZOS)

def synthesize_all():
    hero_classes = [
        'A_female_warrior_knight',
        'A_female_magic_swordsman_with',
        'A_fair-skinned_sorceress_with_long',
        'A_fair-skinned_female_assassin_wearing',
        'A_young_priestess_with_blonde'
    ]

    monsters = [
        'slime_princess',
        'clockwork_maid',
        'arachne_weaver',
        'sakura_kitsune',
        'dragon_princess_ignis',
        'dark_knightress',
        'bandit_pirate',
        'vampire_countess',
        'skeletal_maid',
        'beast_maiden',
        'yeti_maiden',
        'siren_demoness',
        'kraken_maiden',
        'sphinx_queen',
        'dryad_nymph',
        'ghost_maiden',
        'dragon_wyrm',
        'goblin_girl'
    ]

    print("Beginning HD-2D Bespoke Synthesis for all Heroines & Monsters...")

    # 1. Hero Classes
    for h_cls in hero_classes:
        base_dir = os.path.join("public/assets", h_cls)
        print(f"Synthesizing Hero Class: {h_cls}")
        for state in STATES:
            rot_dir = os.path.join(base_dir, state, "rotations")
            os.makedirs(rot_dir, exist_ok=True)
            for d in DIRECTIONS:
                # Main direction file
                main_img = render_character_frame(h_cls, d, state, 0)
                main_img.save(os.path.join(rot_dir, f"{d}.png"))
                # 4 frame animations
                for f in range(4):
                    f_img = render_character_frame(h_cls, d, state, f)
                    f_img.save(os.path.join(rot_dir, f"{d}_{f}.png"))

    # 2. Monsters
    for m_key in monsters:
        base_dir = os.path.join("public/assets/monsters", m_key)
        print(f"Synthesizing Monster Archetype: {m_key}")
        for state in STATES:
            rot_dir = os.path.join(base_dir, state, "rotations")
            os.makedirs(rot_dir, exist_ok=True)
            for d in DIRECTIONS:
                main_img = render_character_frame(m_key, d, state, 0)
                main_img.save(os.path.join(rot_dir, f"{d}.png"))
                for f in range(4):
                    f_img = render_character_frame(m_key, d, state, f)
                    f_img.save(os.path.join(rot_dir, f"{d}_{f}.png"))
        # Root icon
        root_img = render_character_frame(m_key, 'south', 'Idle', 0)
        root_img.save(os.path.join("public/assets/monsters", f"{m_key}.png"))

    print("All HD-2D Bespoke Syntheses completed successfully!")

if __name__ == '__main__':
    synthesize_all()
