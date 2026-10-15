import os, math
from PIL import Image, ImageOps, ImageDraw

def build_all_spellblade_sprites():
    front_base = Image.open('public/assets/portraits/spellblade_ai_sprite_front.png').convert('RGBA')
    back_base = Image.open('public/assets/portraits/spellblade_ai_sprite_back.png').convert('RGBA')
    side_base = Image.open('public/assets/portraits/spellblade_ai_sprite_side.png').convert('RGBA')

    base_dir = 'public/assets/A_female_magic_swordsman_with'
    states = ['Idle', 'Run', 'Attack', 'Cast']
    directions = [
        'south',
        'south-west',
        'west',
        'north-west',
        'north',
        'north-east',
        'east',
        'south-east'
    ]

    # Map each direction to its master base sprite and mirror flag
    dir_config = {
        'south': (front_base, False),
        'south-west': (front_base, False),
        'west': (side_base, False),
        'north-west': (back_base, False),
        'north': (back_base, False),
        'north-east': (back_base, True),
        'east': (side_base, True),
        'south-east': (front_base, True),
    }

    print("Synthesizing 128 production frames for Spellblade...")

    for st in states:
        out_dir = os.path.join(base_dir, st, 'rotations')
        os.makedirs(out_dir, exist_ok=True)

        for d in directions:
            base_sprite, flip = dir_config[d]
            if flip:
                spr = ImageOps.mirror(base_sprite)
            else:
                spr = base_sprite.copy()

            for f in range(4):
                frame = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
                draw = ImageDraw.Draw(frame)

                # Motion physics parameters per state
                dx, dy = 0, 0
                lean = 0

                if st == 'Idle':
                    # Gentle breathing bob
                    bobs = [0, -3, -5, -2]
                    dy = bobs[f]
                elif st == 'Run':
                    # Dynamic running strides
                    run_y = [-2, 4, -2, 4]
                    run_x = [6, 0, -6, 0] if 'west' in d else (-6, 0, 6, 0 if 'east' in d else 0)
                    dy = run_y[f]
                    dx = run_x[f]
                elif st == 'Attack':
                    # Attack sequence
                    if f == 0: # Windup
                        dx = -8 if ('east' in d or 'south-east' in d) else 8
                        dy = -6
                    elif f == 1: # Strike
                        dx = 14 if ('east' in d or 'south-east' in d) else -14
                        dy = 8
                    elif f == 2: # Full extension impact
                        dx = 20 if ('east' in d or 'south-east' in d) else -20
                        dy = 4
                    else: # Follow-through recovery
                        dx = 4 if ('east' in d or 'south-east' in d) else -4
                        dy = 0
                elif st == 'Cast':
                    # Magical levitation & channeling
                    cast_bobs = [-2, -8, -12, -6]
                    dy = cast_bobs[f]

                # Paste transformed character sprite
                frame.paste(spr, (dx, dy), spr)

                # Add dynamic frame FX overlays
                # 1. Crackling lightning sparks dancing around body
                spark_t = f * 1.57
                for sp_i in range(3):
                    angle = spark_t + sp_i * 2.1
                    sx = 128 + dx + int(math.cos(angle) * 55)
                    sy = 110 + dy + int(math.sin(angle) * 45)
                    draw.line([sx, sy, sx + 8, sy - 12, sx + 2, sy - 20], fill=(56, 189, 248, 220), width=3)
                    draw.line([sx, sy, sx + 8, sy - 12, sx + 2, sy - 20], fill=(255, 255, 255, 255), width=1)

                # 2. Attack Lightning Blade Slash Arc
                if st == 'Attack' and f in (1, 2):
                    arc_cx = 128 + dx
                    arc_cy = 120 + dy
                    draw.arc([arc_cx - 65, arc_cy - 85, arc_cx + 95, arc_cy + 75], start=270, end=430, fill=(56, 189, 248, 240), width=12)
                    draw.arc([arc_cx - 60, arc_cy - 80, arc_cx + 90, arc_cy + 70], start=275, end=425, fill=(255, 255, 255, 255), width=5)
                    # Impact sparks
                    draw.polygon([(arc_cx + 70, arc_cy - 30), (arc_cx + 105, arc_cy - 50), (arc_cx + 85, arc_cy - 10)], fill=(56, 189, 248, 255))
                    draw.polygon([(arc_cx + 75, arc_cy + 10), (arc_cx + 115, arc_cy + 30), (arc_cx + 95, arc_cy - 5)], fill=(255, 255, 255, 255))

                # 3. Cast Magic Circle & Lightning Surge
                if st == 'Cast' and f in (1, 2):
                    # Ground electric ring
                    draw.ellipse([128 - 75, 220 - 18, 128 + 75, 220 + 18], outline=(56, 189, 248, 240), width=4)
                    draw.ellipse([128 - 55, 220 - 12, 128 + 55, 220 + 12], outline=(224, 242, 254, 200), width=2)
                    # Vertical lightning pillar
                    draw.line([128 - 25, 215, 128 - 15, 60, 128 - 30, 0], fill=(56, 189, 248, 240), width=4)
                    draw.line([128 + 25, 215, 128 + 15, 60, 128 + 30, 0], fill=(56, 189, 248, 240), width=4)

                # Save animation frame
                frame_path = os.path.join(out_dir, f"{d}_{f}.png")
                frame.save(frame_path)

                # Also save frame 0 as the main rotation file
                if f == 0:
                    main_path = os.path.join(out_dir, f"{d}.png")
                    frame.save(main_path)

    print("All Spellblade production sprites synthesized successfully!")

if __name__ == '__main__':
    build_all_spellblade_sprites()
