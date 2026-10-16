import os
import math
import numpy as np
import trimesh
from PIL import Image, ImageDraw

# -------------------------------------------------------------
# Color Palette Definition (Anime Spellblade)
# -------------------------------------------------------------
PALETTE = {
    'skin': np.array([255, 244, 240, 255], dtype=np.uint8),
    'skin_shadow': np.array([238, 208, 202, 255], dtype=np.uint8),
    'hair': np.array([252, 253, 255, 255], dtype=np.uint8),
    'hair_shadow': np.array([205, 222, 242, 255], dtype=np.uint8),
    'eye': np.array([14, 165, 233, 255], dtype=np.uint8),
    'eye_glow': np.array([186, 230, 253, 255], dtype=np.uint8),
    'outfit': np.array([20, 24, 38, 255], dtype=np.uint8),
    'outfit_trim': np.array([56, 189, 248, 255], dtype=np.uint8),
    'boot': np.array([24, 28, 44, 255], dtype=np.uint8),
    'blade_core': np.array([255, 255, 255, 255], dtype=np.uint8),
    'blade_plasma': np.array([56, 189, 248, 255], dtype=np.uint8),
    'blade_edge': np.array([2, 132, 199, 255], dtype=np.uint8),
    'blade_guard': np.array([30, 41, 59, 255], dtype=np.uint8),
    'blade_gold': np.array([245, 158, 11, 255], dtype=np.uint8),
    'lightning': np.array([56, 189, 248, 255], dtype=np.uint8),
    'lightning_core': np.array([255, 255, 255, 255], dtype=np.uint8)
}

