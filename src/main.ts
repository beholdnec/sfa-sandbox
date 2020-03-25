import { readBlobAsync, hexzero, StreamDataView, jsonify, sliceBlob, stringToFourCC, dataViewToU8Array } from './util'
import * as pako from 'pako'
import { decodeTex_I4, decodeTex_I8, decodeTex_IA16, decodeTex_RGBA16, decodeTex_RGBA32 } from './n64-texture'
import { TextureInputGX, decodeTexture, calcMipChain } from './gx_texture'
import ArrayBufferSlice from './ArrayBufferSlice'

console.log('Hello, World!')

class ZLBHeader {
    static readonly SIZE = 16

    magic: number
    unk4: number
    unk8: number
    size: number

    constructor(sdv: StreamDataView) {
        this.magic = sdv.getNextUint32()
        this.unk4 = sdv.getNextUint32()
        this.unk8 = sdv.getNextUint32()
        this.size = sdv.getNextUint32()
    }
}

function subarrayData(data: DataView, byteOffset: number, byteLength?: number): DataView {
    return new DataView(data.buffer, data.byteOffset + byteOffset, byteLength)
}

function loadDIRn(data: DataView, srcOffs: number): DataView {
    const size = data.getUint32(srcOffs + 8);
    return subarrayData(data, srcOffs + 0x20, size)
}

function loadZLB(dv: DataView, offs: number): ArrayBuffer {
    const sdv = new StreamDataView(dv)
    sdv.setCursor(offs)
    const header = new ZLBHeader(sdv);
    offs += ZLBHeader.SIZE;

    if (header.magic != stringToFourCC('ZLB\0')) {
        throw Error(`Invalid magic identifier 0x${hexzero(header.magic, 8)}`);
    }

    return pako.inflate(new Uint8Array(dv.buffer.slice(offs, offs + header.size))).buffer;
}

