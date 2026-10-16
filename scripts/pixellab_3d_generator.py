import os
import math
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

def hex_to_rgba(hex_str, alpha=255):
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 6:
        r = int(hex_str[0:2], 16)
        g = int(hex_str[2:4], 16)
        b = int(hex_str[4:6], 16)
        return (r, g, b, alpha)
    return (255, 255, 255, alpha)

class PixelLab3DEngine:
    def __init__(self, spec=None):
        self.spec = spec or {
            'name': 'catgirl_rogue',
            'skin': (255, 230, 220, 255),
            'skin_shadow': (220, 180, 170, 255),
            'hair': (32, 35, 45, 255),
            'hair_hi': (65, 72, 92, 255),
            'outfit': (20, 22, 30, 255),
            'outfit_trim': (16, 185, 129, 255),
            'eye': (16, 185, 129, 255),
            'blade': (16, 185, 129, 255),
            'blade_core': (230, 255, 245, 255),
            'shadow': (10, 15, 25, 90),
            'ears': 'cat',
            'tail': 'cat',
            'weapon': 'daggers'
        }

    def render_frame(self, theta, state="Idle", frame_idx=0, w=64, h=64):
        # Render at 4x resolution for sub-pixel geometry, then downscale with Nearest Neighbor
        W, H = w * 4, h * 4
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
        tail_swing = 0
        hair_swing = 0

        if state == "Idle":
            t = (frame_idx / 4.0) * math.pi * 2
            bob = math.sin(t) * 4
            tail_swing = math.sin(t) * 15
            hair_swing = math.cos(t) * 5
        elif state == "Run":
            t = (frame_idx / 4.0) * math.pi * 2
            s = math.sin(t)
            bob = -abs(s) * 8
            stride_l = s * 35
            stride_r = -s * 35
            arm_pitch_l = -s * 45
            arm_pitch_r = s * 45
            tail_swing = s * 25
            hair_swing = -abs(s) * 15
        elif state == "Attack":
            if frame_idx == 0:
                arm_pitch_r, arm_roll_r, bob = -45, 20, -2
            elif frame_idx == 1:
                arm_pitch_r, arm_roll_r, bob = 30, 60, 6
            elif frame_idx == 2:
                arm_pitch_r, arm_roll_r, bob = 85, 80, 10
            else:
                arm_pitch_r, arm_roll_r, bob = 15, 30, 0

        cy += bob

        # Ground Shadow (fixed on ground plane)
        draw.ellipse([cx - 55, H - 40, cx + 55, H - 15], fill=self.spec['shadow'])

        # 3D Orthographic projection with slight RPG downward angle (-15 deg pitch)
        def project(x, y, z):
            rx, ry, rz = rotate_y(x, y, z, theta)
            px = cx + rx
            py = cy + ry - rz * 0.15
            return px, py, rz

        def add_prim(z_depth, draw_func):
            primitives.append((z_depth, draw_func))

        # --- 2. Tail (Originates strictly from sacrum: 0, 48, -14) ---
        if self.spec.get('tail') == 'cat':
            tail_pts = []
            for i in range(8):
                t_f = i / 7.0
                tz = -14 - math.sin(t_f * math.pi * 0.85) * 35
                ty = 48 - t_f * 42 + math.sin(t_f * math.pi) * 12
                tx = math.sin(t_f * math.pi) * (12 + tail_swing)
                tail_pts.append((tx, ty, tz))

            for i in range(len(tail_pts) - 1):
                p1, p2 = tail_pts[i], tail_pts[i+1]
                mid_z = (p1[2] + p2[2]) / 2.0
                _, _, rz = rotate_y((p1[0]+p2[0])/2, (p1[1]+p2[1])/2, mid_z, theta)
                def make_draw_tail(p1=p1, p2=p2):
                    def draw_tail():
                        x1, y1, _ = project(*p1)
                        x2, y2, _ = project(*p2)
                        draw.line([x1, y1, x2, y2], fill=self.spec['hair'], width=10)
                        draw.line([x1, y1, x2, y2], fill=self.spec['outfit_trim'], width=2)
                    return draw_tail
                add_prim(rz, make_draw_tail(p1, p2))

        # --- 3. Legs & Thighs (Left and Right) ---
        for is_right, stride in [(False, stride_l), (True, stride_r)]:
            side = 1 if is_right else -1
            lx = side * 14
            hip_pt = (lx, 50, stride * 0.2)
            knee_pt = (lx + side * 2, 90, stride)
            foot_pt = (lx + side * 2, 130, stride * 1.2)

            _, _, leg_rz = rotate_y(lx, 90, stride, theta)
            def make_draw_leg(hip_pt=hip_pt, knee_pt=knee_pt, foot_pt=foot_pt, side=side):
                def draw_leg():
                    hx, hy, _ = project(*hip_pt)
                    kx, ky, _ = project(*knee_pt)
                    fx, fy, _ = project(*foot_pt)

                    # Voluptuous thigh
                    draw.line([hx, hy, kx, ky], fill=self.spec['skin'], width=20)
                    draw.line([hx, hy, kx, ky], fill=self.spec['skin_shadow'], width=2)
                    # Calf & Boot
                    draw.line([kx, ky, fx, fy], fill=self.spec['skin'], width=14)
                    bx, by, _ = project(foot_pt[0], 115, foot_pt[2])
                    draw.line([bx, by, fx, fy], fill=self.spec['outfit'], width=12)
                return draw_leg
            add_prim(leg_rz, make_draw_leg(hip_pt, knee_pt, foot_pt, side))

        # --- 4. Pelvis & Voluptuous Hips (0, 48, 0) ---
        _, _, pelvis_rz = rotate_y(0, 48, 0, theta)
        def draw_pelvis():
            px, py, _ = project(0, 48, 0)
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)
            pw = math.sqrt((28 * cos_t)**2 + (18 * sin_t)**2)
            draw.ellipse([px - pw, py - 20, px + pw, py + 20], fill=self.spec['skin'], outline=self.spec['skin_shadow'], width=2)
            # Bikini
            if cos_t > 0:
                draw.polygon([(px - 12 * cos_t, py - 6), (px + 12 * cos_t, py - 6), (px, py + 15)], fill=self.spec['outfit'], outline=self.spec['outfit_trim'], width=1)
            else:
                draw.line([px - 15, py - 4, px + 15, py - 4], fill=self.spec['outfit'], width=4)
        add_prim(pelvis_rz, draw_pelvis)

        # --- 5. Slim Waist (0, 24, 0) ---
        _, _, waist_rz = rotate_y(0, 24, 0, theta)
        def draw_waist():
            px, py, _ = project(0, 24, 0)
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)
            ww = math.sqrt((16 * cos_t)**2 + (12 * sin_t)**2)
            draw.ellipse([px - ww, py - 12, px + ww, py + 12], fill=self.spec['skin'])
            if cos_t > 0.2: # Navel
                nx, ny, _ = project(0, 27, 10)
                draw.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=self.spec['skin_shadow'])
        add_prim(waist_rz, draw_waist)

        # --- 6. Voluptuous Bust (Two distinct 3D spheres at +/- 11, 2, 11) ---
        for side in (-1, 1):
            bx, by, bz = side * 11, 2, 11
            _, _, bust_rz = rotate_y(bx, by, bz, theta)
            def make_draw_bust(bx=bx, by=by, bz=bz):
                def draw_bust():
                    px, py, _ = project(bx, by, bz)
                    draw.ellipse([px - 16, py - 16, px + 16, py + 16], fill=self.spec['skin'], outline=self.spec['skin_shadow'], width=2)
                    if math.cos(theta) > -0.2: # Facing front/side
                        draw.ellipse([px - 11, py - 10, px + 11, py + 8], fill=self.spec['outfit'], outline=self.spec['outfit_trim'], width=1)
                return draw_bust
            add_prim(bust_rz, make_draw_bust(bx, by, bz))

        # --- 7. Head, Face & Anime Features (0, -42, 0) ---
        _, _, head_rz = rotate_y(0, -42, 0, theta)
        def draw_head():
            px, py, _ = project(0, -42, 0)
            # Neck
            nx, ny, _ = project(0, -18, 0)
            draw.rectangle([nx - 7, ny - 10, nx + 7, ny + 5], fill=self.spec['skin'])
            # Head volume
            draw.ellipse([px - 22, py - 24, px + 22, py + 24], fill=self.spec['skin'])

            cos_f = math.cos(theta)
            if cos_f > -0.15: # Face visible
                for s in (-1, 1):
                    ex, ey, ez = s * 9, -43, 16
                    epx, epy, erz = project(ex, ey, ez)
                    if erz > head_rz - 5:
                        draw.ellipse([epx - 5, epy - 6, epx + 5, epy + 6], fill=self.spec['eye'])
                        draw.ellipse([epx - 2, epy - 4, epx + 2, epy + 1], fill=(255, 255, 255, 255))
                        draw.arc([epx - 6, epy - 8, epx + 6, epy + 2], start=180, end=360, fill=(20, 20, 25, 255), width=2)
                if cos_f > 0.3: # Blush
                    b1x, b1y, _ = project(-12, -34, 15)
                    b2x, b2y, _ = project(12, -34, 15)
                    draw.ellipse([b1x - 4, b1y - 2, b1x + 4, b1y + 2], fill=(255, 170, 185, 150))
                    draw.ellipse([b2x - 4, b2y - 2, b2x + 4, b2y + 2], fill=(255, 170, 185, 150))
        add_prim(head_rz, draw_head)

        # --- 8. Cat Ears (Anchored on skull at +/- 13, -66, 0) ---
        if self.spec.get('ears') in ['cat', 'fox']:
            for s in (-1, 1):
                ear_x, ear_y, ear_z = s * 13, -66, 0
                _, _, ear_rz = rotate_y(ear_x, ear_y, ear_z, theta)
                def make_draw_ear(s=s, ear_x=ear_x, ear_y=ear_y, ear_z=ear_z):
                    def draw_ear():
                        p1 = project(ear_x - 9 * s, ear_y + 8, ear_z + 6)
                        pt = project(ear_x, ear_y - 26, ear_z)
                        p2 = project(ear_x + 9 * s, ear_y + 8, ear_z - 6)
                        draw.polygon([(p1[0], p1[1]), (pt[0], pt[1]), (p2[0], p2[1])], fill=self.spec['hair'], outline=self.spec['hair_hi'], width=1)
                        if math.cos(theta) > -0.2: # Inner pink fluff
                            pin = project(ear_x, ear_y - 14, ear_z + 3)
                            draw.polygon([(p1[0]+2, p1[1]-2), (pin[0], pin[1]), (p2[0]-2, p2[1]-2)], fill=(255, 215, 225, 255))
                    return draw_ear
                add_prim(ear_rz, make_draw_ear(s, ear_x, ear_y, ear_z))

        # --- 9. Hair Mass (Bangs + Side Locks + Back Cascade) ---
        for hi in range(5):
            hy_pt = -36 + hi * 22
            hz_pt = -13 - hi * 2
            _, _, hair_rz = rotate_y(0, hy_pt, hz_pt, theta)
            def make_draw_hair(hy_pt=hy_pt, hz_pt=hz_pt, hi=hi):
                def draw_hair():
                    px, py, _ = project(0, hy_pt, hz_pt)
                    cos_t = math.cos(theta)
                    sin_t = math.sin(theta)
                    hw_base = 22 + hi * 4
                    hw = math.sqrt((hw_base * cos_t)**2 + (14 * sin_t)**2)
                    draw.ellipse([px - hw, py - 12, px + hw, py + 12], fill=self.spec['hair'], outline=self.spec['hair_hi'], width=1)
                return draw_hair
            add_prim(hair_rz, make_draw_hair(hy_pt, hz_pt, hi))

        # --- 10. Arms & Dual Daggers (Skeletal matrix transforms) ---
        for is_right, pitch, roll in [(False, arm_pitch_l, arm_roll_l), (True, arm_pitch_r, arm_roll_r)]:
            side = 1 if is_right else -1
            sx = side * 24
            sy = 6
            sz = 0

            rad_p = math.radians(pitch)
            rad_r = math.radians(roll)

            hx = sx + math.sin(rad_r) * (18 * side)
            hy = sy + math.cos(rad_p) * 38
            hz = math.sin(rad_p) * 30

            dx = hx + math.sin(rad_r) * 12 * side
            dy = hy + 26
            dz = hz + 18

            _, _, arm_rz = rotate_y(hx, hy, hz, theta)
            def make_draw_weapon(sx=sx, sy=sy, sz=sz, hx=hx, hy=hy, hz=hz, dx=dx, dy=dy, dz=dz):
                def draw_weapon():
                    spx, spy, _ = project(sx, sy, sz)
                    hpx, hpy, _ = project(hx, hy, hz)
                    dpx, dpy, _ = project(dx, dy, dz)

                    # Arm
                    draw.line([spx, spy, hpx, hpy], fill=self.spec['skin'], width=11)
                    draw.line([spx, spy, hpx, hpy], fill=self.spec['skin_shadow'], width=1)
                    # Wrist band
                    draw.ellipse([hpx - 6, hpy - 4, hpx + 6, hpy + 4], fill=self.spec['outfit'])
                    # Dagger Blade
                    draw.polygon([(hpx - 4, hpy), (hpx + 4, hpy), (dpx, dpy)], fill=self.spec['blade'], outline=self.spec['blade_core'], width=1)
                    draw.line([hpx - 7, hpy, hpx + 7, hpy], fill=self.spec['outfit'], width=3)
                return draw_weapon
            add_prim(arm_rz, make_draw_weapon(sx, sy, sz, hx, hy, hz, dx, dy, dz))

        # --- Painter's Algorithm: Sort by Z depth ---
        primitives.sort(key=lambda item: item[0])
        for _, draw_fn in primitives:
            draw_fn()

        # Crisp Nearest-Neighbor Downsample to 64x64
        small = img.resize((w, h), Image.Resampling.NEAREST)
        return small

    def generate_full_package(self, export_dir=r"C:\chronicles_of_fortune\public\assets"):
        name = self.spec['name']
        target_dir = os.path.join(export_dir, name)
        os.makedirs(target_dir, exist_ok=True)

        print(f"\n[PixelLab 3D Engine] Rendering 100% Consistent 8-Direction Sprite Suite for: '{name}'")
        total_frames = 0

        # Master Spritesheet: 8 columns x 9 rows (64x64 each)
        SHEET_W = 64 * 8
        SHEET_H = 64 * 9
        master_sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))

        # 1. Idle (Row 0)
        idle_dir = os.path.join(target_dir, "Idle", "rotations")
        os.makedirs(idle_dir, exist_ok=True)
        for col, d in enumerate(DIRECTIONS):
            theta = DIR_ANGLES[d]
            frame = self.render_frame(theta, state="Idle", frame_idx=0)
            frame.save(os.path.join(idle_dir, f"{d}.png"))
            master_sheet.paste(frame, (col * 64, 0), frame)
            total_frames += 1

        # 2. Run (Rows 1..4)
        run_dir = os.path.join(target_dir, "Run", "rotations")
        os.makedirs(run_dir, exist_ok=True)
        for f in range(4):
            row = 1 + f
            for col, d in enumerate(DIRECTIONS):
                theta = DIR_ANGLES[d]
                frame = self.render_frame(theta, state="Run", frame_idx=f)
                frame.save(os.path.join(run_dir, f"{d}_{f}.png"))
                if f == 0:
                    frame.save(os.path.join(run_dir, f"{d}.png"))
                master_sheet.paste(frame, (col * 64, row * 64), frame)
                total_frames += 1

        # 3. Attack (Rows 5..8)
        atk_dir = os.path.join(target_dir, "Attack", "rotations")
        os.makedirs(atk_dir, exist_ok=True)
        for f in range(4):
            row = 5 + f
            for col, d in enumerate(DIRECTIONS):
                theta = DIR_ANGLES[d]
                frame = self.render_frame(theta, state="Attack", frame_idx=f)
                frame.save(os.path.join(atk_dir, f"{d}_{f}.png"))
                if f == 0:
                    frame.save(os.path.join(atk_dir, f"{d}.png"))
                master_sheet.paste(frame, (col * 64, row * 64), frame)
                total_frames += 1

        # Save Master Sheet
        sheet_path = os.path.join(target_dir, "master_spritesheet_3d.png")
        master_sheet.save(sheet_path)

        # Generate 360 Turnaround Animated GIF
        turnaround_frames = []
        for d in DIRECTIONS:
            theta = DIR_ANGLES[d]
            f = self.render_frame(theta, state="Idle", frame_idx=0).resize((256, 256), Image.Resampling.NEAREST)
            turnaround_frames.append(f)

        gif_path = os.path.join(target_dir, "turnaround_360.gif")
        turnaround_frames[0].save(gif_path, save_all=True, append_images=turnaround_frames[1:], duration=150, loop=0)

        # Metadata
        meta_path = os.path.join(target_dir, "metadata_3d.json")
        with open(meta_path, 'w', encoding='utf-8') as mf:
            json.dump({
                'name': name,
                'engine': 'PixelLab 3D Math Engine (Zero Morphing)',
                'directions': DIRECTIONS,
                'states': STATES,
                'total_frames': total_frames,
                'spritesheet': 'master_spritesheet_3d.png',
                'turnaround_gif': 'turnaround_360.gif'
            }, mf, indent=2)

        print(f"[SUCCESS] Generated all {total_frames} frames into: {target_dir}")
        print(f"Master Spritesheet: {sheet_path}")
        print(f"Turnaround GIF: {gif_path}")
        return sheet_path, gif_path

if __name__ == "__main__":
    engine = PixelLab3DEngine()
    engine.generate_full_package()
