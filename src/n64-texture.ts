

function expand3to8(n: number): number {
    return ((n << (8 - 3)) | (n << (8 - 6)) | (n >>> (9 - 8))) & 0xFF;
}

function expand4to8(n: number): number {
    return ((n << (8 - 4)) | (n >>> (8 - 8))) & 0xFF;
}

function expand5to8(n: number): number {
    return ((n << (8 - 5)) | (n >>> (10 - 8))) & 0xFF;
}

function r5g5b5a1(dst: Uint8Array, dstOffs: number, p: number) {
    dst[dstOffs + 0] = expand5to8((p & 0xF800) >> 11);
    dst[dstOffs + 1] = expand5to8((p & 0x07C0) >> 6);
    dst[dstOffs + 2] = expand5to8((p & 0x003E) >> 1);
    dst[dstOffs + 3] = (p & 0x0001) ? 0xFF : 0x00;
}

export function decodeTex_I8(dst: Uint8Array, view: DataView, srcOffs: number, tileW: number, tileH: number, line: number = 0, deinterleave: boolean = false): void {
    let dstIdx = 0;
    let srcIdx = 0;
    const padW = (line !== 0) ? (((line << 3) - tileW) << 1) : 0x00;
    for (let y = 0; y < tileH; y++) {
        const di = deinterleave ? ((y & 1) << 2) : 0;
        for (let x = 0; x < tileW; x++) {
            const i = view.getUint8(srcOffs + (srcIdx ^ di));
            dst[dstIdx + 0] = i;
            dst[dstIdx + 1] = i;
            dst[dstIdx + 2] = i;
            dst[dstIdx + 3] = i;
            srcIdx += 0x01;
            dstIdx += 0x04;
        }
        srcIdx += padW;
    }
}

export function decodeTex_I4(dst: Uint8Array, view: DataView, srcOffs: number, tileW: number, tileH: number, line: number = 0, deinterleave: boolean = false): void {
    let dstIdx = 0;
    let srcIdx = 0;
    const padW = (line !== 0) ? (((line << 4) - tileW) >>> 1) : 0x00;
    for (let y = 0; y < tileH; y++) {
        const di = deinterleave ? ((y & 1) << 2) : 0;
        for (let x = 0; x < tileW; x += 2) {
            const b = view.getUint8(srcOffs + (srcIdx ^ di));
            const i0 = expand4to8((b >>> 4) & 0x0F);
            dst[dstIdx + 0] = i0;
            dst[dstIdx + 1] = i0;
            dst[dstIdx + 2] = i0;
            dst[dstIdx + 3] = i0;
            const i1 = expand4to8((b >>> 0) & 0x0F);
            dst[dstIdx + 4] = i1;
            dst[dstIdx + 5] = i1;
            dst[dstIdx + 6] = i1;
            dst[dstIdx + 7] = i1;
            srcIdx += 0x01;
            dstIdx += 0x08;
        }
        srcIdx += padW;
    }
}

export function decodeTex_IA16(dst: Uint8Array, view: DataView, srcOffs: number, tileW: number, tileH: number, line: number = 0, deinterleave: boolean = false): void {
    let dstIdx = 0;
    let srcIdx = 0;
    const padW = (line !== 0) ? (((line << 2) - tileW) << 1) : 0x00;
    for (let y = 0; y < tileH; y++) {
        const di = deinterleave ? ((y & 1) << 2) : 0;
        for (let x = 0; x < tileW; x++) {
            const i = view.getUint8(srcOffs + (srcIdx ^ di) + 0x00);
            const a = view.getUint8(srcOffs + (srcIdx ^ di) + 0x01);
            dst[dstIdx + 0] = i;
            dst[dstIdx + 1] = i;
            dst[dstIdx + 2] = i;
            dst[dstIdx + 3] = a;
            srcIdx += 0x02;
            dstIdx += 0x04;
        }
        srcIdx += padW;
    }
}

export function decodeTex_RGBA16(dst: Uint8Array, view: DataView, srcOffs: number, tileW: number, tileH: number, line: number = 0, deinterleave: boolean = false): void {
    let dstIdx = 0;
    let srcIdx = 0;
    const padW = (line !== 0) ? (((line << 2) - tileW) << 1) : 0x00;
    for (let y = 0; y < tileH; y++) {
        const di = deinterleave ? ((y & 1) << 2) : 0;
        for (let x = 0; x < tileW; x++) {
            const p = view.getUint16(srcOffs + (srcIdx ^ di));
            r5g5b5a1(dst, dstIdx + 0, p);
            srcIdx += 0x02;
            dstIdx += 0x04;
        }
        srcIdx += padW;
    }
}

export function decodeTex_RGBA32(dst: Uint8Array, view: DataView, srcIdx: number, tileW: number, tileH: number, line = 0): void {
    let dstIdx = 0;
    const padW = (line !== 0) ? (((line << 1) - tileW) << 2) : 0x00;
    for (let y = 0; y < tileH; y++) {
        for (let x = 0; x < tileW; x++) {
            const p = view.getUint32(srcIdx);
            dst[dstIdx + 0] = (p >>> 24) & 0xFF;
            dst[dstIdx + 1] = (p >>> 16) & 0xFF;
            dst[dstIdx + 2] = (p >>>  8) & 0xFF;
            dst[dstIdx + 3] = (p >>>  0) & 0xFF;
            srcIdx += 0x04;
            dstIdx += 0x04;
        }
        srcIdx += padW;
    }
}