// Reference: <https://www.kernel.org/doc/Documentation/lzo.txt>
function loadLZOn(data: DataView, srcOffs: number): ArrayBuffer {
    const uncompSize = data.getUint32(srcOffs + 0x8)
    srcOffs += 0x10
    let dstOffs = 0;
    const dst = new Uint8Array(uncompSize);

    function getLength(code: number, numBits: number): number {
        const mask = (1 << numBits) - 1;
        let length = code & mask;
        if (length == 0) {
            length = mask;
            while (data.getUint8(srcOffs) == 0) {
                length += 255;
                srcOffs++;
            }
            length += data.getUint8(srcOffs++);
        }
        return length;
    }

    let state = 0;
    const firstByte = data.getUint8(srcOffs++);
    if (firstByte >= 0 && firstByte <= 16) {
        // state 0 literal
        let length = getLength(firstByte, 4) + 3;
        state = 4;
        for (let i = 0; i < length; i++) {
            dst[dstOffs++] = data.getUint8(srcOffs++);
        }
    } else if (firstByte == 17) {
        throw Error(`RLE encoding mode not implemented`);
    } else if (firstByte >= 18 && firstByte <= 21) {
        state = firstByte - 17;
        for (let i = 0; i < state; i++) {
            dst[dstOffs++] = data.getUint8(srcOffs++);
        }
        // srcOffs++; // Skip byte (FIXME: really?)
    } else {
        throw Error(`firstByte in 22..255 not handled`);
    }

    while (dstOffs < uncompSize) {
        const byte = data.getUint8(srcOffs++);
        if (byte >= 128) {
            const s = byte & 0x3;
            state = s;
            const d = (byte >> 2) & 0x7;
            const l = (byte >> 5) & 0x3;
            const length = 5 + l;
            const h = data.getUint8(srcOffs++);
            const distance = (h << 3) + d + 1;
            let msrc = dstOffs - distance;
            for (let i = 0; i < length; i++) {
                dst[dstOffs++] = dst[msrc++];
            }
            for (let i = 0; i < s; i++) {
                dst[dstOffs++] = data.getUint8(srcOffs++);
            }
        } else if (byte >= 64) {
            const l = (byte >> 5) & 0x1;
            const d = (byte >> 2) & 0x7;
            const s = byte & 0x3;
            state = s;
            const length = 3 + l;
            const h = data.getUint8(srcOffs++);
            const distance = (h << 3) + d + 1;
            let msrc = dstOffs - distance;
            for (let i = 0; i < length; i++) {
                dst[dstOffs++] = dst[msrc++];
            }
            for (let i = 0; i < s; i++) {
                dst[dstOffs++] = data.getUint8(srcOffs++);
            }
        } else if (byte >= 32) {
            const length = getLength(byte, 5) + 2;
            const d = data.getUint16(srcOffs, true) >> 2;
            const s = data.getUint16(srcOffs, true) & 0x3;
            srcOffs += 2;
            const distance = d + 1;
            state = s;
            let msrc = dstOffs - distance;
            for (let i = 0; i < length; i++) {
                dst[dstOffs++] = dst[msrc++];
            }
            for (let i = 0; i < s; i++) {
                dst[dstOffs++] = data.getUint8(srcOffs++);
            }
        } else if (byte >= 16) {
            const length = getLength(byte, 3) + 2;
            const h = (byte >> 3) & 0x1;
            const d = data.getUint16(srcOffs, true) >> 2;
            const s = data.getUint16(srcOffs, true) & 0x3;
            srcOffs += 2;
            const distance = 16384 + (h << 14) + d;
            state = s;
            if (distance == 16384) {
                // End
                return dst.buffer;
            }
            let msrc = dstOffs - distance;
            for (let i = 0; i < length; i++) {
                dst[dstOffs++] = dst[msrc++];
            }
            for (let i = 0; i < s; i++) {
                dst[dstOffs++] = data.getUint8(srcOffs++);
            }
        } else {
            if (state == 0) {
                const length = getLength(byte, 4) + 3;
                state = 4;
                for (let i = 0; i < length; i++) {
                    dst[dstOffs++] = data.getUint8(srcOffs++);
                }
            } else if (state >= 1 && state <= 3) {
                const s = byte & 0x3;
                const d = (byte >> 2) & 0x3;
                const length = 2;
                state = s;
                const h = data.getUint8(srcOffs++);
                const distance = (h << 2) + d + 1;
                let msrc = dstOffs - distance;
                for (let i = 0; i < length; i++) {
                    dst[dstOffs++] = dst[msrc++];
                }
                for (let i = 0; i < s; i++) {
                    dst[dstOffs++] = data.getUint8(srcOffs++);
                }
            } else if (state == 4) {
                const s = byte & 0x3;
                state = s;
                const length = 3;
                const d = byte >> 2;
                const h = data.getUint8(srcOffs++);
                const distance = (h << 2) + d + 2049;
                let msrc = dstOffs - distance;
                for (let i = 0; i < length; i++) {
                    dst[dstOffs++] = dst[msrc++];
                }
                for (let i = 0; i < s; i++) {
                    dst[dstOffs++] = data.getUint8(srcOffs++);
                }
            }
        }
    }

    return dst.buffer;
}

function makeDownloadLink(data: DataView, filename: string, text: string): HTMLElement {
    const aEl = document.createElement('a')
    aEl.href = URL.createObjectURL(new Blob([data], {type: 'application/octet-stream'}))
    aEl.download = filename
    aEl.append(text)
    return aEl
}

async function openFile(blob: File) {
    const data = await readBlobAsync(blob)

    const offs = 0
    const magic = data.getUint32(offs)
    let uncompressed: ArrayBuffer
    switch (magic) {
    case stringToFourCC('ZLB\0'):
        uncompressed = loadZLB(data, offs)
        break
    case stringToFourCC('LZOn'):
        console.log(`Decompressing LZO...`);
        uncompressed = loadLZOn(data, offs)
        break
    default:
        throw Error(`Unhandled magic identifier 0x${hexzero(magic, 8)}`)
    }

    const aEl = makeDownloadLink(new DataView(uncompressed), `${blob.name}.dec.bin`, 'Download')
    const downloadLinksEl = document.getElementById('download-links')!
    downloadLinksEl.appendChild(aEl)
}

const fileInputEl = <HTMLInputElement>document.getElementById('file-input')
fileInputEl.onchange = function (event) {
    if (fileInputEl.files) {
        const file = fileInputEl.files[0]
        console.log(`Loading file ${file.name} ...`)
        openFile(file)
    }
}

