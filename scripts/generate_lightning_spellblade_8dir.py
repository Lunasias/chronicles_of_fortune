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
    'skin': (255, 242, 238, 255),          # Porcelain fair white skin
    'skin_shadow': (230, 205, 200, 255),   # Soft peach shadow
    'hair': (248, 250, 255, 255),          # Pure white hair
    'hair_shadow': (190, 205, 225, 255),   # Soft ice-blue hair shading
    'hair_hi': (255, 255, 255, 255),       # Specular white
    'eye': (14, 165, 233, 255),            # Electric sky blue
    'eye_glow': (186, 230, 253, 255),      # Bright cyan-blue glow
    'outfit': (24, 30, 48, 255),           # Dark indigo micro-armor
    'outfit_trim': (56, 189, 248, 255),    # Cyan runic trim
    'blade_core': (224, 242, 254, 255),    # White-blue glowing plasma core
    'blade_edge': (14, 165, 233, 255),     # Electric blue blade edge
    'blade_guard': (30, 41, 59, 255),      # Steel blue guard
    'lightning': (56, 189, 248, 240),      # Crackling cyan lightning
    'lightning_core': (240, 249, 255, 255),# Intense white lightning bolt
    'shadow': (15, 23, 42, 100)            # Ground contact shadow
}

class LightningSpellblade3D:
    def __init__(self, name="lightning_spellblade"):
        self.name = name

    def render_frame(self, theta, state="Idle", frame_idx=0, w=128, h=128):
        # High-res internal rendering buffer for anti-aliasing / pixel snap
        W, H = w * 2, h * 2
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        cx = W // 2
        cy = H // 2 - 12
        primitives = []

        # --- 1. Skeletal Motion Dynamics ---
        bob = 0
        stride_l, stride_r = 0, 0
        arm_pitch_l, arm_pitch_r = 0, 0
        arm_roll_l, arm_roll_r = 0, 0
        sword_pitch = 0
        hair_wind = 0

        t = (frame_idx / 4.0) * math.pi * 2
        if state == "Idle":
            bob = math.sin(t) * 3
            hair_wind = math.sin(t) * 6
            arm_pitch_r = -15 + math.sin(t) * 4
            arm_roll_r = 18
            sword_pitch = -25 + math.sin(t) * 3
        elif state == "Run":
            s = math.sin(t)
            bob = -abs(s) * 6
            stride_l = s * 24
            stride_r = -s * 24
            arm_pitch_l = -s * 30
            arm_pitch_r = s * 30
            sword_pitch = 10 + s * 15
            hair_wind = -abs(s) * 12
        elif state == "Attack":
            if frame_idx == 0:
                arm_pitch_r, sword_pitch, bob = -45, -60, -2
            elif frame_idx == 1:
                arm_pitch_r, sword_pitch, bob = 15, -10, 4
            elif frame_idx == 2:
                arm_pitch_r, sword_pitch, bob = 65, 45, 8
            else:
                arm_pitch_r, sword_pitch, bob = 20, 10, 0

        cy += bob

        # Ground Shadow (Isometric ellipse on ground)
        draw.ellipse([cx - 45, H - 35, cx + 45, H - 12], fill=COLORS['shadow'])

        # 3D Orthographic projection with standard isometric top-down tilt (30 deg RPG view)
        def project(x, y, z):
            rx, ry, rz = rotate_y(x, y, z, theta)
            px = cx + rx
            py = cy + ry - rz * 0.25 # Isometric top-down Y foreshortening
            return px, py, rz

        def add_prim(z_depth, draw_func):
            primitives.append((z_depth, draw_func))

        # --- 2. Legs & Thighs (Left and Right) ---
        for is_right, stride in [(False, stride_l), (True, stride_r)]:
            side = 1 if is_right else -1
            lx = side * 12
            hip_pt = (lx, 36, stride * 0.2)
            knee_pt = (lx + side * 2, 70, stride)
            foot_pt = (lx + side * 2, 105, stride * 1.2)

            _, _, leg_rz = rotate_y(lx, 70, stride, theta)
            def make_draw_leg(hip_pt=hip_pt, knee_pt=knee_pt, foot_pt=foot_pt, side=side):
                def draw_leg():
                    hx, hy, _ = project(*hip_pt)
                    kx, ky, _ = project(*knee_pt)
                    fx, fy, _ = project(*foot_pt)

                    # Voluptuous Thigh
                    draw.line([hx, hy, kx, ky], fill=COLORS['skin'], width=16)
                    draw.line([hx, hy, kx, ky], fill=COLORS['skin_shadow'], width=2)
                    # Thigh-high Armor Boots
                    bx, by, _ = project(knee_pt[0], 65, knee_pt[2])
                    draw.line([bx, by, fx, fy], fill=COLORS['outfit'], width=12)
                    draw.line([bx, by, fx, fy], fill=COLORS['outfit_trim'], width=2)
                return draw_leg
            add_prim(leg_rz, make_draw_leg(hip_pt, knee_pt, foot_pt, side))

        # --- 3. Pelvis & Voluptuous Hips (0, 35, 0) ---
        _, _, pelvis_rz = rotate_y(0, 35, 0, theta)
        def draw_pelvis():
            px, py, _ = project(0, 35, 0)
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)
            pw = math.sqrt((24 * cos_t)**2 + (15 * sin_t)**2)
            draw.ellipse([px - pw, py - 16, px + pw, py + 16], fill=COLORS['skin'], outline=COLORS['skin_shadow'], width=2)
            # Micro-armor skirt / bikini
            if cos_t > 0:
                draw.polygon([(px - 10 * cos_t, py - 4), (px + 10 * cos_t, py - 4), (px, py + 12)], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
            else:
                draw.line([px - 14, py - 2, px + 14, py - 2], fill=COLORS['outfit'], width=4)
        add_prim(pelvis_rz, draw_pelvis)

        # --- 4. Slim Hourglass Waist (0, 16, 0) ---
        _, _, waist_rz = rotate_y(0, 16, 0, theta)
        def draw_waist():
            px, py, _ = project(0, 16, 0)
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)
            ww = math.sqrt((14 * cos_t)**2 + (10 * sin_t)**2)
            draw.ellipse([px - ww, py - 10, px + ww, py + 10], fill=COLORS['skin'])
            if cos_t > 0.2: # Navel
                nx, ny, _ = project(0, 18, 8)
                draw.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=COLORS['skin_shadow'])
        add_prim(waist_rz, draw_waist)

        # --- 5. Voluptuous Bust (Two distinct 3D spheres at +/- 9, -2, 9) ---
        for side in (-1, 1):
            bx, by, bz = side * 9, -2, 9
            _, _, bust_rz = rotate_y(bx, by, bz, theta)
            def make_draw_bust(bx=bx, by=by, bz=bz):
                def draw_bust():
                    px, py, _ = project(bx, by, bz)
                    draw.ellipse([px - 13, py - 13, px + 13, py + 13], fill=COLORS['skin'], outline=COLORS['skin_shadow'], width=2)
                    if math.cos(theta) > -0.25: # Front/side visible
                        draw.ellipse([px - 9, py - 8, px + 9, py + 7], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
                return draw_bust
            add_prim(bust_rz, make_draw_bust(bx, by, bz))

        # --- 6. Head, Glowing Blue Eyes & Face (0, -38, 0) ---
        _, _, head_rz = rotate_y(0, -38, 0, theta)
        def draw_head():
            px, py, _ = project(0, -38, 0)
            # Neck & Runic Choker
            nx, ny, _ = project(0, -18, 0)
            draw.rectangle([nx - 5, ny - 8, nx + 5, ny + 4], fill=COLORS['skin'])
            draw.line([nx - 5, ny, nx + 5, ny], fill=COLORS['outfit_trim'], width=2)
            # Head base
            draw.ellipse([px - 18, py - 20, px + 18, py + 20], fill=COLORS['skin'])

            cos_f = math.cos(theta)
            if cos_f > -0.2: # Face visible
                for s in (-1, 1):
                    ex, ey, ez = s * 7, -39, 14
                    epx, epy, erz = project(ex, ey, ez)
                    if erz > head_rz - 5:
                        # Glowing cyan/blue anime eye
                        draw.ellipse([epx - 4, epy - 5, epx + 4, epy + 5], fill=COLORS['eye'])
                        draw.ellipse([epx - 2, epy - 3, epx + 2, epy + 1], fill=COLORS['eye_glow'])
                        draw.arc([epx - 5, epy - 7, epx + 5, epy + 1], start=180, end=360, fill=(15, 23, 42, 255), width=2)
                # Soft cheek blush
                if cos_f > 0.3:
                    b1x, b1y, _ = project(-10, -31, 12)
                    b2x, b2y, _ = project(10, -31, 12)
                    draw.ellipse([b1x - 3, b1y - 2, b1x + 3, b1y + 2], fill=(255, 180, 190, 140))
                    draw.ellipse([b2x - 3, b2y - 2, b2x + 3, b2y + 2], fill=(255, 180, 190, 140))
        add_prim(head_rz, draw_head)

        # --- 7. Long Loose White Hair (Flowing Cascades with Occlusion) ---
        # 7.1 Bangs and Crown (Forehead)
        _, _, bangs_rz = rotate_y(0, -42, 10, theta)
        def draw_bangs():
            if math.cos(theta) > -0.3:
                px, py, _ = project(0, -42, 10)
                # Front fringe / bangs
                draw.polygon([(px - 16, py - 14), (px + 16, py - 14), (px + 8, py + 4), (px - 8, py + 4)], fill=COLORS['hair'], outline=COLORS['hair_shadow'], width=1)
                # Side locks framing face
                for s in (-1, 1):
                    lx, ly, _ = project(s * 15, -34, 8)
                    draw.polygon([(lx - 3, ly - 8), (lx + 3, ly - 8), (lx, ly + 22)], fill=COLORS['hair'], outline=COLORS['hair_shadow'], width=1)
        add_prim(bangs_rz, draw_bangs)

        # 7.2 Voluminous Long White Hair Cascading Down the Back (0 to past hips)
        for hi in range(7):
            hy_pt = -36 + hi * 15
            hz_pt = -12 - hi * 3
            _, _, hair_rz = rotate_y(0, hy_pt, hz_pt, theta)
            def make_draw_hair(hy_pt=hy_pt, hz_pt=hz_pt, hi=hi):
                def draw_hair():
                    px, py, _ = project(hair_wind * (hi * 0.15), hy_pt, hz_pt)
                    cos_t = math.cos(theta)
                    sin_t = math.sin(theta)
                    hw_base = 20 + hi * 4
                    hw = math.sqrt((hw_base * cos_t)**2 + (12 * sin_t)**2)
                    draw.ellipse([px - hw, py - 10, px + hw, py + 10], fill=COLORS['hair'], outline=COLORS['hair_shadow'], width=1)
                    # Hair highlight sheen
                    draw.line([px - hw * 0.7, py - 2, px + hw * 0.7, py - 2], fill=COLORS['hair_hi'], width=1)
                return draw_hair
            add_prim(hair_rz, make_draw_hair(hy_pt, hz_pt, hi))

        # --- 8. Left Arm (Off-hand / Casting Lightning) ---
        _, _, arm_l_rz = rotate_y(-18, 5, 0, theta)
        def draw_arm_l():
            spx, spy, _ = project(-18, 5, 0)
            hpx, hpy, _ = project(-26, 24, 10)
            draw.line([spx, spy, hpx, hpy], fill=COLORS['skin'], width=9)
            draw.line([spx, spy, hpx, hpy], fill=COLORS['skin_shadow'], width=1)
            # Pauldron armor
            draw.ellipse([spx - 6, spy - 4, spx + 6, spy + 4], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
        add_prim(arm_l_rz, draw_arm_l)

        # --- 9. Right Arm & Massive Glowing Blue Greatsword (Claymore) ---
        sx, sy, sz = 18, 5, 0
        rad_p = math.radians(arm_pitch_r)
        hx = sx + math.sin(rad_p) * 6
        hy = sy + math.cos(rad_p) * 28
        hz = math.sin(rad_p) * 22

        # Greatsword geometry: Hilt -> Guard -> Long Blade Tip
        rad_sw = math.radians(sword_pitch)
        # Blade vector in 3D (massive two-handed length = 75px)
        bx = hx + math.sin(rad_sw) * 10
        by = hy + math.cos(rad_sw) * 75
        bz = hz + math.sin(rad_sw) * 45

        # Average sword depth
        _, _, sword_rz = rotate_y((hx + bx) / 2, (hy + by) / 2, (hz + bz) / 2, theta)

        def draw_greatsword():
            spx, spy, _ = project(sx, sy, sz)
            hpx, hpy, _ = project(hx, hy, hz)
            tpx, tpy, _ = project(bx, by, bz)

            # Arm holding sword
            draw.line([spx, spy, hpx, hpy], fill=COLORS['skin'], width=10)
            draw.ellipse([spx - 6, spy - 4, spx + 6, spy + 4], fill=COLORS['outfit'], outline=COLORS['outfit_trim'], width=1)
            # Gauntlet
            draw.ellipse([hpx - 5, hpy - 4, hpx + 5, hpy + 4], fill=COLORS['outfit'])

            # Greatsword Guard (Cross-guard)
            gx1, gy1, _ = project(hx - 14, hy + 6, hz)
            gx2, gy2, _ = project(hx + 14, hy + 6, hz)
            draw.line([gx1, gy1, gx2, gy2], fill=COLORS['blade_guard'], width=5)
            draw.line([gx1, gy1, gx2, gy2], fill=COLORS['outfit_trim'], width=1)

            # Massive Blue Greatsword Blade (Tapered double-edged claymore)
            dx = tpx - hpx
            dy = tpy - hpy
            dist = math.sqrt(dx*dx + dy*dy) or 1
            nx = -dy / dist * 6.5
            ny = dx / dist * 6.5

            blade_poly = [
                (hpx + nx, hpy + ny),
                (tpx + nx * 0.4, tpy + ny * 0.4),
                (tpx, tpy),
                (tpx - nx * 0.4, tpy - ny * 0.4),
                (hpx - nx, hpy - ny)
            ]
            # Outer electric aura glow
            draw.polygon(blade_poly, fill=COLORS['blade_edge'], outline=COLORS['lightning'], width=2)
            # Inner white-cyan plasma core
            draw.line([hpx, hpy, tpx, tpy], fill=COLORS['blade_core'], width=4)

            # Crackling Lightning Arcs winding around the Greatsword
            for li in range(4):
                lt = (li + 1) / 5.0
                mx = hpx + dx * lt + math.sin(t * 3 + li) * 8
                my = hpy + dy * lt + math.cos(t * 3 + li) * 6
                draw.line([hpx + dx * (lt - 0.2), hpy + dy * (lt - 0.2), mx, my], fill=COLORS['lightning_core'], width=2)
                draw.line([mx, my, hpx + dx * (lt + 0.2), hpy + dy * (lt + 0.2)], fill=COLORS['lightning'], width=1)

        add_prim(sword_rz, draw_greatsword)

        # --- 10. Crackling Lightning Aura Surrounding Her Body ---
        # 3D Lightning bolts orbiting in full 360 space
        for arc_i in range(6):
            arc_phi = (arc_i / 6.0) * math.pi * 2 + t * 2.0
            arc_r = 28 + math.sin(t * 4 + arc_i) * 6
            lx_pt = math.cos(arc_phi) * arc_r
            ly_pt = math.sin(arc_i * 1.5) * 35
            lz_pt = math.sin(arc_phi) * arc_r

            _, _, arc_rz = rotate_y(lx_pt, ly_pt, lz_pt, theta)

            def make_draw_lightning(lx_pt=lx_pt, ly_pt=ly_pt, lz_pt=lz_pt, arc_i=arc_i):
                def draw_lightning():
                    px1, py1, _ = project(lx_pt, ly_pt, lz_pt)
                    # Zigzag bolt
                    zig_x = lx_pt + (math.sin(arc_i * 2.0 + t * 5) * 12)
                    zig_y = ly_pt + 14
                    zig_z = lz_pt + (math.cos(arc_i * 2.0 + t * 5) * 12)
                    px2, py2, _ = project(zig_x, zig_y, zig_z)

                    draw.line([px1, py1, px2, py2], fill=COLORS['lightning_core'], width=2)
                    draw.line([px1, py1, px2, py2], fill=COLORS['lightning'], width=1)
                    # Lightning sparks
                    draw.point([px1 + 2, py1 - 2], fill=COLORS['lightning_core'])
                    draw.point([px2 - 2, py2 + 2], fill=COLORS['blade_core'])
                return draw_lightning

            add_prim(arc_rz, make_draw_lightning(lx_pt, ly_pt, lz_pt, arc_i))

        # --- Painter's Algorithm: Sort by Z depth (Furthest first -> Closest last) ---
        primitives.sort(key=lambda item: item[0])
        for _, draw_fn in primitives:
            draw_fn()

        # Downsample to target pixel art resolution (Crisp Nearest-Neighbor)
        small = img.resize((w, h), Image.Resampling.NEAREST)
        return small

    def generate_suite(self, export_dir=r"C:\chronicles_of_fortune\public\assets\lightning_spellblade"):
        os.makedirs(export_dir, exist_ok=True)
        print(f"\n[PixelLab Engine] Generating 8-Direction Isometric Lightning Spellblade Suite in: {export_dir}")

        total_frames = 0
        rotations_dir = os.path.join(export_dir, "Idle", "rotations")
        os.makedirs(rotations_dir, exist_ok=True)

        turnaround_frames = []
        turnaround_sheet = Image.new("RGBA", (128 * 8, 128), (0, 0, 0, 0))

        # 1. Generate 8-Direction Isometric Turnaround
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

        # 3. Master Spritesheet: 8 columns (directions) x 9 rows (Idle, Run x4, Attack x4)
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
                'hair': 'Pure White / Long Loose',
                'skin': 'Porcelain Fair White',
                'eyes': 'Glowing Electric Blue',
                'weapon': 'Massive Blue Greatsword with Crackling Lightning',
                'view': 'Top-down Isometric 8 Directions (Zero Morphing)',
                'directions': DIRECTIONS,
                'total_frames': total_frames,
                'files': {
                    'turnaround_strip': 'turnaround_8dir_sheet.png',
                    'turnaround_gif': 'turnaround_360.gif',
                    'master_spritesheet': 'master_spritesheet_72f.png'
                }
            }, mf, indent=2, ensure_ascii=False)

        print(f"[SUCCESS] Suite generated successfully!")
        print(f"1. 8-Direction Turnaround Strip: {sheet_path}")
        print(f"2. 360 Animated GIF: {gif_path}")
        print(f"3. Master Spritesheet: {master_sheet_path}")
        return sheet_path, gif_path, master_sheet_path

if __name__ == "__main__":
    builder = LightningSpellblade3D()
    builder.generate_suite()
