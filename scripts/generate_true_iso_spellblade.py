import math, os
from PIL import Image, ImageDraw

def safe_box(x0, y0, x1, y1):
    return [min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)]

def render_spellblade_frame(dir_name, anim_state="Idle", frame_idx=0, w=256, h=256):
    W, H = w * 2, h * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = W // 2
    cy = H // 2 + 50

    # Direction categorization
    is_south = dir_name == "south"
    is_sw = dir_name == "south-west"
    is_se = dir_name == "south-east"
    is_west = dir_name == "west"
    is_east = dir_name == "east"
    is_side = is_west or is_east
    is_nw = dir_name == "north-west"
    is_ne = dir_name == "north-east"
    is_north = dir_name == "north"
    is_back = is_north or is_nw or is_ne
    is_diag = is_sw or is_se or is_nw or is_ne

    flip_x = is_east or is_se or is_ne
    sign_x = -1 if flip_x else 1
    vec_x = sign_x if (is_side or is_diag) else 0

    # Physics & Frame Dynamics
    bob = math.sin((frame_idx / 4.0) * math.pi * 2) * 5
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
        if frame_idx == 0: # Overhead windup
            weapon_arc = -50
            arm_r = -40
            lean_x = -vec_x * 14
        elif frame_idx == 1: # Colossal lightning slash
            weapon_arc = 25
            arm_r = 45
            lean_x = vec_x * 26
            bob = 8
        elif frame_idx == 2: # Full extension impact
            weapon_arc = 65
            arm_r = 60
            lean_x = vec_x * 34
            bob = 12
        else: # Recovery
            weapon_arc = 15
            arm_r = 20
            lean_x = vec_x * 10
    elif anim_state == "Cast":
        bob = math.sin(frame_idx * math.pi) * 8 - 6
        arm_l = -40 - frame_idx * 5
        arm_r = -45 - frame_idx * 6
        weapon_arc = -60

    cx += lean_x
    cy += bob

    # 1. Dynamic Ground Lightning & Shadow
    draw.ellipse([cx - 85, cy + 115, cx + 85, cy + 155], fill=(15, 23, 42, 130))
    spark_t = frame_idx * 1.57
    for i in range(3):
        gx = cx + math.sin(spark_t + i * 2) * 65
        gy = cy + 135 + math.cos(spark_t + i * 2) * 15
        draw.line([gx, gy, gx + 8, gy - 12, gx + 4, gy - 20], fill=(56, 189, 248, 220), width=3)
        draw.line([gx, gy, gx + 8, gy - 12, gx + 4, gy - 20], fill=(255, 255, 255, 255), width=1)

    # 2. Color Palette (Fair skin, pure white hair, white bikini, electric cyan energy)
    SKIN = (255, 234, 226, 255)
    SKIN_SHADOW = (226, 180, 170, 255)
    SKIN_DEEP = (196, 146, 138, 255)

    HAIR_WHITE = (255, 255, 255, 255)
    HAIR_SHADOW = (210, 222, 245, 255)
    HAIR_OUTLINE = (150, 168, 200, 255)

    BIKINI_WHITE = (255, 255, 255, 255)
    BIKINI_SHADOW = (200, 218, 245, 255)
    BIKINI_TRIM = (90, 120, 180, 255)
    GARTER_BLACK = (35, 45, 65, 255)

    CYAN_ENERGY = (56, 189, 248, 255)
    CYAN_LIGHT = (186, 230, 253, 255)

    # 3. Floating Lightning Arcs around body (behind layer)
    for sp_i in range(2):
        sp_phase = spark_t + sp_i * 3.14
        sp_x = cx + math.sin(sp_phase) * 60
        sp_y = cy - 20 + math.cos(sp_phase) * 45
        draw.line([sp_x, sp_y, sp_x + 16, sp_y - 20, sp_x + 4, sp_y - 38], fill=CYAN_ENERGY, width=3)
        draw.line([sp_x, sp_y, sp_x + 16, sp_y - 20, sp_x + 4, sp_y - 38], fill=(255, 255, 255, 255), width=1)

    # 4. Long Loose Flowing White Hair (Behind body layer)
    sway = math.sin(spark_t) * 12
    if is_side:
        # Side profile: hair cascades down back
        draw.polygon([
            (cx - sign_x * 20, cy - 100),
            (cx - sign_x * 85 + sway, cy + 10),
            (cx - sign_x * 75 + sway, cy + 145),
            (cx - sign_x * 12, cy + 75)
        ], fill=HAIR_WHITE, outline=HAIR_OUTLINE, width=2)
        # Shading strand
        draw.line([(cx - sign_x * 40 + sway * 0.5, cy - 30), (cx - sign_x * 45 + sway * 0.8, cy + 120)], fill=HAIR_SHADOW, width=4)
    else:
        # Full billowing cascades
        draw.polygon([
            (cx - 45, cy - 100),
            (cx - 85 + sway, cy + 20),
            (cx - 75 + sway, cy + 150),
            (cx + 75 - sway, cy + 150),
            (cx + 85 - sway, cy + 20),
            (cx + 45, cy - 100)
        ], fill=HAIR_WHITE, outline=HAIR_OUTLINE, width=2)
        # Inner shading strands
        draw.line([(cx - 30, cy - 40), (cx - 40 + sway * 0.6, cy + 120)], fill=HAIR_SHADOW, width=4)
        draw.line([(cx + 30, cy - 40), (cx + 40 - sway * 0.6, cy + 120)], fill=HAIR_SHADOW, width=4)

    # 5. Voluptuous Body, Legs & Stance
    thigh_top = cy + 26
    thigh_bot = cy + 96
    foot_bot = cy + 142

    if is_side:
        # True 90° Side Profile Stance
        leg_back_x = cx + sign_x * 10
        leg_front_x = cx - sign_x * 8
        # Back leg
        draw.polygon([(leg_back_x - 10, thigh_top), (leg_back_x + 12, thigh_top), (leg_back_x + 8, thigh_bot), (leg_back_x + 4, foot_bot), (leg_back_x - 10, foot_bot), (leg_back_x - 6, thigh_bot)], fill=SKIN_SHADOW)
        # Front leg
        draw.polygon([(leg_front_x - 14, thigh_top), (leg_front_x + 14, thigh_top), (leg_front_x + 10, thigh_bot), (leg_front_x + 6, foot_bot), (leg_front_x - 12, foot_bot), (leg_front_x - 10, thigh_bot)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        # Garter strap & white stocking
        draw.line([leg_front_x - sign_x * 4, thigh_top + 10, leg_front_x - sign_x * 2, thigh_bot - 14], fill=GARTER_BLACK, width=3)
        draw.rectangle(safe_box(leg_front_x - 13, thigh_bot - 15, leg_front_x + 11, foot_bot), fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)

        # S-Curve Torso
        # Glute curve protruding back
        draw.ellipse(safe_box(cx - sign_x * 38, cy + 12, cx + sign_x * 24, cy + 50), fill=SKIN, outline=SKIN_SHADOW, width=2)
        # Narrow pinched waist
        draw.polygon([(cx - sign_x * 16, cy - 18), (cx + sign_x * 14, cy - 18), (cx + sign_x * 22, cy + 18), (cx - sign_x * 26, cy + 18)], fill=SKIN)
        # Bust protruding forward
        bx = cx + sign_x * 18
        by = cy - 36
        draw.ellipse(safe_box(bx - 26, by - 12, bx + 26, by + 34), fill=SKIN, outline=SKIN_SHADOW, width=2)
        # Side white bikini cup
        draw.polygon([(bx - sign_x * 14, by - 6), (bx + sign_x * 22, by + 6), (bx - sign_x * 6, by + 26)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        # Side bikini thong string
        draw.line([cx - sign_x * 22, cy + 20, cx + sign_x * 14, cy + 20], fill=BIKINI_TRIM, width=3)

    elif is_back:
        # True Back View / Rear 3/4 View
        lx = cx - 22 + stride_l
        rx = cx + 22 + stride_r
        draw.polygon([(lx - 14, thigh_top), (lx + 14, thigh_top), (lx + 11, thigh_bot), (lx + 8, foot_bot), (lx - 8, foot_bot), (lx - 11, thigh_bot)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(rx - 14, thigh_top), (rx + 14, thigh_top), (rx + 11, thigh_bot), (rx + 8, foot_bot), (rx - 8, foot_bot), (rx - 11, thigh_bot)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx - 20, cy + 22, lx, thigh_bot - 15], fill=GARTER_BLACK, width=3)
        draw.line([cx + 20, cy + 22, rx, thigh_bot - 15], fill=GARTER_BLACK, width=3)
        draw.rectangle([lx - 13, thigh_bot - 15, lx + 13, foot_bot], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.rectangle([rx - 13, thigh_bot - 15, rx + 13, foot_bot], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)

        # Voluptuous glutes & back
        draw.ellipse([cx - 44, cy + 12, cx + 44, cy + 50], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx, cy + 20, cx, cy + 46], fill=SKIN_SHADOW, width=2)
        # White string thong
        draw.polygon([(cx - 16, cy + 14), (cx + 16, cy + 14), (cx, cy + 34)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.line([cx - 40, cy + 16, cx - 16, cy + 16], fill=BIKINI_TRIM, width=2)
        draw.line([cx + 40, cy + 16, cx + 16, cy + 16], fill=BIKINI_TRIM, width=2)
        # Exposed back & shoulder blades
        draw.polygon([(cx - 30, cy - 35), (cx + 30, cy - 35), (cx + 25, cy + 14), (cx - 25, cy + 14)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx, cy - 25, cx, cy + 10], fill=SKIN_SHADOW, width=2)
        draw.line([cx - 28, cy - 14, cx + 28, cy - 14], fill=BIKINI_TRIM, width=2)

    else:
        # Front View / Front 3/4 Diagonal View
        lx = cx - 22 + stride_l
        rx = cx + 22 + stride_r
        draw.polygon([(lx - 14, thigh_top), (lx + 14, thigh_top), (lx + 11, thigh_bot), (lx + 8, foot_bot), (lx - 8, foot_bot), (lx - 11, thigh_bot)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(rx - 14, thigh_top), (rx + 14, thigh_top), (rx + 11, thigh_bot), (rx + 8, foot_bot), (rx - 8, foot_bot), (rx - 11, thigh_bot)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx - 20, cy + 22, lx, thigh_bot - 15], fill=GARTER_BLACK, width=3)
        draw.line([cx + 20, cy + 22, rx, thigh_bot - 15], fill=GARTER_BLACK, width=3)
        draw.rectangle([lx - 13, thigh_bot - 15, lx + 13, foot_bot], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.rectangle([rx - 13, thigh_bot - 15, rx + 13, foot_bot], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)

        # Voluptuous hips & midriff
        draw.ellipse([cx - 46, cy + 12, cx + 46, cy + 50], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(cx - 26, cy - 18), (cx + 26, cy - 18), (cx + 38, cy + 20), (cx - 38, cy + 20)], fill=SKIN)
        draw.ellipse([cx - 2, cy + 12, cx + 2, cy + 18], fill=SKIN_DEEP)

        # Heavy Cleavage & Bust
        bust_y = cy - 38
        bw, bh = 34, 38
        draw.ellipse([cx - bw - 2, bust_y - 10, cx + 2, bust_y + bh], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.ellipse([cx - 2, bust_y - 10, cx + bw + 2, bust_y + bh], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx, bust_y - 4, cx, bust_y + bh - 8], fill=SKIN_SHADOW, width=2)

        # White micro bikini cups
        draw.polygon([(cx - 32, bust_y + 4), (cx - 18, bust_y - 20), (cx - 4, bust_y + 12)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.polygon([(cx + 32, bust_y + 4), (cx + 18, bust_y - 20), (cx + 4, bust_y + 12)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.line([cx - 18, bust_y - 20, cx, bust_y - 34], fill=BIKINI_TRIM, width=2)
        draw.line([cx + 18, bust_y - 20, cx, bust_y - 34], fill=BIKINI_TRIM, width=2)
        # White string thong
        draw.polygon([(cx - 20, cy + 16), (cx + 20, cy + 16), (cx, cy + 42)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.line([cx - 40, cy + 18, cx - 20, cy + 18], fill=BIKINI_TRIM, width=2)
        draw.line([cx + 40, cy + 18, cx + 20, cy + 18], fill=BIKINI_TRIM, width=2)

    # 6. Anime Head, Eyes, and Front Bangs
    hx, hy = cx, cy - 92
    if is_side:
        # True side profile head
        draw.ellipse(safe_box(hx - sign_x * 12, hy - 32, hx + sign_x * 32, hy + 32), fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(hx + sign_x * 28, hy - 4), (hx + sign_x * 38, hy + 4), (hx + sign_x * 26, hy + 14)], fill=SKIN)
        eye_x = hx + sign_x * 16
        draw.polygon([(eye_x, hy - 6), (eye_x + sign_x * 10, hy - 2), (eye_x, hy + 6)], fill=CYAN_ENERGY)
        draw.ellipse(safe_box(eye_x + sign_x * 2, hy - 3, eye_x + sign_x * 6, hy + 2), fill=(255, 255, 255, 255))
    elif not is_back:
        # Front / 3/4 Face
        draw.ellipse([hx - 32, hy - 34, hx + 32, hy + 34], fill=SKIN, outline=SKIN_SHADOW, width=2)
        eye_y = hy - 4
        for ex, dir_off in [(hx - 18, -1), (hx + 18, 1)]:
            draw.ellipse([ex - 9, eye_y - 8, ex + 9, eye_y + 12], fill=CYAN_ENERGY, outline=(14, 116, 144, 255), width=2)
            draw.ellipse([ex - 5, eye_y - 5, ex + 1, eye_y + 3], fill=(255, 255, 255, 255))
            draw.arc([ex - 10, eye_y - 12, ex + 10, eye_y - 2], start=180, end=360, fill=(35, 45, 65, 255), width=3)
        draw.ellipse([hx - 24, eye_y + 12, hx - 8, eye_y + 20], fill=(255, 160, 175, 160))
        draw.ellipse([hx + 8, eye_y + 12, hx + 24, eye_y + 20], fill=(255, 160, 175, 160))
        draw.arc([hx - 6, hy + 16, hx + 6, hy + 24], start=0, end=180, fill=(225, 100, 120, 255), width=2)
    else:
        # Back of head
        draw.ellipse([hx - 32, hy - 34, hx + 32, hy + 34], fill=HAIR_WHITE, outline=HAIR_OUTLINE, width=2)

    # Front bangs
    draw.polygon([(hx - 36, hy - 25), (hx - 18, hy + 4), (hx, hy + 10), (hx + 18, hy + 4), (hx + 36, hy - 25), (hx, hy - 46)], fill=HAIR_WHITE, outline=HAIR_OUTLINE, width=2)

    # 7. Signature Colossal Glowing Cyan Greatsword with Electric Lightning
    wx = cx + sign_x * 58 + (arm_r * 0.8)
    wy = cy - 15 + arm_r
    sw_len = 145
    sw_w = 32

    sword_rot = weapon_arc - (20 if not is_side else 15)
    rad = math.radians(sword_rot)
    tip_x = wx + math.sin(rad) * sw_len * (sign_x if not is_side else 1)
    tip_y = wy - math.cos(rad) * sw_len

    # Bronze Crossguard
    draw.rectangle([wx - 22, wy + 14, wx + 22, wy + 26], fill=(217, 119, 6, 255), outline=(251, 191, 36, 255), width=2)
    draw.ellipse([wx - 8, wy + 12, wx + 8, wy + 28], fill=CYAN_ENERGY, outline=(255, 255, 255, 255), width=2)

    # Colossal Slab Blade - Dark core with glowing cyan plasma edges
    blade_poly = [
        (wx - sw_w // 2, wy + 14),
        (wx + sw_w // 2, wy + 14),
        (tip_x + sw_w // 2, tip_y + 24),
        (tip_x, tip_y),
        (tip_x - sw_w // 2, tip_y + 24)
    ]
    draw.polygon(blade_poly, fill=(30, 36, 52, 255), outline=CYAN_ENERGY, width=6)
    draw.line([(wx, wy + 14), (tip_x, tip_y)], fill=CYAN_LIGHT, width=8)
    draw.line([(wx, wy + 14), (tip_x, tip_y)], fill=(255, 255, 255, 255), width=3)

    # Crackling zigzag lightning arcs wrapping around blade
    for i in range(4):
        ratio = (i + 1) / 5.0
        bx = wx + (tip_x - wx) * ratio + math.sin(spark_t * 2 + i) * 22
        by = wy + (tip_y - wy) * ratio + math.cos(spark_t * 2 + i) * 14
        draw.line([bx - 16, by + 12, bx, by, bx + 18, by - 14], fill=CYAN_ENERGY, width=4)
        draw.line([bx - 16, by + 12, bx, by, bx + 18, by - 14], fill=(255, 255, 255, 255), width=2)

    # 8. Animation Specific Action Effects
    if anim_state == "Attack" and frame_idx in (1, 2):
        # Colossal Lightning Slash Arc
        draw.arc([cx - 80, cy - 140, cx + 190, cy + 95], start=270, end=430, fill=CYAN_ENERGY, width=18)
        draw.arc([cx - 75, cy - 135, cx + 185, cy + 90], start=275, end=425, fill=(255, 255, 255, 255), width=6)
        # Impact sparks
        draw.polygon([(wx + 85, wy - 30), (wx + 135, wy - 60), (wx + 115, wy - 10)], fill=CYAN_ENERGY)
        draw.polygon([(wx + 95, wy + 20), (wx + 145, wy + 40), (wx + 120, wy)], fill=(255, 255, 255, 255))
    elif anim_state == "Cast" and frame_idx in (1, 2):
        # Ground Electric Magic Circle
        draw.ellipse([cx - 120, cy + 70, cx + 120, cy + 145], outline=CYAN_ENERGY, width=5)
        draw.ellipse([cx - 95, cy + 85, cx + 95, cy + 130], outline=(224, 242, 254, 220), width=3)
        # Skyward Lightning Pillars
        draw.line([cx - 40, cy + 100, cx - 30, cy - 80, cx - 45, cy - 180], fill=CYAN_ENERGY, width=5)
        draw.line([cx + 40, cy + 100, cx + 30, cy - 80, cx + 45, cy - 180], fill=CYAN_ENERGY, width=5)

    return img.resize((w, h), Image.Resampling.LANCZOS)

if __name__ == "__main__":
    directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east']
    states = ['Idle', 'Run', 'Attack', 'Cast']
    base_dir = r"public/assets/A_female_magic_swordsman_with"

    print("Generating bespoke true 8-direction isometric Spellblade sprites...")
    for st in states:
        r_dir = os.path.join(base_dir, st, "rotations")
        os.makedirs(r_dir, exist_ok=True)
        for d in directions:
            # Main static rotation
            main_f = render_spellblade_frame(d, st, 0)
            main_f.save(os.path.join(r_dir, f"{d}.png"))
            # 4 animation frames
            for f in range(4):
                frame_img = render_spellblade_frame(d, st, f)
                frame_img.save(os.path.join(r_dir, f"{d}_{f}.png"))

    print("All 8-direction Spellblade sprites successfully generated!")
