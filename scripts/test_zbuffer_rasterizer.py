import numpy as np
import math
from PIL import Image

def test_rasterizer():
    W, H = 160, 160
    color_buf = np.zeros((H, W, 4), dtype=np.uint8)
    z_buf = np.full((H, W), -1e9, dtype=np.float32)

    # Let's write a vectorized triangle rasterizer
    def draw_triangle(v0, v1, v2, color):
        # v = (x, y, z)
        # Bounding box
        min_x = max(0, int(min(v0[0], v1[0], v2[0])))
        max_x = min(W - 1, int(max(v0[0], v1[0], v2[0])))
        min_y = max(0, int(min(v0[1], v1[1], v2[1])))
        max_y = min(H - 1, int(max(v0[1], v1[1], v2[1])))
        
        if min_x > max_x or min_y > max_y:
            return

        # 2D cross product for area
        det = (v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1])
        if abs(det) < 1e-5:
            return

        xs, ys = np.meshgrid(np.arange(min_x, max_x + 1), np.arange(min_y, max_y + 1))
        
        # Barycentric coordinates
        w0 = ((v1[1] - v2[1]) * (xs - v2[0]) + (v2[0] - v1[0]) * (ys - v2[1])) / det
        w1 = ((v2[1] - v0[1]) * (xs - v0[0]) + (v0[0] - v2[0]) * (ys - v0[1])) / det
        w2 = 1.0 - w0 - w1

        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not np.any(inside):
            return

        z_interp = w0 * v0[2] + w1 * v1[2] + w2 * v2[2]
        
        ys_in = ys[inside]
        xs_in = xs[inside]
        zs_in = z_interp[inside]

        # Depth test
        closer = zs_in > z_buf[ys_in, xs_in]
        if np.any(closer):
            ys_pass = ys_in[closer]
            xs_pass = xs_in[closer]
            zs_pass = zs_in[closer]

            z_buf[ys_pass, xs_pass] = zs_pass
            color_buf[ys_pass, xs_pass] = color

    # Draw two overlapping triangles to test Z-buffering
    # Red triangle behind, Green triangle in front
    draw_triangle((40, 40, -10), (120, 40, -10), (80, 120, -10), [255, 0, 0, 255])
    draw_triangle((60, 20, 0), (140, 80, 0), (60, 100, 0), [0, 255, 0, 255])

    img = Image.fromarray(color_buf, 'RGBA')
    img.save("C:/chronicles_of_fortune/public/assets/test_rasterizer.png")
    print("Rasterizer test OK, saved test_rasterizer.png")

test_rasterizer()