function loadN64Texture(data: DataView, srcOffs: number): HTMLCanvasElement {
    const canvasEl = document.createElement('canvas')
    console.log(`data length 0x${data.byteLength.toString(16)} srcOffs 0x${srcOffs.toString(16)}`)

    const width = data.getUint8(srcOffs) & 0x7f
    const height = data.getUint8(srcOffs + 1) & 0x7f
    const format = data.getUint8(srcOffs + 2)

    canvasEl.width = width
    canvasEl.height = height

    const ctx = canvasEl.getContext('2d')!
    const imageData = ctx.createImageData(width, height)
    const pixels = new Uint8Array(imageData.data.buffer)
    const dataOffset = srcOffs + 0x20
    switch (format) {
    case 0x00: // 32-bit RGBA? Size is 4 * width * height, not including header. might be mipmapped.
        decodeTex_RGBA32(pixels, data, dataOffset, width, height, 0);
        break;
    case 0x01: // Appears to be 16-bit
        console.log(`loading format 0x${format.toString(16)} from offset 0x${srcOffs.toString(16)}`);
        decodeTex_RGBA16(pixels, data, dataOffset, width, height, 0, false); // FIXME: where is the line parameter stored?
        break;
    case 0x05: // Appears to be 8-bit
        decodeTex_I8(pixels, data, dataOffset, width, height, 0, false);
        break;
    case 0x11: // Appears to be 16-bit
        decodeTex_IA16(pixels, data, dataOffset, width, height, 0, false);
        break;
    case 0x15: // 24-bit RGB??! Size is 3 * width * height, not including header. might be mipmapped.
        console.log(`loading format 0x${format.toString(16)} from offset 0x${srcOffs.toString(16)}`);
        decodeTex_RGBA16(pixels, data, dataOffset, width, height, 0, false); // FIXME: where is the line parameter stored?
        break;
    case 0x25: // Appears to be 8-bit
        decodeTex_I8(pixels, data, dataOffset, width, height, 0, false);
        break;
    case 0x26: // Appears to be 4-bit
        decodeTex_I4(pixels, data, dataOffset, width, height, 0, false);
        break;
    default:
        console.warn(`Unknown texture format 0x${format.toString(16)}`)
        break
    }
    ctx.putImageData(imageData, 0, 0)

    return canvasEl
}

async function openN64Textures() {
    if (n64TexTabEl.files!.length <= 0 || n64TexBinEl.files!.length <= 0) {
        return
    }

    console.log(`Loading N64 textures...`)

    const texTab = await readBlobAsync(n64TexTabEl.files![0])
    const texBin = await readBlobAsync(n64TexBinEl.files![0])

    const texturesEl = document.getElementById('textures')!
    let done = false
    let tabOffs = 0
    while (!done) {
        const tabValue = texTab.getUint32(tabOffs)
        tabOffs += 4
        if (tabValue == 0xFFFFFFFF) {
            break
        }

        const canvasEl = loadN64Texture(texBin, tabValue)
        texturesEl.appendChild(canvasEl)
    }
}

const n64TexTabEl = <HTMLInputElement>document.getElementById('n64-tex-tab')!
n64TexTabEl.onchange = async function (event) {
    await openN64Textures()
}

const n64TexBinEl = <HTMLInputElement>document.getElementById('n64-tex-bin')!
n64TexBinEl.onchange = async function (event) {
    await openN64Textures()
}

async function loadGXTexture(data: DataView, srcOffs: number, isAncient: boolean): Promise<HTMLCanvasElement[]> {
    console.log(`data length 0x${data.byteLength.toString(16)} srcOffs 0x${srcOffs.toString(16)}`)

    const header = {
        width: data.getUint16(srcOffs + 0xa),
        height: data.getUint16(srcOffs + 0xc),
        levels: data.getUint16(srcOffs + 0x1c) + 1, 
        format: data.getUint8(srcOffs + 0x16),
    }
    console.log(`gx texture header: ${jsonify(header)}`)


    const dataOffset = srcOffs + (isAncient ? 0x20 : 0x60)
    const texData = subarrayData(data, dataOffset)
    const textureInput: TextureInputGX = {
        name: 'Texture',
        width: header.width,
        height: header.height,
        format: header.format,
        mipCount: header.levels,
        data: new ArrayBufferSlice(texData.buffer, texData.byteOffset, texData.byteLength)
    }
    const mipChain = calcMipChain(textureInput, header.levels);

    const canvases: HTMLCanvasElement[] = []
    for (let i = 0; i < mipChain.mipLevels.length; i++) {
        const canvasEl = document.createElement('canvas')
        canvasEl.width = mipChain.mipLevels[i].width
        canvasEl.height = mipChain.mipLevels[i].height
        const ctx = canvasEl.getContext('2d')!
        const decodedTexture = await decodeTexture(mipChain.mipLevels[i])
        const imageData = new ImageData(new Uint8ClampedArray(decodedTexture.pixels.buffer),
            mipChain.mipLevels[i].width, mipChain.mipLevels[i].height)
        ctx.putImageData(imageData, 0, 0)
        canvases.push(canvasEl)
    }

    return canvases
}

