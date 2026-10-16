import os
import math
from PIL import Image, ImageDraw

DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
DIR_ANGLES = {
    'south': 0.0,
    'south-east': math.pi * 0.25,
    'east': math.pi * 0.5,
    'north-east': math.pi * 0.75,
    'north': math.pi,
    'north-west': math.pi * 1.25,
    'west': math.pi * 1.5,
    'south-west': math.pi * 1.75
}

COLORS = {
    'skin': (255, 244, 240, 255),          # Fair porcelain anime skin
    'skin_shadow': (236, 206, 200, 255),   # Soft peach shadow
    'hair': (252, 253, 255, 255),          # Pure white hair
    'hair_shadow': (195, 212, 235, 255),   # Soft ice-blue shadow
    'hair_hi': (255, 255, 255, 255),       # Specular white
    'eye': (14, 165, 233, 255),            # Electric sky blue
    'eye_glow': (186, 230, 253, 255),      # Bright cyan-blue glow
    'eye_dark': (2, 132, 199, 255),        # Deep sapphire pupil
    'outfit': (22, 28, 45, 255),           # Dark indigo micro-armor
    'outfit_trim': (56, 189, 248, 255),    # Cyan glowing rune trim
    'blade_core': (255, 255, 255, 255),    # White-hot plasma core
    'blade_plasma': (56, 189, 248, 255),   # Electric cyan glow
    'blade_edge': (2, 132, 199, 255),      # Deep electric blue cutting edge
    'blade_guard': (30, 41, 59, 255),      # Titanium cross-guard
    'blade_gold': (245, 158, 11, 255),     # Gold runic gem/inlay
    'lightning': (56, 189, 248, 255),      # Bright cyan lightning
    'lightning_core': (255, 255, 255, 255),# White lightning bolt core
    'shadow': (15, 23, 42, 110)            # Ground contact shadow
}

# 3D Math Helper: Rotate vector around vertical Y-axis by theta
def rotate_y(x, y, z, theta):
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)
    xr = x * cos_t + z * sin_t
    zr = -x * sin_t + z * cos_t
    return xr, y, zr

