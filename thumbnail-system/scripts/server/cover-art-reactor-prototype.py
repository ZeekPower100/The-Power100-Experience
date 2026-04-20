#!/usr/bin/env python3
"""
COVER ART REACTOR — ensemble via ComfyUI ReActor face-indexing (2026-04-17)

Gemini's path A1 — the proper multi-subject solution.

Architectural difference from positional-swap (A2):
  - A2 cropped each face region, swapped on crop, pasted back with feather.
    Failed: Katie's crop bounds extended into Jr's territory → face-swap saw
    TWO faces → blended Jr's face into Katie's region (the "two-face Batman" artifact).
  - A1 (this) lets ReActor do native face indexing on the full scene.
    No crops, no paste-back, no boundary contamination possible.

Pipeline:
  1. Plain FLUX scene (no PuLID — same as A2)
  2. Build a ComfyUI workflow JSON with chained ReActor nodes:
       LoadImage(scene) ─┐
       LoadImage(src1) ──┼─→ ReActor[face_idx=0, src=src1] ─┐
                                                              ├─→ ReActor[face_idx=1, src=src2] → SaveImage
       LoadImage(src2) ──────────────────────────────────────┘
  3. Bundle inputs as zip, call fofr/any-comfyui-workflow on Replicate
  4. Apply locked v11 text overlay

Both ReActor nodes have CodeFormer face restoration BUILT IN — no separate
restoration pass needed.

Usage:
    python3 cover-art-reactor-prototype.py <post_id> <drive_mp4_id>

Test (DePaolas):
    python3 cover-art-reactor-prototype.py 705 1Sur6w3O-_YQ382ajl5VgWW4JLe4Mp8fS
"""

import os
import sys
import json
import time
import base64
import shutil
import zipfile
import tempfile
import requests
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
import pipeline

HOME = os.path.expanduser('~')
OUT_DIR = f'{HOME}/thumbnail-system/output/cover-art-tests'
WP_UPLOADS = '/home/runcloud/webapps/innercircle/wp-content/uploads/2026/04'
PUBLIC_BASE = 'https://innercircle.power100.io/wp-content/uploads/2026/04'
FONT_PATH = f'{HOME}/thumbnail-system/fonts/Poppins-Black.ttf'

IC_GOLD = (200, 169, 81)
IC_GOLD_LIGHT = (232, 212, 139)
WHITE = (255, 255, 255)
CREAM = (248, 244, 230)  # Netflix-style filmic off-white — reads cinematic vs pure white

# ============================================================================
# PER-SHOW TYPOGRAPHY DNA
# Every treatment keeps white title + dark letterbox for legibility; the
# font + accent colors + stroke mood vary by show family to break up
# monotony on the Netflix-style wall.
# ============================================================================
FONTS_DIR = f'{HOME}/thumbnail-system/fonts'

SHOW_TYPOGRAPHY = {
    'EDITORIAL': {
        'title_font': 'Poppins-Black.ttf',
        'wordmark_font': 'Poppins-Black.ttf',
        'title_color': CREAM,
        'wordmark_color': IC_GOLD,
        'shadow_color': (0, 0, 0, 200),
        'shadow_offset': (5, 5),
        'shadow_blur': 12,
        'gradient_peak': 110,
        'size_scale': 1.0,
    },
    'ATHLETIC': {
        'title_font': 'BebasNeue-Regular.ttf',
        'wordmark_font': 'BebasNeue-Regular.ttf',
        'title_color': CREAM,
        'wordmark_color': (255, 185, 70),
        'shadow_color': (0, 0, 0, 210),
        'shadow_offset': (6, 6),
        'shadow_blur': 14,
        'gradient_peak': 110,
        'size_scale': 1.35,
    },
    'PREMIUM': {
        'title_font': 'PlayfairDisplay-Variable.ttf',
        'wordmark_font': 'Poppins-Black.ttf',
        'title_color': CREAM,
        'wordmark_color': (220, 185, 110),
        'shadow_color': (0, 0, 0, 200),
        'shadow_offset': (4, 4),
        'shadow_blur': 10,
        'gradient_peak': 110,
        'size_scale': 0.92,
    },
    'INDUSTRIAL': {
        'title_font': 'Anton-Regular.ttf',
        'wordmark_font': 'Anton-Regular.ttf',
        'title_color': CREAM,
        'wordmark_color': (255, 120, 75),
        'shadow_color': (0, 0, 0, 220),
        'shadow_offset': (6, 6),
        'shadow_blur': 14,
        'gradient_peak': 110,
        'size_scale': 1.25,
    },
    'REBEL': {
        'title_font': 'ArchivoBlack-Regular.ttf',
        'wordmark_font': 'ArchivoBlack-Regular.ttf',
        'title_color': CREAM,
        'wordmark_color': (255, 90, 70),
        'shadow_color': (0, 0, 0, 210),
        'shadow_offset': (5, 5),
        'shadow_blur': 12,
        'gradient_peak': 110,
        'size_scale': 1.0,
    },
    'DOC': {
        'title_font': 'Oswald-Variable.ttf',
        'wordmark_font': 'Oswald-Variable.ttf',
        'title_color': CREAM,
        'wordmark_color': (190, 205, 220),
        'shadow_color': (0, 0, 0, 190),
        'shadow_offset': (4, 4),
        'shadow_blur': 10,
        'gradient_peak': 110,
        'size_scale': 1.15,
    },
}

SHOW_TO_TREATMENT = {
    'powerchat': 'EDITORIAL',
    'executive interviews': 'EDITORIAL',
    'feature interviews': 'EDITORIAL',
    'grit to gold': 'ATHLETIC',
    'rapid fire interviews': 'ATHLETIC',
    'highlights': 'ATHLETIC',
    'inner circle': 'PREMIUM',
    'power100 spotlight': 'PREMIUM',
    'customer interviews': 'PREMIUM',
    'beyond the hammer': 'INDUSTRIAL',
    'remodel boom': 'INDUSTRIAL',
    'outside the lines': 'REBEL',
    'clever marketing': 'REBEL',
    'day in the life': 'DOC',
    'events': 'DOC',
}



VISUAL_TREATMENTS = {
    "netflix-dark": {
        "framing": "Cinematic editorial portrait photograph for a premium Netflix limited-series poster",
        "lighting_solo": "cool steel-blue and slate-gray palette with subtle warm amber side-lighting from upper-right, dramatic shadow falloff across the face. Premium magazine-cover quality. Photorealistic, 50mm portrait lens, shallow depth of field, cinematic color grade with subtle film grain. Reminiscent of Peaky Blinders or Dynasty Netflix poster art.",
        "darkness_pct": 40,
    },
    "editorial-bright": {
        "framing": "Editorial magazine cover photograph in the style of GQ or Esquire feature spreads",
        "lighting_solo": "warm cream and soft golden palette with diffused natural daylight from a large window source on the left, gentle shadows, even skin tones, sharp clarity. Photorealistic, 85mm portrait lens, medium depth of field. Bright, sophisticated, magazine-grade. Reminiscent of GQ Man-of-the-Year cover photography.",
        "darkness_pct": 30,
    },
    "documentary-daylight": {
        "framing": "Documentary-style editorial portrait photograph in the spirit of long-form magazine journalism",
        "lighting_solo": "natural daylight, neutral white-balanced palette, no color grade applied. Even ambient illumination with realistic environmental shadows. Photorealistic, 35mm documentary lens, deep depth of field showing setting clearly. The Atlantic feature photography vibe — honest, journalistic, real-moment captured.",
        "darkness_pct": 25,
    },
    "espn-athletic": {
        "framing": "Sports magazine cover photograph in the style of ESPN The Magazine or Sports Illustrated profile spreads",
        "lighting_solo": "high-contrast warm orange and deep amber palette with strong rim-lighting from behind, motion-blurred backdrop suggesting energy, rich saturated shadows on the body. Photorealistic, 70mm sports photography lens, dramatic perspective. Powerful, energetic, championship-photo vibe.",
        "darkness_pct": 35,
    },
    "vanity-fair": {
        "framing": "Vanity Fair editorial portrait photograph in the style of Annie Leibovitz",
        "lighting_solo": "velvety jewel-tone palette — rich emerald, deep burgundy, warm gold accents — with sculpted theatrical lighting from a large soft-box on the right, painterly shadow falloff, art-direction precision. Photorealistic, 50mm medium-format portrait lens, ultra-sharp on subject with creamy bokeh background. Art-gallery-grade portraiture.",
        "darkness_pct": 38,
    },
    "indie-film": {
        "framing": "Cinematic still from an A24 indie drama film, editorial portrait composition",
        "lighting_solo": "desaturated muted palette with slight teal-orange split tone, natural-source lighting feel, visible film grain, slightly faded shadow detail, cool natural color cast. Photorealistic, 35mm film stock aesthetic, medium depth of field. Reminiscent of A24 stills like The Whale or Aftersun.",
        "darkness_pct": 33,
    },
}


def get_visual_treatment():
    name = (os.environ.get("TREATMENT", "netflix-dark") or "netflix-dark").lower().strip()
    if name not in VISUAL_TREATMENTS:
        log("treatment", f"  unknown TREATMENT={name}, falling back to netflix-dark")
        name = "netflix-dark"
    log("treatment", f"  using visual treatment: {name}")
    return name, VISUAL_TREATMENTS[name]


def pick_treatment(show_label):
    """Match a show label like 'Grit To Gold w/ Paul Burleson' to a treatment.
    Strips wp-cli CSV quotes + 'w/ ...' suffixes, lowercases, falls back to EDITORIAL."""
    if not show_label:
        return SHOW_TYPOGRAPHY['EDITORIAL'], 'EDITORIAL'
    key = show_label.lower().strip().strip('"').strip("'").split(' w/')[0].strip()
    name = SHOW_TO_TREATMENT.get(key, 'EDITORIAL')
    return SHOW_TYPOGRAPHY[name], name

FLUX_MODEL = 'black-forest-labs/flux-dev'
COMFY_MODEL = 'fofr/any-comfyui-workflow'
GUEST_OVERRIDES_PATH = f'{HOME}/thumbnail-system/config/guest-overrides.json'
SCENE_OVERRIDES_PATH = f'{HOME}/thumbnail-system/config/scene-overrides.json'
NAME_ALIASES_PATH = f'{HOME}/thumbnail-system/config/name-aliases.json'
ARTIFACT_CACHE_DIR = f"{HOME}/thumbnail-system/cache"
ARTIFACT_CACHE_TTL_DAYS = 30


def _artifact_cache_path(post_id, name):
    return f"{ARTIFACT_CACHE_DIR}/{post_id}/{name}"


def load_artifact_cache(post_id, name):
    path = _artifact_cache_path(post_id, name)
    if not os.path.exists(path):
        return None
    age_days = (time.time() - os.path.getmtime(path)) / 86400
    if age_days > ARTIFACT_CACHE_TTL_DAYS:
        log("cache", f"  EXPIRED {name} for post {post_id} ({age_days:.0f}d old) - refetching")
        return None
    try:
        with open(path) as f:
            data = json.load(f)
        log("cache", f"  HIT  {name} for post {post_id} ({age_days:.1f}d old)")
        return data
    except Exception as e:
        log("cache", f"  CORRUPT {name} for post {post_id}: {e} - refetching")
        return None


def save_artifact_cache(post_id, name, data):
    os.makedirs(f"{ARTIFACT_CACHE_DIR}/{post_id}", exist_ok=True)
    path = _artifact_cache_path(post_id, name)
    with open(path, "w") as f:
        json.dump(data, f)
    log("cache", f"  SAVE {name} for post {post_id} ({os.path.getsize(path)//1024} KB)")


def evict_old_artifact_caches():
    if not os.path.isdir(ARTIFACT_CACHE_DIR):
        return
    cutoff = time.time() - (ARTIFACT_CACHE_TTL_DAYS * 86400)
    evicted = 0
    for post_dir in os.listdir(ARTIFACT_CACHE_DIR):
        full = f"{ARTIFACT_CACHE_DIR}/{post_dir}"
        if not os.path.isdir(full):
            continue
        try:
            files = [f"{full}/{f}" for f in os.listdir(full)]
            if files and max(os.path.getmtime(f) for f in files) < cutoff:
                shutil.rmtree(full)
                evicted += 1
        except Exception:
            pass
    if evicted:
        log("cache", f"evicted {evicted} stale post caches (> {ARTIFACT_CACHE_TTL_DAYS}d)")



