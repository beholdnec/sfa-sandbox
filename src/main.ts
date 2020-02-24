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

async function loadGXTexture(data: DataView, srcOffs: number): Promise<HTMLCanvasElement[]> {
    console.log(`data length 0x${data.byteLength.toString(16)} srcOffs 0x${srcOffs.toString(16)}`)

    const header = {
        width: data.getUint16(srcOffs + 0xa),
        height: data.getUint16(srcOffs + 0xc),
        levels: data.getUint16(srcOffs + 0x1c) + 1, 
        format: data.getUint8(srcOffs + 0x16),
    }
    console.log(`gx texture header: ${jsonify(header)}`)


    const dataOffset = srcOffs + 0x60
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
                const uncomp = loadRes(texBin, srcOffs)
                const canvasEls = await loadGXTexture(uncomp, 0)
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
