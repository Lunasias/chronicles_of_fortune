import os
import math
import random
import json
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

STATES = ['Idle', 'Run', 'Attack']

# 3D Math Helper: Rotate vector around Y-axis by theta
def rotate_y(x, y, z, theta):
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)
    xr = x * cos_t + z * sin_t
    zr = -x * sin_t + z * cos_t
    return xr, y, zr

COLORS = {
    'skin': (255, 243, 238, 255),          # Porcelain fair white skin
    'skin_shadow': (235, 205, 198, 255),   # Soft peach shadow
    'hair': (250, 252, 255, 255),          # Pure white hair
    'hair_shadow': (200, 215, 235, 255),   # Soft ice-blue shadow
    'hair_hi': (255, 255, 255, 255),       # Pure white specular
    'eye': (14, 165, 233, 255),            # Electric sky blue
    'eye_glow': (186, 230, 253, 255),      # Bright cyan-blue glow
    'eye_dark': (3, 105, 161, 255),        # Deep sapphire pupil
    'outfit': (20, 26, 42, 255),           # Dark indigo micro-armor
    'outfit_shadow': (12, 16, 28, 255),
    'outfit_trim': (56, 189, 248, 255),    # Cyan glowing rune trim
    'blade_core': (240, 249, 255, 255),    # Intense white plasma core
    'blade_plasma': (56, 189, 248, 255),   # Brilliant cyan glow
    'blade_edge': (2, 132, 199, 255),      # Electric blue blade edge
    'blade_guard': (30, 41, 59, 255),      # Dark forged titanium
    'blade_gold': (250, 204, 21, 255),     # Gold runic pommel/inlay
    'lightning': (56, 189, 248, 250),      # Crackling cyan lightning
    'lightning_core': (255, 255, 255, 255),# White core bolt
    'lightning_aura': (14, 165, 233, 120), # Diffuse electric aura
    'shadow': (15, 23, 42, 110)            # Ground contact shadow
}

