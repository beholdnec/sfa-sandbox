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
            const srcOffs = (tabValue & 0x00FFFFFF) * 2
            try {
                const pEl = document.createElement('p')
                texturesEl.appendChild(pEl)
                pEl.append(`#${texNum}`);
                const uncomp = loadRes(texBin, srcOffs)
                const canvasEls = await loadGXTexture(uncomp, 0, true)
                for (let i = 0; i < canvasEls.length; i++) {
                    pEl.appendChild(canvasEls[i])
                }
                const aEl = makeDownloadLink(uncomp, `tex${tabValue.toString(16)}.bin`, `Download`)
                pEl.appendChild(aEl)
            } catch (e) {
                console.log(`Skipping texture at 0x${srcOffs.toString(16)} due to exception:`)
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

    let X_MUL = 0.39275 // Approximately pi / 8
    let Y_MUL = 0.0981875 // Approximately pi / 32
    for (let y = 0; y < height; y++) {
        let yAngle = Y_MUL * y
        for (let x = 0; x < width; x++) {
            let xAngle = X_MUL * x
            let iFactor = Math.cos(0.5 * Math.sin(xAngle) + yAngle)
            let aFactor = Math.cos(X_MUL * x * xAngle)
            let I = 127 * iFactor + 127
            let A = 127 * iFactor * aFactor + 127
            plot(imageData, y, x, I, I, I, 0xff)
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

const warpyCanvas = generateWarpyTexture()
document.getElementById('textures')!.appendChild(warpyCanvas)

const waterCanvas = generateWaterRelatedTexture()
document.getElementById('textures')!.appendChild(waterCanvas)

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
