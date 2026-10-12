"""
Generates official production brand assets (PNG, ICO, SVG, JPG) for SwiftSats.
Extracts high-resolution emblems and full logos from official brand artwork,
generating smooth, anti-aliased icons across all platforms, PWAs, and social cards.
"""
import os
import io
import base64
from PIL import Image, ImageDraw, ImageFilter

def make_squircle_icon(emblem_img, size, corner_radius_pct=0.22, emblem_scale_pct=0.78):
    """
    Renders an obsidian squircle brand icon at the specified dimension
    using 2x oversampling and Lanczos downsampling for ultra-smooth edges.
    """
    ssize = size * 2
    
    # 1. Squircle clipping mask
    mask = Image.new('L', (ssize, ssize), 0)
    draw_mask = ImageDraw.Draw(mask)
    radius = int(ssize * corner_radius_pct)
    draw_mask.rounded_rectangle([0, 0, ssize - 1, ssize - 1], radius=radius, fill=255)
    
    # 2. Base background: Obsidian Dark (#07080d)
    bg = Image.new('RGBA', (ssize, ssize), (7, 8, 13, 255))
    
    # 3. Ambient emerald radial glow behind emblem
    glow = Image.new('RGBA', (ssize, ssize), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = ssize // 2, ssize // 2
    glow_radius = int(ssize * 0.40)
    glow_draw.ellipse(
        [cx - glow_radius, cy - glow_radius, cx + glow_radius, cy + glow_radius],
        fill=(0, 230, 118, 55)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(ssize * 0.16)))
    bg.alpha_composite(glow)
    
    # 4. Subtle glowing emerald border ring
    stroke_w = max(2, int(ssize * 0.02))
    border_layer = Image.new('RGBA', (ssize, ssize), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_layer)
    border_draw.rounded_rectangle(
        [stroke_w // 2, stroke_w // 2, ssize - 1 - stroke_w // 2, ssize - 1 - stroke_w // 2],
        radius=radius,
        outline=(0, 230, 118, 120),
        width=stroke_w
    )
    bg.alpha_composite(border_layer)
    
    # 5. Position and composite the speed 'S' emblem
    aspect = emblem_img.width / emblem_img.height
    emb_w = int(ssize * emblem_scale_pct)
    emb_h = int(emb_w / aspect)
    if emb_h > int(ssize * 0.68):
        emb_h = int(ssize * 0.68)
        emb_w = int(emb_h * aspect)
        
    emb_resized = emblem_img.resize((emb_w, emb_h), Image.Resampling.LANCZOS)
    x_pos = (ssize - emb_w) // 2
    y_pos = (ssize - emb_h) // 2
    
    bg.alpha_composite(emb_resized, (x_pos, y_pos))
    
    # 6. Apply squircle mask
    final_2x = Image.new('RGBA', (ssize, ssize), (0, 0, 0, 0))
    final_2x.paste(bg, (0, 0), mask)
    
    # 7. Resample to final size with Lanczos anti-aliasing
    return final_2x.resize((size, size), Image.Resampling.LANCZOS)


def make_transparent_emblem(emblem_img, canvas_size=512, target_w=440):
    """
    Centers the speed 'S' emblem on a square transparent canvas with breathing room.
    """
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    aspect = emblem_img.width / emblem_img.height
    target_h = int(target_w / aspect)
    resized = emblem_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    x = (canvas_size - target_w) // 2
    y = (canvas_size - target_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def make_og_banner(full_logo_img, width=1200, height=630, logo_scale_w=820):
    """
    Generates a social preview card with obsidian background, emerald ambient glow,
    and centered full logo lockup.
    """
    canvas = Image.new('RGB', (width, height), (7, 8, 13))
    
    # Ambient emerald glow
    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = width // 2, height // 2
    glow_draw.ellipse(
        [cx - 420, cy - 250, cx + 420, cy + 250],
        fill=(0, 230, 118, 55)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=110))
    
    canvas_rgba = canvas.convert('RGBA')
    canvas_rgba.alpha_composite(glow)
    
    # Full logo placement
    aspect = full_logo_img.width / full_logo_img.height
    target_h = int(logo_scale_w / aspect)
    logo_resized = full_logo_img.resize((logo_scale_w, target_h), Image.Resampling.LANCZOS)
    
    x_pos = (width - logo_scale_w) // 2
    y_pos = (height - target_h) // 2
    canvas_rgba.alpha_composite(logo_resized, (x_pos, y_pos))
    return canvas_rgba


def generate_svg(emblem_img, width=512, height=512):
    """
    Generates an SVG container with squircle backdrop and embedded high-res emblem.
    """
    # Create high-res transparent emblem image buffer
    emblem_canvas = make_transparent_emblem(emblem_img, 512, 440)
    buf = io.BytesIO()
    emblem_canvas.save(buf, format='PNG', optimize=True)
    b64_data = base64.b64encode(buf.getvalue()).decode('ascii')
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">
  <!-- SwiftSats Obsidian Black Squircle Backdrop -->
  <rect width="{width}" height="{height}" rx="{int(width * 0.22)}" fill="#07080d"/>
  <rect x="{int(width * 0.012)}" y="{int(height * 0.012)}" width="{int(width * 0.976)}" height="{int(height * 0.976)}" rx="{int(width * 0.21)}" stroke="#00e676" stroke-width="{max(2, int(width * 0.02))}" stroke-opacity="0.6"/>
  
  <!-- Subtle Emerald Ambient Glow -->
  <circle cx="{width // 2}" cy="{height // 2}" r="{int(width * 0.32)}" fill="#00e676" opacity="0.18"/>
  
  <!-- High-Fidelity SwiftSats Speed S Emblem -->
  <image href="data:image/png;base64,{b64_data}" x="0" y="0" width="{width}" height="{height}" preserveAspectRatio="xMidYMid meet"/>
</svg>'''
    return svg


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pub_dir = os.path.join(base_dir, 'frontend', 'public')
    up_dir = r'C:\Users\HP\.gemini\antigravity-ide\brain\fb7b71c0-96f5-4dee-a81b-123bc239c78e\.user_uploaded'
    
    png_source = os.path.join(up_dir, 'media_1791844777645.png')
    jpg_source = os.path.join(up_dir, 'media_1791844751847.jpg')
    
    if not os.path.exists(png_source):
        raise FileNotFoundError(f"Source PNG not found at {png_source}")
        
    print("[1/8] Loading source master artwork...")
    png_full = Image.open(png_source)
    
    # Extract Speed 'S' Emblem (rows 247:532, cols 255:721)
    emblem_crop = png_full.crop((255, 247, 721, 532))
    
    # Extract Full Logo Lockup (rows 247:771, cols 94:929)
    full_logo_crop = png_full.crop((94, 247, 929, 771))
    
    print("[2/8] Generating logo-emblem.png (512x512 transparent)...")
    emblem_512 = make_transparent_emblem(emblem_crop, 512, 440)
    emblem_512.save(os.path.join(pub_dir, 'logo-emblem.png'), 'PNG', optimize=True)
    
    print("[3/8] Generating logo-full.png (transparent full brand lockup)...")
    full_logo_crop.save(os.path.join(pub_dir, 'logo-full.png'), 'PNG', optimize=True)
    
    print("[4/8] Generating squircle app icons (logo512, logo192, apple-touch-icon, favicon.png)...")
    icon512 = make_squircle_icon(emblem_crop, 512, corner_radius_pct=0.22, emblem_scale_pct=0.76)
    icon512.save(os.path.join(pub_dir, 'logo512.png'), 'PNG', optimize=True)
    
    icon192 = make_squircle_icon(emblem_crop, 192, corner_radius_pct=0.22, emblem_scale_pct=0.76)
    icon192.save(os.path.join(pub_dir, 'logo192.png'), 'PNG', optimize=True)
    
    apple_icon = make_squircle_icon(emblem_crop, 180, corner_radius_pct=0.22, emblem_scale_pct=0.76)
    apple_icon.save(os.path.join(pub_dir, 'apple-touch-icon.png'), 'PNG', optimize=True)
    
    fav64 = make_squircle_icon(emblem_crop, 64, corner_radius_pct=0.22, emblem_scale_pct=0.82)
    fav64.save(os.path.join(pub_dir, 'favicon.png'), 'PNG', optimize=True)
    
    print("[5/8] Generating multi-resolution favicon.ico...")
    icon512.save(
        os.path.join(pub_dir, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    
    print("[6/8] Generating vector SVGs (favicon.svg, logo.svg)...")
    fav_svg = generate_svg(emblem_crop, 64, 64)
    with open(os.path.join(pub_dir, 'favicon.svg'), 'w', encoding='utf-8') as f:
        f.write(fav_svg)
        
    logo_svg = generate_svg(emblem_crop, 512, 512)
    with open(os.path.join(pub_dir, 'logo.svg'), 'w', encoding='utf-8') as f:
        f.write(logo_svg)
        
    print("[7/8] Generating OpenGraph social card (og-image.jpg and og-image.png)...")
    og_card = make_og_banner(full_logo_crop, 1200, 630, logo_scale_w=840)
    og_card.convert('RGB').save(os.path.join(pub_dir, 'og-image.jpg'), 'JPEG', quality=95, optimize=True)
    og_card.save(os.path.join(pub_dir, 'og-image.png'), 'PNG', optimize=True)
    
    print("[8/8] Generating banner.jpg (1376x768)...")
    banner_card = make_og_banner(full_logo_crop, 1376, 768, logo_scale_w=920)
    banner_card.convert('RGB').save(os.path.join(pub_dir, 'banner.jpg'), 'JPEG', quality=95, optimize=True)
    
    print(">> All brand assets generated successfully in frontend/public/!")

if __name__ == '__main__':
    main()