class PerfectIsometricSpellblade:
    def __init__(self, name="lightning_spellblade_iso"):
        self.name = name

    def render_frame(self, theta, state="Idle", frame_idx=0, w=128, h=128):
        # 2x supersampling for crisp geometric projection
        W, H = w * 2, h * 2
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        cx = W // 2
        cy = H // 2 - 16
        primitives = []

        # --- 1. Top-Down Isometric Projection Constants ---
        # Camera angle: 30° downward isometric pitch
        # Y_proj = cy + y * cos(30°) - z * sin(30°)
        # where cos(30°) ≈ 0.866, sin(30°) = 0.5
        ISO_COS = math.cos(math.radians(30))
        ISO_SIN = math.sin(math.radians(30))

        def project(x, y, z):
            rx, ry, rz = rotate_y(x, y, z, theta)
            px = cx + rx
            py = cy + (ry * ISO_COS) - (rz * ISO_SIN)
            return px, py, rz

        def add_prim(z_depth, draw_func):
            primitives.append((z_depth, draw_func))

        # --- 2. Skeletal Motion Dynamics ---
        bob = 0
        stride_l, stride_r = 0, 0
        body_twist = 0
        t = (frame_idx / 4.0) * math.pi * 2

        if state == "Idle":
            bob = math.sin(t) * 3
        elif state == "Run":
            s = math.sin(t)
            bob = -abs(s) * 6
            stride_l = s * 22
            stride_r = -s * 22
            body_twist = s * 0.1
        elif state == "Attack":
            if frame_idx == 0:
                bob = -3
            elif frame_idx == 1:
                bob = 4
            elif frame_idx == 2:
                bob = 8
            else:
                bob = 0

        cy += bob

        # Ground Shadow (True isometric ellipse on ground plane)
        draw.ellipse([cx - 48, H - 42, cx + 48, H - 16], fill=COLORS['shadow'])

        # --- 3. Legs & Thighs (Left and Right) ---
        for is_right, stride in [(False, stride_l), (True, stride_r)]:
            side = 1 if is_right else -1
            lx = side * 13
            hip_pt = (lx, 42, stride * 0.2)
            knee_pt = (lx + side * 2, 75, stride)
            foot_pt = (lx + side * 2, 110, stride * 1.25)

            _, _, leg_rz = rotate_y(lx, 75, stride, theta)

            def make_draw_leg(hip_pt=hip_pt, knee_pt=knee_pt, foot_pt=foot_pt, side=side):
                def draw_leg():
                    hx, hy, _ = project(*hip_pt)
                    kx, ky, _ = project(*knee_pt)
                    fx, fy, _ = project(*foot_pt)

                    # Voluptuous Fair Thigh
                    draw.line([hx, hy, kx, ky], fill=COLORS['skin'], width=18)
                    draw.line([hx, hy, kx, ky], fill=COLORS['skin_shadow'], width=2)
                    # Thigh-strap
                    sx, sy, _ = project(hip_pt[0], 55, hip_pt[2])
                    draw.ellipse([sx - 10, sy - 4, sx + 10, sy + 4], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
                    # Armored Greaves & Boots
                    bx, by, _ = project(knee_pt[0], 70, knee_pt[2])
                    draw.line([bx, by, fx, fy], fill=COLORS['outfit'], width=14)
                    draw.line([bx, by, fx, fy], fill=COLORS['outfit_trim'], width=2)
                return draw_leg
            add_prim(leg_rz, make_draw_leg(hip_pt, knee_pt, foot_pt, side))

        # --- 4. Pelvis & Voluptuous Hips (0, 40, 0) ---
        _, _, pelvis_rz = rotate_y(0, 40, 0, theta)
        def draw_pelvis():
            px, py, _ = project(0, 40, 0)
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)
            pw = math.sqrt((26 * cos_t)**2 + (16 * sin_t)**2)
            draw.ellipse([px - pw, py - 18, px + pw, py + 18], fill=COLORS['skin'], outline=COLORS['skin_shadow'], width=2)
            # Micro-armor bottom / runic panties
            if cos_t > 0:
                draw.polygon([(px - 11 * cos_t, py - 4), (px + 11 * cos_t, py - 4), (px, py + 14)], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
            else:
                draw.line([px - 15, py - 2, px + 15, py - 2], fill=COLORS['outfit'], width=5)
        add_prim(pelvis_rz, draw_pelvis)

        # --- 5. Narrow Hourglass Waist (0, 18, 0) ---
        _, _, waist_rz = rotate_y(0, 18, 0, theta)
        def draw_waist():
            px, py, _ = project(0, 18, 0)
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)
            ww = math.sqrt((15 * cos_t)**2 + (11 * sin_t)**2)
            draw.ellipse([px - ww, py - 11, px + ww, py + 11], fill=COLORS['skin'])
            if cos_t > 0.2: # Navel
                nx, ny, _ = project(0, 22, 9)
                draw.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=COLORS['skin_shadow'])
        add_prim(waist_rz, draw_waist)

        # --- 6. Voluptuous Bust (Two distinct 3D spheres at +/- 10, -2, 11) ---
        for side in (-1, 1):
            bx, by, bz = side * 10, -2, 11
            _, _, bust_rz = rotate_y(bx, by, bz, theta)
            def make_draw_bust(bx=bx, by=by, bz=bz):
                def draw_bust():
                    px, py, _ = project(bx, by, bz)
                    draw.ellipse([px - 15, py - 15, px + 15, py + 15], fill=COLORS['skin'], outline=COLORS['skin_shadow'], width=2)
                    if math.cos(theta) > -0.2: # Facing front/profile
                        draw.ellipse([px - 10, py - 9, px + 10, py + 8], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
                return draw_bust
            add_prim(bust_rz, make_draw_bust(bx, by, bz))

        # --- 7. Head, Glowing Blue Eyes & Anime Face (0, -42, 0) ---
        _, _, head_rz = rotate_y(0, -42, 0, theta)
        def draw_head():
            px, py, _ = project(0, -42, 0)
            # Neck & Runic Collar
            nx, ny, _ = project(0, -20, 0)
            draw.rectangle([nx - 6, ny - 10, nx + 6, ny + 4], fill=COLORS['skin'])
            draw.line([nx - 6, ny, nx + 6, ny], fill=COLORS['outfit_trim'], width=2)
            # Head volume (sphere seen slightly from above)
            draw.ellipse([px - 20, py - 22, px + 20, py + 22], fill=COLORS['skin'])

            cos_f = math.cos(theta)
            if cos_f > -0.2: # Face visible
                for s in (-1, 1):
                    ex, ey, ez = s * 8, -44, 16
                    epx, epy, erz = project(ex, ey, ez)
                    if erz > head_rz - 5:
                        # Large anime eye with cyan iris and white reflection
                        draw.ellipse([epx - 5, epy - 6, epx + 5, epy + 6], fill=COLORS['eye_dark'])
                        draw.ellipse([epx - 4, epy - 3, epx + 4, epy + 5], fill=COLORS['eye'])
                        draw.ellipse([epx - 2, epy - 4, epx + 2, epy + 1], fill=COLORS['eye_glow'])
                        draw.point([epx + 1, epy - 3], fill=(255, 255, 255, 255))
                        # Eyelash line
                        draw.arc([epx - 6, epy - 8, epx + 6, epy + 2], start=180, end=360, fill=(15, 23, 42, 255), width=2)
                # Cheek blush
                if cos_f > 0.3:
                    b1x, b1y, _ = project(-11, -34, 14)
                    b2x, b2y, _ = project(11, -34, 14)
                    draw.ellipse([b1x - 4, b1y - 2, b1x + 4, b1y + 2], fill=(255, 185, 195, 160))
                    draw.ellipse([b2x - 4, b2y - 2, b2x + 4, b2y + 2], fill=(255, 185, 195, 160))
        add_prim(head_rz, draw_head)

        # --- 8. Long Loose Flowing White Hair (Full 3D Volumetric Strands) ---
        # 8.1 Crown & Fringe Bangs (Forehead)
        _, _, bangs_rz = rotate_y(0, -48, 12, theta)
        def draw_bangs():
            if math.cos(theta) > -0.25:
                # Top hair cap
                px, py, _ = project(0, -56, 4)
                draw.ellipse([px - 22, py - 14, px + 22, py + 14], fill=COLORS['hair'], outline=COLORS['hair_shadow'], width=1)
                # Front center bangs parted gracefully
                bx1, by1, _ = project(-14, -48, 18)
                bx2, by2, _ = project(0, -40, 18)
                bx3, by3, _ = project(14, -48, 18)
                draw.polygon([(bx1, by1), (bx2, by2), (bx3, by3)], fill=COLORS['hair'])
                draw.line([bx1, by1, bx2, by2], fill=COLORS['hair_shadow'], width=1)
                draw.line([bx3, by3, bx2, by2], fill=COLORS['hair_shadow'], width=1)
        add_prim(bangs_rz, draw_bangs)

        # 8.2 Side Sidelocks framing the face (Left and Right)
        for s in (-1, 1):
            lx, ly, lz = s * 16, -30, 8
            _, _, lock_rz = rotate_y(lx, ly, lz, theta)
            def make_draw_sidelock(s=s, lx=lx, ly=ly, lz=lz):
                def draw_sidelock():
                    p_top = project(s * 18, -48, 6)
                    p_mid = project(s * 20, -25, 10)
                    p_tip = project(s * 15, 10, 8)
                    draw.polygon([(p_top[0], p_top[1]), (p_mid[0], p_mid[1]), (p_tip[0], p_tip[1])], fill=COLORS['hair'], outline=COLORS['hair_shadow'], width=1)
                return draw_sidelock
            add_prim(lock_rz, make_draw_sidelock(s, lx, ly, lz))

        # 8.3 Long Flowing Back Hair (Cascading past waist to hips)
        # Modeled as multiple flowing 3D ribbon strands that billow behind her
        for strand_i in range(-3, 4):
            offset_x = strand_i * 6
            curve_z = -12 - abs(strand_i) * 3
            _, _, back_hair_rz = rotate_y(offset_x, -10, curve_z, theta)

            def make_draw_back_hair(offset_x=offset_x, curve_z=curve_z, strand_i=strand_i):
                def draw_back_hair():
                    pts = []
                    for seg in range(6):
                        sy = -45 + seg * 16
                        # Wind dynamics: wavy sway
                        wind_x = offset_x + math.sin(t * 1.5 + seg * 0.8 + strand_i) * 5
                        wind_z = curve_z - (seg * 3) + math.cos(t * 1.5 + seg) * 3
                        pts.append(project(wind_x, sy, wind_z))

                    for i in range(len(pts) - 1):
                        p1, p2 = pts[i], pts[i+1]
                        w_strand = max(4, 14 - i * 2)
                        draw.line([p1[0], p1[1], p2[0], p2[1]], fill=COLORS['hair'], width=w_strand)
                        draw.line([p1[0], p1[1], p2[0], p2[1]], fill=COLORS['hair_shadow'], width=1)
                return draw_back_hair
            add_prim(back_hair_rz, make_draw_back_hair(offset_x, curve_z, strand_i))

        # --- 9. Left Arm (Grip & Support / Rune Gauntlet) ---
        _, _, arm_l_rz = rotate_y(-18, 12, 4, theta)
        def draw_arm_l():
            spx, spy, _ = project(-18, 6, 0)
            hpx, hpy, _ = project(-14, 28, 14) # Left hand gripping upper sword hilt
            draw.line([spx, spy, hpx, hpy], fill=COLORS['skin'], width=11)
            draw.line([spx, spy, hpx, hpy], fill=COLORS['skin_shadow'], width=1)
            draw.ellipse([spx - 6, spy - 4, spx + 6, spy + 4], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
            draw.ellipse([hpx - 5, hpy - 4, hpx + 5, hpy + 4], fill=COLORS['outfit'])
        add_prim(arm_l_rz, draw_arm_l)

        # --- 10. Massive Glowing Blue Greatsword (Two-Handed Claymore) ---
        # Positioned prominently diagonally across torso:
        # Hilt at (-14, 26, 14), Cross-guard at (-6, 32, 16), Blade extends to (42, 98, 22)
        # OR held proudly upright in combat-ready angle, visible from all 8 directions!
        hilt_x, hilt_y, hilt_z = -12, 24, 14
        guard_x, guard_y, guard_z = -4, 30, 16
        blade_tip_x, blade_tip_y, blade_tip_z = 32, 102, 22

        # In Attack state, sword swings outward in an arc!
        if state == "Attack":
            if frame_idx == 1:
                blade_tip_x, blade_tip_y = 55, 75
            elif frame_idx == 2:
                blade_tip_x, blade_tip_y = 70, 30

        mid_sword = ((hilt_x + blade_tip_x)/2, (hilt_y + blade_tip_y)/2, (hilt_z + blade_tip_z)/2)
        _, _, sword_rz = rotate_y(*mid_sword, theta)

        def draw_massive_greatsword():
            hpx, hpy, _ = project(hilt_x, hilt_y, hilt_z)
            gpx, gpy, _ = project(guard_x, guard_y, guard_z)
            tpx, tpy, _ = project(blade_tip_x, blade_tip_y, blade_tip_z)

            # Right arm gripping lower hilt
            r_spx, r_spy, _ = project(18, 6, 0)
            draw.line([r_spx, r_spy, hpx, hpy], fill=COLORS['skin'], width=11)
            draw.line([r_spx, r_spy, hpx, hpy], fill=COLORS['skin_shadow'], width=1)
            draw.ellipse([r_spx - 6, r_spy - 4, r_spx + 6, r_spy + 4], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)

            # Hilt Grip
            draw.line([hpx, hpy, gpx, gpy], fill=COLORS['blade_guard'], width=6)
            draw.line([hpx, hpy, gpx, gpy], fill=COLORS['blade_gold'], width=2)
            # Pommel
            draw.ellipse([hpx - 4, hpy - 4, hpx + 4, hpy + 4], fill=COLORS['blade_gold'])

            # Heavy Titanium Cross-Guard
            dx = tpx - gpx
            dy = tpy - gpy
            dist = math.hypot(dx, dy) or 1
            nx = -dy / dist
            ny = dx / dist

            # Guard width = 28px
            gx1, gy1 = gpx + nx * 14, gpy + ny * 14
            gx2, gy2 = gpx - nx * 14, gpy - ny * 14
            draw.line([gx1, gy1, gx2, gy2], fill=COLORS['blade_guard'], width=7)
            draw.line([gx1, gy1, gx2, gy2], fill=COLORS['outfit_trim'], width=2)

            # MASSIVE GREATSWORD BLADE (Broad double-edged claymore)
            # Blade half-width = 11px at base, 8px at tip before point
            bw_base = 11.0
            bw_tip = 7.5

            b_base_l = (gpx + nx * bw_base, gpy + ny * bw_base)
            b_base_r = (gpx - nx * bw_base, gpy - ny * bw_base)
            b_shoulder_l = (tpx - dx * 0.12 + nx * bw_tip, tpy - dy * 0.12 + ny * bw_tip)
            b_shoulder_r = (tpx - dx * 0.12 - nx * bw_tip, tpy - dy * 0.12 - ny * bw_tip)
            b_point = (tpx, tpy)

            blade_poly = [b_base_l, b_shoulder_l, b_point, b_shoulder_r, b_base_r]

            # 1. Electric blue outer cutting edge
            draw.polygon(blade_poly, fill=COLORS['blade_edge'], outline=COLORS['blade_plasma'], width=2)
            # 2. Glowing cyan plasma fuller/inlay
            draw.polygon([
                (gpx + nx * 5, gpy + ny * 5),
                (tpx - dx * 0.15 + nx * 3, tpy - dy * 0.15 + ny * 3),
                (tpx - dx * 0.08, tpy - dy * 0.08),
                (tpx - dx * 0.15 - nx * 3, tpy - dy * 0.15 - ny * 3),
                (gpx - nx * 5, gpy - ny * 5)
            ], fill=COLORS['blade_plasma'])
            # 3. White-hot lightning core beam down center of blade
            draw.line([gpx, gpy, tpx - dx * 0.05, tpy - dy * 0.05], fill=COLORS['blade_core'], width=3)

            # 4. Crackling Lightning Bolts wrapping the Greatsword Blade
            for arc_i in range(5):
                pos_t = (arc_i + 1) / 6.0
                mx = gpx + dx * pos_t + nx * math.sin(t * 4 + arc_i) * 10
                my = gpy + dy * pos_t + ny * math.sin(t * 4 + arc_i) * 10

                prev_x = gpx + dx * (pos_t - 0.15)
                prev_y = gpy + dy * (pos_t - 0.15)
                next_x = gpx + dx * (pos_t + 0.15)
                next_y = gpy + dy * (pos_t + 0.15)

                draw.line([prev_x, prev_y, mx, my], fill=COLORS['lightning_core'], width=2)
                draw.line([mx, my, next_x, next_y], fill=COLORS['lightning'], width=1)
                draw.point([mx + 1, my - 1], fill=COLORS['lightning_core'])

        add_prim(sword_rz, draw_massive_greatsword)

        # --- 11. Dynamic 3D Lightning Orbiting Her Body (มีสายฟ้ารอบตัว) ---
        # 6 Orbiting lightning spark nodes around character
        for li in range(8):
            phi = (li / 8.0) * math.pi * 2 + t * 2.2
            orb_r = 34 + math.sin(t * 3 + li) * 8
            lx = math.cos(phi) * orb_r
            ly = -10 + math.sin(li * 1.7) * 45
            lz = math.sin(phi) * orb_r

            _, _, bolt_rz = rotate_y(lx, ly, lz, theta)

            def make_draw_body_lightning(lx=lx, ly=ly, lz=lz, li=li):
                def draw_body_lightning():
                    p1 = project(lx, ly, lz)
                    # Zigzag lightning branch
                    jx = lx + math.sin(li * 2.5 + t * 4) * 14
                    jy = ly + 16
                    jz = lz + math.cos(li * 2.5 + t * 4) * 14
                    p2 = project(jx, jy, jz)

                    draw.line([p1[0], p1[1], p2[0], p2[1]], fill=COLORS['lightning_core'], width=2)
                    draw.line([p1[0], p1[1], p2[0], p2[1]], fill=COLORS['lightning'], width=1)
                    # Sparks
                    draw.point([p1[0] + 1, p1[1] - 1], fill=COLORS['lightning_core'])
                    draw.point([p2[0] - 1, p2[1] + 1], fill=COLORS['blade_plasma'])
                return draw_body_lightning
            add_prim(bolt_rz, make_draw_body_lightning(lx, ly, lz, li))

        # --- Painter's Algorithm: Sort by Z depth (Furthest first -> Closest last) ---
        primitives.sort(key=lambda item: item[0])
        for _, draw_fn in primitives:
            draw_fn()

        # Downsample to target pixel art resolution (Crisp Nearest-Neighbor)
        small = img.resize((w, h), Image.Resampling.NEAREST)
        return small

    def generate_suite(self, export_dir=r"C:\chronicles_of_fortune\public\assets\perfect_spellblade"):
        os.makedirs(export_dir, exist_ok=True)
        print(f"\n[Perfect Isometric Engine] Generating 8-Direction Isometric Lightning Spellblade Suite in: {export_dir}")

        total_frames = 0
        rotations_dir = os.path.join(export_dir, "Idle", "rotations")
        os.makedirs(rotations_dir, exist_ok=True)

        turnaround_frames = []
        turnaround_sheet = Image.new("RGBA", (128 * 8, 128), (0, 0, 0, 0))

        # 1. Generate 8-Direction Isometric Turnaround (128x128 HD Pixel Art)
        for col, d in enumerate(DIRECTIONS):
            theta = DIR_ANGLES[d]
            frame = self.render_frame(theta, state="Idle", frame_idx=0, w=128, h=128)
            frame.save(os.path.join(rotations_dir, f"{d}.png"))
            turnaround_sheet.paste(frame, (col * 128, 0), frame)
            turnaround_frames.append(frame)
            total_frames += 1

        # Save 8-Direction Turnaround Strip
        sheet_path = os.path.join(export_dir, "turnaround_8dir_sheet.png")
        turnaround_sheet.save(sheet_path)

        # 2. Save 360-degree Animated GIF
        gif_path = os.path.join(export_dir, "turnaround_360.gif")
        turnaround_frames[0].save(
            gif_path,
            save_all=True,
            append_images=turnaround_frames[1:],
            duration=160,
            loop=0
        )

        # 3. Master Spritesheet: 8 columns (directions) x 9 rows (Idle, Run x4, Attack x4) at 64x64
        SHEET_W = 64 * 8
        SHEET_H = 64 * 9
        master_sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))

        # Row 0: Idle
        for col, d in enumerate(DIRECTIONS):
            theta = DIR_ANGLES[d]
            f = self.render_frame(theta, state="Idle", frame_idx=0, w=64, h=64)
            master_sheet.paste(f, (col * 64, 0), f)

        # Rows 1..4: Run cycle
        run_dir = os.path.join(export_dir, "Run", "rotations")
        os.makedirs(run_dir, exist_ok=True)
        for r_f in range(4):
            row = 1 + r_f
            for col, d in enumerate(DIRECTIONS):
                theta = DIR_ANGLES[d]
                f = self.render_frame(theta, state="Run", frame_idx=r_f, w=64, h=64)
                f.save(os.path.join(run_dir, f"{d}_{r_f}.png"))
                if r_f == 0:
                    f.save(os.path.join(run_dir, f"{d}.png"))
                master_sheet.paste(f, (col * 64, row * 64), f)
                total_frames += 1

        # Rows 5..8: Attack cycle
        atk_dir = os.path.join(export_dir, "Attack", "rotations")
        os.makedirs(atk_dir, exist_ok=True)
        for a_f in range(4):
            row = 5 + a_f
            for col, d in enumerate(DIRECTIONS):
                theta = DIR_ANGLES[d]
                f = self.render_frame(theta, state="Attack", frame_idx=a_f, w=64, h=64)
                f.save(os.path.join(atk_dir, f"{d}_{a_f}.png"))
                if a_f == 0:
                    f.save(os.path.join(atk_dir, f"{d}.png"))
                master_sheet.paste(f, (col * 64, row * 64), f)
                total_frames += 1

        master_sheet_path = os.path.join(export_dir, "master_spritesheet_72f.png")
        master_sheet.save(master_sheet_path)

        # Metadata
        meta_path = os.path.join(export_dir, "metadata.json")
        with open(meta_path, 'w', encoding='utf-8') as mf:
            json.dump({
                'name': self.name,
                'class': 'Lightning Spellblade (สาวดาบเวทสายฟ้า)',
                'hair': 'Pure White / Long Flowing Loose Hair',
                'skin': 'Porcelain Fair White Skin',
                'eyes': 'Glowing Electric Sky Blue',
                'weapon': 'Massive Blue Greatsword (Two-Handed Claymore) with Crackling Lightning Arcs',
                'aura': '3D Orbiting Cyan/White Lightning Bolts',
                'view': 'True 30-Degree Top-Down Isometric 8 Directions (Zero Morphing)',
                'directions': DIRECTIONS,
                'total_frames': total_frames,
                'files': {
                    'turnaround_strip': 'turnaround_8dir_sheet.png',
                    'turnaround_gif': 'turnaround_360.gif',
                    'master_spritesheet': 'master_spritesheet_72f.png'
                }
            }, mf, indent=2, ensure_ascii=False)

        print(f"[SUCCESS] Perfect Isometric Suite generated!")
        print(f"1. 8-Direction Turnaround Strip: {sheet_path}")
        print(f"2. 360 Animated GIF: {gif_path}")
        print(f"3. Master Spritesheet: {master_sheet_path}")
        return sheet_path, gif_path, master_sheet_path

if __name__ == "__main__":
    builder = PerfectIsometricSpellblade()
    builder.generate_suite()
