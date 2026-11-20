"""Original hand-authored levels. Coordinates are world-space pixels."""
LEVELS = [
    {"name":"FIRST STEPS","subtitle":"Learn the rhythm","length":5100,"speed":315.0,"color":"#38bdf8","accent":"#a78bfa","objects":[
        (500,"spike"),(760,"spike"),(900,"coin"),(1010,"double"),(1320,"block"),(1510,"pad"),(1740,"spike"),(1970,"orb"),(2050,"coin"),(2190,"block"),(2480,"triple"),(2860,"spike"),(3100,"double"),(3300,"coin"),(3460,"block"),(3780,"spike"),(4020,"triple"),(4480,"block"),(4770,"double")]},
    {"name":"NEON CIRCUIT","subtitle":"Keep your timing tight","length":5900,"speed":355.0,"color":"#a78bfa","accent":"#f472b6","objects":[
        (470,"spike"),(690,"double"),(880,"coin"),(1010,"block"),(1260,"triple"),(1510,"pad"),(1780,"double"),(1970,"orb"),(2220,"triple"),(2450,"coin"),(2600,"double"),(2920,"block"),(3180,"triple"),(3550,"double"),(3880,"block"),(4150,"triple"),(4540,"double"),(4860,"block"),(5150,"triple"),(5520,"double")]},
    {"name":"BYTECODE RUSH","subtitle":"Fast lane. No hesitation.","length":6500,"speed":390.0,"color":"#34d399","accent":"#38bdf8","objects":[
        (460,"double"),(720,"triple"),(900,"coin"),(1080,"block"),(1330,"triple"),(1560,"pad"),(1820,"double"),(1940,"orb"),(2200,"triple"),(2380,"coin"),(2550,"double"),(2840,"block"),(3100,"triple"),(3440,"triple"),(3790,"block"),(4070,"double"),(4370,"triple"),(4720,"block"),(5000,"triple"),(5350,"double"),(5660,"block"),(5950,"triple"),(6250,"double")]}
]

def build_objects(level):
    """Expand compact patterns into collision-ready world objects."""
    objects = []
    for x, kind in level["objects"]:
        if kind == "spike":
            objects.append({"x":x,"kind":"spike","w":34,"h":38})
        elif kind == "double":
            objects.extend([{"x":x,"kind":"spike","w":34,"h":38},{"x":x+34,"kind":"spike","w":34,"h":38}])
        elif kind == "triple":
            objects.extend([{"x":x+i*32,"kind":"spike","w":34,"h":38} for i in range(3)])
        elif kind == "block":
            objects.append({"x":x,"kind":"block","w":58,"h":54})
        elif kind == "pad":
            objects.append({"x":x,"kind":"pad","w":42,"h":12,"used":False})
        elif kind == "orb":
            objects.append({"x":x,"kind":"orb","w":30,"h":30,"y":196,"used":False})
        elif kind == "coin":
            objects.append({"x":x,"kind":"coin","w":24,"h":24,"y":220,"collected":False})
    return objects