def load_name_aliases():
    """Map non-canonical guest names to their canonical form. Applied at the
    boundary right after pipeline.get_post_data so all downstream lookups
    (guest-overrides cache, ic_leader term meta) hit the right entry. Add
    new aliases when a guest's name varies across posts."""
    try:
        with open(NAME_ALIASES_PATH) as f:
            data = json.load(f)
        return {k: v for k, v in data.items() if not k.startswith('_')}
    except Exception:
        return {}


def canonicalize_guest_name(name, aliases=None):
    if aliases is None:
        aliases = load_name_aliases()
    return aliases.get(name, name)

# Shows where the listed "Host" is actually a featured panelist — the show
# IS named after them, they appear on every thumbnail. For these shows we
# DO NOT exclude speaker[0] from the guest list. PowerChat / Customer / etc
# follow the standard host-excluded pattern (Greg interviews → Greg out).
SHOWS_INCLUDE_HOST = {
    'grit to gold',           # Paul Burleson's show — Paul is THE show
    'inner circle',           # Greg + Paul co-host the flagship
    'outside the lines',      # Ray hosts and is featured
    'beyond the hammer',      # Brian Gottlieb's show
    'remodel boom',           # Jadon's show
    'clever marketing',       # Daniel Rahmon's show
    'day in the life',        # subject is the focus
}


def show_includes_host(show_label):
    if not show_label:
        return False
    # wp-cli CSV escapes show names containing '/' with quotes, e.g.
    # `"Grit To Gold w/ Paul Burleson"` — strip them before matching.
    key = show_label.lower().strip().strip('"').strip("'").split(' w/')[0].strip()
    return key in SHOWS_INCLUDE_HOST

# Show-default scenes: used when no per-post scene override exists. Each is
# a description paragraph that slots into the FLUX scene prompt, replacing
# our old hardcoded "modern industrial showroom" language. Episodes can
# override this via scene-overrides.json for better thematic relevance.
SHOW_DEFAULT_SCENES = {
    'powerchat': 'a modern podcast studio with warm amber-tinted lighting, tasteful bookshelves and microphone booms softly out-of-focus in the background, exposed beams overhead, deep atmospheric shadows',
    'executive interviews': 'a top-floor corporate office with floor-to-ceiling windows overlooking a city skyline at golden hour, leather and glass details, dramatic side-lighting',
    'feature interviews': 'a curated editorial space with architectural lighting, minimalist furniture and deep atmospheric shadows',
    'grit to gold': 'an industrial workshop or raw concrete gym at dusk, exposed ductwork and tool walls, shafts of amber light cutting through the darkness',
    'rapid fire interviews': 'a high-contrast photography set with deep black backdrop and a single rim light, sharp dramatic shadows',
    'highlights': 'a sharp editorial backdrop with bold architectural geometry and dramatic lighting',
    'inner circle': 'an elegant leather-bound library with warm task lighting, antique wood panels and deep burgundy accents, intimate firelit mood',
    'power100 spotlight': 'a cinematic editorial set with museum-quality lighting, muted stone walls and brass accents',
    'customer interviews': 'a warm client-facing reception space with natural wood, soft diffused lighting and tasteful greenery',
    'beyond the hammer': 'a rough framed-in construction site interior at blue hour, exposed studs and subfloor, work lights casting warm shafts across the space',
    'remodel boom': 'a freshly renovated industrial-chic home interior with concrete, reclaimed wood and warm evening light coming through skylights',
    'outside the lines': 'an urban rooftop at dusk with city lights just starting to twinkle, deep indigo sky, dramatic backlighting',
    'clever marketing': 'a sleek modern studio loft with floor-to-ceiling windows and city backdrop, sharp architectural lines and cool blue-grey palette',
    'day in the life': 'a cinematic documentary-style environment with natural window light, lived-in textures and authentic atmospheric shadows',
    'events': 'a cinematic conference stage with deep atmospheric haze, intersecting beams of warm spotlight and a blurred audience beyond',
}


def show_default_scene(show_label):
    """Fallback scene when no per-post override exists. Returns the setting
    description paragraph that replaces our old hardcoded showroom language."""
    if not show_label:
        return SHOW_DEFAULT_SCENES['powerchat']
    key = show_label.lower().strip().strip('"').strip("'").split(' w/')[0].strip()
    return SHOW_DEFAULT_SCENES.get(key, SHOW_DEFAULT_SCENES['powerchat'])
# Community model — pin version. Refresh periodically via:
#   curl -H "Authorization: Bearer $KEY" https://api.replicate.com/v1/models/fofr/any-comfyui-workflow
COMFY_VERSION = '16d0a881fbfc066f0471a3519a347db456fe8cbcbd53abb435a50a74efaeb427'


def log(step, msg):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f'[{ts}] [rx/{step}] {msg}', flush=True)


# ============================================================================
# PLAIN FLUX SCENE GEN (no identity baking — same as A2)
# ============================================================================
def flux_generate_scene(prompt, output_path):
    log('flux', f'Calling plain FLUX with {len(prompt)} char prompt...')
    payload = {
        'input': {
            'prompt': prompt,
            'aspect_ratio': '16:9',
            'num_inference_steps': 28,
            'guidance': 3.5,
            'output_format': 'png',
            'output_quality': 95,
            'num_outputs': 1,
        }
    }
    create_url = f'https://api.replicate.com/v1/models/{FLUX_MODEL}/predictions'
    headers = {
        'Authorization': f'Bearer {pipeline.REPLICATE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'wait',
    }
    # Retry on 429 (account-level rate limit kicks in under $5 credit)
    for attempt in range(8):
        r = requests.post(create_url, headers=headers, json=payload, timeout=600)
        if r.status_code == 429:
            try:
                wait_s = int(r.json().get('retry_after', 10)) + 2
            except Exception:
                wait_s = 12
            log('flux', f'  429 throttled, waiting {wait_s}s (attempt {attempt + 1}/8)')
            time.sleep(wait_s)
            continue
        if r.status_code in (200, 201, 202):
            break
        raise Exception(f'FLUX create failed: {r.status_code} {r.text[:500]}')
    else:
        raise Exception('FLUX create failed: rate-limited after 8 retries')
    pred = r.json()
    pred_id = pred.get('id')
    log('flux', f'  prediction {pred_id}, status: {pred.get("status")}')
    while pred.get('status') in ('starting', 'processing'):
        time.sleep(3)
        poll = requests.get(f'https://api.replicate.com/v1/predictions/{pred_id}',
                            headers=headers, timeout=60)
        pred = poll.json()
        log('flux', f'  status: {pred.get("status")}')
    if pred.get('status') != 'succeeded':
        raise Exception(f'FLUX failed: {pred.get("status")} / {pred.get("error")}')
    output = pred.get('output')
    img_url = output[0] if isinstance(output, list) else output
    img_data = requests.get(img_url, timeout=120).content
    with open(output_path, 'wb') as f:
        f.write(img_data)
    log('flux', f'  saved: {output_path} ({len(img_data) // 1024} KB)')
    return output_path




def gemini_generate_scene(prompt, output_path, references=None):
    """Gemini 2.5 Flash Image scene generator via Vertex AI, now multimodal.

    references = {
        "guests": [{"name": str, "path": str}],
        "hosts":  [{"name": str, "path": str}],   # exclusion — do NOT include
        "frames": [str, ...],                     # episode frames for clothing/body
    }

    When references are present, the guest's actual face + episode clothing
    get preserved by Gemini, potentially eliminating the ReActor face-swap
    step. Host exclusion stops Greg/co-hosts from showing up in the scene."""
    sa_path = os.environ.get("VERTEX_SA_JSON") or pipeline._env.get("VERTEX_SA_JSON", "")
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or pipeline._env.get("GOOGLE_CLOUD_PROJECT", "")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION") or pipeline._env.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    if not sa_path or not os.path.exists(sa_path):
        raise Exception(f"VERTEX_SA_JSON not set or file missing: {sa_path}")
    if not project:
        raise Exception("GOOGLE_CLOUD_PROJECT not set")

    from google.oauth2 import service_account as _sa
    from google.auth.transport.requests import Request as _GReq
    creds = _sa.Credentials.from_service_account_file(
        sa_path, scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    creds.refresh(_GReq())
    access_token = creds.token

    log("gemini", f"Calling Vertex Gemini 2.5 Flash Image (project={project}) with {len(prompt)} char prompt...")
    model = "gemini-2.5-flash-image"
    endpoint = f"https://aiplatform.googleapis.com/v1/projects/{project}/locations/global/publishers/google/models/{model}:generateContent"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # Build multimodal parts. References come FIRST, then the text prompt.
    parts = []
    references = references or {}
    ref_preamble_lines = []

    def _encode_image(path):
        try:
            with open(path, "rb") as fp:
                return base64.b64encode(fp.read()).decode()
        except Exception as e:
            log("gemini", f"  ref encode fail {path}: {e}")
            return None

    # Guests (include in scene) — letters A, B, ...
    for i, g in enumerate(references.get("guests", [])):
        b64 = _encode_image(g.get("path", ""))
        if not b64:
            continue
        letter = chr(ord("A") + i)
        parts.append({"inlineData": {"mimeType": "image/jpeg", "data": b64}})
        ref_preamble_lines.append(
            f"REFERENCE_{letter}: Headshot of {g['name']} — this GUEST MUST appear in the generated scene. Preserve their exact face, facial hair, glasses, and hair style."
        )

    # Hosts (exclude from scene) — letters X, Y, ...
    for i, h in enumerate(references.get("hosts", [])):
        b64 = _encode_image(h.get("path", ""))
        if not b64:
            continue
        letter = chr(ord("X") + i)
        parts.append({"inlineData": {"mimeType": "image/jpeg", "data": b64}})
        ref_preamble_lines.append(
            f"REFERENCE_{letter}: {h['name']} is the HOST — this person MUST NOT appear in the generated scene. Do not include them anywhere in the frame."
        )

    # Episode frames (clothing + setting context)
    frames = references.get("frames", [])
    if frames:
        log("gemini", f"  attaching {len(frames)} episode frame(s) as clothing/setting reference")
    for i, fp_path in enumerate(frames):
        b64 = _encode_image(fp_path)
        if not b64:
            continue
        parts.append({"inlineData": {"mimeType": "image/jpeg", "data": b64}})
    if frames:
        ref_preamble_lines.append(
            f"The last {len(frames)} images are FRAMES from the actual recent episode recording. Use them to match the GUEST.s real clothing, body proportions, current age, and overall look from that recording day. CRITICAL: if the GUEST appears in these frames, use THEIR APPEARANCE FROM THE FRAMES as the primary face/age reference — the headshot reference may be older or outdated. Render the guest as they look TODAY in the episode. Do not copy the SETTING of these frames — the new scene setting is described in the prompt below."
        )

    ref_preamble = ""
    if ref_preamble_lines:
        ref_preamble = "REFERENCE IMAGES:\n" + "\n".join(ref_preamble_lines) + "\n\n"

    # Text part is always LAST so Gemini reads references first
    parts.append({"text": ref_preamble + prompt})

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "temperature": 0.9,
            "imageConfig": {"aspectRatio": "16:9"},
        }
    }

    for attempt in range(5):
        r = requests.post(endpoint, headers=headers, json=body, timeout=180)
        if r.status_code == 429:
            wait_s = 15 + attempt * 5
            log("gemini", f"  429 throttled, waiting {wait_s}s (attempt {attempt+1}/5)")
            time.sleep(wait_s)
            continue
        if r.status_code == 200:
            break
        raise Exception(f"Vertex Gemini failed: {r.status_code} {r.text[:500]}")
    else:
        raise Exception("Vertex Gemini rate-limited after 5 retries")

    data = r.json()
    img_b64 = None
    try:
        parts_resp = data["candidates"][0]["content"]["parts"]
        for p in parts_resp:
            if "inlineData" in p or "inline_data" in p:
                node = p.get("inlineData") or p.get("inline_data")
                img_b64 = node.get("data")
                break
    except Exception as e:
        raise Exception(f"Vertex Gemini parse error: {e} / response: {str(data)[:500]}")

    if not img_b64:
        raise Exception(f"No image in Vertex response: {str(data)[:500]}")

    img_bytes = base64.b64decode(img_b64)
    with open(output_path, "wb") as f:
        f.write(img_bytes)
    log("gemini", f"  saved: {output_path} ({len(img_bytes) // 1024} KB)")


