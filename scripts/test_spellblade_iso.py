import math
from PIL import Image, ImageDraw

def render_true_iso_spellblade(dir_name, anim_state='Idle', frame_idx=0, w=256, h=256):
    W, H = w * 2, h * 2
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = W // 2
    cy = H // 2 + 50

    is_south = dir_name == 'south'
    is_sw = dir_name in ('south-west', 'south-east')
    is_se = dir_name == 'south-east'
    is_side = dir_name in ('west', 'east')
    is_east = dir_name == 'east'
    is_nw = dir_name in ('north-west', 'north-east')
    is_ne = dir_name == 'north-east'
    is_north = dir_name == 'north'
    is_back = is_north or is_nw or is_ne

    flip_x = is_east or is_se or is_ne
    sign_x = -1 if flip_x else 1

    bob = math.sin((frame_idx / 4.0) * math.pi * 2) * 5
    cy += bob

    # Dynamic Ground Lightning Shadow
    draw.ellipse([cx - 85, cy + 115, cx + 85, cy + 155], fill=(15, 23, 42, 130))
    spark_t = frame_idx * 1.57
    for i in range(3):
        gx = cx + math.sin(spark_t + i * 2) * 65
        gy = cy + 135 + math.cos(spark_t + i * 2) * 15
        draw.line([gx, gy, gx + 8, gy - 12, gx + 4, gy - 20], fill=(56, 189, 248, 220), width=3)
        draw.line([gx, gy, gx + 8, gy - 12, gx + 4, gy - 20], fill=(255, 255, 255, 255), width=1)

    # Color Palette with high-contrast cel-shading
    SKIN = (255, 232, 224, 255)
    SKIN_SHADOW = (225, 178, 168, 255)
    SKIN_DEEP = (195, 145, 138, 255)

    HAIR_LIGHT = (255, 255, 255, 255)
    HAIR_SHADOW = (180, 195, 225, 255)
    HAIR_OUTLINE = (130, 145, 180, 255)

    BIKINI_WHITE = (255, 255, 255, 255)
    BIKINI_SHADOW = (185, 205, 235, 255)
    BIKINI_TRIM = (90, 120, 180, 255)
    GARTER_BLACK = (35, 45, 65, 255)

    CYAN_ENERGY = (56, 189, 248, 255)
    CYAN_LIGHT = (186, 230, 253, 255)

    # Behind hair (drawn first)
    sway = math.sin(spark_t) * 12
    if not is_side:
        draw.polygon([
            (cx - 45, cy - 100),
            (cx - 80 + sway, cy + 20),
            (cx - 70 + sway, cy + 140),
            (cx + 70 - sway, cy + 140),
            (cx + 80 - sway, cy + 20),
            (cx + 45, cy - 100)
        ], fill=HAIR_SHADOW, outline=HAIR_OUTLINE, width=2)
    else:
        draw.polygon([
            (cx - sign_x * 20, cy - 100),
            (cx - sign_x * 85 + sway, cy + 10),
            (cx - sign_x * 75 + sway, cy + 140),
            (cx - sign_x * 10, cy + 80)
        ], fill=HAIR_SHADOW, outline=HAIR_OUTLINE, width=2)

    # Legs & Thighs
    thigh_top = cy + 26
    thigh_bot = cy + 96
    foot_bot = cy + 142

    if is_side:
        # True side profile legs (front leg overlaps back leg)
        # Back leg
        draw.polygon([(cx + sign_x * 6, thigh_top), (cx + sign_x * 24, thigh_top), (cx + sign_x * 18, thigh_bot), (cx + sign_x * 14, foot_bot), (cx - sign_x * 4, foot_bot), (cx, thigh_bot)], fill=SKIN_SHADOW)
        # Front leg
        draw.polygon([(cx - sign_x * 14, thigh_top), (cx + sign_x * 14, thigh_top), (cx + sign_x * 8, thigh_bot), (cx + sign_x * 4, foot_bot), (cx - sign_x * 14, foot_bot), (cx - sign_x * 12, thigh_bot)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        # White thigh-high stockings with garter
        draw.line([cx - sign_x * 6, thigh_top + 10, cx - sign_x * 4, thigh_bot - 14], fill=GARTER_BLACK, width=3)
        draw.rectangle([cx - sign_x * 15, thigh_bot - 15, cx + sign_x * 9, foot_bot], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
    else:
        # Front / 3/4 / Back stance
        lx = cx - 22
        rx = cx + 22
        draw.polygon([(lx - 14, thigh_top), (lx + 14, thigh_top), (lx + 11, thigh_bot), (lx + 8, foot_bot), (lx - 8, foot_bot), (lx - 11, thigh_bot)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(rx - 14, thigh_top), (rx + 14, thigh_top), (rx + 11, thigh_bot), (rx + 8, foot_bot), (rx - 8, foot_bot), (rx - 11, thigh_bot)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx - 20, cy + 22, lx, thigh_bot - 15], fill=GARTER_BLACK, width=3)
        draw.line([cx + 20, cy + 22, rx, thigh_bot - 15], fill=GARTER_BLACK, width=3)
        draw.rectangle([lx - 13, thigh_bot - 15, lx + 13, foot_bot], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.rectangle([rx - 13, thigh_bot - 15, rx + 13, foot_bot], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)

    # Torso, Hips & Cleavage
    if is_side:
        # True side profile hourglass S-curve
        draw.ellipse([cx - sign_x * 38, cy + 12, cx + sign_x * 24, cy + 50], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(cx - sign_x * 15, cy - 18), (cx + sign_x * 12, cy - 18), (cx + sign_x * 22, cy + 18), (cx - sign_x * 26, cy + 18)], fill=SKIN)
        bx = cx + sign_x * 18
        by = cy - 36
        draw.ellipse([bx - 26, by - 12, bx + 26, by + 34], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(bx - sign_x * 14, by - 6), (bx + sign_x * 22, by + 6), (bx - sign_x * 6, by + 26)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.line([cx - sign_x * 22, cy + 20, cx + sign_x * 14, cy + 20], fill=BIKINI_TRIM, width=3)
    elif is_back:
        # Back view
        draw.ellipse([cx - 44, cy + 12, cx + 44, cy + 50], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx, cy + 20, cx, cy + 46], fill=SKIN_SHADOW, width=2)
        draw.polygon([(cx - 16, cy + 14), (cx + 16, cy + 14), (cx, cy + 34)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.line([cx - 40, cy + 16, cx - 16, cy + 16], fill=BIKINI_TRIM, width=2)
        draw.line([cx + 40, cy + 16, cx + 16, cy + 16], fill=BIKINI_TRIM, width=2)
        draw.polygon([(cx - 30, cy - 35), (cx + 30, cy - 35), (cx + 25, cy + 14), (cx - 25, cy + 14)], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx, cy - 25, cx, cy + 10], fill=SKIN_SHADOW, width=2)
        draw.line([cx - 28, cy - 14, cx + 28, cy - 14], fill=BIKINI_TRIM, width=2)
    else:
        # Front / 3/4 view
        draw.ellipse([cx - 46, cy + 12, cx + 46, cy + 50], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(cx - 26, cy - 18), (cx + 26, cy - 18), (cx + 38, cy + 20), (cx - 38, cy + 20)], fill=SKIN)
        draw.ellipse([cx - 2, cy + 12, cx + 2, cy + 18], fill=SKIN_DEEP)
        bust_y = cy - 38
        bw, bh = 34, 38
        draw.ellipse([cx - bw - 2, bust_y - 10, cx + 2, bust_y + bh], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.ellipse([cx - 2, bust_y - 10, cx + bw + 2, bust_y + bh], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.line([cx, bust_y - 4, cx, bust_y + bh - 8], fill=SKIN_SHADOW, width=2)
        draw.polygon([(cx - 32, bust_y + 4), (cx - 18, bust_y - 20), (cx - 4, bust_y + 12)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.polygon([(cx + 32, bust_y + 4), (cx + 18, bust_y - 20), (cx + 4, bust_y + 12)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.line([cx - 18, bust_y - 20, cx, bust_y - 34], fill=BIKINI_TRIM, width=2)
        draw.line([cx + 18, bust_y - 20, cx, bust_y - 34], fill=BIKINI_TRIM, width=2)
        draw.polygon([(cx - 20, cy + 16), (cx + 20, cy + 16), (cx, cy + 42)], fill=BIKINI_WHITE, outline=BIKINI_TRIM, width=2)
        draw.line([cx - 40, cy + 18, cx - 20, cy + 18], fill=BIKINI_TRIM, width=2)
        draw.line([cx + 40, cy + 18, cx + 20, cy + 18], fill=BIKINI_TRIM, width=2)

    # Head, Face & Hair
    hx, hy = cx, cy - 92
    if is_side:
        # True side profile head
        draw.ellipse([hx - sign_x * 12, hy - 32, hx + sign_x * 32, hy + 32], fill=SKIN, outline=SKIN_SHADOW, width=2)
        draw.polygon([(hx + sign_x * 28, hy - 4), (hx + sign_x * 38, hy + 4), (hx + sign_x * 26, hy + 14)], fill=SKIN)
        eye_x = hx + sign_x * 16
        draw.polygon([(eye_x, hy - 6), (eye_x + sign_x * 10, hy - 2), (eye_x, hy + 6)], fill=CYAN_ENERGY)
        draw.ellipse([eye_x + sign_x * 2, hy - 3, eye_x + sign_x * 6, hy + 2], fill=(255, 255, 255, 255))
    elif not is_back:
        # Front / 3/4 anime face
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
        draw.ellipse([hx - 32, hy - 34, hx + 32, hy + 34], fill=HAIR_SHADOW, outline=HAIR_OUTLINE, width=2)

    # Front bangs and hair surface
    draw.polygon([(hx - 36, hy - 25), (hx - 18, hy + 4), (hx, hy + 10), (hx + 18, hy + 4), (hx + 36, hy - 25), (hx, hy - 46)], fill=HAIR_LIGHT, outline=HAIR_OUTLINE, width=2)

    # Signature Colossal Glowing Cyan Greatsword
    wx = cx + sign_x * 58
    wy = cy - 15
    sw_len = 145
    sw_w = 32

    sword_rot = -20 if not is_side else 15
    rad = math.radians(sword_rot)
    tip_x = wx + math.sin(rad) * sw_len * sign_x
    tip_y = wy - math.cos(rad) * sw_len

    # Bronze hilt & crossguard
    draw.rectangle([wx - 22, wy + 14, wx + 22, wy + 26], fill=(217, 119, 6, 255), outline=(251, 191, 36, 255), width=2)
    draw.ellipse([wx - 8, wy + 12, wx + 8, wy + 28], fill=CYAN_ENERGY, outline=(255, 255, 255, 255), width=2)

    # Dark slab core with blazing cyan borders
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

    return img.resize((w, h), Image.Resampling.LANCZOS)

if __name__ == '__main__':
    s_img = render_true_iso_spellblade('south')
    s_img.save('public/assets/portraits/spellblade_test_south.png')

    w_img = render_true_iso_spellblade('west')
    w_img.save('public/assets/portraits/spellblade_test_west.png')

    n_img = render_true_iso_spellblade('north')
    n_img.save('public/assets/portraits/spellblade_test_north.png')

    print('Renders generated successfully.')
