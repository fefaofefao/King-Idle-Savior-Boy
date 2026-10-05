#!/usr/bin/env python3
"""
Verifica se todas as bibliotecas nativas (.so) de um AAB/APK suportam páginas de 16 KB
(exigência do Google Play para apps com targetSdk 35+ desde nov/2025).

Regra: todo segmento PT_LOAD do ELF precisa de p_align >= 16384 (2**14).
Uso: python3 scripts/check-16kb.py app-release.aab   → sai com código 1 se algum .so falhar.
"""
import struct
import sys
import zipfile

PAGE = 16 * 1024
PT_LOAD = 1


def load_aligns(data: bytes) -> list[int]:
    if data[:4] != b'\x7fELF':
        raise ValueError('não é ELF')
    is64 = data[4] == 2
    end = '<' if data[5] == 1 else '>'
    if is64:
        phoff, = struct.unpack_from(end + 'Q', data, 0x20)
        phentsize, phnum = struct.unpack_from(end + 'HH', data, 0x36)
    else:
        phoff, = struct.unpack_from(end + 'I', data, 0x1C)
        phentsize, phnum = struct.unpack_from(end + 'HH', data, 0x2A)
    aligns = []
    for i in range(phnum):
        off = phoff + i * phentsize
        p_type, = struct.unpack_from(end + 'I', data, off)
        if p_type != PT_LOAD:
            continue
        if is64:
            p_align, = struct.unpack_from(end + 'Q', data, off + 0x30)
        else:
            p_align, = struct.unpack_from(end + 'I', data, off + 0x1C)
        aligns.append(p_align)
    return aligns


def main(path: str) -> int:
    bad, checked = [], 0
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if not name.endswith('.so'):
                continue
            checked += 1
            aligns = load_aligns(z.read(name))
            ok = bool(aligns) and all(a >= PAGE and a % PAGE == 0 for a in aligns)
            print(f"{'OK ' if ok else 'FALHA'} {name}  LOAD p_align={[hex(a) for a in aligns]}")
            if not ok:
                bad.append(name)
    if checked == 0:
        print('Nenhuma biblioteca nativa (.so) no pacote: compatível com páginas de 16 KB.')
    print(f'Resumo 16 KB: {checked} .so verificados, {len(bad)} com problema.')
    return 1 if bad else 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