def generate_scene(prompt, output_path, references=None):
    """Scene engine router — picks generator based on SCENE_ENGINE env var.
    Default = flux. Alternatives: gemini. Downstream ReActor/GFPGAN/PIL
    overlay stays identical regardless of engine. Gemini uses references
    (headshot + host exclusion + episode frames) if provided."""
    engine = (os.environ.get("SCENE_ENGINE", "gemini") or "gemini").lower().strip()
    if engine == "gemini":
        log("scene-engine", "using Gemini 2.5 Flash Image (multimodal)")
        return gemini_generate_scene(prompt, output_path, references=references)
    log("scene-engine", "using FLUX-dev")
    return flux_generate_scene(prompt, output_path)


def build_scene_prompt(guests, scene_setting=None):
    """Per-guest: gender, age, hair (from Vision describe). Hair MUST come
    from the real person's headshot — face-swap doesn't swap hair, only the
    face region (forehead-chin, ear-to-ear). If we let FLUX choose hair,
    Katie ends up brunette and the thumbnail no longer represents her.

    scene_setting: optional paragraph describing WHERE the two guests are
    standing (episode-specific scene from Claude, or show-default fallback).
    Defaults to the old generic showroom if None."""

    # Expanded pool — paired with name-hash selection below so each guest gets
    # their own consistent look across every thumbnail they appear in, while
    # different guests across the catalogue wear different things.
    CLOTHING_POOL_MALE = [
        "a charcoal quarter-zip pullover over a light blue collared shirt",
        "a navy merino crewneck sweater",
        "a crisp white open-collar shirt under a slate-grey blazer",
        "a rich brown suede jacket over a heather-grey tee",
        "a forest-green button-down shirt with sleeves rolled",
        "a black turtleneck under a camel overcoat",
        "a denim jacket over a fitted white henley",
        "a dusty-blue chambray shirt with the top button undone",
        "a cream cable-knit sweater",
        "a graphite-grey sport coat over a black tee",
        "a burgundy quarter-zip fleece over a chambray shirt",
        "a tan work jacket over a dark grey tee",
    ]
    CLOTHING_POOL_FEMALE = [
        "a blush-pink blazer over a cream silk blouse",
        "a tailored ivory blazer with a fitted black top underneath",
        "a rust-orange turtleneck sweater",
        "a camel wool coat over a cream turtleneck",
        "a soft sage-green silk blouse",
        "a deep navy blazer over a white scoop-neck tee",
        "a cognac leather jacket over a black top",
        "a plum velvet blazer over a silk camisole",
        "a cream cashmere turtleneck",
        "a dusty-rose blouse with a delicate gold chain",
        "a forest-green silk wrap top",
        "a tailored charcoal blazer over a dove-grey tee",
    ]

    def describe_person(g, idx):
        d = g.get('description', {}) or {}
        gender = (d.get('gender') or 'person').lower()
        age = d.get('age_estimate', 38)
        hair = d.get('hair_description', 'short professional hair')
        build = d.get('build_description', 'average medium build')
        glasses = d.get('glasses', False)
        gp = 'man' if gender == 'male' else ('woman' if gender == 'female' else 'person')
        glasses_clause = ' wearing modern eyeglasses,' if glasses else ''

        # Clothing resolution:
        #   1. Per-guest override (guest-overrides.json 'clothing' field) wins
        #   2. Else hash(guest_name) picks deterministically from gender-aware pool
        #      → same guest = same outfit every render; different guests get varied looks
        clothing = d.get('clothing_override')
        if not clothing:
            pool = CLOTHING_POOL_FEMALE if gender == 'female' else CLOTHING_POOL_MALE
            h = abs(hash(g.get('name', f'guest{idx}'))) % len(pool)
            clothing = pool[h]

        # Skip build clause if blank (photo-driven mode)
        build_clause = f', {build}' if build and build.strip() else ''
        return f"a {age}-year-old {gp}{build_clause}, with {hair},{glasses_clause} wearing {clothing}"

    setting = scene_setting or 'a modern industrial-minimalist showroom with exposed wood beams and polished concrete, warm wood textures, deep atmospheric shadows'

    if len(guests) == 1:
        # SOLO mode — portrait framing, guest on the right, darker left for title
        g0_desc = describe_person(guests[0], 0)
        treatment_name, treatment = get_visual_treatment()
        return f"""{treatment["framing"]}, 16:9 widescreen format.

{g0_desc.capitalize()}, positioned on the RIGHT-CENTER of the frame, visible from chest up, three-quarter angle facing slightly toward the camera, calm confident expression, closed mouth, standing in {setting}.

LEFT {treatment["darkness_pct"]} percent of the frame is intentionally darker and atmospheric for title text — soft bokeh, subtle architectural shapes, NOT empty void.

LIGHTING: {treatment["lighting_solo"]}"""

    # ENSEMBLE mode — two guests in a natural two-shot
    g0_desc = describe_person(guests[0], 0)
    g1_desc = describe_person(guests[1], 1)

    return f"""Cinematic editorial portrait photograph for a premium Netflix limited-series poster, 16:9 widescreen format.

Two distinct home improvement industry executives standing together in {setting}.

LEFT character: {g0_desc}, visible from chest up, three-quarter angle facing slightly toward the camera, calm confident expression, closed mouth.

RIGHT character: {g1_desc}, visible from chest up, three-quarter angle facing slightly toward the camera, calm confident expression, closed mouth, positioned slightly in front of or beside the LEFT character for natural two-shot composition.

The two characters MUST be visually distinct from each other — different clothing, different hair, different posture. They are clearly two separate people in their thirties to early forties — youthful, sharp, energetic, NOT elderly.

LEFT 35 percent of the frame is intentionally darker and atmospheric for title text — soft bokeh, subtle architectural shapes, NOT empty void.

LIGHTING: cool steel-blue and slate-gray palette with subtle warm amber side-lighting from upper-right, dramatic shadow falloff across both faces. Premium magazine-cover quality. Photorealistic, 50mm portrait lens, shallow depth of field, cinematic color grade with subtle film grain. Reminiscent of Peaky Blinders or Dynasty Netflix poster art."""


# ============================================================================
# COMFYUI REACTOR WORKFLOW
# ============================================================================
def build_reactor_workflow(scene_filename, src1_filename, src2_filename=None):
    """Chained ReActor nodes — one per guest.

    1 guest → one ReActor pass swapping onto face_index=0.
    2 guests → two chained passes (face_index=0 then 1).

    ReActor detects faces in the input image and swaps onto the position
    specified by `input_faces_index`. CodeFormer face restoration is built
    into each ReActor node — no separate restoration step needed.
    """
    common_inputs = {
        "enabled": True,
        "swap_model": "inswapper_128.onnx",
        "facedetection": "retinaface_resnet50",
        "face_restore_model": "GFPGANv1.4.pth",
        "face_restore_visibility": 0.35,
        "codeformer_weight": 0.5,
        "detect_gender_input": "no",
        "detect_gender_source": "no",
        "source_faces_index": "0",
        "console_log_level": 1,
    }

    wf = {
        "1": {"class_type": "LoadImage",
              "inputs": {"image": scene_filename, "upload": "image"}},
        "2": {"class_type": "LoadImage",
              "inputs": {"image": src1_filename, "upload": "image"}},
        "4": {"class_type": "ReActorFaceSwap",
              "inputs": {**common_inputs,
                         "input_image": ["1", 0],
                         "source_image": ["2", 0],
                         "input_faces_index": "0"}},
    }

    if src2_filename:
        wf["3"] = {"class_type": "LoadImage",
                   "inputs": {"image": src2_filename, "upload": "image"}}
        wf["5"] = {"class_type": "ReActorFaceSwap",
                   "inputs": {**common_inputs,
                              "input_image": ["4", 0],
                              "source_image": ["3", 0],
                              "input_faces_index": "1"}}
        final_node = "5"
    else:
        final_node = "4"

    wf["6"] = {"class_type": "SaveImage",
               "inputs": {"images": [final_node, 0],
                          "filename_prefix": "reactor_out"}}
    return wf


def call_comfyui_reactor(workflow_json, zip_url, output_path):
    """POST to fofr/any-comfyui-workflow with our workflow + input zip URL.
    Retries on 429 (rate-limited under $5 credit = 6 req/min)."""
    log('comfy', f'Calling {COMFY_MODEL} with {len(json.dumps(workflow_json))} char workflow')
    payload = {
        'version': COMFY_VERSION,
        'input': {
            'workflow_json': json.dumps(workflow_json),
            'input_file': zip_url,
            'output_format': 'png',
            'output_quality': 95,
            'randomise_seeds': True,
            'return_temp_files': False,
        }
    }
    create_url = 'https://api.replicate.com/v1/predictions'
    headers = {
        'Authorization': f'Bearer {pipeline.REPLICATE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'wait',
    }
    for attempt in range(8):
        r = requests.post(create_url, headers=headers, json=payload, timeout=900)
        if r.status_code == 429:
            try:
                wait_s = int(r.json().get('retry_after', 12)) + 2
            except Exception:
                wait_s = 15
            log('comfy', f'  429 throttled, waiting {wait_s}s (attempt {attempt + 1}/8)')
            time.sleep(wait_s)
            continue
        if r.status_code in (200, 201, 202):
            break
        raise Exception(f'ComfyUI create failed: {r.status_code} {r.text[:800]}')
    else:
        raise Exception('ComfyUI create failed: rate-limited after 8 retries')
    pred = r.json()
    pred_id = pred.get('id')
    log('comfy', f'  prediction {pred_id}, status: {pred.get("status")}')
    while pred.get('status') in ('starting', 'processing'):
        time.sleep(5)
        poll = requests.get(f'https://api.replicate.com/v1/predictions/{pred_id}',
                            headers=headers, timeout=60)
        pred = poll.json()
        log('comfy', f'  status: {pred.get("status")}')
    if pred.get('status') != 'succeeded':
        raise Exception(f'ComfyUI failed: {pred.get("status")} / {pred.get("error")} / logs: {pred.get("logs", "")[-1500:]}')
    output = pred.get('output')
    img_url = output[0] if isinstance(output, list) else output
    log('comfy', f'  output URL: {img_url}')
    img_data = requests.get(img_url, timeout=120).content
    with open(output_path, 'wb') as f:
        f.write(img_data)
    log('comfy', f'  saved: {output_path} ({len(img_data) // 1024} KB)')
    return output_path


# ============================================================================
# TEXT OVERLAY (locked v11 — identical to positional-swap)
# ============================================================================
def make_cover_art_lines(hook_title):
    upper = hook_title.upper().strip().rstrip('.').rstrip('?').strip()
    for prefix in ('THE ', 'A ', 'AN ', 'WHY ', 'HOW ', 'WHAT '):
        if upper.startswith(prefix):
            upper = upper[len(prefix):]
            break
    if len(upper) <= 18:
        return [upper]
    mid = len(upper) // 2
    best_split, best_dist = None, 999
    for i, ch in enumerate(upper):
        if ch == ' ':
            d = abs(i - mid)
            if d < best_dist:
                best_dist, best_split = d, i
    if best_split:
        return [upper[:best_split], upper[best_split + 1:]]
    return [upper]


def _draw_letter_spaced(draw, xy, text, font, fill, tracking=4):
    """Draw text with manual letter-spacing (PIL doesn't have a tracking
    param). Returns the total width drawn."""
    x, y = xy
    total = 0
    for i, ch in enumerate(text):
        draw.text((x + total, y), ch, font=font, fill=fill)
        w = font.getlength(ch)
        total += w + (tracking if i < len(text) - 1 else 0)
    return total


def _measure_letter_spaced(font, text, tracking=4):
    total = 0
    for i, ch in enumerate(text):
        total += font.getlength(ch) + (tracking if i < len(text) - 1 else 0)
    return total


def _soft_shadow_text(base_img, xy, text, font, shadow_color, offset, blur_radius):
    """Draw text shadow as a blurred offset copy — replaces the hard 3px
    stroke with a cinematic drop shadow that integrates the text into the
    scene rather than sitting on top of it."""
    shadow_layer = Image.new('RGBA', base_img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.text((xy[0] + offset[0], xy[1] + offset[1]), text, font=font, fill=shadow_color)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur_radius))
    return Image.alpha_composite(base_img, shadow_layer)


