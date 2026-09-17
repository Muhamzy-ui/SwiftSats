"""
Generates production-grade brand icon assets (SVG, PNG, ICO) for SwiftSats.
Zero external dependencies (uses standard python zlib, struct).
"""
import os
import zlib
import struct
import math

def make_png(width, height, get_pixel_func):
    """
    Generate raw RGBA PNG bytes without external dependencies.
    get_pixel_func(x, y) -> (r, g, b, a) in [0..255]
    """
    raw_rows = bytearray()
    for y in range(height):
        raw_rows.append(0)  # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y)
            raw_rows.extend((r, g, b, a))

    def make_chunk(chunk_type, data):
        length = len(data)
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        return struct.pack('>I', length) + chunk_type + data + struct.pack('>I', crc)

    png_signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)
    compressed = zlib.compress(bytes(raw_rows), 9)
    idat = make_chunk(b'IDAT', compressed)
    iend = make_chunk(b'IEND', b'')

    return png_signature + ihdr + idat + iend

def make_ico(png_bytes, width=32, height=32):
    """Wrap PNG bytes in a standard Windows ICO container."""
    # ICONDIR
    ico_header = struct.pack('<HHH', 0, 1, 1)
    # ICONDIRENTRY
    entry = struct.pack(
        '<BBBBHHII',
        width if width < 256 else 0,
        height if height < 256 else 0,
        0,  # color count
        0,  # reserved
        1,  # color planes
        32, # bits per pixel
        len(png_bytes),
        22  # offset (6 + 16 = 22)
    )
    return ico_header + entry + png_bytes