function loadRes(data: DataView, srcOffs: number): DataView {
    const magic = data.getUint32(srcOffs);
    switch (magic) {
    case stringToFourCC('ZLB\0'):
        return new DataView(loadZLB(data, srcOffs));
    case stringToFourCC('DIRn'): // FIXME: actually just "DIR"
        return loadDIRn(data, srcOffs);
    case stringToFourCC('LZOn'):
        return new DataView(loadLZOn(data, srcOffs));
    default:
        console.warn(`Invalid magic identifier 0x${hexzero(magic, 8)}`);
        return data;
    }
}

function isValidTextureTabValue(tabValue: number) {
    return tabValue != 0xFFFFFFFF && (tabValue & 0x80000000) != 0;
}

async function openGXTextures() {
    if (gxTexTabEl.files!.length <= 0 || gxTexBinEl.files!.length <= 0) {
        return
    }

    console.log(`Loading GX textures...`)

    const texTab = await readBlobAsync(gxTexTabEl.files![0])
    const texBin = await readBlobAsync(gxTexBinEl.files![0])

    const texturesEl = document.getElementById('textures')!
    let done = false
    let tabOffs = 0
    let texNum = 0;
    while (!done) {
        const tabValue = texTab.getUint32(tabOffs)
        tabOffs += 4
        if (tabValue == 0xFFFFFFFF) {
            break
        }

        if (isValidTextureTabValue(tabValue)) {
            const arrayLength = (tabValue >>> 24) & 0x3f
            const binOffs = (tabValue & 0x00FFFFFF) * 2
            try {
                const pEl = document.createElement('p')
                texturesEl.appendChild(pEl)
                pEl.append(`#${texNum}`);
                if (arrayLength === 1) {
                    const uncomp = loadRes(texBin, binOffs)
                    const canvasEls = await loadGXTexture(uncomp, 0, false)
                    for (let i = 0; i < canvasEls.length; i++) {
                        pEl.appendChild(canvasEls[i])
                    }
                    const aEl = makeDownloadLink(uncomp, `tex${tabValue.toString(16)}.bin`, `Download`)
                    pEl.appendChild(aEl)
                } else {
                    for (let i = 0; i < arrayLength; i++) {
                        const texOffs = texBin.getUint32(binOffs + i * 4)
                        const uncomp = loadRes(texBin, binOffs + texOffs)
                        const canvasEls = await loadGXTexture(uncomp, 0, false)
                        for (let i = 0; i < canvasEls.length; i++) {
                            pEl.appendChild(canvasEls[i])
                        }
                        const aEl = makeDownloadLink(uncomp, `tex${tabValue.toString(16)}.bin`, `Download`)
                        pEl.appendChild(aEl)
                    }
                }
            } catch (e) {
                console.log(`Skipping texture at 0x${binOffs.toString(16)} due to exception:`)
                console.error(e)
            }
        }

        texNum++;
    }
}

const gxTexTabEl = <HTMLInputElement>document.getElementById('gx-tex-tab')!
gxTexTabEl.onchange = async function (event) {
    await openGXTextures()
}

const gxTexBinEl = <HTMLInputElement>document.getElementById('gx-tex-bin')!
gxTexBinEl.onchange = async function (event) {
    await openGXTextures()
}

function plot(imageData: ImageData, x: number, y: number, r: number, g: number, b: number, a: number) {
    const pixels = new Uint8Array(imageData.data.buffer)
    const idx = 4 * (y * imageData.width + x)
    pixels[idx] = r
    pixels[idx + 1] = g
    pixels[idx + 2] = b
    pixels[idx + 3] = a
}