def text_overlay_cover_art(scene_path, title_lines, show_label, output_path):
    """Netflix-aesthetic overlay — no pill badge, no sig. Just the episode
    hook as primary title with a small letter-spaced show wordmark above,
    soft blurred drop shadow (not hard stroke), cream-white (not digital
    pure white), and a light left-side gradient.

    Site-side badge system (IC theme) handles Recently Added / Top N /
    Power100 Original overlays at render time."""
    # Clean show name before rendering: strip wp-cli CSV quotes AND decode
    # HTML entities (wp returns "Greg &amp;amp; Paul" — double-encoded — so
    # one unescape leaves "&amp;" still visible; loop until stable).
    if show_label:
        import html
        show_label = show_label.strip().strip('"').strip("'")
        for _ in range(3):
            decoded = html.unescape(show_label)
            if decoded == show_label:
                break
            show_label = decoded
    treatment, treatment_name = pick_treatment(show_label)
    log('overlay', f'  treatment={treatment_name} for show="{show_label}"')

    title_font_path = f'{FONTS_DIR}/{treatment["title_font"]}'
    wordmark_font_path = f'{FONTS_DIR}/{treatment["wordmark_font"]}'
    size_scale = treatment.get('size_scale', 1.0)

    img = Image.open(scene_path).convert('RGBA')
    img = img.resize((1280, 720), Image.LANCZOS)

    # Light left-side gradient (was 195 → now 110). Lets the scene
    # photography do more of the work — text still reads thanks to
    # drop shadow + the scene's natural left-side darkness.
    peak = treatment['gradient_peak']
    grad = Image.new('RGBA', img.size, (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(grad)
    for x in range(640):
        alpha = int(peak * (1 - x / 640) ** 1.4)
        grad_draw.rectangle([x, 0, x + 1, 720], fill=(0, 0, 0, alpha))
    img = Image.alpha_composite(img, grad)

    # Fit title to 1200px max width, shrinking size if needed
    max_width = 1200
    base_size = 86 if len(title_lines) == 2 else 110
    title_font_size = int(base_size * size_scale)
    while title_font_size > int(48 * size_scale):
        tf = ImageFont.truetype(title_font_path, title_font_size)
        if max(tf.getlength(l) for l in title_lines) <= max_width:
            break
        title_font_size -= 4
    title_font = ImageFont.truetype(title_font_path, title_font_size)

    # Wordmark above title (small letter-spaced caps, treatment accent color)
    wordmark_text = (show_label or '').upper().strip()
    wordmark_size = 18
    wordmark_font = ImageFont.truetype(wordmark_font_path, wordmark_size)

    bottom_padding = 80
    line_gap = 8
    line_height = title_font_size + line_gap
    title_block_h = len(title_lines) * line_height - line_gap
    wordmark_gap = 14
    start_y = 720 - bottom_padding - title_block_h

    # Paint drop shadows FIRST (behind text), in a single layer per line
    for i, line in enumerate(title_lines):
        y = start_y + i * line_height
        img = _soft_shadow_text(img, (40, y), line, title_font,
                                treatment['shadow_color'],
                                treatment['shadow_offset'],
                                treatment['shadow_blur'])

    draw_real = ImageDraw.Draw(img)

    # Wordmark (small caps with tracking) — ABOVE the title
    # Needs its own soft shadow for contrast on mixed-luminosity backgrounds
    # (red/orange accents get lost on warm scenes without a shadow behind)
    if wordmark_text:
        wm_y = start_y - wordmark_gap - wordmark_size

        # Shadow pass for wordmark
        shadow_layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow_layer)
        sx = 40 + 2
        sy = wm_y + 2
        total = 0
        for i, ch in enumerate(wordmark_text):
            sd.text((sx + total, sy), ch, font=wordmark_font, fill=(0, 0, 0, 220))
            total += wordmark_font.getlength(ch) + (4 if i < len(wordmark_text) - 1 else 0)
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(6))
        img = Image.alpha_composite(img, shadow_layer)
        draw_real = ImageDraw.Draw(img)

        _draw_letter_spaced(draw_real, (40, wm_y), wordmark_text,
                            wordmark_font, treatment['wordmark_color'], tracking=4)
        wm_w = _measure_letter_spaced(wordmark_font, wordmark_text, tracking=4)
        line_y = wm_y + wordmark_size + 4
        draw_real.rectangle([40, line_y, 40 + int(wm_w * 0.35), line_y + 2],
                            fill=treatment['wordmark_color'])

    # Main title lines on top of shadow
    for i, line in enumerate(title_lines):
        y = start_y + i * line_height
        draw_real.text((40, y), line, font=title_font, fill=treatment['title_color'])

    rgb = Image.new('RGB', img.size, (0, 0, 0))
    rgb.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
    rgb.save(output_path, 'JPEG', quality=92, optimize=True)
    log('overlay', f'Saved: {output_path} ({os.path.getsize(output_path) // 1024} KB)')


# ============================================================================
# MAIN
# ============================================================================
def load_guest_overrides():
    """Per-guest profile cache (hair/age/glasses/gender) keyed by exact guest
    name. First encounter: Claude Haiku Vision auto-populates this file.
    Subsequent thumbnails read from cache — zero API cost per repeat guest.
    You edit entries manually when Vision misreads (e.g. hair color in
    stylized headshots)."""
    try:
        with open(GUEST_OVERRIDES_PATH) as f:
            data = json.load(f)
        return {k: v for k, v in data.items() if not k.startswith('_')}
    except Exception as e:
        log('overrides', f'  no override file at {GUEST_OVERRIDES_PATH} ({e})')
        return {}


