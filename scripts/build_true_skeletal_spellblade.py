import os, math
import numpy as np
from PIL import Image, ImageDraw

OUTPUT_DIR = r"public\assets\A_female_magic_swordsman_with"
PORTRAITS_DIR = r"public\assets\portraits"

DIRECTIONS = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east']
DIR_MAP = {
    'south':      (0, 1, False, False),
    'south-west': (-0.7, 0.7, False, False),
    'west':       (-1, 0, False, True),
    'north-west': (-0.7, -0.7, True, False),
    'north':      (0, -1, True, False),
    'north-east': (0.7, -0.7, True, False),
    'east':       (1, 0, False, True),
    'south-east': (0.7, 0.7, False, False)
}

SKIN_PALE = (255, 238, 232, 255)
SKIN_SHADOW = (235, 195, 185, 255)
SKIN_HIGHLIGHT = (255, 250, 248, 255)

HAIR_WHITE = (253, 254, 255, 255)
HAIR_SHADOW = (215, 225, 245, 255)
HAIR_HIGHLIGHT = (255, 255, 255, 255)

EYE_BLUE = (56, 189, 248, 255)
EYE_DARK = (14, 116, 144, 255)

BIKINI_WHITE = (255, 255, 255, 255)
BIKINI_SHADOW = (205, 218, 240, 255)
BIKINI_GOLD = (245, 195, 50, 255)

SWORD_STEEL = (35, 45, 65, 255)
SWORD_CYAN = (56, 189, 248, 255)
SWORD_GLOW = (224, 242, 254, 255)
GOLD_TRIM = (245, 195, 50, 255)

def safe_box(x0, y0, x1, y1):
    return [min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)]

def rotate_pt(x, y, cx, cy, angle_rad):
    dx = x - cx
    dy = y - cy
    rx = dx * math.cos(angle_rad) - dy * math.sin(angle_rad)
    ry = dx * math.sin(angle_rad) + dy * math.cos(angle_rad)
    return cx + rx, cy + ry

def draw_limb_segment(draw, x0, y0, x1, y1, width_top, width_bot, fill_col, outline_col):
    dx = x1 - x0
    dy = y1 - y0
    length = math.hypot(dx, dy)
    if length < 1e-4: return
    nx = -dy / length
    ny = dx / length
    p0 = (x0 + nx * width_top / 2, y0 + ny * width_top / 2)
    p1 = (x0 - nx * width_top / 2, y0 - ny * width_top / 2)
    p2 = (x1 - nx * width_bot / 2, y1 - ny * width_bot / 2)
    p3 = (x1 + nx * width_bot / 2, y1 + ny * width_bot / 2)
    draw.polygon([p0, p1, p2, p3], fill=fill_col, outline=outline_col)

def draw_colossal_greatsword(draw, hx, hy, angle_rad, length=125, width=24, with_lightning=True, phase=0):
    sin_a = math.sin(angle_rad)
    cos_a = math.cos(angle_rad)
    
    # Hilt
    hilt_len = 35
    grip_x = hx - sin_a * hilt_len
    grip_y = hy + cos_a * hilt_len
    draw.line([grip_x, grip_y, hx, hy], fill=(45, 30, 20, 255), width=6)
    draw.ellipse(safe_box(grip_x - 5, grip_y - 5, grip_x + 5, grip_y + 5), fill=GOLD_TRIM)
    
    # Crossguard
    gx0, gy0 = rotate_pt(hx - 22, hy, hx, hy, angle_rad)
    gx1, gy1 = rotate_pt(hx + 22, hy, hx, hy, angle_rad)
    draw.line([gx0, gy0, gx1, gy1], fill=GOLD_TRIM, width=7)
    draw.ellipse(safe_box(hx - 6, hy - 6, hx + 6, hy + 6), fill=SWORD_CYAN)
    
    # Blade tip
    tip_x = hx + sin_a * length
    tip_y = hy - cos_a * length
    
    # Corner edges
    left_base = rotate_pt(hx - width/2, hy - 4, hx, hy, angle_rad)
    right_base = rotate_pt(hx + width/2, hy - 4, hx, hy, angle_rad)
    left_tip = rotate_pt(hx - width/2, hy - length + 22, hx, hy, angle_rad)
    right_tip = rotate_pt(hx + width/2, hy - length + 22, hx, hy, angle_rad)
    
    # Blade Polygon
    blade_pts = [left_base, right_base, right_tip, (tip_x, tip_y), left_tip]
    draw.polygon(blade_pts, fill=SWORD_STEEL, outline=SWORD_CYAN)
    
    # Center Plasma Fuller
    draw.line([(hx, hy), (tip_x, tip_y)], fill=SWORD_CYAN, width=5)
    draw.line([(hx, hy), (tip_x, tip_y)], fill=SWORD_GLOW, width=2)
    
    # Crackling Lightning along blade
    if with_lightning:
        for arc_i in range(3):
            t = 0.25 + arc_i * 0.28
            bx = hx + (tip_x - hx) * t
            by = hy + (tip_y - hy) * t
            j_x = math.sin(phase * 2.5 + arc_i) * 16
            j_y = math.cos(phase * 2.5 + arc_i) * 10
            draw.line([bx - 10 + j_x, by + 8 + j_y, bx + j_x, by + j_y, bx + 12 + j_x, by - 10 + j_y], fill=SWORD_CYAN, width=3)
            draw.line([bx - 10 + j_x, by + 8 + j_y, bx + j_x, by + j_y, bx + 12 + j_x, by - 10 + j_y], fill=(255, 255, 255, 255), width=1)