function generateWarpyTexture(): HTMLCanvasElement {
    const canvasEl = document.createElement('canvas')

    const width = 64
    const height = 64

    canvasEl.width = width
    canvasEl.height = height

    const ctx = canvasEl.getContext('2d')!
    const imageData = ctx.createImageData(width, height)

    const X_MUL = 0.39275; // Approximately pi / 8
    const Y_MUL = 0.0981875; // Approximately pi / 32
    for (let y = 0; y < height; y++) {
        let yAngle = Y_MUL * y
        for (let x = 0; x < width; x++) {
            const xAngle = X_MUL * x;
            const iFactor = Math.cos(0.5 * Math.sin(xAngle) + yAngle);
            const aFactor = Math.cos(xAngle);
            const I = 127 * iFactor + 127;
            const A = 127 * iFactor * aFactor + 127;
            plot(imageData, y, x, A, A, A, 0xff);
        }
    }

    ctx.putImageData(imageData, 0, 0)

    return canvasEl
}

function generateWaterRelatedTexture(): HTMLCanvasElement {
    const canvasEl = document.createElement('canvas')

    const width = 128
    const height = 128

    canvasEl.width = width
    canvasEl.height = height

    const ctx = canvasEl.getContext('2d')!
    const imageData = ctx.createImageData(width, height)

    for (let y = 0; y < height; y++) {
        let fy = (y - 64) / 64
        for (let x = 0; x < width; x++) {
            let fx = (x - 64) / 64
            let dist = Math.hypot(fx, fy);
            if (dist < 0.25 || 0.75 < dist) {
                dist = 0.0
            } else {
                let f = 2.0 * (dist - 0.25)
                if (f <= 0.5) {
                    f = 0.5 - f
                } else {
                    f = f - 0.5
                }
                dist = -(2.0 * f - 1.0)
                if (0.0 < dist) {
                    dist = Math.sqrt(dist)
                }
            }
            let I = /*16*/ 255 * dist
            plot(imageData, y, x, I, I, I, 0xff)
        }
    }

    ctx.putImageData(imageData, 0, 0)

    return canvasEl
}

function generateFooTexture(): HTMLCanvasElement {
    const canvasEl = document.createElement('canvas')

    const width = 64
    const height = 64

    canvasEl.width = width
    canvasEl.height = height

    const ctx = canvasEl.getContext('2d')!
    const imageData = ctx.createImageData(width, height)

    for (let y = 0; y < height; y++) {
        const dVar30 = (y - 32) / 32
        const dVar23 = (y + 1 - 32) / 32
        for (let x = 0; x < width; x++) {
            let fVar3 = (x - 32) / 32
            let dVar27 = fVar3 * fVar3

            let dVar28 = dVar30 * dVar30 + dVar27
            if (dVar28 > 0) {
                let dVar24 = 1 / Math.sqrt(dVar28)
                dVar24 = 0.5 * dVar24 * -(dVar28 * dVar24 * dVar24 - 3.0)
                dVar24 = 0.5 * dVar24 * -(dVar28 * dVar24 * dVar24 - 3.0)
                dVar28 = dVar28 * 0.5 * dVar24 * -(dVar28 * dVar24 * dVar24 - 3.0)
            }
            
            dVar27 = (dVar23 * dVar23 + dVar27)
            if (dVar27 > 0) {
                let dVar24 = 1 / Math.sqrt(dVar27)
                dVar24 = 0.5 * dVar24 * -(dVar27 * dVar24 * dVar24 - 3.0)
                dVar24 = 0.5 * dVar24 * -(dVar27 * dVar24 * dVar24 - 3.0)
                dVar27 = dVar27 * 0.5 * dVar24 * -(dVar27 * dVar24 * dVar24 - 3.0)
            }

            fVar3 = (x + 1 - 32) / 32
            let dVar24 = dVar30 * dVar30 + (fVar3 * fVar3)
            if (dVar24 > 0) {
                let dVar25 = 1 / Math.sqrt(dVar24)
                dVar25 = 0.5 * dVar25 * -(dVar24 * dVar25 * dVar25 - 3.0)
                dVar25 = 0.5 * dVar25 * -(dVar24 * dVar25 * dVar25 - 3.0)
                dVar24 = dVar24 * 0.5 * dVar25 * -(dVar24 * dVar25 * dVar25 - 3.0)
            }

            let dVar25 = Math.cos(18.852 * dVar28) // approximately PI * 6
            dVar25 = -dVar25
            dVar27 = Math.cos(18.852 * dVar27)
            dVar27 = -dVar27
            dVar24 = Math.cos(18.852 * dVar24)
            if (dVar28 >= 1.0) {
                dVar28 = 0
            } else {
                dVar28 = 1.0 - dVar28
                if (dVar28 > 0) {
                    let dVar29 = 1 / Math.sqrt(dVar28)
                    dVar29 = 0.5 * dVar29 * -(dVar28 * dVar29 * dVar29 - 3.0)
                    dVar29 = 0.5 * dVar29 * -(dVar28 * dVar29 * dVar29 - 3.0)
                    dVar28 = dVar28 * 0.5 * dVar29 * -(dVar28 * dVar29 * dVar29 - 3.0)
                }
            }

            let dVar29 = 32 * dVar28
            if (15 < (32 * dVar28)) {
                dVar29 = 15
            }

            const dVar33 = 0.5 // TODO
            const dVar39 = 1.0 / dVar33
            const R = (((dVar39 * (127 * (dVar25 - -dVar24)) + 127) / 16) & 0xf) / 15 * 255
            const G = ((dVar29) & 0xf) / 15 * 255
            const B = (((dVar39 * (127 * (dVar25 - dVar27)) + 127) / 32) & 0x7) / 7 * 255
            const A = 255
            plot(imageData, x, y, R, G, B, A)
        }
    }

    ctx.putImageData(imageData, 0, 0)

    return canvasEl
}