# -------------------------------------------------------------
# 3D Model Construction
# -------------------------------------------------------------
class SpellbladeModel:
    def __init__(self):
        self.parts = [] # List of (mesh, base_color, is_emissive)
        self.build_model()

    def add_mesh(self, mesh, color, is_emissive=False):
        self.parts.append((mesh, color, is_emissive))

    def build_model(self):
        # 1. Head & Scalp (Icosphere at Y = 56, Radius = 10)
        head = trimesh.creation.icosphere(subdivisions=2, radius=9.5)
        head.apply_translation([0, 56, 0])
        self.add_mesh(head, PALETTE['skin'])

        # 2. Long Loose White Hair (Complete Coverage - Scalp, Bangs & Cascading Locks)
        # Scalp / Hair Crown (Covers entire top, back and sides of head)
        hair_crown = trimesh.creation.icosphere(subdivisions=2, radius=10.6)
        # Flatten slightly at front/bottom to show face
        hair_crown.apply_translation([0, 56.5, -1.0])
        self.add_mesh(hair_crown, PALETTE['hair'])

        # Front Bangs (Parted fringe)
        for s in (-1, 1):
            bang = trimesh.creation.capsule(height=6, radius=2.5)
            bang.apply_translation([s * 4, 58, 8.5])
            self.add_mesh(bang, PALETTE['hair'])

        # Long Sidelocks framing cheeks (Past shoulders down to Y = 36)
        for s in (-1, 1):
            lock = trimesh.creation.cylinder(radius=2.2, height=22, sections=8)
            lock.apply_translation([s * 8.5, 46, 3])
            self.add_mesh(lock, PALETTE['hair'])

        # Back Cascading Hair (Covering entire back from crown Y=58 down to hips Y=20!)
        for ox in np.linspace(-8, 8, 7):
            curve_z = -7.5 - abs(ox) * 0.4
            back_strand = trimesh.creation.cylinder(radius=3.0, height=38, sections=8)
            # Tilt strand slightly back
            rot_m = trimesh.transformations.rotation_matrix(math.radians(-6), [1, 0, 0])
            back_strand.apply_transform(rot_m)
            back_strand.apply_translation([ox, 38, curve_z])
            self.add_mesh(back_strand, PALETTE['hair'])

        # 3. Slender Neck & Collar (Y = 48)
        neck = trimesh.creation.cylinder(radius=3.5, height=6, sections=12)
        neck.apply_translation([0, 48, 0])
        self.add_mesh(neck, PALETTE['skin'])
        collar = trimesh.creation.annulus(r_min=3.6, r_max=4.4, height=1.5, sections=12)
        collar.apply_translation([0, 48, 0])
        self.add_mesh(collar, PALETTE['outfit_trim'], is_emissive=True)

        # 4. Voluptuous Bust & Micro-armor (Y = 42, Z = 5.5)
        for s in (-1, 1):
            bust = trimesh.creation.icosphere(subdivisions=2, radius=5.2)
            bust.apply_translation([s * 4.4, 42, 5.2])
            self.add_mesh(bust, PALETTE['skin'])
            # Dark micro bikini cup
            cup = trimesh.creation.icosphere(subdivisions=1, radius=5.4)
            # Clip back half
            cup.apply_translation([s * 4.4, 42, 5.6])
            self.add_mesh(cup, PALETTE['outfit'])

        # 5. Narrow Hourglass Torso & Waist (Y = 32 to 38)
        torso = trimesh.creation.cylinder(radius=5.2, height=10, sections=12)
        torso.apply_translation([0, 35, 0])
        self.add_mesh(torso, PALETTE['skin'])

        # 6. Voluptuous Hips & Micro-armor Bottom (Y = 26)
        hips = trimesh.creation.icosphere(subdivisions=2, radius=8.8)
        # Scale to wider oval hips
        hips.apply_scale([1.2, 0.75, 0.95])
        hips.apply_translation([0, 26, 0])
        self.add_mesh(hips, PALETTE['skin'])

        # Dark bikini bottom
        bikini = trimesh.creation.box(extents=[12, 5, 8.5])
        bikini.apply_translation([0, 26, 0])
        self.add_mesh(bikini, PALETTE['outfit'])

        # 7. Legs & Thigh-high Armored Boots
        for s in (-1, 1):
            # Fair Thigh (Y = 16 to 24)
            thigh = trimesh.creation.capsule(height=9, radius=4.4)
            thigh.apply_translation([s * 5.2, 20, 0.5])
            self.add_mesh(thigh, PALETTE['skin'])

            # Knee cuff with glowing cyan rune
            cuff = trimesh.creation.cylinder(radius=4.6, height=2, sections=12)
            cuff.apply_translation([s * 5.2, 15, 0.5])
            self.add_mesh(cuff, PALETTE['outfit_trim'], is_emissive=True)

            # High Boot (Y = 2 to 14)
            boot = trimesh.creation.capsule(height=12, radius=3.8)
            boot.apply_translation([s * 5.2, 8, 0.5])
            self.add_mesh(boot, PALETTE['boot'])

            # Foot
            foot = trimesh.creation.box(extents=[4.5, 3, 7])
            foot.apply_translation([s * 5.2, 1.5, 1.5])
            self.add_mesh(foot, PALETTE['boot'])

        # 8. Arms & Combat Grip Posture
        # Shoulders (Y = 44)
        for s in (-1, 1):
            shoulder = trimesh.creation.icosphere(subdivisions=1, radius=3.2)
            shoulder.apply_translation([s * 9.5, 44, 0])
            self.add_mesh(shoulder, PALETTE['outfit'])

        # Left Arm (Holding upper grip)
        arm_l = trimesh.creation.cylinder(radius=2.2, height=14, sections=8)
        arm_l.apply_translation([-7.5, 37, 4.5])
        self.add_mesh(arm_l, PALETTE['skin'])

        # Right Arm (Gripping hilt)
        arm_r = trimesh.creation.cylinder(radius=2.2, height=14, sections=8)
        arm_r.apply_translation([7.5, 37, 4.5])
        self.add_mesh(arm_r, PALETTE['skin'])

        # 9. MASSIVE GLOWING BLUE GREATSWORD (True 3D Geometry!)
        # The greatsword is held in ready posture in front/right:
        # Crossguard centered at (X=7, Y=33, Z=8)
        # Blade angles diagonally: base at (7, 34, 8), tip at (24, 75, 14)
        # Length = 46 units, Width = 11 units, Thickness = 2.4 units!

        sword_origin = np.array([6.0, 32.0, 7.0])
        # Calculate rotation to point along blade vector
        blade_vec = np.array([14.0, 40.0, 4.0])
        blade_len = np.linalg.norm(blade_vec)
        blade_dir = blade_vec / blade_len

        # Transform matrix aligning Y-axis to blade_dir
        y_axis = np.array([0.0, 1.0, 0.0])
        rot_axis = np.cross(y_axis, blade_dir)
        rot_axis_norm = np.linalg.norm(rot_axis)
        if rot_axis_norm > 1e-5:
            rot_axis = rot_axis / rot_axis_norm
            rot_angle = math.acos(np.dot(y_axis, blade_dir))
            sword_rot = trimesh.transformations.rotation_matrix(rot_angle, rot_axis)
        else:
            sword_rot = np.eye(4)

        # Crossguard (Heavy titanium with runic trim)
        guard = trimesh.creation.box(extents=[19.0, 3.2, 4.5])
        guard.apply_transform(sword_rot)
        guard.apply_translation(sword_origin)
        self.add_mesh(guard, PALETTE['blade_guard'])

        # Crossguard Gold Gem
        guard_gem = trimesh.creation.icosphere(subdivisions=1, radius=2.2)
        guard_gem.apply_translation(sword_origin)
        self.add_mesh(guard_gem, PALETTE['blade_gold'], is_emissive=True)

        # Hilt & Pommel (Extending downward from guard)
        hilt = trimesh.creation.cylinder(radius=1.8, height=12.0, sections=8)
        hilt.apply_transform(sword_rot)
        hilt.apply_translation(sword_origin - blade_dir * 6.0)
        self.add_mesh(hilt, PALETTE['blade_guard'])

        pommel = trimesh.creation.icosphere(subdivisions=1, radius=2.8)
        pommel.apply_translation(sword_origin - blade_dir * 12.0)
        self.add_mesh(pommel, PALETTE['blade_gold'], is_emissive=True)

        # Broad Greatsword Blade (Electric Blue Body)
        # Outer cutting edge
        blade_outer = trimesh.creation.box(extents=[10.5, blade_len, 2.2])
        blade_outer.apply_transform(sword_rot)
        blade_outer.apply_translation(sword_origin + blade_dir * (blade_len * 0.5))
        self.add_mesh(blade_outer, PALETTE['blade_edge'])

        # Cyan Glowing Plasma Fuller (Slightly narrower and glowing)
        blade_plasma = trimesh.creation.box(extents=[7.0, blade_len * 0.92, 2.5])
        blade_plasma.apply_transform(sword_rot)
        blade_plasma.apply_translation(sword_origin + blade_dir * (blade_len * 0.5))
        self.add_mesh(blade_plasma, PALETTE['blade_plasma'], is_emissive=True)

        # White-hot Plasma Spine Core (Super bright center)
        blade_core = trimesh.creation.box(extents=[3.0, blade_len * 0.88, 2.8])
        blade_core.apply_transform(sword_rot)
        blade_core.apply_translation(sword_origin + blade_dir * (blade_len * 0.5))
        self.add_mesh(blade_core, PALETTE['blade_core'], is_emissive=True)