def render_skeletal_frame(direction: str, anim_state: str, frame_idx: int) -> Image.Image:
    # Virtual canvas: 512x512 downsampled to 256x256
    W, H = 512, 512
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    vec_x, vec_y, is_back, is_side = DIR_MAP[direction]
    flip_x = (vec_x > 0) and is_side
    facing_sign = -1 if vec_x < 0 else 1
    
    # Root Center
    cx = W // 2
    cy = H // 2 - 25
    
    # -------------------------------------------------------------
    # SKELETAL JOINT ANGLE COMPUTATIONS FOR ANIMATION STATES
    # -------------------------------------------------------------
    # Default pose
    hip_l_ang = 0.0
    knee_l_ang = 0.0
    hip_r_ang = 0.0
    knee_r_ang = 0.0
    torso_lean = 0.0
    torso_bob = 0.0
    arm_l_ang = math.radians(20)
    arm_r_ang = math.radians(-25)
    sword_ang = math.radians(35 * facing_sign)
    sword_hands = 1
    hair_flutter = math.sin((frame_idx / 4.0) * math.pi * 2) * 12
    
    slash_arc = False
    lightning_burst = False
    
    if anim_state == "Idle":
        # Breathing & weight shift
        b_phase = (frame_idx / 4.0) * math.pi * 2
        torso_bob = math.sin(b_phase) * 3
        torso_lean = math.sin(b_phase * 0.5) * 0.02
        hip_l_ang = math.radians(3)
        knee_l_ang = math.radians(-3)
        hip_r_ang = math.radians(-5)
        knee_r_ang = math.radians(5)
        arm_r_ang = math.radians(-20 + math.sin(b_phase) * 4)
        sword_ang = math.radians(40 * facing_sign + math.sin(b_phase) * 3)
        
    elif anim_state == "Run":
        # True 4-frame kinematic run cycle with leg strides, knee flexion, and hair stream
        if frame_idx == 0:
            # Contact Frame: Left leg forward, right leg back
            hip_l_ang = math.radians(-32)
            knee_l_ang = math.radians(18)
            hip_r_ang = math.radians(38)
            knee_r_ang = math.radians(55)
            torso_bob = 0
            torso_lean = math.radians(8 * facing_sign)
            arm_l_ang = math.radians(35)
            arm_r_ang = math.radians(-40)
            sword_ang = math.radians(55 * facing_sign)
            hair_flutter = -18 * facing_sign
        elif frame_idx == 1:
            # Down / Compression Frame: Both knees bend, body squats 8px
            hip_l_ang = math.radians(-15)
            knee_l_ang = math.radians(40)
            hip_r_ang = math.radians(15)
            knee_r_ang = math.radians(35)
            torso_bob = 8
            torso_lean = math.radians(10 * facing_sign)
            arm_l_ang = math.radians(20)
            arm_r_ang = math.radians(-25)
            sword_ang = math.radians(45 * facing_sign)
            hair_flutter = -10 * facing_sign
        elif frame_idx == 2:
            # Passing / Lift Frame: Right leg forward, left leg back
            hip_l_ang = math.radians(36)
            knee_l_ang = math.radians(50)
            hip_r_ang = math.radians(-30)
            knee_r_ang = math.radians(15)
            torso_bob = -2
            torso_lean = math.radians(8 * facing_sign)
            arm_l_ang = math.radians(-30)
            arm_r_ang = math.radians(30)
            sword_ang = math.radians(35 * facing_sign)
            hair_flutter = -22 * facing_sign
        elif frame_idx == 3:
            # Push-Off Spring Frame: Aerial thrust, right knee high
            hip_l_ang = math.radians(25)
            knee_l_ang = math.radians(20)
            hip_r_ang = math.radians(-42)
            knee_r_ang = math.radians(65)
            torso_bob = -8
            torso_lean = math.radians(11 * facing_sign)
            arm_l_ang = math.radians(40)
            arm_r_ang = math.radians(-45)
            sword_ang = math.radians(60 * facing_sign)
            hair_flutter = -26 * facing_sign

    elif anim_state == "Attack":
        # True full-body sword slash sequence
        if frame_idx == 0:
            # Wind-up: Greatsword pulled high behind shoulder, torso coiled
            torso_lean = math.radians(-12 * facing_sign)
            torso_bob = -3
            hip_l_ang = math.radians(15)
            knee_l_ang = math.radians(10)
            hip_r_ang = math.radians(-15)
            knee_r_ang = math.radians(20)
            arm_r_ang = math.radians(-95 * facing_sign)
            sword_ang = math.radians(-75 * facing_sign)
            hair_flutter = 15 * facing_sign
        elif frame_idx == 1:
            # Acceleration Downward Chop
            torso_lean = math.radians(15 * facing_sign)
            torso_bob = 5
            hip_l_ang = math.radians(-25)
            knee_l_ang = math.radians(35)
            hip_r_ang = math.radians(20)
            knee_r_ang = math.radians(15)
            arm_r_ang = math.radians(10 * facing_sign)
            sword_ang = math.radians(15 * facing_sign)
            hair_flutter = -20 * facing_sign
        elif frame_idx == 2:
            # Full Slash Extension & Colossal Crescent Arc!
            torso_lean = math.radians(22 * facing_sign)
            torso_bob = 6
            hip_l_ang = math.radians(-35)
            knee_l_ang = math.radians(45)
            hip_r_ang = math.radians(30)
            knee_r_ang = math.radians(10)
            arm_r_ang = math.radians(85 * facing_sign)
            sword_ang = math.radians(95 * facing_sign)
            slash_arc = True
            hair_flutter = -32 * facing_sign
        elif frame_idx == 3:
            # Recovery & Follow-Through
            torso_lean = math.radians(8 * facing_sign)
            torso_bob = 2
            hip_l_ang = math.radians(-10)
            knee_l_ang = math.radians(15)
            hip_r_ang = math.radians(10)
            knee_r_ang = math.radians(10)
            arm_r_ang = math.radians(65 * facing_sign)
            sword_ang = math.radians(115 * facing_sign)
            hair_flutter = -12 * facing_sign

    elif anim_state == "Cast":
        # Lightning Summoning & Skyward Channeling
        if frame_idx == 0:
            # Raise sword with two hands towards sky
            torso_lean = 0
            torso_bob = 0
            hip_l_ang = math.radians(-8)
            knee_l_ang = math.radians(8)
            hip_r_ang = math.radians(8)
            knee_r_ang = math.radians(8)
            arm_r_ang = math.radians(-135 * facing_sign)
            sword_ang = math.radians(-10 * facing_sign)
        elif frame_idx == 1:
            # Levitation: feet dangle, body lifts 14px
            torso_lean = 0
            torso_bob = -14
            hip_l_ang = math.radians(10)
            knee_l_ang = math.radians(25)
            hip_r_ang = math.radians(12)
            knee_r_ang = math.radians(30)
            arm_r_ang = math.radians(-155 * facing_sign)
            sword_ang = math.radians(0)
            hair_flutter = -25 # upward float
        elif frame_idx == 2:
            # Thunderbolt Surge: Lightning strikes the blade!
            torso_lean = 0
            torso_bob = -16
            hip_l_ang = math.radians(8)
            knee_l_ang = math.radians(20)
            hip_r_ang = math.radians(10)
            knee_r_ang = math.radians(24)
            arm_r_ang = math.radians(-160 * facing_sign)
            sword_ang = math.radians(0)
            lightning_burst = True
            hair_flutter = -35 # high flare
        elif frame_idx == 3:
            # Release: Ground shockwave
            torso_lean = math.radians(15 * facing_sign)
            torso_bob = 4
            hip_l_ang = math.radians(-20)
            knee_l_ang = math.radians(30)
            hip_r_ang = math.radians(20)
            knee_r_ang = math.radians(25)
            arm_r_ang = math.radians(45 * facing_sign)
            sword_ang = math.radians(70 * facing_sign)
            hair_flutter = 15

    # -------------------------------------------------------------
    # SKELETAL FORWARD KINEMATICS (FK) POSITIONS
    # -------------------------------------------------------------
    root_x = cx
    root_y = cy + torso_bob
    
    # Pelvis
    pelvis_x = root_x
    pelvis_y = root_y + 35
    
    # Hips (Left & Right)
    hip_sep = 24 if not is_side else 10
    hip_l_x = pelvis_x - hip_sep
    hip_l_y = pelvis_y
    hip_r_x = pelvis_x + hip_sep
    hip_r_y = pelvis_y
    
    # Left Leg (Thigh length = 55, Calf length = 55)
    thigh_l = 55
    calf_l = 55
    knee_l_x = hip_l_x + math.sin(hip_l_ang) * thigh_l
    knee_l_y = hip_l_y + math.cos(hip_l_ang) * thigh_l
    foot_l_x = knee_l_x + math.sin(hip_l_ang + knee_l_ang) * calf_l
    foot_l_y = knee_l_y + math.cos(hip_l_ang + knee_l_ang) * calf_l
    
    # Right Leg
    knee_r_x = hip_r_x + math.sin(hip_r_ang) * thigh_l
    knee_r_y = hip_r_y + math.cos(hip_r_ang) * thigh_l
    foot_r_x = knee_r_x + math.sin(hip_r_ang + knee_r_ang) * calf_l
    foot_r_y = knee_r_y + math.cos(hip_r_ang + knee_r_ang) * calf_l
    
    # Torso & Chest (Chest height = 55)
    chest_l = 55
    chest_x = root_x + math.sin(torso_lean) * chest_l
    chest_y = root_y - math.cos(torso_lean) * chest_l
    
    # Head & Neck (Head length = 42)
    head_x = chest_x + math.sin(torso_lean * 1.2) * 44
    head_y = chest_y - math.cos(torso_lean * 1.2) * 44
    
    # Shoulders
    shoulder_sep = 28 if not is_side else 12
    shoulder_r_x = chest_x + math.cos(torso_lean) * shoulder_sep * facing_sign
    shoulder_r_y = chest_y + math.sin(torso_lean) * shoulder_sep
    
    # Arm & Hand (Upper arm = 38, Forearm = 36)
    elbow_r_x = shoulder_r_x + math.sin(arm_r_ang) * 38
    elbow_r_y = shoulder_r_y + math.cos(arm_r_ang) * 38
    hand_r_x = elbow_r_x + math.sin(arm_r_ang) * 36
    hand_r_y = elbow_r_y + math.cos(arm_r_ang) * 36

    # -------------------------------------------------------------
    # DRAWING ANATOMICAL PIXEL RIG LAYERS
    # -------------------------------------------------------------
    # 0. Ground Shadow
    shadow_w = 75
    shadow_h = 24
    draw.ellipse(safe_box(root_x - shadow_w, H - 42, root_x + shadow_w, H - 18), fill=(8, 12, 24, 110))
    
    # 1. Back Flowing Hair (Wind fluttering)
    for strand in range(3):
        strand_w = 40 + strand * 14
        h_off = strand * 12
        h_pt0 = (head_x - 12 * facing_sign, head_y - 20)
        h_pt1 = (head_x - (45 + h_off) * facing_sign + hair_flutter * 1.2, head_y + 70 + h_off)
        h_pt2 = (head_x - (30 + h_off) * facing_sign + hair_flutter * 1.5, head_y + 160 + h_off)
        h_pt3 = (head_x + 12 * facing_sign, head_y - 10)
        draw.polygon([h_pt0, h_pt1, h_pt2, h_pt3], fill=HAIR_SHADOW, outline=HAIR_WHITE)
    
    # 2. Back Leg (Drawn first so it sits behind body)
    draw_limb_segment(draw, hip_l_x, hip_l_y, knee_l_x, knee_l_y, 28, 20, SKIN_PALE, SKIN_SHADOW)
    draw_limb_segment(draw, knee_l_x, knee_l_y, foot_l_x, foot_l_y, 20, 16, (250, 252, 255, 255), BIKINI_SHADOW) # White stocking
    draw.ellipse(safe_box(foot_l_x - 12, foot_l_y - 8, foot_l_x + 12, foot_l_y + 8), fill=BIKINI_SHADOW) # Foot shoe
    
    # 3. Voluptuous Pelvis, Hips & Butt
    hip_w = 38 if not is_side else 28
    draw.ellipse(safe_box(pelvis_x - hip_w, pelvis_y - 20, pelvis_x + hip_w, pelvis_y + 26), fill=SKIN_PALE, outline=SKIN_SHADOW)
    
    # 4. Front Leg (Drawn in front of pelvis)
    draw_limb_segment(draw, hip_r_x, hip_r_y, knee_r_x, knee_r_y, 28, 20, SKIN_PALE, SKIN_SHADOW)
    draw_limb_segment(draw, knee_r_x, knee_r_y, foot_r_x, foot_r_y, 20, 16, (250, 252, 255, 255), BIKINI_SHADOW) # White stocking
    draw.ellipse(safe_box(foot_r_x - 12, foot_r_y - 8, foot_r_x + 12, foot_r_y + 8), fill=BIKINI_SHADOW) # Foot shoe
    
    # White Garter Straps & Clips
    draw.line([pelvis_x - 10, pelvis_y + 8, hip_r_x, knee_r_y - 18], fill=BIKINI_WHITE, width=3)
    draw.line([pelvis_x + 10, pelvis_y + 8, hip_l_x, knee_l_y - 18], fill=BIKINI_WHITE, width=3)
    
    # 5. White Micro-Bikini Bottom
    if not is_back:
        draw.polygon([(pelvis_x - 22, pelvis_y - 6), (pelvis_x + 22, pelvis_y - 6), (pelvis_x, pelvis_y + 22)], fill=BIKINI_WHITE, outline=BIKINI_SHADOW)
        draw.line([pelvis_x - hip_w + 4, pelvis_y - 6, pelvis_x - 20, pelvis_y - 6], fill=BIKINI_WHITE, width=3)
        draw.line([pelvis_x + hip_w - 4, pelvis_y - 6, pelvis_x + 20, pelvis_y - 6], fill=BIKINI_WHITE, width=3)
    else:
        # Micro white string thong on glutes
        draw.line([pelvis_x - 6, pelvis_y - 10, pelvis_x, pelvis_y + 18], fill=BIKINI_WHITE, width=4)
        draw.line([pelvis_x - hip_w + 4, pelvis_y - 8, pelvis_x + hip_w - 4, pelvis_y - 8], fill=BIKINI_WHITE, width=3)
    
    # 6. Hourglass Torso & Narrow Waist
    waist_y = (root_y + chest_y) / 2
    waist_w = 22 if not is_side else 16
    draw.polygon([
        (pelvis_x - hip_w + 6, pelvis_y - 10),
        (pelvis_x + hip_w - 6, pelvis_y - 10),
        (root_x + waist_w, waist_y),
        (chest_x + 30, chest_y + 6),
        (chest_x - 30, chest_y + 6),
        (root_x - waist_w, waist_y)
    ], fill=SKIN_PALE, outline=SKIN_SHADOW)
    
    # 7. Voluptuous Bust (Large Cleavage)
    if not is_back:
        bw, bh = 28, 30
        draw.ellipse(safe_box(chest_x - bw - 2, chest_y - 14, chest_x + 4, chest_y + bh), fill=SKIN_PALE, outline=SKIN_SHADOW)
        draw.ellipse(safe_box(chest_x - 4, chest_y - 14, chest_x + bw + 2, chest_y + bh), fill=SKIN_PALE, outline=SKIN_SHADOW)
        draw.line([chest_x, chest_y - 6, chest_x, chest_y + bh - 6], fill=SKIN_SHADOW, width=2)
        # White Micro Bikini Cups
        draw.polygon([(chest_x - bw, chest_y + 6), (chest_x - 14, chest_y - 14), (chest_x - 2, chest_y + 16)], fill=BIKINI_WHITE, outline=BIKINI_SHADOW)
        draw.polygon([(chest_x + bw, chest_y + 6), (chest_x + 14, chest_y - 14), (chest_x + 2, chest_y + 16)], fill=BIKINI_WHITE, outline=BIKINI_SHADOW)
        draw.line([chest_x - 14, chest_y - 14, chest_x, chest_y - 28], fill=BIKINI_WHITE, width=2) # Neck ties
        draw.line([chest_x + 14, chest_y - 14, chest_x, chest_y - 28], fill=BIKINI_WHITE, width=2)
    else:
        # Bare Back with thin string
        draw.line([chest_x - 26, chest_y + 2, chest_x + 26, chest_y + 2], fill=BIKINI_WHITE, width=3)
    
    # 8. Beautiful Anime Head, Face, Blue Eyes
    draw.ellipse(safe_box(head_x - 26, head_y - 32, head_x + 26, head_y + 28), fill=SKIN_PALE, outline=SKIN_SHADOW)
    if not is_back:
        # Expressive bright blue anime eyes
        eye_y = head_y - 2
        eye_off = 12 if not is_side else (8 * facing_sign)
        if not is_side:
            draw.ellipse(safe_box(head_x - eye_off - 8, eye_y - 8, head_x - eye_off + 8, eye_y + 10), fill=EYE_BLUE)
            draw.ellipse(safe_box(head_x - eye_off - 4, eye_y - 6, head_x - eye_off + 2, eye_y + 2), fill=(255, 255, 255, 255))
            draw.ellipse(safe_box(head_x + eye_off - 8, eye_y - 8, head_x + eye_off + 8, eye_y + 10), fill=EYE_BLUE)
            draw.ellipse(safe_box(head_x + eye_off - 2, eye_y - 6, head_x + eye_off + 4, eye_y + 2), fill=(255, 255, 255, 255))
            draw.arc(safe_box(head_x - eye_off - 10, eye_y - 12, head_x - eye_off + 10, eye_y), start=180, end=360, fill=(35, 20, 25, 255), width=3)
            draw.arc(safe_box(head_x + eye_off - 10, eye_y - 12, head_x + eye_off + 10, eye_y), start=180, end=360, fill=(35, 20, 25, 255), width=3)
        else:
            # Side profile single anime eye
            draw.ellipse(safe_box(head_x + eye_off - 8, eye_y - 8, head_x + eye_off + 8, eye_y + 10), fill=EYE_BLUE)
            draw.ellipse(safe_box(head_x + eye_off - 3, eye_y - 6, head_x + eye_off + 3, eye_y + 2), fill=(255, 255, 255, 255))
            draw.arc(safe_box(head_x + eye_off - 10, eye_y - 12, head_x + eye_off + 10, eye_y), start=180, end=360, fill=(35, 20, 25, 255), width=3)
    
    # Bangs & Forehead Hair
    draw.polygon([
        (head_x - 30, head_y - 20),
        (head_x - 14, head_y + 6),
        (head_x, head_y + 10),
        (head_x + 14, head_y + 6),
        (head_x + 30, head_y - 20),
        (head_x, head_y - 42)
    ], fill=HAIR_WHITE, outline=HAIR_SHADOW)
    
    # 9. Front Arm Gripping the Greatsword
    draw_limb_segment(draw, shoulder_r_x, shoulder_r_y, elbow_r_x, elbow_r_y, 16, 14, SKIN_PALE, SKIN_SHADOW)
    draw_limb_segment(draw, elbow_r_x, elbow_r_y, hand_r_x, hand_r_y, 14, 12, SKIN_PALE, SKIN_SHADOW)
    draw.ellipse(safe_box(hand_r_x - 7, hand_r_y - 7, hand_r_x + 7, hand_r_y + 7), fill=SKIN_PALE, outline=SKIN_SHADOW)
    
    # 10. Colossal Glowing Cyan Greatsword
    draw_colossal_greatsword(draw, hand_r_x, hand_r_y, sword_ang, length=145, width=28, with_lightning=True, phase=frame_idx)
    
    # 11. Action Effects (Slash Arc / Lightning Call)
    if slash_arc:
        # Colossal horizontal crescent slash wave in front of heroine
        arc_cx = hand_r_x + math.sin(sword_ang) * 90
        arc_cy = hand_r_y - math.cos(sword_ang) * 90
        draw.arc(safe_box(arc_cx - 150, arc_cy - 120, arc_cx + 150, arc_cy + 120), start=240, end=440, fill=(56, 189, 248, 250), width=24)
        draw.arc(safe_box(arc_cx - 145, arc_cy - 115, arc_cx + 145, arc_cy + 115), start=245, end=435, fill=(240, 252, 255, 255), width=8)
        # Impact sparks
        for sp_i in range(8):
            sp_a = math.radians(sp_i * 45)
            draw.line([arc_cx, arc_cy, arc_cx + math.cos(sp_a) * 45, arc_cy + math.sin(sp_a) * 45], fill=SWORD_CYAN, width=3)
            draw.line([arc_cx, arc_cy, arc_cx + math.cos(sp_a) * 45, arc_cy + math.sin(sp_a) * 45], fill=(255, 255, 255, 255), width=1)
            
    if lightning_burst:
        # Colossal Lightning Bolt striking from heaven
        draw.line([hand_r_x - 20, 0, hand_r_x + 10, hand_r_y - 120, hand_r_x, hand_r_y - 140], fill=SWORD_CYAN, width=12)
        draw.line([hand_r_x - 20, 0, hand_r_x + 10, hand_r_y - 120, hand_r_x, hand_r_y - 140], fill=(255, 255, 255, 255), width=6)
        # Ground magic runes
        draw.ellipse(safe_box(root_x - 130, H - 70, root_x + 130, H - 10), outline=SWORD_CYAN, width=6)
        draw.ellipse(safe_box(root_x - 100, H - 55, root_x + 100, H - 25), outline=(224, 242, 254, 255), width=3)

    # Downsample from 512x512 virtual canvas to 256x256 pixel sprite
    final_im = im.resize((256, 256), Image.Resampling.LANCZOS)
    return final_im