interface Hair {
    numLayers: number;
    x: number;
    y: number;
    field_0xc: number;
    field_0x10: number;
}

function evaluateHair(x: number, y: number, layer: number, hairs: Hair[]): [number, number] {
    let dVar5 = 0;
    let dVar6 = 0;

    for (let i = 0; i < hairs.length; i++) {
        const hair = hairs[i];

        if (layer < hair.numLayers) {
            let dVar8 = 0.25 + (hair.numLayers - layer) / hair.numLayers;
            if (dVar8 > 1) {
                dVar8 = 1;
            }
            if (dVar8 > 0) {
                dVar8 = Math.sqrt(dVar8);
            }
            let fVar2 = Math.abs(hair.x - x);
            let fVar1 = Math.abs(1 + hair.x - x);
            if (fVar2 > fVar1) {
                fVar2 = fVar1;
            }
            fVar1 = Math.abs(hair.x - 1 - x)
            if (fVar2 > fVar1) {
                fVar2 = fVar1;
            }

            let dVar7 = hair.y;
            fVar1 = 0;
            if (dVar7 < y) {
                fVar1 = y - dVar7;
            }
            let fVar4 = Math.abs(1 + dVar7 - y);
            let fVar3 = Math.abs(dVar7 - y);
            if (fVar4 < Math.abs(dVar7 - y)) {
                fVar3 = fVar4;
                fVar1 = 0;
            }
            dVar7 = fVar1;
            let dVar9 = hair.y - 1;
            fVar1 = Math.abs(dVar9 - y);
            if ((fVar1 < fVar3) && (fVar3 = fVar1, dVar9 < y)) {
                dVar7 = y - dVar9;
            }
            dVar9 = Math.sqrt(fVar2 * fVar2 + fVar3 * fVar3);
            let dVar10 = Math.sqrt(layer / hair.numLayers);
            dVar10 = -(dVar10 * (hair.field_0xc - hair.field_0x10) - hair.field_0xc);
            if (dVar9 <= dVar10) {
                dVar9 = 1 - dVar9 / dVar10;
                if (dVar9 > 0) {
                    dVar9 = Math.sqrt(dVar9);
                }
                dVar5 = dVar8 * dVar9 + dVar5;
                dVar6 = 0.5 * -(layer / 16 - 1) + dVar6 + dVar7 / dVar10;
            }
        }
    }

    if (dVar5 > 1) {
        dVar5 = 1;
    }
    if (dVar6 > 1) {
        dVar6 = 1;
    }
    return [dVar6 / 8 + 7/16, dVar5];
}