def render_isometric_frame(theta, w=160, h=160):
    # 2x supersampling buffer (320x320)
    W, H = w * 2, h * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = W // 2
    ground_y = H - 55
    primitives = []

    # True 30-degree isometric top-down projection:
    # Camera looks down at elevation angle of 30°
    # Y is vertical height (0 at ground, +110 at head)
    # Z is ground depth (positive towards camera, negative away)
    # X is ground horizontal
    COS_30 = math.cos(math.radians(30)) # 0.866
    SIN_30 = math.sin(math.radians(30)) # 0.500

    def project(x, y, z):
        rx, ry, rz = rotate_y(x, y, z, theta)
        # Screen coordinates
        px = cx + rx
        # Top-down isometric projection: height Y goes UP (-), depth Z goes DOWN (+)
        py = ground_y - (ry * COS_30) + (rz * SIN_30)
        return px, py, rz

    def add_prim(z_depth, draw_func):
        primitives.append((z_depth, draw_func))

    # --- 1. Isometric Ground Shadow ---
    # In isometric top-down view, a circular shadow becomes a 2:1 flattened ellipse
    draw.ellipse([cx - 52, ground_y - 20, cx + 52, ground_y + 20], fill=COLORS['shadow'])

    # --- 2. Legs & Armored Boots ---
    # Legs stand on ground at Y = 0 to 45
    for is_right in [False, True]:
        side = 1 if is_right else -1
        lx = side * 14
        ankle_pt = (lx, 6, 0)
        knee_pt = (lx + side * 2, 38, 2)
        hip_pt = (lx + side * 1, 68, 0)

        _, _, leg_rz = rotate_y(lx, 38, 0, theta)

        def make_draw_leg(ankle_pt=ankle_pt, knee_pt=knee_pt, hip_pt=hip_pt, side=side):
            def draw_leg():
                ax, ay, _ = project(*ankle_pt)
                kx, ky, _ = project(*knee_pt)
                hx, hy, _ = project(*hip_pt)

                # Voluptuous Fair Thigh
                draw.line([hx, hy, kx, ky], fill=COLORS['skin'], width=20)
                draw.line([hx, hy, kx, ky], fill=COLORS['skin_shadow'], width=2)
                # Thigh-high Armor Boot
                draw.line([kx, ky, ax, ay], fill=COLORS['outfit'], width=15)
                draw.line([kx, ky, ax, ay], fill=COLORS['outfit_trim'], width=2)
                # Boot cuff
                draw.ellipse([kx - 8, ky - 3, kx + 8, ky + 3], fill=COLORS['outfit_trim'])
            return draw_leg
        add_prim(leg_rz, make_draw_leg(ankle_pt, knee_pt, hip_pt, side))

    # --- 3. Pelvis & Voluptuous Hips (Y = 66) ---
    _, _, pelvis_rz = rotate_y(0, 66, 0, theta)
    def draw_pelvis():
        px, py, _ = project(0, 66, 0)
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)
        pw = math.sqrt((26 * cos_t)**2 + (17 * sin_t)**2)
        draw.ellipse([px - pw, py - 16, px + pw, py + 16], fill=COLORS['skin'], outline=COLORS['skin_shadow'], width=2)
        # Micro-armor bottom / runic bikini
        if cos_t > 0:
            draw.polygon([(px - 11 * cos_t, py - 3), (px + 11 * cos_t, py - 3), (px, py + 12)], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
        else:
            draw.line([px - 14, py - 2, px + 14, py - 2], fill=COLORS['outfit'], width=4)
    add_prim(pelvis_rz, draw_pelvis)

    # --- 4. Narrow Hourglass Waist (Y = 82) ---
    _, _, waist_rz = rotate_y(0, 82, 0, theta)
    def draw_waist():
        px, py, _ = project(0, 82, 0)
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)
        ww = math.sqrt((16 * cos_t)**2 + (12 * sin_t)**2)
        draw.ellipse([px - ww, py - 11, px + ww, py + 11], fill=COLORS['skin'])
        if cos_t > 0.2: # Navel
            nx, ny, _ = project(0, 78, 8)
            draw.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=COLORS['skin_shadow'])
    add_prim(waist_rz, draw_waist)

    # --- 5. Voluptuous Bust (Two distinct 3D spheres at Y = 96, Z = 10) ---
    for side in (-1, 1):
        bx, by, bz = side * 10, 96, 10
        _, _, bust_rz = rotate_y(bx, by, bz, theta)
        def make_draw_bust(bx=bx, by=by, bz=bz):
            def draw_bust():
                px, py, _ = project(bx, by, bz)
                draw.ellipse([px - 15, py - 15, px + 15, py + 15], fill=COLORS['skin'], outline=COLORS['skin_shadow'], width=2)
                if math.cos(theta) > -0.25: # Front/profile
                    draw.ellipse([px - 10, py - 8, px + 10, py + 8], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
            return draw_bust
        add_prim(bust_rz, make_draw_bust(bx, by, bz))

    # --- 6. Head, Glowing Blue Eyes & Anime Face (Y = 124) ---
    _, _, head_rz = rotate_y(0, 124, 0, theta)
    def draw_head():
        px, py, _ = project(0, 124, 0)
        # Neck & Runic Collar
        nx, ny, _ = project(0, 108, 0)
        draw.rectangle([nx - 6, ny - 8, nx + 6, ny + 4], fill=COLORS['skin'])
        draw.line([nx - 6, ny, nx + 6, ny], fill=COLORS['outfit_trim'], width=2)
        # Head volume
        draw.ellipse([px - 22, py - 23, px + 22, py + 23], fill=COLORS['skin'])

        # Top hair crown (must cover the scalp in ALL angles so the head is never bald from behind!)
        draw.ellipse([px - 23, py - 24, px + 23, py - 2], fill=COLORS['hair'], outline=COLORS['hair_shadow'], width=1)

        cos_f = math.cos(theta)
        if cos_f > -0.2: # Face visible
            for s in (-1, 1):
                ex, ey, ez = s * 9, 124, 15
                epx, epy, erz = project(ex, ey, ez)
                if erz > head_rz - 5:
                    # Glowing electric blue anime eyes
                    draw.ellipse([epx - 5, epy - 6, epx + 5, epy + 6], fill=COLORS['eye_dark'])
                    draw.ellipse([epx - 4, epy - 3, epx + 4, epy + 5], fill=COLORS['eye'])
                    draw.ellipse([epx - 2, epy - 4, epx + 2, epy + 1], fill=COLORS['eye_glow'])
                    draw.point([epx + 1, epy - 3], fill=(255, 255, 255, 255))
                    draw.arc([epx - 6, epy - 8, epx + 6, epy + 2], start=180, end=360, fill=(15, 23, 42, 255), width=2)
            # Blush
            if cos_f > 0.3:
                b1x, b1y, _ = project(-11, 116, 14)
                b2x, b2y, _ = project(11, 116, 14)
                draw.ellipse([b1x - 4, b1y - 2, b1x + 4, b1y + 2], fill=(255, 185, 195, 150))
                draw.ellipse([b2x - 4, b2y - 2, b2x + 4, b2y + 2], fill=(255, 185, 195, 150))
    add_prim(head_rz, draw_head)

    # --- 7. Long Loose Flowing White Hair (ผมขาว ปล่อยผม) ---
    # 7.1 Bangs and Crown (Forehead)
    _, _, bangs_rz = rotate_y(0, 132, 10, theta)
    def draw_bangs():
        if math.cos(theta) > -0.3:
            px, py, _ = project(0, 135, 4)
            # Crown volume
            draw.ellipse([px - 24, py - 16, px + 24, py + 16], fill=COLORS['hair'], outline=COLORS['hair_shadow'], width=1)
            # Front center bangs parted
            bx1, by1, _ = project(-15, 126, 17)
            bx2, by2, _ = project(0, 118, 17)
            bx3, by3, _ = project(15, 126, 17)
            draw.polygon([(bx1, by1), (bx2, by2), (bx3, by3)], fill=COLORS['hair'])
            draw.line([bx1, by1, bx2, by2], fill=COLORS['hair_shadow'], width=1)
            draw.line([bx3, by3, bx2, by2], fill=COLORS['hair_shadow'], width=1)
    add_prim(bangs_rz, draw_bangs)

    # 7.2 Sidelocks framing face
    for s in (-1, 1):
        lx, ly, lz = s * 17, 110, 8
        _, _, lock_rz = rotate_y(lx, ly, lz, theta)
        def make_draw_sidelock(s=s, lx=lx, ly=ly, lz=lz):
            def draw_sidelock():
                p_top = project(s * 19, 130, 6)
                p_mid = project(s * 21, 108, 10)
                p_tip = project(s * 15, 78, 8)
                draw.polygon([(p_top[0], p_top[1]), (p_mid[0], p_mid[1]), (p_tip[0], p_tip[1])], fill=COLORS['hair'], outline=COLORS['hair_shadow'], width=1)
            return draw_sidelock
        add_prim(lock_rz, make_draw_sidelock(s, lx, ly, lz))

    # 7.3 Long Cascading Loose Back Hair (From crown Y=135 down to hips Y=60)
    for strand_i in range(-3, 4):
        offset_x = strand_i * 6
        curve_z = -12 - abs(strand_i) * 3
        _, _, back_hair_rz = rotate_y(offset_x, 95, curve_z, theta)

        def make_draw_back_hair(offset_x=offset_x, curve_z=curve_z, strand_i=strand_i):
            def draw_back_hair():
                pts = []
                for seg in range(6):
                    sy = 135 - seg * 14
                    wind_x = offset_x + math.sin(seg * 0.7 + strand_i) * 5
                    wind_z = curve_z - (seg * 3)
                    pts.append(project(wind_x, sy, wind_z))

                for i in range(len(pts) - 1):
                    p1, p2 = pts[i], pts[i+1]
                    w_strand = max(5, 16 - i * 2)
                    draw.line([p1[0], p1[1], p2[0], p2[1]], fill=COLORS['hair'], width=w_strand)
                    draw.line([p1[0], p1[1], p2[0], p2[1]], fill=COLORS['hair_shadow'], width=1)
            return draw_back_hair
        add_prim(back_hair_rz, make_draw_back_hair(offset_x, curve_z, strand_i))

    # --- 8. Left Arm (Grip & Support) ---
    _, _, arm_l_rz = rotate_y(-18, 95, 4, theta)
    def draw_arm_l():
        spx, spy, _ = project(-18, 104, 0)
        hpx, hpy, _ = project(-12, 85, 14) # Left hand gripping upper sword hilt
        draw.line([spx, spy, hpx, hpy], fill=COLORS['skin'], width=12)
        draw.line([spx, spy, hpx, hpy], fill=COLORS['skin_shadow'], width=1)
        draw.ellipse([spx - 7, spy - 5, spx + 7, spy + 5], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
        draw.ellipse([hpx - 5, hpy - 4, hpx + 5, hpy + 4], fill=COLORS['outfit'])
    add_prim(arm_l_rz, draw_arm_l)

    # --- 9. MASSIVE GLOWING BLUE GREATSWORD (Claymore) ---
    # Positioned prominently so the massive blade is gloriously visible in ALL 8 angles
    hilt_pt = (10, 84, 10)
    guard_pt = (16, 78, 14)
    blade_tip_pt = (46, 12, 20)

    mid_sw = ((hilt_pt[0] + blade_tip_pt[0])/2, (hilt_pt[1] + blade_tip_pt[1])/2, (hilt_pt[2] + blade_tip_pt[2])/2)
    _, _, sword_rz = rotate_y(*mid_sw, theta)

    def draw_massive_greatsword():
        hpx, hpy, _ = project(*hilt_pt)
        gpx, gpy, _ = project(*guard_pt)
        tpx, tpy, _ = project(*blade_tip_pt)

        # Right arm gripping lower hilt
        r_spx, r_spy, _ = project(18, 104, 0)
        draw.line([r_spx, r_spy, hpx, hpy], fill=COLORS['skin'], width=12)
        draw.line([r_spx, r_spy, hpx, hpy], fill=COLORS['skin_shadow'], width=1)
        draw.ellipse([r_spx - 7, r_spy - 5, r_spx + 7, r_spy + 5], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)

        # Hilt & Pommel
        draw.line([hpx, hpy, gpx, gpy], fill=COLORS['blade_guard'], width=8)
        draw.line([hpx, hpy, gpx, gpy], fill=COLORS['blade_gold'], width=3)
        draw.ellipse([hpx - 5, hpy - 5, hpx + 5, hpy + 5], fill=COLORS['blade_gold'])

        # Crossguard (Width = 36px)
        dx = tpx - gpx
        dy = tpy - gpy
        dist = math.hypot(dx, dy) or 1
        nx = -dy / dist
        ny = dx / dist

        gx1, gy1 = gpx + nx * 18, gpy + ny * 18
        gx2, gy2 = gpx - nx * 18, gpy - ny * 18
        draw.line([gx1, gy1, gx2, gy2], fill=COLORS['blade_guard'], width=9)
        draw.line([gx1, gy1, gx2, gy2], fill=COLORS['outfit_trim'], width=2)

        # Truly Massive Greatsword Blade (28px base width, 18px tip width!)
        bw_base = 14.0
        bw_tip = 9.0

        b_base_l = (gpx + nx * bw_base, gpy + ny * bw_base)
        b_base_r = (gpx - nx * bw_base, gpy - ny * bw_base)
        b_shoulder_l = (tpx - dx * 0.12 + nx * bw_tip, tpy - dy * 0.12 + ny * bw_tip)
        b_shoulder_r = (tpx - dx * 0.12 - nx * bw_tip, tpy - dy * 0.12 - ny * bw_tip)
        b_point = (tpx, tpy)

        blade_poly = [b_base_l, b_shoulder_l, b_point, b_shoulder_r, b_base_r]

        # 1. Outer Electric Aura
        draw.polygon(blade_poly, fill=COLORS['blade_edge'], outline=COLORS['lightning'], width=3)

        # 2. Cyan Glowing Plasma Fuller
        draw.polygon([
            (gpx + nx * 7, gpy + ny * 7),
            (tpx - dx * 0.15 + nx * 4.5, tpy - dy * 0.15 + ny * 4.5),
            (tpx - dx * 0.08, tpy - dy * 0.08),
            (tpx - dx * 0.15 - nx * 4.5, tpy - dy * 0.15 - ny * 4.5),
            (gpx - nx * 7, gpy - ny * 7)
        ], fill=COLORS['blade_plasma'])

        # 3. White-hot Plasma Core
        draw.line([gpx, gpy, tpx - dx * 0.05, tpy - dy * 0.05], fill=COLORS['blade_core'], width=5)

        # 4. Crackling Lightning Arcs wrapping the Greatsword Blade
        for arc_i in range(5):
            pos_t = (arc_i + 1) / 6.0
            mx = gpx + dx * pos_t + nx * math.sin(arc_i * 1.8) * 12
            my = gpy + dy * pos_t + ny * math.sin(arc_i * 1.8) * 12

            prev_x = gpx + dx * (pos_t - 0.15)
            prev_y = gpy + dy * (pos_t - 0.15)
            next_x = gpx + dx * (pos_t + 0.15)
            next_y = gpy + dy * (pos_t + 0.15)

            draw.line([prev_x, prev_y, mx, my], fill=COLORS['lightning_core'], width=2)
            draw.line([mx, my, next_x, next_y], fill=COLORS['lightning'], width=1)
            draw.point([mx + 1, my - 1], fill=COLORS['lightning_core'])

    add_prim(sword_rz, draw_massive_greatsword)

    # --- 10. 3D Lightning Orbiting Her Body (มีสายฟ้ารอบตัว) ---
    for li in range(8):
        phi = (li / 8.0) * math.pi * 2
        orb_r = 38 + math.sin(li * 1.5) * 8
        lx = math.cos(phi) * orb_r
        ly = 45 + math.sin(li * 1.7) * 45
        lz = math.sin(phi) * orb_r

        _, _, bolt_rz = rotate_y(lx, ly, lz, theta)

        def make_draw_body_lightning(lx=lx, ly=ly, lz=lz, li=li):
            def draw_body_lightning():
                p1 = project(lx, ly, lz)
                jx = lx + math.sin(li * 2.5) * 16
                jy = ly + 18
                jz = lz + math.cos(li * 2.5) * 16
                p2 = project(jx, jy, jz)

                draw.line([p1[0], p1[1], p2[0], p2[1]], fill=COLORS['lightning_core'], width=2)
                draw.line([p1[0], p1[1], p2[0], p2[1]], fill=COLORS['lightning'], width=1)
                draw.point([p1[0] + 1, p1[1] - 1], fill=COLORS['lightning_core'])
                draw.point([p2[0] - 1, p2[1] + 1], fill=COLORS['blade_plasma'])
            return draw_body_lightning
        add_prim(bolt_rz, make_draw_body_lightning(lx, ly, lz, li))

    # --- Painter's Algorithm: Sort by Z depth ---
    primitives.sort(key=lambda item: item[0])
    for _, draw_fn in primitives:
        draw_fn()

    # Downsample to crisp pixel art target resolution
    small = img.resize((w, h), Image.Resampling.NEAREST)
    return small

# Generate the 8-direction turnaround sheet
out_dir = r"C:\chronicles_of_fortune\public\assets\spellblade_isometric_8dir"
os.makedirs(out_dir, exist_ok=True)

strip = Image.new("RGBA", (160 * 8, 160), (0, 0, 0, 0))
frames = []

for col, d in enumerate(DIRECTIONS):
    theta = DIR_ANGLES[d]
    f = render_isometric_frame(theta, w=160, h=160)
    f.save(os.path.join(out_dir, f"{d}.png"))
    strip.paste(f, (col * 160, 0), f)
    frames.append(f)

sheet_path = os.path.join(out_dir, "spellblade_iso_8dir.png")
strip.save(sheet_path)

gif_path = os.path.join(out_dir, "spellblade_iso_turnaround.gif")
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=160, loop=0)

print("Saved Isometric Turnaround Strip to:", sheet_path)
print("Saved Isometric Animated GIF to:", gif_path)