# -------------------------------------------------------------
# Z-Buffer Software Rasterizer with Isometric Projection
# -------------------------------------------------------------
def render_turnaround_8dir(model, out_path, frame_size=160):
    # Supersampling factor 2x for smooth antialiasing
    scale_factor = 2
    W = frame_size * scale_factor
    H = frame_size * scale_factor

    directions = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
    angles = [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0]

    # Isometric Camera Setup:
    # Elevation pitch = 30° (classic 2:1 isometric ratio)
    cos_pitch = math.cos(math.radians(30)) # 0.8660
    sin_pitch = math.sin(math.radians(30)) # 0.5000

    view_scale = 3.6 # Pixels per 3D unit
    cx = W // 2
    ground_y = H - int(45 * scale_factor)

    # Directional Key Light (from top-left front)
    light_dir = np.array([-0.4, 0.7, 0.6])
    light_dir = light_dir / np.linalg.norm(light_dir)

    frames = []

    for angle_deg in angles:
        theta = math.radians(angle_deg)
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)

        # Frame buffers
        color_buf = np.zeros((H, W, 4), dtype=np.uint8)
        z_buf = np.full((H, W), -1e9, dtype=np.float32)

        # 1. Ground Shadow Ellipse
        img_shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_sh = ImageDraw.Draw(img_shadow)
        sw_r = int(24 * view_scale)
        sh_r = int(12 * view_scale)
        draw_sh.ellipse([cx - sw_r, ground_y - sh_r, cx + sw_r, ground_y + sh_r], fill=(15, 23, 42, 110))
        del draw_sh

        # 2. Render all 3D mesh parts with Z-buffering
        for mesh, base_color, is_emissive in model.parts:
            verts = mesh.vertices.copy()
            faces = mesh.faces
            normals = mesh.face_normals

            # Rotate vertices around vertical Y-axis by theta
            vx = verts[:, 0]
            vy = verts[:, 1]
            vz = verts[:, 2]

            rx = vx * cos_t + vz * sin_t
            ry = vy
            rz = -vx * sin_t + vz * cos_t

            # Project to screen coordinates
            # Screen X: cx + rx * scale
            # Screen Y: ground_y - (ry * cos_pitch - rz * sin_pitch) * scale
            # Depth Z: (rz * cos_pitch + ry * sin_pitch)
            px = cx + rx * view_scale
            py = ground_y - (ry * cos_pitch - rz * sin_pitch) * view_scale
            pz = rz * cos_pitch + ry * sin_pitch

            # Rotate face normals for lighting
            nx = normals[:, 0] * cos_t + normals[:, 2] * sin_t
            ny = normals[:, 1]
            nz = -normals[:, 0] * sin_t + normals[:, 2] * cos_t
            r_normals = np.stack([nx, ny, nz], axis=1)

            # Shading calculation
            if is_emissive:
                face_colors = np.tile(base_color, (len(faces), 1))
            else:
                diffuse = np.clip(np.sum(r_normals * light_dir, axis=1), 0.25, 1.0)
                # Ambient + diffuse lighting
                face_colors = np.zeros((len(faces), 4), dtype=np.uint8)
                for c_i in range(3):
                    face_colors[:, c_i] = np.clip(base_color[c_i] * (0.4 + 0.6 * diffuse), 0, 255).astype(np.uint8)
                face_colors[:, 3] = base_color[3]

            # Vectorized Triangle Rasterization
            v0_idx = faces[:, 0]
            v1_idx = faces[:, 1]
            v2_idx = faces[:, 2]

            p0 = np.stack([px[v0_idx], py[v0_idx], pz[v0_idx]], axis=1)
            p1 = np.stack([px[v1_idx], py[v1_idx], pz[v1_idx]], axis=1)
            p2 = np.stack([px[v2_idx], py[v2_idx], pz[v2_idx]], axis=1)

            for f_i in range(len(faces)):
                t0, t1, t2 = p0[f_i], p1[f_i], p2[f_i]

                min_x = max(0, int(min(t0[0], t1[0], t2[0])))
                max_x = min(W - 1, int(max(t0[0], t1[0], t2[0])))
                min_y = max(0, int(min(t0[1], t1[1], t2[1])))
                max_y = min(H - 1, int(max(t0[1], t1[1], t2[1])))

                if min_x > max_x or min_y > max_y:
                    continue

                det = (t1[1] - t2[1]) * (t0[0] - t2[0]) + (t2[0] - t1[0]) * (t0[1] - t2[1])
                if abs(det) < 1e-5:
                    continue

                xs, ys = np.meshgrid(np.arange(min_x, max_x + 1), np.arange(min_y, max_y + 1))
                w0 = ((t1[1] - t2[1]) * (xs - t2[0]) + (t2[0] - t1[0]) * (ys - t2[1])) / det
                w1 = ((t2[1] - t0[1]) * (xs - t0[0]) + (t0[0] - t2[0]) * (ys - t0[1])) / det
                w2 = 1.0 - w0 - w1

                inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
                if not np.any(inside):
                    continue

                z_interp = w0 * t0[2] + w1 * t1[2] + w2 * t2[2]
                ys_in = ys[inside]
                xs_in = xs[inside]
                zs_in = z_interp[inside]

                closer = zs_in > z_buf[ys_in, xs_in]
                if np.any(closer):
                    ys_pass = ys_in[closer]
                    xs_pass = xs_in[closer]
                    zs_pass = zs_in[closer]

                    z_buf[ys_pass, xs_pass] = zs_pass
                    color_buf[ys_pass, xs_pass] = face_colors[f_i]

        # Convert 3D buffer to PIL Image
        frame_img = Image.fromarray(color_buf, 'RGBA')
        final_frame = Image.alpha_composite(img_shadow, frame_img)
        draw = ImageDraw.Draw(final_frame)

        # 3. Glowing Anime Eyes Decals (Only visible when facing camera cos_t > -0.25)
        if cos_t > -0.25:
            for s in (-1, 1):
                ex = s * 4.4
                ey = 56.5
                ez = 8.8
                rx = ex * cos_t + ez * sin_t
                ry = ey
                rz = -ex * sin_t + ez * cos_t

                # Project eye position
                epx = cx + rx * view_scale
                epy = ground_y - (ry * cos_pitch - rz * sin_pitch) * view_scale
                epz = rz * cos_pitch + ry * sin_pitch

                # If eye is in front of head surface
                if epz > z_buf[int(epy), int(epx)] - 4.0:
                    ew, eh = 3.5 * scale_factor, 4.5 * scale_factor
                    # Deep sapphire base
                    draw.ellipse([epx - ew, epy - eh, epx + ew, epy + eh], fill=(2, 132, 199, 255))
                    # Electric cyan glow
                    draw.ellipse([epx - ew * 0.7, epy - eh * 0.6, epx + ew * 0.7, epy + eh * 0.6], fill=(14, 165, 233, 255))
                    # Bright white specular shine
                    draw.ellipse([epx - ew * 0.3, epy - eh * 0.5, epx + ew * 0.3, epy - eh * 0.1], fill=(255, 255, 255, 255))

        # 4. Crackling Lightning Arcs (Wrapping Greatsword & Orbiting Body)
        np.random.seed(int(angle_deg) + 42)
        # 4.1 Lightning wrapping the blade
        blade_base = np.array([6.0, 32.0, 7.0])
        blade_tip = np.array([20.0, 72.0, 11.0])
        for li in range(4):
            t_start = li / 4.0
            t_end = (li + 1) / 4.0
            pt1_3d = blade_base + (blade_tip - blade_base) * t_start
            pt2_3d = blade_base + (blade_tip - blade_base) * t_end

            # Jitter in 3D
            jitter1 = np.random.uniform(-3, 3, 3)
            jitter2 = np.random.uniform(-3, 3, 3)

            p1_rot_x = (pt1_3d[0] + jitter1[0]) * cos_t + (pt1_3d[2] + jitter1[2]) * sin_t
            p1_rot_y = pt1_3d[1] + jitter1[1]
            p1_rot_z = -(pt1_3d[0] + jitter1[0]) * sin_t + (pt1_3d[2] + jitter1[2]) * cos_t

            p2_rot_x = (pt2_3d[0] + jitter2[0]) * cos_t + (pt2_3d[2] + jitter2[2]) * sin_t
            p2_rot_y = pt2_3d[1] + jitter2[1]
            p2_rot_z = -(pt2_3d[0] + jitter2[0]) * sin_t + (pt2_3d[2] + jitter2[2]) * cos_t

            sx1 = cx + p1_rot_x * view_scale
            sy1 = ground_y - (p1_rot_y * cos_pitch - p1_rot_z * sin_pitch) * view_scale
            sx2 = cx + p2_rot_x * view_scale
            sy2 = ground_y - (p2_rot_y * cos_pitch - p2_rot_z * sin_pitch) * view_scale

            draw.line([sx1, sy1, sx2, sy2], fill=(56, 189, 248, 255), width=3 * scale_factor)
            draw.line([sx1, sy1, sx2, sy2], fill=(255, 255, 255, 255), width=1 * scale_factor)

        # 4.2 Lightning sparks orbiting the body
        for sp_i in range(8):
            phi = (sp_i / 8.0) * math.pi * 2 + angle_deg * 0.05
            orb_r = 16.0 + math.sin(sp_i * 1.5) * 4.0
            sp_x = math.cos(phi) * orb_r
            sp_y = 20.0 + (sp_i / 8.0) * 36.0
            sp_z = math.sin(phi) * orb_r

            s_rx = sp_x * cos_t + sp_z * sin_t
            s_ry = sp_y
            s_rz = -sp_x * sin_t + sp_z * cos_t

            spx = cx + s_rx * view_scale
            spy = ground_y - (s_ry * cos_pitch - s_rz * sin_pitch) * view_scale

            # Spark diamond
            sr = 2 * scale_factor
            draw.polygon([(spx, spy - sr), (spx + sr, spy), (spx, spy + sr), (spx - sr, spy)], fill=(255, 255, 255, 255))
            draw.line([spx - sr * 1.5, spy, spx + sr * 1.5, spy], fill=(56, 189, 248, 255), width=1 * scale_factor)

        # Downsample 2x to crisp pixel art target resolution
        pixel_frame = final_frame.resize((frame_size, frame_size), Image.Resampling.NEAREST)
        frames.append(pixel_frame)

    # Combine into 8-direction horizontal strip
    strip = Image.new("RGBA", (frame_size * 8, frame_size), (0, 0, 0, 0))
    for col, f in enumerate(frames):
        strip.paste(f, (col * frame_size, 0), f)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    strip.save(out_path)

    # Save animated turnaround GIF
    gif_path = os.path.splitext(out_path)[0] + ".gif"
    frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=150, loop=0)

    print("Successfully generated Master 3D Isometric 8-Direction Turnaround Strip:", out_path)
    print("Successfully generated Turnaround Animated GIF:", gif_path)

if __name__ == "__main__":
    print("Building 3D Anime Spellblade Model...")
    model = SpellbladeModel()
    print("Parts count:", len(model.parts))
    out_file = r"C:\chronicles_of_fortune\public\assets\master_isometric_spellblade\spellblade_master_8dir.png"
    render_turnaround_8dir(model, out_file, frame_size=160)
