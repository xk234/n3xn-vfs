"""Original levels for I Am Geometrying My Dash."""
from .config import GROUND_Y

LEVELS = [
    {
        "name": "FIRST STEPS",
        "subtitle": "Learn the rhythm",
        "length": 5200,
        "speed": 315.0,
        "color": "#38bdf8",
        "accent": "#a78bfa",
        "objects": [
            (480, "spike"), (720, "spike"), (880, "coin"),
            (980, "double"), (1280, "block"), (1480, "pad"),
            (1720, "spike"), (1940, "orb"), (2020, "coin"),
            (2180, "block"), (2460, "triple"), (2840, "spike"),
            (3080, "double"), (3280, "coin"), (3440, "block"),
            (3760, "spike"), (4000, "triple"), (4460, "block"),
            (4740, "double"),
        ],
    },
    {
        "name": "NEON CIRCUIT",
        "subtitle": "Ship mode online",
        "length": 6400,
        "speed": 340.0,
        "color": "#a78bfa",
        "accent": "#f472b6",
        "objects": [
            (450, "spike"), (660, "double"), (840, "coin"),
            (980, "block"), (1220, "triple"), (1480, "pad"),
            (1720, "double"), (1900, "orb"),
            (2100, "portal_ship"),
            (2300, "block"), (2550, "block"),
            (2800, "spike"), (3000, "double"),
            (3200, "portal_cube"),
            (3400, "triple"), (3700, "pad"), (3950, "orb"),
            (4200, "double"), (4500, "block"), (4800, "triple"),
            (5100, "coin"), (5300, "double"), (5600, "block"),
            (5900, "triple"), (6200, "double"),
        ],
    },
    {
        "name": "BYTECODE RUSH",
        "subtitle": "Ball · Wave · Gravity",
        "length": 7200,
        "speed": 365.0,
        "color": "#34d399",
        "accent": "#38bdf8",
        "objects": [
            (440, "double"), (700, "triple"), (880, "coin"),
            (1050, "block"), (1300, "triple"), (1520, "pad"),
            (1780, "double"), (1900, "orb"),
            (2100, "portal_ball"),
            (2300, "spike"), (2500, "double"),
            (2750, "portal_grav"),
            (2950, "spike"), (3150, "double"),
            (3400, "portal_grav"),
            (3600, "portal_wave"),
            (3850, "block"), (4100, "block"),
            (4400, "portal_cube"),
            (4600, "triple"), (4900, "pad"), (5150, "orb"),
            (5400, "speed_fast"),
            (5600, "double"), (5850, "triple"), (6100, "block"),
            (6400, "double"), (6700, "triple"), (7000, "double"),
        ],
    },
    {
        "name": "AGENT OVERCLOCK",
        "subtitle": "Everything at once",
        "length": 8000,
        "speed": 380.0,
        "color": "#fb923c",
        "accent": "#a78bfa",
        "objects": [
            (420, "spike"), (600, "double"), (780, "coin"),
            (920, "block"), (1150, "triple"), (1380, "pad"),
            (1600, "orb"), (1750, "portal_ship"),
            (1950, "block"), (2200, "spike"),
            (2450, "portal_cube"), (2650, "triple"),
            (2900, "portal_ball"), (3100, "double"),
            (3350, "portal_grav"), (3550, "spike"),
            (3800, "portal_wave"), (4050, "block"),
            (4300, "portal_cube"), (4500, "speed_fast"),
            (4700, "double"), (4950, "triple"), (5200, "pad"),
            (5450, "orb"), (5700, "portal_ship"),
            (5950, "block"), (6200, "double"),
            (6450, "portal_cube"), (6700, "triple"),
            (7000, "double"), (7300, "block"), (7600, "triple"),
            (7850, "double"),
        ],
    },
]


def build_objects(level):
    objects = []
    for x, kind in level["objects"]:
        if kind == "spike":
            objects.append({"x": x, "kind": "spike", "w": 34, "h": 38})
        elif kind == "double":
            objects.extend([
                {"x": x, "kind": "spike", "w": 34, "h": 38},
                {"x": x + 34, "kind": "spike", "w": 34, "h": 38},
            ])
        elif kind == "triple":
            objects.extend([
                {"x": x + i * 32, "kind": "spike", "w": 34, "h": 38}
                for i in range(3)
            ])
        elif kind == "block":
            objects.append({"x": x, "kind": "block", "w": 58, "h": 54})
        elif kind == "pad":
            objects.append({"x": x, "kind": "pad", "w": 42, "h": 12, "used": False})
        elif kind == "orb":
            objects.append({"x": x, "kind": "orb", "w": 30, "h": 30, "y": 196, "used": False})
        elif kind == "coin":
            objects.append({"x": x, "kind": "coin", "w": 24, "h": 24, "y": 220, "collected": False})
        elif kind.startswith("portal_"):
            objects.append({
                "x": x, "kind": kind, "w": 36, "h": 72,
                "y": GROUND_Y - 72, "used": False,
            })
        elif kind.startswith("speed_"):
            objects.append({
                "x": x, "kind": kind, "w": 40, "h": 40,
                "y": GROUND_Y - 80, "used": False,
            })
    return objects