def save_guest_override(name, profile):
    """Write/update a single guest entry in the overrides JSON. Preserves
    the file's _comment and any other entries. Called after Vision describes
    a new guest, so the result is cached for all future runs."""
    try:
        try:
            with open(GUEST_OVERRIDES_PATH) as f:
                data = json.load(f)
        except Exception:
            data = {'_comment': 'Per-guest Vision cache. Edit to correct.'}
        data[name] = profile
        with open(GUEST_OVERRIDES_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        log('overrides', f'  cached {name} → {GUEST_OVERRIDES_PATH}')
    except Exception as e:
        log('overrides', f'  cache write failed: {e}')


def load_scene_overrides():
    try:
        with open(SCENE_OVERRIDES_PATH) as f:
            data = json.load(f)
        return {k: v for k, v in data.items() if not k.startswith('_')}
    except Exception:
        return {}


def save_scene_override(post_id, scene_entry):
    try:
        try:
            with open(SCENE_OVERRIDES_PATH) as f:
                data = json.load(f)
        except Exception:
            data = {'_comment': 'Claude-proposed scene settings per post ID. Edit any entry to customize the FLUX backdrop for that specific episode.'}
        data[str(post_id)] = scene_entry
        with open(SCENE_OVERRIDES_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        log('scene', f'  cached scene for post {post_id}')
    except Exception as e:
        log('scene', f'  cache write failed: {e}')



SCENE_DESIGNER_ROLE = """You are a Netflix-level cover art/poster art designer for video content consumed on a gated membership video platform. You serve an audience that expects a balance of high quality, relatability, and unique creativity to tell visual stories. You are unafraid to push boundaries in reason, within these confines. Your work must feel designed — not default — and each cover must feel distinct from the covers before and after it."""


SCENE_CLASSES = {
    "Worksite": {
        "description": "Active jobsite, install in progress, hard hats, equipment, ladders, trucks",
        "best_for": "day-in-the-life episodes, ops/install topics, field work stories",
        "composition": "wide environmental portrait, subject off-center with equipment and workers in mid/background, 35mm lens, dynamic natural light",
        "moment": "mid-action or mid-conversation, hand gesturing or holding a tool, natural body language not posed",
    },
    "Stage": {
        "description": "Podium speech, conference floor, audience POV, stage lighting, keynote",
        "best_for": "speeches, keynotes, big-room moments, leadership address",
        "composition": "low angle from audience POV looking up slightly, subject center or left-of-center, blurred stage/audience behind, dramatic rim lighting",
        "moment": "mid-speech, slight gesture, engaged expression",
    },
    "Studio": {
        "description": "Clean editorial backdrop, isolated subject, controlled studio lighting",
        "best_for": "feature interviews, profiles, authority pieces",
        "composition": "tight editorial crop, subject rule-of-thirds, seamless neutral backdrop, 85mm portrait lens",
        "moment": "direct gaze or slight glance off-camera, composed magazine-cover pose",
    },
    "Office": {
        "description": "Boardroom, glass conference room, desk-side executive space",
        "best_for": "CEO interviews, leadership topics, financial/strategy discussions",
        "composition": "guest standing beside conference table or at glass wall overlooking skyline, 50mm lens, even interior light with window glow",
        "moment": "confident upright stance, hands in pockets or on table, focused gaze",
    },
    "Home": {
        "description": "Finished install in a customer's home — kitchen, living room, bathroom, dining room",
        "best_for": "customer success, install reveal, family-business stories",
        "composition": "environmental mid-shot, subject standing in a finished room showing the work, warm interior lighting, 35-50mm lens",
        "moment": "relaxed and proud, maybe gesturing to the completed space",
    },
    "Field": {
        "description": "Rooftop, parking lot with trucks/vans, outdoor terrace, loading dock",
        "best_for": "lifestyle, regional stories, fleet/operations topics",
        "composition": "wide outdoor environmental, subject on left or right third, natural daylight, sky or buildings as backdrop",
        "moment": "walking or standing casually, sunlit, natural eye line",
    },
    "Vehicle": {
        "description": "Truck cab interior, work van, in-car conversation framing",
        "best_for": "day-in-the-life travel, candid on-the-road moments",
        "composition": "tight interior frame through passenger window or over-shoulder, natural light through windshield, 35mm lens",
        "moment": "mid-conversation or looking thoughtfully out window",
    },
    "Workshop": {
        "description": "Fabrication shop, manufacturing floor, design studio, warehouse with product",
        "best_for": "product/manufacturing topics, craft stories, quality/process pieces",
        "composition": "environmental wide shot with machinery or product visible, industrial lighting with warm accent, 35mm lens",
        "moment": "engaged with work, hand on material, natural industrial pose",
    },
    "Casual": {
        "description": "Coffee shop, restaurant booth, neighborhood walk, brewery, diner",
        "best_for": "personality pieces, personal-side stories, origin stories",
        "composition": "intimate candid framing, shallow depth of field, warm ambient interior light, 50mm lens",
        "moment": "laughing, mid-conversation, relaxed body language",
    },
    "Abstract Symbolic": {
        "description": "Symbolic environment matching episode topic — scaffolding for growth, vault for finance, scoreboard for closing rate, library for wisdom",
        "best_for": "concept-heavy episodes, big-idea hooks, metaphor-driven titles",
        "composition": "dramatic environmental portrait, subject framed by the symbolic structure, strong directional lighting, 50mm lens",
        "moment": "contemplative or resolute, looking toward or through the symbolic element",
    },
}


_LAST_SCENE_CLASS_HINTS = {"class": None, "composition": None, "moment": None}


def load_scene_class_history(show):
    try:
        with open(SCENE_OVERRIDES_PATH) as f:
            data = json.load(f)
        return data.get("_scene_class_history", {}).get(show, [])[-3:]
    except Exception:
        return []


def append_scene_class_history(show, class_name):
    try:
        try:
            with open(SCENE_OVERRIDES_PATH) as f:
                data = json.load(f)
        except Exception:
            data = {"_comment": "Claude-proposed scene settings per post ID."}
        hist_root = data.setdefault("_scene_class_history", {})
        show_hist = hist_root.setdefault(show, [])
        show_hist.append(class_name)
        hist_root[show] = show_hist[-10:]
        with open(SCENE_OVERRIDES_PATH, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        log("scene", f"  class history write failed: {e}")


def pick_scene_class(post, hook, transcript_sample, all_hooks=None):
    forced = os.environ.get("FORCE_SCENE_CLASS", "").strip()
    if forced and forced in SCENE_CLASSES:
        log("scene", f"  class: FORCED via env -> {forced}")
        return forced

    show = post.get("show", "PowerChat")
    title = post.get("title", "")[:200]
    recent = load_scene_class_history(show)
    forbidden = set(recent[-2:]) if len(recent) >= 2 else set()

    hooks_text = chr(10).join(f"- {h['title']}" for h in (all_hooks or [hook])[:5])
    matrix_desc = chr(10).join(
        f"- {name}: {c['description']}. Best for: {c['best_for']}"
        for name, c in SCENE_CLASSES.items()
        if name not in forbidden
    )
    forbidden_text = ""
    if forbidden:
        forbidden_text = f"{chr(10)}{chr(10)}DIVERSITY CONSTRAINT: do NOT pick {', '.join(forbidden)} -- those were used in the previous episodes of this show. Pick something visually distinct."

    prompt = f"""{SCENE_DESIGNER_ROLE}

Pick ONE scene class from the matrix for this thumbnail. Match the class to the episode's title + hook -- the title will appear on the thumbnail and the scene must reinforce it visually.

SHOW: {show}
EPISODE TITLE: {title}
TOP HOOKS:
{hooks_text}

TRANSCRIPT EXCERPT:
"{transcript_sample[:2500]}"

AVAILABLE SCENE CLASSES:
{matrix_desc}{forbidden_text}

Respond in EXACTLY this format, no preamble:
CLASS: <one class name from the list above>
REASON: <one short sentence explaining why this class fits this episode>
"""

    try:
        content = _claude_call(prompt, max_tokens=200, temperature=0.7)
        for line in content.splitlines():
            line = line.strip()
            if line.upper().startswith("CLASS:"):
                name = line.split(":", 1)[1].strip()
                if name in SCENE_CLASSES:
                    log("scene", f"  class: {name}")
                    for ln in content.splitlines():
                        if ln.strip().upper().startswith("REASON:"):
                            log("scene", f"  reason: {ln.split(':', 1)[1].strip()[:140]}")
                    return name
        log("scene", "  class parse failed -> Office fallback")
        return "Office"
    except Exception as e:
        log("scene", f"  pick_scene_class failed ({e}) -> Office fallback")
        return "Office"


def _claude_call(prompt_text, max_tokens=600, temperature=0.85):
    """Bare Claude Haiku text call helper."""
    api_key = os.environ.get('ANTHROPIC_API_KEY') or pipeline._env.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        raise Exception('ANTHROPIC_API_KEY not set')
    body = {
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': max_tokens,
        'temperature': temperature,
        'messages': [{'role': 'user', 'content': prompt_text}]
    }
    r = requests.post('https://api.anthropic.com/v1/messages',
                      headers={
                          'x-api-key': api_key,
                          'anthropic-version': '2023-06-01',
                          'content-type': 'application/json',
                      },
                      json=body, timeout=60)
    if r.status_code != 200:
        raise Exception(f'Claude {r.status_code}: {r.text[:300]}')
    content = r.json().get('content', [{}])[0].get('text', '')
    if not content:
        raise Exception('Claude returned empty content')
    return content.strip()

def _claude_call_sonnet(prompt_text, max_tokens=800, temperature=0.85):
    """Claude Sonnet 4.6 text call — higher instruction-following than Haiku."""
    api_key = os.environ.get('ANTHROPIC_API_KEY') or pipeline._env.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        raise Exception('ANTHROPIC_API_KEY not set')
    body = {
        'model': 'claude-sonnet-4-6',
        'max_tokens': max_tokens,
        'temperature': temperature,
        'messages': [{'role': 'user', 'content': prompt_text}]
    }
    r = requests.post('https://api.anthropic.com/v1/messages',
                      headers={'x-api-key': api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
                      json=body, timeout=90)
    if r.status_code != 200:
        raise Exception(f'Sonnet {r.status_code}: {r.text[:300]}')
    content = r.json().get('content', [{}])[0].get('text', '')
    if not content:
        raise Exception('Sonnet returned empty content')
    return content.strip()





def claude_extract_scene_beats(post, hook, all_hooks, transcript_full):
    """Stage 1 of two-stage scene proposer. Claude reads the FULL transcript
    + hooks + post metadata and extracts the raw thematic material that
    Stage 2 will use to design the visual scene.

    The point of separating extraction from design: when Claude tries to do
    both at once it defaults to safe interiors. Forcing it to first ENUMERATE
    specific places, objects, eras, and emotional arcs from the transcript
    makes Stage 2 much more likely to ground the scene in something real."""
    guest_names = ', '.join(g['name'] for g in post.get('guests', [])[:2])
    show = post.get('show', 'PowerChat')
    title = post.get('title', '')[:200]

    hooks_text = '\n'.join(f'- {h["title"]}' for h in (all_hooks or [hook])[:5])

    prompt = f'''Read this podcast episode and extract the visual material a Netflix poster art director would need to design the thumbnail.

SHOW: {show}
EPISODE TITLE: {title}
GUESTS: {guest_names}
TOP HOOKS:
{hooks_text}

TRANSCRIPT (first segments):
"{transcript_full[:5000]}"

Extract the following — be SPECIFIC, drawing from what's actually mentioned in the transcript. If the transcript references concrete places, objects, time periods, or sensory details, name them. Don't invent.

Respond in EXACTLY this format, no preamble:
SPECIFIC_PLACES: <comma-separated list of concrete places mentioned in the transcript or directly tied to the story — e.g. "Fenway Park dugout, original 1914 fence yard, Boston Common bench at sunset, family kitchen table". Include 3-5.>
SPECIFIC_OBJECTS: <comma-separated list of physical objects, tools, artifacts, or visual symbols tied to the episode — e.g. "vintage wooden fence posts, baseball glove on workbench, framed family photos from 1914, mental health awareness ribbons". Include 3-5.>
ERA_OR_TIME: <when does this story span — e.g. "spans 4 generations from 1914 to today" or "11 years since the tragedy" — one phrase>
EMOTIONAL_ARC: <one phrase describing the emotional through-line — e.g. "tragedy transformed into purpose", "blue-collar grit becomes generational legacy", "founder's perseverance through doubt">
VISUAL_METAPHOR: <one specific visual that would represent this episode if it were a single image — e.g. "two siblings standing in front of a giant Green Monster wall at dusk", "a craftsman's calloused hands holding both a fence rail and a baseball">'''

    content = _claude_call(prompt, max_tokens=600, temperature=0.6)
    beats = {}
    for line in content.splitlines():
        line = line.strip()
        for key in ('SPECIFIC_PLACES', 'SPECIFIC_OBJECTS', 'ERA_OR_TIME', 'EMOTIONAL_ARC', 'VISUAL_METAPHOR'):
            if line.upper().startswith(key + ':'):
                beats[key.lower()] = line.split(':', 1)[1].strip()
    return beats


def claude_propose_scene(post, hook, transcript_sample, all_hooks=None, scene_class=None):
    """Class-dominant Netflix-level scene designer. Uses Sonnet 4.6.

    The scene CLASS is the primary frame. Everything else — hook, transcript
    beats, episode title — are context to help design WITHIN that class.
    No "examples" that bias toward boardrooms. No fallback permission to
    default to interiors. The class is the rule."""
    show = post.get('show', 'PowerChat')
    title = post.get('title', '')[:200]
    if scene_class is None:
        scene_class = pick_scene_class(post, hook, transcript_sample, all_hooks=all_hooks)
    class_def = SCENE_CLASSES.get(scene_class, SCENE_CLASSES["Office"])
    _LAST_SCENE_CLASS_HINTS["class"] = scene_class
    _LAST_SCENE_CLASS_HINTS["composition"] = class_def["composition"]
    _LAST_SCENE_CLASS_HINTS["moment"] = class_def["moment"]

    # Extract beats for raw material (places, objects, era, visual metaphor)
    try:
        beats = claude_extract_scene_beats(post, hook, all_hooks, transcript_sample)
        log('scene', f'  beats: places="{beats.get("specific_places", "?")[:80]}"')
        log('scene', f'  beats: metaphor="{beats.get("visual_metaphor", "?")[:80]}"')
    except Exception as e:
        log('scene', f'  beat extraction failed ({e})')
        beats = {}

    beats_context = ""
    if beats:
        beats_context = f"""
EPISODE CONTEXT (use to personalize the scene within the class):
- Specific places mentioned: {beats.get('specific_places', '(none)')}
- Physical objects/symbols: {beats.get('specific_objects', '(none)')}
- Era/timespan: {beats.get('era_or_time', '(unknown)')}
- Emotional arc: {beats.get('emotional_arc', '(unknown)')}
- Visual metaphor: {beats.get('visual_metaphor', '(none)')}
"""

    # Class-dominant prompt. No "examples" that steer toward offices.
    prompt = f"""{SCENE_DESIGNER_ROLE}

HARD CONSTRAINT: You MUST design a specific scene INSIDE the following class. You may NOT drift into another class. If the episode content doesn't obviously fit this class, find a creative interpretation that still lives within it.

ASSIGNED SCENE CLASS: {scene_class}
Class description: {class_def['description']}
Best for: {class_def['best_for']}
Composition hint for this class: {class_def['composition']}
Subject moment for this class: {class_def['moment']}

EPISODE HEADLINE (appears on the thumbnail): "{hook['title']}"
SHOW: {show}
EPISODE TITLE: {title}
{beats_context}
FORBIDDEN: Do NOT set this scene in an office, boardroom, conference room, glass-walled meeting space, sales floor, showroom, or any generic corporate interior UNLESS the class is literally "Office" or "Studio". If your first instinct is an office/corporate interior and the class is something else, that is your brain defaulting — push through and design within the actual class.

DESIGN RULES:
- Pick a SPECIFIC real-world instance within the {scene_class} class — named or imagined, but concrete
- Use the episode context to personalize: if the class is Worksite and the episode is about closing rate, maybe a residential driveway at dusk with a sales truck and a doorbell demo in progress
- LEFT ~35% of the frame must be darker / atmospheric for title text legibility
- Cinematic depth — real architectural or environmental layers, not a flat wall
- Photorealistic (no illustration, no stylization)
- Wide 16:9 landscape
- The class composition + moment hints ARE the framing rules — honor them

Respond in EXACTLY this format, no preamble:
SCENE: <one paragraph, 60-90 words, describing the specific scene instance with concrete details, lighting direction, color palette, and atmosphere — the scene MUST live within the {scene_class} class>
"""

    content = _claude_call_sonnet(prompt, max_tokens=600, temperature=0.9)
    for line in content.splitlines():
        line = line.strip()
        if line.upper().startswith('SCENE:'):
            return line.split(':', 1)[1].strip()
    return content.strip()


def resolve_scene(post, hook, transcript_sample, all_hooks=None):
    """Resolution order: cached override → Claude fresh proposal → show default."""
    pid = str(post.get('id') or post.get('post_id') or '')
    cache = load_scene_overrides().get(pid, {}) if pid else {}
    if cache and cache.get('scene'):
        log('scene', f'  using cached scene for post {pid}')
        return cache['scene']
    try:
        scene = claude_propose_scene(post, hook, transcript_sample, all_hooks=all_hooks)
        log('scene', f'  Claude proposed: "{scene[:140]}..."')
        if pid:
            save_scene_override(pid, {
                'scene': scene,
                'hook_used': hook['title'],
                'scene_class': _LAST_SCENE_CLASS_HINTS.get('class'),
                '_source': 'claude-haiku-auto',
            })
            if _LAST_SCENE_CLASS_HINTS.get('class'):
                append_scene_class_history(post.get('show', 'PowerChat'), _LAST_SCENE_CLASS_HINTS['class'])
        return scene
    except Exception as e:
        log('scene', f'  Claude proposal failed ({e}), using show default')
        return show_default_scene(post.get('show'))


def extract_episode_frames(source_mp4, work_dir, num_frames=8):
    """Pull N frames evenly spread across the source MP4 via ffmpeg.
    Returns list of frame file paths. Used to give Vision the actual
    recording-day attire each guest is wearing in the episode."""
    import subprocess
    ffmpeg_bin = pipeline.FFMPEG if hasattr(pipeline, 'FFMPEG') else f'{HOME}/bin/ffmpeg'
    ffprobe_bin = ffmpeg_bin.replace('ffmpeg', 'ffprobe')
    # Get duration first
    probe = subprocess.run([ffprobe_bin, '-v', 'error', '-show_entries',
                            'format=duration', '-of', 'default=nw=1:nk=1',
                            source_mp4], capture_output=True, text=True, timeout=60)
    try:
        duration = float(probe.stdout.strip())
    except Exception:
        duration = 1800  # fallback 30min
    log('frames', f'  source duration {duration:.0f}s, extracting {num_frames} frames')

    frames = []
    # Skip first/last 10% to avoid intros/outros
    start_skip = duration * 0.1
    end_skip = duration * 0.9
    span = end_skip - start_skip
    for i in range(num_frames):
        ts = start_skip + (span * i / max(1, num_frames - 1))
        out = f'{work_dir}/frame-{i:02d}.jpg'
        subprocess.run([ffmpeg_bin, '-y', '-ss', str(ts), '-i', source_mp4,
                        '-vframes', '1', '-q:v', '4', out],
                       capture_output=True, timeout=60)
        if os.path.exists(out) and os.path.getsize(out) > 5000:
            frames.append(out)
    log('frames', f'  extracted {len(frames)} usable frames')
    return frames


def claude_extract_all_episode_clothing(guests, frame_paths, host_refs=None):
    """ONE batch call: send all guests' reference headshots + numbered episode
    frames. For each frame, Claude identifies WHICH guest (or 'other') is
    shown and describes their clothing.

    host_refs: optional list of [(name, headshot_path)] for hosts/people who are
    explicitly NOT the target. These appear alongside guest references but are
    labeled clearly — any frame matching one of these gets marked 'other'.
    Critical for solo episodes where only one guest reference alone isn't enough
    to disambiguate from the host (who's in most frames).

    Model selectable via CLAUDE_CLOTHING_MODEL env var (default: haiku). Set
    to 'sonnet' for better face-identification accuracy at higher cost.

    Returns dict {guest_name: clothing_string} for guests reliably identified."""
    api_key = os.environ.get('ANTHROPIC_API_KEY') or pipeline._env.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        return {}

    frames_to_send = frame_paths[:8]
    if not frames_to_send or not guests:
        return {}
    host_refs = host_refs or []

    # Build reference list with letter labels (A, B, ...)
    ref_labels = []
    for i, g in enumerate(guests):
        letter = chr(ord('A') + i)
        ref_labels.append((letter, g['name'], g['_face_ref_path']))

    # Build host-exclusion labels (X, Y, Z...) — negative references
    host_labels = []
    for i, (host_name, host_path) in enumerate(host_refs):
        letter = chr(ord('X') + i)
        host_labels.append((letter, host_name, host_path))

    refs_text = '\n'.join(f'  REFERENCE_{letter}: {name} (GUEST - identify)' for letter, name, _ in ref_labels)
    if host_labels:
        refs_text += '\n' + '\n'.join(f'  REFERENCE_{letter}: {name} (HOST - MARK AS OTHER, do NOT identify as guest)' for letter, name, _ in host_labels)

    host_warning = ''
    if host_labels:
        host_names = ', '.join(n for _, n, _ in host_labels)
        host_warning = f'''

CRITICAL: {host_names} is the show HOST and appears in many frames. The host is NOT the guest you are identifying. If a frame shows the host, mark PERSON=other even though you recognize them. The host's clothing must NEVER be attributed to the guest.'''

    instructions = f'''You will receive {len(guests) + len(host_labels)} REFERENCE headshots followed by {len(frames_to_send)} numbered FRAMES from a podcast episode.

REFERENCES:
{refs_text}{host_warning}

For EACH frame, decide which GUEST reference person is shown — or "other" if the person is the HOST, is not in the references at all, or if multiple people appear and you can't confidently isolate the guest.

For EACH frame, decide which reference person is shown — or "other" if it's someone not in the references. Compare facial features carefully. If multiple people appear in one frame, identify the most prominent one.

Be PRECISE about garment type. The garment category matters more than the color — FLUX will render exactly what you describe, so "jacket" produces a heavy outerwear coat while "quarter-zip pullover" produces a fitted fleece. Use specific category words:
- pullover / quarter-zip / fleece / hoodie / sweater / cardigan
- button-up shirt / polo / t-shirt / henley / turtleneck
- blazer / sport coat / suit jacket
- jacket (only for actual outerwear) / coat / vest

Respond in EXACTLY this format, one line per frame, no preamble:
FRAME_1: person=A OR B OR other OR none | clothing=<precise phrase if person is A/B, blank otherwise>
FRAME_2: person=A OR B OR other OR none | clothing=<precise phrase if person is A/B, blank otherwise>
... (one line per frame)

Examples (note the garment precision):
FRAME_1: person=A | clothing=a navy blue quarter-zip fleece pullover over an olive green crewneck tee
FRAME_2: person=other | clothing=
FRAME_3: person=B | clothing=a chambray blue button-up shirt with a delicate gold chain necklace'''

    content = [{'type': 'text', 'text': instructions}]
    # Add guest reference headshots first (letters A, B, ...)
    for letter, name, path in ref_labels:
        with open(path, 'rb') as fp:
            content.append({
                'type': 'image',
                'source': {'type': 'base64', 'media_type': 'image/jpeg',
                           'data': base64.b64encode(fp.read()).decode()}
            })
    # Then host/negative references (letters X, Y, ...)
    for letter, name, path in host_labels:
        with open(path, 'rb') as fp:
            content.append({
                'type': 'image',
                'source': {'type': 'base64', 'media_type': 'image/jpeg',
                           'data': base64.b64encode(fp.read()).decode()}
            })
    # Add frames
    for fp_path in frames_to_send:
        with open(fp_path, 'rb') as fp:
            content.append({
                'type': 'image',
                'source': {'type': 'base64', 'media_type': 'image/jpeg',
                           'data': base64.b64encode(fp.read()).decode()}
            })

    # Model selection — Sonnet is the default now (strict enough to reject
    # ambiguous frames like host-in-background, gracefully falls back to
    # headshot-derived clothing). CLAUDE_CLOTHING_MODEL=haiku to override.
    model_choice = os.environ.get('CLAUDE_CLOTHING_MODEL', 'sonnet').lower()
    model_id = 'claude-haiku-4-5-20251001' if model_choice == 'haiku' else 'claude-sonnet-4-6'
    log('clothing', f'  using model: {model_id}')

    body = {
        'model': model_id,
        'max_tokens': 800,
        'temperature': 0.1,
        'messages': [{'role': 'user', 'content': content}]
    }
    try:
        r = requests.post('https://api.anthropic.com/v1/messages',
                          headers={
                              'x-api-key': api_key,
                              'anthropic-version': '2023-06-01',
                              'content-type': 'application/json',
                          },
                          json=body, timeout=180)
        if r.status_code != 200:
            log('clothing', f'  Claude {r.status_code}: {r.text[:200]}')
            return {}
        resp = r.json().get('content', [{}])[0].get('text', '')

        # Parse per-frame: aggregate clothing per guest letter
        per_letter = {}  # letter -> list of clothing strings
        for line in resp.splitlines():
            line = line.strip()
            if not line.upper().startswith('FRAME_'):
                continue
            try:
                _, _, rest = line.partition(':')
                parts = [p.strip() for p in rest.split('|')]
                person_kv = next((p for p in parts if p.lower().startswith('person=')), '')
                clothing_kv = next((p for p in parts if p.lower().startswith('clothing=')), '')
                person = person_kv.split('=', 1)[1].strip().upper()
                clothing = clothing_kv.split('=', 1)[1].strip().strip('"').strip("'") if clothing_kv else ''
                if person in [letter for letter, _, _ in ref_labels] and clothing:
                    per_letter.setdefault(person, []).append(clothing)
            except Exception:
                continue

        result = {}
        for letter, name, _ in ref_labels:
            descs = per_letter.get(letter, [])
            if not descs:
                log('clothing', f'  {name}: no frames identified')
                continue
            # Pick the longest (most descriptive) match
            descs.sort(key=len, reverse=True)
            result[name] = descs[0]
            log('clothing', f'  {name}: {len(descs)} frame(s) matched → "{descs[0]}"')
        return result
    except Exception as e:
        log('clothing', f'  batch episode-frame clothing extraction failed: {e}')
        return {}


def claude_extract_episode_clothing(guest, frame_paths, headshot_path):
    """Per-frame structured identification — for each frame, Claude must say
    YES/NO whether the reference person is in it, then describe their clothing
    only on YES frames. Aggregates across confident matches.

    Why per-frame: a single 'find this person' prompt will pick whoever is
    most visually prominent across the frame batch — which on a podcast set
    is usually the host (more screen time, more striking outfit) rather than
    the guest. Forcing per-frame yes/no with a strict identity standard
    eliminates the host-bleeding-into-guest-clothing failure mode.

    Returns clothing string from confident matches, or None."""
    api_key = os.environ.get('ANTHROPIC_API_KEY') or pipeline._env.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        return None

    frames_to_send = frame_paths[:6]
    if not frames_to_send:
        return None

    instructions = f'''The FIRST image is a reference headshot of {guest['name']}.
The next {len(frames_to_send)} images are numbered frames (1, 2, 3...) from a podcast episode {guest['name']} appeared in. Other people (especially the show host) ALSO appear in these frames — those people are NOT {guest['name']} and must be ignored.

For EACH frame, decide: is the SAME person from the reference headshot present in this frame?

Be strict. Compare facial features (jawline, nose, eye shape, age, build). If you're not at least 85% confident it's the same person, answer NO. Different person → NO. Person turned away or face not visible → NO.

For frames where the answer is YES, describe what {guest['name']} is wearing IN THAT FRAME.

Respond in EXACTLY this format, one line per frame, no preamble or commentary:
FRAME_1: present=yes OR no | clothing=<one phrase if present, blank otherwise>
FRAME_2: present=yes OR no | clothing=<one phrase if present, blank otherwise>
... (one line per frame)'''

    content = [{'type': 'text', 'text': instructions}]
    with open(headshot_path, 'rb') as fp:
        content.append({
            'type': 'image',
            'source': {'type': 'base64', 'media_type': 'image/jpeg',
                       'data': base64.b64encode(fp.read()).decode()}
        })
    for fp_path in frames_to_send:
        with open(fp_path, 'rb') as fp:
            content.append({
                'type': 'image',
                'source': {'type': 'base64', 'media_type': 'image/jpeg',
                           'data': base64.b64encode(fp.read()).decode()}
            })

    body = {
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 600,
        'temperature': 0.1,
        'messages': [{'role': 'user', 'content': content}]
    }
    try:
        r = requests.post('https://api.anthropic.com/v1/messages',
                          headers={
                              'x-api-key': api_key,
                              'anthropic-version': '2023-06-01',
                              'content-type': 'application/json',
                          },
                          json=body, timeout=120)
        if r.status_code != 200:
            log('clothing', f'  Claude {r.status_code}: {r.text[:200]}')
            return None
        resp = r.json().get('content', [{}])[0].get('text', '')

        # Parse per-frame results
        matches = []  # list of (frame_idx, clothing) for present=yes
        for line in resp.splitlines():
            line = line.strip()
            if not line.upper().startswith('FRAME_'):
                continue
            try:
                frame_part, _, rest = line.partition(':')
                frame_idx = int(frame_part.split('_')[1])
                # rest format: " present=yes | clothing=..."
                parts = [p.strip() for p in rest.split('|')]
                present_kv = next((p for p in parts if p.lower().startswith('present=')), '')
                clothing_kv = next((p for p in parts if p.lower().startswith('clothing=')), '')
                present = present_kv.split('=', 1)[1].strip().lower().startswith('y')
                clothing = clothing_kv.split('=', 1)[1].strip().strip('"').strip("'") if clothing_kv else ''
                if present and clothing:
                    matches.append((frame_idx, clothing))
            except Exception:
                continue

        if not matches:
            log('clothing', f'  {guest["name"]}: no confident frame matches')
            return None

        # Aggregate: pick the longest description (most detailed) from
        # confident matches — usually the most descriptive frame is also
        # the clearest view of the person
        matches.sort(key=lambda x: len(x[1]), reverse=True)
        log('clothing', f'  {guest["name"]}: matched {len(matches)} frame(s), '
                       f'using frame_{matches[0][0]} description')
        return matches[0][1]
    except Exception as e:
        log('clothing', f'  episode-frame clothing extraction failed: {e}')
        return None


def resolve_episode_clothing(post_id, guests, source_mp4, work_dir, host_refs=None):
    """Per-(post + guest) clothing resolution. Cached in scene-overrides.json
    under guest_clothing.<name>. Resolution chain when building scene prompt:
      1. Per-(post + guest) cache (this function — episode-frame derived)
      2. Per-guest headshot cache (guest-overrides.json clothing field)
      3. Hash pool fallback

    host_refs: optional list of [(name, headshot_path)] for host exclusion
    during Vision identification. Critical for solo episodes."""
    cache = load_scene_overrides().get(str(post_id), {}) or {}
    cached_clothing = cache.get('guest_clothing', {})

    # Option 1: CLOTHING_MODE=headshot-only → skip episode-frame extraction for
    # SOLO episodes (where host-confusion is most likely). Still runs for
    # ensemble since multiple guest refs help disambiguate.
    if os.environ.get('CLOTHING_MODE') == 'headshot-only' and len(guests) == 1:
        log('clothing', f'  CLOTHING_MODE=headshot-only + solo → skipping episode-frame extraction')
        return cached_clothing

    # Check if we already have all guests cached
    needed = [g for g in guests if g['name'] not in cached_clothing]
    if not needed:
        log('clothing', f'  all guests have cached episode clothing')
        return cached_clothing

    # Extract frames once for the whole batch
    log('clothing', f'  extracting episode frames to identify {len(needed)} guest(s)')
    frames = extract_episode_frames(source_mp4, work_dir, num_frames=8)
    if not frames:
        log('clothing', f'  no frames extracted, skipping episode clothing')
        return cached_clothing

    # Batch identification with host exclusion (negative references)
    if host_refs:
        log('clothing', f'  using {len(host_refs)} host exclusion reference(s): {", ".join(n for n, _ in host_refs)}')
    batch_results = claude_extract_all_episode_clothing(needed, frames, host_refs=host_refs)
    for g in needed:
        c = batch_results.get(g['name'])
        if c:
            cached_clothing[g['name']] = c
        else:
            log('clothing', f'  {g["name"]}: not reliably identified in frames, will fall back')

    # Write back to scene-overrides cache
    if cached_clothing:
        cache['guest_clothing'] = cached_clothing
        save_scene_override(post_id, cache)

    return cached_clothing


def claude_haiku_describe(face_ref_path, name):
    """Claude Haiku 4.5 vision — doesn't refuse on identifiable business
    people like GPT-4o does. Returns same dict shape as old vision_describe."""
    api_key = os.environ.get('ANTHROPIC_API_KEY') or pipeline._env.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        raise Exception('ANTHROPIC_API_KEY not set')

    with open(face_ref_path, 'rb') as fp:
        b64 = base64.b64encode(fp.read()).decode()

    body = {
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 300,
        'temperature': 0.2,
        'messages': [{
            'role': 'user',
            'content': [
                {
                    'type': 'image',
                    'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': b64}
                },
                {
                    'type': 'text',
                    'text': '''Describe this person for a thumbnail generator. This is a public business figure whose photo appears on their company website. Respond in EXACTLY this format, one per line, no JSON, no preamble:
GENDER: male OR female
AGE: <integer, your best estimate>
HAIR: <one phrase with color + length + style, e.g. "shoulder-length dirty-blonde wavy hair" or "short salt-and-pepper hair" or "completely bald">
GLASSES: yes OR no
BUILD: <one phrase describing body type. COMMIT to a real read — don't default to "average". Use the visible cues:
  - Sharp narrow jawline + visible neck cords + slight shoulders → "lean athletic build"
  - Defined jawline + medium neck + average shoulders → "trim medium build"
  - Slightly full jawline + thicker neck + broad shoulders → "stocky solid build with broad shoulders"
  - Full jowls/double-chin start + wide neck + heavy frame → "heavier fuller build with substantial frame"
  - Distinctly heavy jowls + wide neck + rounded shoulders → "heavy frame with full neck and shoulders"
  Default to "stocky solid build" rather than "average" when uncertain — mid-50s+ business executives skew this way and FLUX renders look more authentic when slightly fuller than too thin.>
CLOTHING: <one phrase describing the type, color, and style of what they're wearing in this photo, e.g. "a navy blazer over a crisp white dress shirt" or "a black v-neck sweater" or "a charcoal suit with a burgundy tie" — if clothing isn't visible or only the very neckline shows, write "professional business attire">'''
                }
            ]
        }]
    }
    r = requests.post('https://api.anthropic.com/v1/messages',
                      headers={
                          'x-api-key': api_key,
                          'anthropic-version': '2023-06-01',
                          'content-type': 'application/json',
                      },
                      json=body, timeout=60)
    if r.status_code != 200:
        raise Exception(f'Claude vision {r.status_code}: {r.text[:300]}')
    content = r.json().get('content', [{}])[0].get('text', '')
    if not content:
        raise Exception('Claude returned empty content')
    return content


def vision_describe(face_ref_path, name):
    """Resolution order:
      1. Manual override in guest-overrides.json (you edited it — trust it)
      2. Cached Vision result in guest-overrides.json (Vision already ran once)
      3. Fresh Claude Haiku Vision call + auto-cache result to JSON

    So: first-ever thumbnail for a new guest triggers one Vision call.
    Every thumbnail after that reads the cache. You correct entries in the
    JSON if Vision misread — correction persists forever.

    Hair description goes into the FLUX scene prompt because face-swap does
    NOT swap hair — only the face region (forehead-chin, ear-to-ear)."""
    defaults = {
        'gender': 'person',
        'age_estimate': 38,
        'hair_description': 'short professional hair',
        'glasses': False,
        'build_description': 'average medium build',
        'clothing_override': None,  # set only if Vision extracted it from headshot
    }

    cached = load_guest_overrides().get(name, {})
    if cached:
        source = 'manual/cached'
        log('overrides', f'  {name}: {source} → age={cached.get("age")}, '
                         f'hair="{cached.get("hair")}"')
    out = dict(defaults)

    if cached:
        if 'gender' in cached:
            out['gender'] = cached['gender']
        if 'age' in cached:
            out['age_estimate'] = int(cached['age'])
        if 'hair' in cached:
            out['hair_description'] = cached['hair']
        if 'glasses' in cached:
            out['glasses'] = bool(cached['glasses'])
        if 'build' in cached:
            out['build_description'] = cached['build']
        if 'clothing' in cached:
            out['clothing_override'] = cached['clothing']
        return out

    # No cache — call Claude Haiku Vision and persist the result
    try:
        content = claude_haiku_describe(face_ref_path, name)
        for line in content.splitlines():
            line = line.strip()
            if line.lower().startswith('gender:'):
                v = line.split(':', 1)[1].strip().lower()
                if v in ('male', 'female'):
                    out['gender'] = v
            elif line.lower().startswith('age:'):
                v = line.split(':', 1)[1].strip()
                try:
                    out['age_estimate'] = int(''.join(c for c in v if c.isdigit())[:2] or '38')
                except Exception:
                    pass
            elif line.lower().startswith('hair:'):
                out['hair_description'] = line.split(':', 1)[1].strip().strip('"').strip("'")
            elif line.lower().startswith('glasses:'):
                out['glasses'] = line.split(':', 1)[1].strip().lower().startswith('y')
            elif line.lower().startswith('build:'):
                build = line.split(':', 1)[1].strip().strip('"').strip("'")
                if build:
                    out['build_description'] = build
            elif line.lower().startswith('clothing:'):
                clothing = line.split(':', 1)[1].strip().strip('"').strip("'")
                if clothing and 'professional business attire' not in clothing.lower():
                    out['clothing_override'] = clothing
        log('vision', f'  {name}: haiku → {out["gender"]}, age~{out["age_estimate"]}, '
                     f'hair="{out["hair_description"]}", build="{out["build_description"]}", '
                     f'glasses={out["glasses"]}, clothing="{out.get("clothing_override") or "(pool fallback)"}"')

        # Cache it so we never call Vision for this guest again
        cache_entry = {
            'age': out['age_estimate'],
            'hair': out['hair_description'],
            'glasses': out['glasses'],
            'gender': out['gender'],
            'build': out['build_description'],
            '_source': 'claude-haiku-auto',
        }
        if out.get('clothing_override'):
            cache_entry['clothing'] = out['clothing_override']
        save_guest_override(name, cache_entry)
    except Exception as e:
        log('vision', f'  {name}: Claude Haiku failed ({e}), using defaults')

    return out




def claude_extract_all_episode_body(guests, frame_paths):
    """ONE batch call: send all guests headshots + numbered frames. For each
    GUEST, Claude returns a rich body description derived from frames where
    they appear (visible torso, midsection, neck, shoulders).

    Headshots alone underestimate body mass — they only show face + shoulders.
    Episode frames usually show torso/full body, giving Vision real signal.

    Returns dict {guest_name: body_dict} where body_dict has:
      frame, midsection, shoulders, torso_garment_fit, weight_estimate_lbs

    These are merged into a single rich build description used by FLUX.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY") or pipeline._env.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {}

    frames_to_send = frame_paths[:8]
    if not frames_to_send or not guests:
        return {}

    ref_labels = []
    for i, g in enumerate(guests):
        letter = chr(ord("A") + i)
        ref_labels.append((letter, g["name"], g["_face_ref_path"]))

    refs_text = "\n".join(f"  REFERENCE_{letter}: {name}" for letter, name, _ in ref_labels)

    instructions = f"""You will receive {len(guests)} REFERENCE headshots followed by {len(frames_to_send)} numbered FRAMES from a podcast episode.

REFERENCES:
{refs_text}

For EACH guest reference, study the frames where that person appears and return a rich body description. Use ONLY visible cues — do not invent. If frames don't show the body clearly, say so.

For weight_estimate_lbs: provide a SPECIFIC integer estimate based on visible body mass. Middle-aged business executives commonly range 200-280 lbs. Default to higher (240+) when uncertain — FLUX biases slim and we want realistic body mass.

For midsection: describe whether there is a defined waist (tapered) or a fuller midsection (no taper / belly). Be honest — most middle-aged executives have a fuller midsection, not a tapered one.

For each guest, respond in EXACTLY this format, one block per guest:

IMPORTANT: Describe BODY ONLY. Do NOT describe face, jaw, neck, jowls, beard, chin, or any feature above the shoulders. Those features are handled by a separate face-swap from the headshot — describing them here causes visual conflicts.

GUEST_A:
weight_estimate_lbs: <integer 150-320>
frame: <one phrase like "heavyset frame" or "trim athletic frame" or "stocky solid frame">
midsection: <one phrase like "full midsection without taper at waist" or "defined waist with mild taper" or "prominent belly">
shoulders: <one phrase like "broad rounded shoulders" or "narrow lean shoulders" or "average width shoulders">
torso_garment_fit: <one phrase like "blazer pulls slightly across the torso" or "shirt fits naturally across the chest" or "jacket sits closed across the midsection" — describes how their CLOTHING fits their BODY, never describes face/neck>
visible_in_frames: <comma-separated frame numbers, e.g. "1,3,5" — or "none" if guest never visible>

GUEST_B:
... (same format)
"""

    content = [{"type": "text", "text": instructions}]
    for letter, name, path in ref_labels:
        with open(path, "rb") as fp:
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg",
                           "data": base64.b64encode(fp.read()).decode()}
            })
    for fp_path in frames_to_send:
        with open(fp_path, "rb") as fp:
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg",
                           "data": base64.b64encode(fp.read()).decode()}
            })

    model_id = "claude-sonnet-4-6"
    log("body", f"  using model: {model_id}, {len(guests)} guest(s), {len(frames_to_send)} frames")

    body_payload = {
        "model": model_id,
        "max_tokens": 1500,
        "temperature": 0.2,
        "messages": [{"role": "user", "content": content}]
    }
    r = requests.post("https://api.anthropic.com/v1/messages",
                      headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                      json=body_payload, timeout=120)
    if r.status_code != 200:
        log("body", f"  Claude body extraction failed {r.status_code}: {r.text[:200]}")
        return {}

    text = r.json().get("content", [{}])[0].get("text", "")
    log("body", f"  Claude raw response:\n{text[:600]}")

    results = {}
    current_letter = None
    current_data = {}
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.upper().startswith("GUEST_") and line.endswith(":"):
            if current_letter and current_data:
                guest_name = next((n for l, n, _ in ref_labels if l == current_letter), None)
                if guest_name:
                    results[guest_name] = current_data
            current_letter = line.split("_")[1].rstrip(":").strip().upper()
            current_data = {}
        elif ":" in line and current_letter:
            key, _, val = line.partition(":")
            current_data[key.strip().lower()] = val.strip()
    if current_letter and current_data:
        guest_name = next((n for l, n, _ in ref_labels if l == current_letter), None)
        if guest_name:
            results[guest_name] = current_data

    log("body", f"  parsed {len(results)} guest body description(s): {list(results.keys())}")
    return results


def resolve_episode_body(post_id, guests, source_mp4, work_dir):
    """Per-(post + guest) rich body description. Cached in scene-overrides.json
    under guest_body.<name>. Falls back to vision_describe build field on miss.

    Per-guest manual override via guest-overrides.json build_override field
    always wins (skips Claude call entirely for that guest).
    """
    cache = load_scene_overrides().get(str(post_id), {}) or {}
    cached_body = cache.get("guest_body", {})

    overrides = load_guest_overrides()
    for g in guests:
        ov = overrides.get(g["name"], {})
        if ov.get("build_override"):
            cached_body[g["name"]] = {"manual_override": ov["build_override"]}
            log("body", f"  {g['name']}: using manual build_override from guest-overrides.json")

    needed = [g for g in guests if g["name"] not in cached_body]
    if not needed:
        log("body", f"  all guests have cached body description")
        return cached_body

    log("body", f"  extracting body description for {len(needed)} guest(s)")
    frames = extract_episode_frames(source_mp4, work_dir, num_frames=8)
    if not frames:
        log("body", f"  no frames extracted, skipping body extraction")
        return cached_body

    batch_results = claude_extract_all_episode_body(needed, frames)
    for g in needed:
        b = batch_results.get(g["name"])
        if b and b.get("visible_in_frames", "none").lower() != "none":
            cached_body[g["name"]] = b
        else:
            log("body", f"  {g['name']}: not visible in frames, will fall back to headshot build")

    if cached_body:
        cache["guest_body"] = cached_body
        save_scene_override(post_id, cache)

    return cached_body


def format_body_for_prompt(body_dict):
    """Convert structured body dict into a FLUX-prompt-friendly phrase with
    anti-taper language and weight anchor. Returns a string ready to drop
    into the scene prompt."""
    if not body_dict:
        return None
    if body_dict.get("manual_override"):
        return body_dict["manual_override"]
    parts = []
    weight = body_dict.get("weight_estimate_lbs")
    if weight:
        try:
            w = int("".join(c for c in str(weight) if c.isdigit())[:3] or "0")
            if w >= 150:
                parts.append(f"approximately {w} pounds")
        except Exception:
            pass
    for key in ("frame", "midsection", "shoulders", "torso_garment_fit"):
        v = body_dict.get(key, "").strip()
        if v and v.lower() not in ("none", "unknown", ""):
            parts.append(v)
    return ", ".join(parts) if parts else None


def run_reactor(post_id, drive_file_id):
    start = datetime.now()
    log('start', f'=== ReActor ensemble for post {post_id} ===')

    post = pipeline.get_post_data(post_id)
    log('wp', f'Title: {post["title"][:80]}')
    log('wp', f'Show: {post.get("show", "?")}')

    # Show-aware speaker selection: for shows where the host is also featured
    # (Grit to Gold, Inner Circle, etc.), pull from the full speaker list
    # instead of the host-excluded guests list.
    if show_includes_host(post.get('show')):
        guests = post.get('speakers', post['guests'])
        log('wp', f'  show "{post["show"]}" includes host — using full speaker list')
    else:
        guests = post['guests']

    # Canonicalize guest names against alias map BEFORE any cache/term lookups
    aliases = load_name_aliases()
    if aliases:
        for g in guests:
            original = g['name']
            canonical = canonicalize_guest_name(original, aliases)
            if canonical != original:
                log('alias', f'  "{original}" → "{canonical}"')
                g['name'] = canonical

    log('wp', f'Guests: {[g["name"] for g in guests]}')

    if len(guests) < 1:
        raise Exception(f'No guests found on post {post_id}')
    # Cap at 2 — ensemble or solo. Same pipeline, conditional workflow.
    guests = guests[:2]
    log('wp', f'  mode: {"SOLO" if len(guests) == 1 else "ENSEMBLE"} ({len(guests)} guest)')

    work_dir = f'{HOME}/thumbnail-system/output/post-{post_id}-reactor'
    os.makedirs(work_dir, exist_ok=True)

    # 1. Download + describe each guest
    for i, g in enumerate(guests):
        if not g.get('headshot_url'):
            raise Exception(f'Guest {g["name"]} has no headshot URL')
        log('face', f'#{i} {g["name"]}: downloading headshot')
        hpath = f'{work_dir}/headshot-{i}.jpg'
        with open(hpath, 'wb') as f:
            f.write(requests.get(g['headshot_url'], timeout=60).content)
        # Defensive RGB conversion — Greg's headshot (and others) are PNG-RGBA;
        # pipeline.crop_face_reference saves to JPEG which can't handle alpha.
        try:
            tmp = Image.open(hpath)
            if tmp.mode != 'RGB':
                rgb = Image.new('RGB', tmp.size, (255, 255, 255))
                rgb.paste(tmp, mask=tmp.split()[3] if tmp.mode == 'RGBA' else None)
                rgb.save(hpath, 'JPEG', quality=95)
        except Exception as _e:
            log('face', f'  RGB conversion skipped: {_e}')
        face_ref = f'{work_dir}/face-ref-{i}.jpg'
        pipeline.crop_face_reference(hpath, face_ref)
        g['_face_ref_path'] = face_ref
        g['description'] = vision_describe(face_ref, g['name'])
        log('vision', f'  {g["name"]}: gender={g["description"].get("gender", "?")}')

    # 2. Source MP4 + transcript + hook
    evict_old_artifact_caches()
    segments = load_artifact_cache(post_id, "transcript.json")
    if segments is None:
        source_path = pipeline.ensure_source_cached(drive_file_id, post_id)
        with tempfile.TemporaryDirectory() as tmp:
            segments = pipeline.try_transcript_from_drive(drive_file_id, tmp)
            if segments:
                log("transcript", f"Drive: {len(segments)} segments")
            else:
                segments = pipeline.extract_transcript_from_video(source_path, tmp)
                log("transcript", f"Whisper: {len(segments)} segments")
        save_artifact_cache(post_id, "transcript.json", segments)
    else:
        source_path = pipeline.ensure_source_cached(drive_file_id, post_id)
    analysis = load_artifact_cache(post_id, "hooks.json")
    if analysis is None:
        analysis = pipeline.analyze_hooks(segments, post)
        save_artifact_cache(post_id, "hooks.json", analysis)
    if not analysis.get('top_hooks'):
        raise Exception('No hooks extracted')
    top_hook = analysis['top_hooks'][0]
    log('hook', f'Selected: [{top_hook["score"]}] {top_hook["title"]}')

    # 3. Resolve scene setting (cached override → Claude fresh → show default)
    post['id'] = post_id
    transcript_sample = ' '.join(s.get('text', '') for s in segments[:15]) if segments else ''
    scene_setting = resolve_scene(post, top_hook, transcript_sample,
                                  all_hooks=analysis.get('top_hooks'))

    # 3b. Build host exclusion refs — hosts appear in frames but are NOT the
    # target. Prevents Greg-labeled-as-Nick bug on solo PowerChat episodes.
    host_refs = []
    for s in post.get('speakers', []):
        if 'host' not in (s.get('title') or '').lower():
            continue
        if s['name'] in [g['name'] for g in guests]:
            continue  # guest is also the host for this show (Paul on Grit to Gold)
        if not s.get('headshot_url'):
            continue
        try:
            hpath = f'{work_dir}/host-{len(host_refs)}.jpg'
            with open(hpath, 'wb') as f:
                f.write(requests.get(s['headshot_url'], timeout=60).content)
            # RGB normalize defensively
            tmp = Image.open(hpath)
            if tmp.mode != 'RGB':
                rgb = Image.new('RGB', tmp.size, (255, 255, 255))
                rgb.paste(tmp, mask=tmp.split()[3] if tmp.mode == 'RGBA' else None)
                rgb.save(hpath, 'JPEG', quality=95)
            face_ref = f'{work_dir}/host-face-{len(host_refs)}.jpg'
            pipeline.crop_face_reference(hpath, face_ref)
            host_refs.append((s['name'], face_ref))
            log('hosts', f'  loaded exclusion ref for host: {s["name"]}')
        except Exception as e:
            log('hosts', f'  failed to load host ref {s["name"]}: {e}')

    # 3c. Resolve per-(post + guest) clothing from episode frames (cached)
    episode_clothing = resolve_episode_clothing(post_id, guests, source_path, work_dir, host_refs=host_refs)
    for g in guests:
        ec = episode_clothing.get(g['name'])
        if ec:
            g['description']['clothing_override'] = ec

    # 3d. Resolve per-(post + guest) rich body description from episode frames
    episode_body = resolve_episode_body(post_id, guests, source_path, work_dir)
    for g in guests:
        bd = episode_body.get(g['name'])
        if bd:
            rich_build = format_body_for_prompt(bd)
            if rich_build:
                g['description']['build_description'] = rich_build
                log('body', f"  {g['name']}: build = {rich_build}")

    # 4. Generate 2-person scene with plain FLUX using episode-specific setting
    scene_prompt = build_scene_prompt(guests, scene_setting=scene_setting)
    scene_path = f'{work_dir}/scene.png'
    # Build reference images for multimodal scene engines (Gemini).
    # FLUX ignores references — only Gemini uses them.
    _gemini_refs = {
        "guests": [{"name": g["name"], "path": g["_face_ref_path"]} for g in guests if g.get("_face_ref_path")],
        "hosts": [{"name": n, "path": p} for (n, p) in host_refs] if host_refs else [],
        "frames": [],
    }
    # Reuse episode frames that resolve_episode_clothing extracted (already in work_dir)
    try:
        _frame_candidates = sorted([f for f in os.listdir(work_dir) if f.startswith("frame-") and f.endswith(".jpg")])
        _gemini_refs["frames"] = [f"{work_dir}/{f}" for f in _frame_candidates[:4]]  # cap at 4 for token budget
    except Exception:
        pass
    generate_scene(scene_prompt, scene_path, references=_gemini_refs)

    # 4. Bundle scene + N face refs into a zip for ComfyUI
    zip_path = f'{work_dir}/inputs.zip'
    scene_filename = 'scene.png'
    src1_filename = 'src1.jpg'
    src2_filename = 'src2.jpg' if len(guests) > 1 else None
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(scene_path, scene_filename)
        z.write(guests[0]['_face_ref_path'], src1_filename)
        if src2_filename:
            z.write(guests[1]['_face_ref_path'], src2_filename)
    log('zip', f'  bundled inputs → {zip_path} ({os.path.getsize(zip_path) // 1024} KB)')

    # 5. Upload zip to public URL
    zip_url = pipeline.upload_to_ic_public(zip_path, f'gen-{post_id}-rx-inputs.zip')
    log('zip', f'  public URL: {zip_url}')

    # 6. Build workflow + call ComfyUI
    workflow = build_reactor_workflow(scene_filename, src1_filename, src2_filename)
    if src2_filename:
        log('workflow', f'  ensemble — guest 0 → face_idx=0, guest 1 → face_idx=1')
    else:
        log('workflow', f'  solo — single ReActor pass on face_idx=0')

    reactor_out = f'{work_dir}/reactor-output.png'
    use_reactor = os.environ.get('USE_REACTOR', '').lower() in ('1', 'true', 'yes')
    if not use_reactor:
        log('workflow', '  Gemini multimodal default — using raw scene, skipping ReActor face swap + GFPGAN. Set USE_REACTOR=true to opt into legacy ReActor lane.')
        shutil.copy(scene_path, reactor_out)
    else:
        call_comfyui_reactor(workflow, zip_url, reactor_out)

    # 7. Text overlay
    title_lines = make_cover_art_lines(top_hook['title'])
    log('overlay', f'Title lines: {title_lines}')
    os.makedirs(OUT_DIR, exist_ok=True)
    treatment_suffix = ""
    _t = os.environ.get("TREATMENT", "")
    if _t and _t.lower() != "netflix-dark":
        treatment_suffix = f"-{_t.lower()}"
    final_path = f'{OUT_DIR}/post-{post_id}-thumbnail-reactor-v17{treatment_suffix}.jpg'
    text_overlay_cover_art(reactor_out, title_lines, post['show'], final_path)

    # 8. Publish to WP uploads
    public_name = f'post-{post_id}-thumbnail-reactor-v17{treatment_suffix}.jpg'
    shutil.copy(final_path, f'{WP_UPLOADS}/{public_name}')
    public_url = f'{PUBLIC_BASE}/{public_name}'

    elapsed = (datetime.now() - start).total_seconds()
    log('done', f'=== ReActor v1 complete in {elapsed:.1f}s ===')
    log('done', f'Public URL: {public_url}')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: cover-art-reactor-prototype.py <post_id> <drive_mp4_id>')
        sys.exit(1)
    try:
        run_reactor(int(sys.argv[1]), sys.argv[2])
    except Exception as e:
        print(f'\n[ERROR] {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
