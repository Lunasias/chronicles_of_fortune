import os, math, cv2
import numpy as np
from PIL import Image, ImageDraw

PORTRAITS_DIR = r"public\assets\portraits"
OUTPUT_DIR = r"public\assets\A_female_magic_swordsman_with"
DIRECTIONS = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east']
DIR_MAP = {
    'south':      {'flip': False, 'view': 'front'},
    'south-west': {'flip': False, 'view': 'front'},
    'south-east': {'flip': True,  'view': 'front'},
    'west':       {'flip': False, 'view': 'side'},
    'east':       {'flip': True,  'view': 'side'},
    'north-west': {'flip': False, 'view': 'back'},
    'north':      {'flip': False, 'view': 'back'},
    'north-east': {'flip': True,  'view': 'back'}
}

def clean_and_despeckle(img_path: str, tolerance: int = 14) -> Image.Image:
    im = Image.open(img_path).convert('RGB')
    arr = np.array(im)
    h, w = arr.shape[:2]
    
    # 1. Floodfill background
    mask = np.zeros((h + 2, w + 2), np.uint8)
    diff = (tolerance, tolerance, tolerance)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)
    
    seeds = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1), (w//2, 0), (w//2, h-1), (0, h//2), (w-1, h//2)]
    for pt in seeds:
        r, g, b = arr[pt[1], pt[0]]
        if r > 190 and g > 190 and b > 190:
            cv2.floodFill(arr, mask, pt, (0, 0, 0), diff, diff, flags)
            
    is_bg = (mask[1:h+1, 1:w+1] == 255)
    
    # 2. Despeckle isolated stray pixels outside main body
    # Find connected components of non-bg pixels
    fg_mask = (~is_bg).astype(np.uint8)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(fg_mask, connectivity=8)
    
    # Keep components with area > 150 pixels (filters out speckles/dust)
    clean_fg = np.zeros_like(fg_mask)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= 150:
            clean_fg[labels == i] = 1
            
    alpha = np.where(clean_fg == 1, 255, 0).astype(np.uint8)
    rgba = np.dstack([arr, alpha])
    out = Image.fromarray(rgba, 'RGBA')
    
    # Crop to content
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
        
    # Scale to 256x256 sprite canvas (height ~ 220)
    target_h = 220
    ratio = target_h / out.height
    new_w = min(240, max(60, int(out.width * ratio)))
    scaled = out.resize((new_w, target_h), Image.Resampling.LANCZOS)
    
    canvas = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    paste_x = (256 - new_w) // 2
    paste_y = 256 - target_h - 16
    canvas.paste(scaled, (paste_x, paste_y), scaled)
    return canvas

def synthesize_frames(base_front: Image.Image, base_back: Image.Image, base_side: Image.Image, state: str):
    frames = {'front': [], 'back': [], 'side': []}
    
    for view, base_img in [('front', base_front), ('back', base_back), ('side', base_side)]:
        w, h = base_img.size
        
        for f in range(4):
            frame_canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(frame_canvas)
            
            # Ground shadow
            shadow_rx = 40
            shadow_ry = 12
            draw.ellipse([w//2 - shadow_rx, h - 26, w//2 + shadow_rx, h - 14], fill=(8, 12, 24, 110))
            
            if state == "Idle":
                # Subtle sinusoidal breathing expansion & electric motes
                phase = (f / 4.0) * math.pi * 2
                dy = int(math.sin(phase) * 2)
                # Paste base with micro breathing bob
                frame_canvas.paste(base_img, (0, dy), base_img)
                # Crackling lightning spark along blade
                sp_x = w // 2 + 55 + int(math.sin(phase * 2) * 10)
                sp_y = h // 2 - 35 + int(math.cos(phase * 2) * 25)
                draw.line([sp_x - 6, sp_y + 4, sp_x, sp_y, sp_x + 8, sp_y - 6], fill=(56, 189, 248, 255), width=2)
                draw.line([sp_x - 6, sp_y + 4, sp_x, sp_y, sp_x + 8, sp_y - 6], fill=(255, 255, 255, 255), width=1)
                
            elif state == "Run":
                # Kinetic 4-frame run cycle
                if f == 0:
                    # Contact stride
                    frame_canvas.paste(base_img, (0, 0), base_img)
                elif f == 1:
                    # Down compression (2px crouch dip)
                    frame_canvas.paste(base_img, (2, 4), base_img)
                elif f == 2:
                    # Passing stride (opposite swing offset)
                    frame_canvas.paste(base_img, (-2, -1), base_img)
                elif f == 3:
                    # Push-off spring (3px airborne lift)
                    frame_canvas.paste(base_img, (1, -4), base_img)
                    
            elif state == "Attack":
                # Kinetic sword swing progression
                if f == 0:
                    # Anticipation wind-up: shifted back 4px
                    frame_canvas.paste(base_img, (-4, -2), base_img)
                elif f == 1:
                    # Downward swing forward dash
                    frame_canvas.paste(base_img, (6, 2), base_img)
                elif f == 2:
                    # Slash impact apex: Full cyan crescent arc
                    frame_canvas.paste(base_img, (4, 1), base_img)
                    # Glowing cyan impact shockwave
                    draw.arc([w//2 - 60, h//2 - 70, w//2 + 90, h//2 + 50], start=270, end=430, fill=(56, 189, 248, 240), width=12)
                    draw.arc([w//2 - 55, h//2 - 65, w//2 + 85, h//2 + 45], start=275, end=425, fill=(240, 252, 255, 255), width=4)
                elif f == 3:
                    # Follow-through recovery
                    frame_canvas.paste(base_img, (2, 0), base_img)
                    
            elif state == "Cast":
                # Spellcasting lightning channel
                if f == 0:
                    # Magic circle starts
                    frame_canvas.paste(base_img, (0, 0), base_img)
                    draw.ellipse([w//2 - 65, h - 35, w//2 + 65, h - 15], outline=(56, 189, 248, 180), width=2)
                elif f == 1:
                    # Levitation (lift 6px)
                    frame_canvas.paste(base_img, (0, -6), base_img)
                    draw.ellipse([w//2 - 75, h - 35, w//2 + 75, h - 15], outline=(56, 189, 248, 220), width=3)
                elif f == 2:
                    # Thunderbolt strike from sky into greatsword!
                    frame_canvas.paste(base_img, (0, -8), base_img)
                    draw.line([w//2 + 45, 0, w//2 + 50, h//2 - 40], fill=(56, 189, 248, 255), width=8)
                    draw.line([w//2 + 45, 0, w//2 + 50, h//2 - 40], fill=(255, 255, 255, 255), width=4)
                    draw.ellipse([w//2 - 85, h - 35, w//2 + 85, h - 15], outline=(56, 189, 248, 255), width=4)
                    draw.ellipse([w//2 - 85, h - 35, w//2 + 85, h - 15], outline=(255, 255, 255, 255), width=1)
                elif f == 3:
                    # Landing shockwave release
                    frame_canvas.paste(base_img, (0, 2), base_img)
                    draw.line([w//2 - 80, h - 22, w//2 + 80, h - 22], fill=(56, 189, 248, 255), width=3)
                    
            frames[view].append(frame_canvas)
            
    return frames

def main():
    print("1. Cleaning and despeckling AI master concept portraits...")
    clean_idle_front = clean_and_despeckle(r"public\assets\portraits\spellblade_white_bikini_standing.png", tolerance=14)
    clean_run_front  = clean_and_despeckle(r"public\assets\portraits\spellblade_test_run_raw.png", tolerance=14)
    clean_atk_front  = clean_and_despeckle(r"public\assets\portraits\spellblade_test_attack_raw.png", tolerance=14)
    clean_cast_front = clean_and_despeckle(r"public\assets\portraits\spellblade_test_cast_raw.png", tolerance=14)
    
    clean_back = clean_and_despeckle(r"public\assets\portraits\spellblade_white_bikini_back.png", tolerance=14)
    clean_side = clean_and_despeckle(r"public\assets\portraits\spellblade_white_bikini_side.png", tolerance=14)
    
    # Save clean bases
    clean_idle_front.save(r"public\assets\portraits\spellblade_clean_idle_base.png")
    clean_run_front.save(r"public\assets\portraits\spellblade_clean_run_base.png")
    clean_atk_front.save(r"public\assets\portraits\spellblade_clean_attack_base.png")
    clean_cast_front.save(r"public\assets\portraits\spellblade_clean_cast_base.png")
    clean_back.save(r"public\assets\portraits\spellblade_clean_back_base.png")
    clean_side.save(r"public\assets\portraits\spellblade_clean_side_base.png")
    print("Saved all 6 clean master bases!")
    
    # 2. Synthesize all 4 states
    states = ['Idle', 'Run', 'Attack', 'Cast']
    base_map = {
        'Idle': clean_idle_front,
        'Run': clean_run_front,
        'Attack': clean_atk_front,
        'Cast': clean_cast_front
    }
    
    gif_frames = {s: [] for s in states}
    
    print("2. Generating full 8-direction production sheets for all 4 states...")
    for state in states:
        state_dir = os.path.join(OUTPUT_DIR, state, "rotations")
        os.makedirs(state_dir, exist_ok=True)
        
        frames = synthesize_frames(base_map[state], clean_back, clean_side, state)
        
        for d in DIRECTIONS:
            conf = DIR_MAP[d]
            view = conf['view']
            flip = conf['flip']
            
            for f in range(4):
                frame_img = frames[view][f]
                if flip:
                    frame_img = frame_img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                    
                dest_f = os.path.join(state_dir, f"{d}_{f}.png")
                frame_img.save(dest_f)
                
                if f == 0:
                    dest_default = os.path.join(state_dir, f"{d}.png")
                    frame_img.save(dest_default)
                    
                if d == 'south-west':
                    gif_frames[state].append(frame_img)
                    
    print("3. Exporting Animated GIFs with true AI pixel art...")
    for state in states:
        gif_path = os.path.join(PORTRAITS_DIR, f"spellblade_ai_{state.lower()}.gif")
        frames_list = gif_frames[state]
        if frames_list:
            duration = 180 if state == 'Idle' else (120 if state == 'Run' else 160)
            frames_list[0].save(gif_path, save_all=True, append_images=frames_list[1:], duration=duration, loop=0, disposal=2)
            print(f"Saved: {gif_path}")
            
    # 4. Create Contact Sheet
    cell_w, cell_h = 256, 256
    contact_sheet = Image.new('RGBA', (cell_w * 4, cell_h * 4), (16, 22, 34, 255))
    draw_cs = ImageDraw.Draw(contact_sheet)
    
    for row, state in enumerate(states):
        for col in range(4):
            x = col * cell_w
            y = row * cell_h
            draw_cs.rectangle([x + 2, y + 2, x + cell_w - 2, y + cell_h - 2], fill=(22, 30, 48, 255), outline=(56, 189, 248, 140), width=1)
            f_path = os.path.join(OUTPUT_DIR, state, 'rotations', f'south-west_{col}.png')
            if os.path.exists(f_path):
                sp = Image.open(f_path).convert('RGBA')
                contact_sheet.paste(sp, (x, y), sp)
            draw_cs.text((x + 12, y + 12), f"{state.upper()} #{col}", fill=(255, 255, 255, 255))
            
    cs_path = os.path.join(PORTRAITS_DIR, "spellblade_production_ai_contact_sheet.png")
    contact_sheet.save(cs_path)
    print(f"Saved production AI contact sheet to: {cs_path}")

if __name__ == "__main__":
    main()