def main():
    os.makedirs(PORTRAITS_DIR, exist_ok=True)
    states = ['Idle', 'Run', 'Attack', 'Cast']
    
    print("Synthesizing true skeletal anatomical frame-by-frame sprites for Spellblade...")
    total_frames = 0
    
    # Keep frames for animated GIFs
    gif_frames = {state: [] for state in states}
    
    for state in states:
        state_dir = os.path.join(OUTPUT_DIR, state, "rotations")
        os.makedirs(state_dir, exist_ok=True)
        
        for d in DIRECTIONS:
            for f in range(4):
                frame_img = render_skeletal_frame(d, state, f)
                
                # Save production sprite frames
                dest_f = os.path.join(state_dir, f"{d}_{f}.png")
                frame_img.save(dest_f)
                
                # Also save default rotation image for frame 0
                if f == 0:
                    dest_default = os.path.join(state_dir, f"{d}.png")
                    frame_img.save(dest_default)
                    
                total_frames += 1
                
                # Collect south-west (isometric front) for GIF preview
                if d == 'south-west':
                    gif_frames[state].append(frame_img)

    print(f"Synthesized all {total_frames} production frames across 8 directions!")
    
    # Generate Animated GIFs for in-chat verification
    for state in states:
        gif_path = os.path.join(PORTRAITS_DIR, f"spellblade_skeletal_{state.lower()}.gif")
        frames = gif_frames[state]
        if frames:
            duration = 180 if state == 'Idle' else (120 if state == 'Run' else 150)
            frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=duration, loop=0, disposal=2)
            print(f"Generated animated preview GIF: {gif_path}")

if __name__ == "__main__":
    main()