def render_swiftsats_icon(size):
    """
    Renders the SwiftSats Squircle Emblem at given pixel size.
    Obsidian background (#07080d), rounded squircle, emerald lightning 'S'.
    """
    scale = size / 64.0
    corner_radius = 16.0 * scale
    border_thick = 1.5 * scale

    # Pre-render geometric primitives scaled to target size
    def get_pixel(x, y):
        # Center coordinates
        cx = size / 2.0
        cy = size / 2.0

        # Squircle distance
        # Check rounded rect with radius corner_radius
        dx = abs(x + 0.5 - cx)
        dy = abs(y + 0.5 - cy)
        half_w = (size - 1) / 2.0
        half_h = (size - 1) / 2.0

        # Signed distance to rounded rectangle
        qx = dx - (half_w - corner_radius)
        qy = dy - (half_h - corner_radius)
        
        if qx > 0 and qy > 0:
            dist = math.sqrt(qx * qx + qy * qy) - corner_radius
        else:
            dist = max(qx - corner_radius, qy - corner_radius)

        # Anti-aliased outer mask
        if dist > 0.5:
            return (0, 0, 0, 0)
        
        outer_alpha = max(0.0, min(1.0, 0.5 - dist))

        # Base background: Obsidian Dark (#07080d)
        bg_r, bg_g, bg_b = 7, 8, 13

        # Squircle border glow (#00e676 with subtle gradient)
        border_dist = abs(dist + border_thick / 2.0)
        if border_dist < border_thick:
            b_alpha = max(0.0, min(1.0, 1.0 - border_dist / border_thick)) * 0.4
            bg_r = int(bg_r * (1 - b_alpha) + 0 * b_alpha)
            bg_g = int(bg_g * (1 - b_alpha) + 230 * b_alpha)
            bg_b = int(bg_b * (1 - b_alpha) + 118 * b_alpha)

        # Draw the SwiftSats Monogram:
        # Normalized coordinates in [0, 64]
        nx = (x + 0.5) / scale
        ny = (y + 0.5) / scale

        # Color gradient: #00f59b (top) to #00e676 (mid) to #00c853 (bottom)
        t = max(0.0, min(1.0, (ny - 12.0) / 40.0))
        g_r = int(0 * (1 - t) + 0 * t)
        g_g = int(245 * (1 - t) + 200 * t)
        g_b = int(155 * (1 - t) + 83 * t)

        is_emblem = False
        is_core_bolt = False

        # 1. Top S-arm curve: stroke from (44, 15) to (24, 15), curved down to (17, 23), to (24, 30), to (34, 30)
        # We test distance to segments
        def pt_seg_dist(px, py, x1, y1, x2, y2):
            dx = x2 - x1
            dy = y2 - y1
            if dx == 0 and dy == 0:
                return math.hypot(px - x1, py - y1)
            u = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
            return math.hypot(px - (x1 + u * dx), py - (y1 + u * dy))

        d1 = pt_seg_dist(nx, ny, 24, 16, 44, 16)
        d2 = pt_seg_dist(nx, ny, 20, 22, 24, 16)
        d3 = pt_seg_dist(nx, ny, 18, 23, 22, 29)
        d4 = pt_seg_dist(nx, ny, 22, 29, 36, 29)
        top_d = min(d1, d2, d3, d4)

        # 2. Bottom S-arm curve: stroke from (28, 35) to (42, 35), curved to (46, 41), to (40, 48), to (20, 48)
        d5 = pt_seg_dist(nx, ny, 28, 35, 42, 35)
        d6 = pt_seg_dist(nx, ny, 42, 35, 46, 41)
        d7 = pt_seg_dist(nx, ny, 46, 41, 42, 48)
        d8 = pt_seg_dist(nx, ny, 42, 48, 20, 48)
        bot_d = min(d5, d6, d7, d8)

        min_arm_dist = min(top_d, bot_d)

        # Arm thickness: radius 3.0 (width 6.0)
        if min_arm_dist < 3.2:
            is_emblem = True

        # 3. Core High-Velocity Lightning Strike Polygon:
        # Points: (37, 12), (25, 29), (37, 29), (27, 52), (39, 31), (29, 31)
        # Point-in-polygon test:
        poly = [(37, 12), (25, 29), (37, 29), (27, 52), (39, 31), (29, 31)]
        inside = False
        j = len(poly) - 1
        for i in range(len(poly)):
            xi, yi = poly[i]
            xj, yj = poly[j]
            if ((yi > ny) != (yj > ny)) and (nx < (xj - xi) * (ny - yi) / (yj - yi) + xi):
                inside = not inside
            j = i

        if inside:
            is_core_bolt = True

        if is_core_bolt:
            # Brilliant white-mint lightning core
            fg_r, fg_g, fg_b = 255, 255, 255
            # Composite with glow
            fin_r = int(bg_r * 0.1 + fg_r * 0.9)
            fin_g = int(bg_g * 0.1 + fg_g * 0.9)
            fin_b = int(bg_b * 0.1 + fg_b * 0.9)
            return (fin_r, fin_g, fin_b, int(outer_alpha * 255))
        elif is_emblem:
            arm_alpha = max(0.0, min(1.0, (3.2 - min_arm_dist) / 0.8))
            fin_r = int(bg_r * (1 - arm_alpha) + g_r * arm_alpha)
            fin_g = int(bg_g * (1 - arm_alpha) + g_g * arm_alpha)
            fin_b = int(bg_b * (1 - arm_alpha) + g_b * arm_alpha)
            return (fin_r, fin_g, fin_b, int(outer_alpha * 255))
        else:
            return (bg_r, bg_g, bg_b, int(outer_alpha * 255))

    return make_png(size, size, get_pixel)

def main():
    pub_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public')
    os.makedirs(pub_dir, exist_ok=True)

    print("Generating favicon.ico and PNG assets...")
    png32 = render_swiftsats_icon(32)
    with open(os.path.join(pub_dir, 'favicon.png'), 'wb') as f:
        f.write(png32)

    ico = make_ico(png32, 32, 32)
    with open(os.path.join(pub_dir, 'favicon.ico'), 'wb') as f:
        f.write(ico)

    png192 = render_swiftsats_icon(192)
    with open(os.path.join(pub_dir, 'logo192.png'), 'wb') as f:
        f.write(png192)

    png512 = render_swiftsats_icon(512)
    with open(os.path.join(pub_dir, 'logo512.png'), 'wb') as f:
        f.write(png512)

    with open(os.path.join(pub_dir, 'apple-touch-icon.png'), 'wb') as f:
        f.write(png192)

    print("Successfully generated all icon assets in frontend/public/")

if __name__ == '__main__':
    main()