function random(lo: number, hi: number) {
    return lo + (hi - lo) * Math.random();
}

function generateFurMap(layer: number, hairs: Hair[]): HTMLCanvasElement {
    const canvasEl = document.createElement('canvas')

    const width = 64
    const height = 64

    canvasEl.width = width
    canvasEl.height = height

    const ctx = canvasEl.getContext('2d')!
    const imageData = ctx.createImageData(width, height)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const [I_, A_] = evaluateHair(x / 64, y / 64, layer, hairs);
            const I = I_ * 0xff
            // const I = A_ * 0xff
            //const A = A_ * 0xff
            const A = 0xff
            plot(imageData, x, y, I, I, I, A)
        }
    }

    ctx.putImageData(imageData, 0, 0)

    return canvasEl
}

const warpyCanvas = generateWarpyTexture()
document.getElementById('textures')!.appendChild(warpyCanvas)

const waterCanvas = generateWaterRelatedTexture()
document.getElementById('textures')!.appendChild(waterCanvas)

const fooCanvas = generateFooTexture()
document.getElementById('textures')!.appendChild(fooCanvas)

function generateFurMaps() {
    const hairs: Hair[] = [];

    let try_ = 0;
    for (let i = 0; i < 50 && try_ < 10000; i++) {
        const newHair = {
            numLayers: random(8, 16),
            x: 0,
            y: 0,
            field_0xc: 0.01 * random(5, 10),
            field_0x10: 0,
        };
        newHair.field_0x10 = newHair.field_0xc * 0.01 * random(20, 50);

        let done = false;
        do {
            newHair.x = 0.001 * random(0, 999);
            newHair.y = 0.001 * random(0, 999);

            done = false;
            let j = 0;
            while (j < i && !done) {
                const cmpHair = hairs[j];

                let fVar1 = Math.abs(newHair.x - cmpHair.x);
                let fVar2 = Math.abs(1 + newHair.x - cmpHair.x);
                if (fVar2 < fVar1) {
                    fVar1 = fVar2;
                }
                fVar2 = Math.abs(newHair.x - 1 - cmpHair.x);
                if (fVar2 < fVar1) {
                    fVar1 = fVar2;
                }
                fVar2 = Math.abs(newHair.y - cmpHair.y);
                let fVar3 = Math.abs(1 + newHair.y - cmpHair.y);
                if (fVar3 < fVar2) {
                    fVar2 = fVar3;
                }
                fVar3 = Math.abs(newHair.y - 1 - cmpHair.y);
                if (fVar3 < fVar2) {
                    fVar2 = fVar3;
                }

                let dVar11 = Math.sqrt(fVar1 * fVar1 + fVar2 * fVar2);
                if (dVar11 < (newHair.field_0x10 + cmpHair.field_0xc)) {
                    done = true;
                }

                j++;
            }

            try_++;
        } while (done && try_ < 10000);

        if (try_ >= 10000) {
            console.warn(`reached 10,000 tries`);
        }

        hairs.push(newHair);
    }

    for (let i = 0; i < 16; i++) {
        const furMapCanvas = generateFurMap(i, hairs)
        document.getElementById('textures')!.appendChild(furMapCanvas)
    }
}

generateFurMaps();

function interpS16(value: number): number {
    const u16 = new Uint16Array(1);
    const s16 = new Int16Array(u16.buffer);
    u16[0] = value & 0xffff;
    return s16[0];
}

function getInfoForOp6(code: number): string {
    const subop = code & 0xff;
    const param = (code >> 8) & 0xff;
    return `subop 0x${subop.toString(16)} param 0x${param.toString(16)}`;
}

