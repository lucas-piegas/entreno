"""Genera los íconos PNG sin dependencias: fondo naranja y una flecha de progreso (tres barras que suben)."""
import struct, sys, zlib
def png(tam, ruta):
    filas = []
    for y in range(tam):
        fila = bytearray([0])
        for x in range(tam):
            u, v = x / tam, y / tam
            col = (194, 65, 12)
            for i, (x0, alto) in enumerate(((0.24, 0.22), (0.43, 0.36), (0.62, 0.50))):
                if x0 <= u < x0 + 0.14 and 0.76 - alto <= v < 0.76:
                    col = (255, 255, 255)
            fila += bytes(col)
        filas.append(bytes(fila))
    ch = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    open(ruta, "wb").write(b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", tam, tam, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(b"".join(filas), 9)) + ch(b"IEND", b""))
png(180, sys.argv[1] + "/icono-180.png"); png(512, sys.argv[1] + "/icono-512.png")