async function openAnimcurves() {
    if (animcurvesTabEl.files!.length <= 0 || animcurvesBinEl.files!.length <= 0) {
        return
    }

    console.log(`Loading ANIMCURVES...`)

    const tab = await readBlobAsync(animcurvesTabEl.files![0])
    const bin = await readBlobAsync(animcurvesBinEl.files![0])

    const animcurvesEl = document.getElementById('animcurves')!;

    let tabOffs = 0;
    let i = 0;
    while (tabOffs < tab.byteLength) {
        const numEvents = tab.getUint16(tabOffs + 0x2);
        let binOffs = tab.getUint32(tabOffs + 0x4);

        const pEl = document.createElement('p');
        animcurvesEl.append(pEl);

        const hEl = document.createElement('h3');
        pEl.append(hEl);
        hEl.append(`Animation #${i}`);

        const origBinOffs = binOffs;
        for (; binOffs < origBinOffs + numEvents * 4; binOffs += 0x4) {
            const evpEl = document.createElement('p');
            pEl.appendChild(evpEl);

            const event = bin.getUint32(binOffs);
            const eventCode = event >>> 24;
            const frames = (event >>> 16) & 0xff;
            const param = event & 0xffff;
            switch (eventCode) {
            case 0: {
                const time = interpS16(param);
                evpEl.append(`Wait until frame ${time}`);
                break;
            }
            case 0xff: {
                const duration = interpS16(param);
                evpEl.append(`Set duration ${duration}`);
                break;
            }
            case 0x2: {
                evpEl.append(`Start animation ${param}; frames ${frames}`);
                break;
            }
            case 0x3: {
                evpEl.append(`Set current object ${param}; frames ${frames}`);
                break;
            }
            case 0xb: {
                evpEl.append(`Schedule ${param} subevents; frames ${frames}`);
                for (let j = 0; j < param; j++) {
                    binOffs += 0x4;

                    const subevent = bin.getUint32(binOffs);
                    const op = subevent & 0x3f;
                    const subop = (subevent >>> 6) & 0x3ff;
                    const param = (subevent >>> 16) & 0xffff;

                    const subEl = document.createElement('p');
                    evpEl.append(subEl);
                    let text;
                    text = `Subevent #${j}: 0x${subevent.toString(16)} (op 0x${op.toString(16)})`
                    if (op === 6) {
                        text += ` (${getInfoForOp6(subop | (param << 8))})`;
                    }
                    subEl.append(text);
                }
                break;
            }
            default:
                evpEl.append(`Unknown event code 0x${eventCode.toString(16)}; ${frames} frames; param 0x${param.toString(16)}`);
                break;
            }
        }

        tabOffs += 0x8;
        i++;
    }
}

const animcurvesTabEl = <HTMLInputElement>document.getElementById('animcurves-tab')!
animcurvesTabEl.onchange = async function (event) {
    await openAnimcurves()
}

const animcurvesBinEl = <HTMLInputElement>document.getElementById('animcurves-bin')!
animcurvesBinEl.onchange = async function (event) {
    await openAnimcurves()
}

async function openObjseq() {
    if (objseqTabEl.files!.length <= 0 || objseqBinEl.files!.length <= 0) {
        return
    }

    console.log(`Loading OBJSEQ...`)

    const tab = await readBlobAsync(objseqTabEl.files![0])
    const bin = await readBlobAsync(objseqBinEl.files![0])

    const objseqEl = document.getElementById('objseq')!;

    let done = false;
    let i = 0;
    while (!done) {
        const startIndex = tab.getUint16(i * 2);
        const endIndex = tab.getUint16((i + 1) * 2);
        let count;
        if (endIndex === 0xffff) {
            done = true;
            count = (bin.byteLength / 0x8) - startIndex;
        } else {
            count = endIndex - startIndex;
        }

        const pEl = document.createElement('p');
        objseqEl.append(pEl);

        const hEl = document.createElement('h3');
        pEl.append(hEl);
        hEl.append(`Object Sequence #${i}`);

        let offs = startIndex * 0x8;
        for (let j = 0; j < count; j++) {
            const fields = {
                objId: bin.getUint32(offs),
                flags: bin.getUint16(offs + 0x4),
                objType: bin.getUint16(offs + 0x6),
            };
            const text = `Object #${j}: ID 0x${fields.objId.toString(16)}, flags 0x${fields.flags.toString(16)}, type 0x${fields.objType.toString(16)}`;
            const subp = document.createElement('p');
            pEl.appendChild(subp);
            subp.append(text);
            offs += 0x8;
        }

        i++;
    }
}

const objseqTabEl = <HTMLInputElement>document.getElementById('objseq-tab')!
objseqTabEl.onchange = async function (event) {
    await openObjseq()
}

const objseqBinEl = <HTMLInputElement>document.getElementById('objseq-bin')!
objseqBinEl.onchange = async function (event) {
    await openObjseq()
}
