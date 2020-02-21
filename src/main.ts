import { readBlobAsync, hexzero, StreamDataView, jsonify, sliceBlob, stringToFourCC, dataViewToU8Array } from './util'
import * as pako from 'pako'

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

function loadZLB(dv: DataView): ArrayBuffer {
    let offs = 0;
    const header = new ZLBHeader(new StreamDataView(dv));
    offs += ZLBHeader.SIZE;

    if (header.magic != stringToFourCC('ZLB\0')) {
        throw Error(`Invalid magic identifier 0x${hexzero(header.magic, 8)}`);
    }

    return pako.inflate(new Uint8Array(dv.buffer.slice(offs, offs + header.size))).buffer;
}

async function openFile(blob: File) {
    const data = await readBlobAsync(blob)

    const magic = data.getUint32(0)
    let uncompressed: ArrayBuffer
    switch (magic) {
    case stringToFourCC('ZLB\0'):
        uncompressed = loadZLB(data)
        break
    case 0xFACEFEED:
        // uncompressed = loadZLB(new DataView(data.buffer.slice(0x24)))
        uncompressed = loadZLB(new DataView(data.buffer.slice(0x164)))
        break
    default:
        throw Error(`Unhandled magic identifier 0x${hexzero(magic, 8)}`)
    }

    const aEl = document.createElement('a')
    const downloadLinksEl = document.getElementById('download-links')!
    downloadLinksEl.appendChild(aEl)
    aEl.href = URL.createObjectURL(new Blob([uncompressed], {type: 'application/octet-stream'}))
    aEl.download = `${blob.name}.dec.bin`
    aEl.append('Download')

    const sdv = new StreamDataView(new DataView(uncompressed))
    sdv.setCursor(0x54)
    const texOffset = sdv.getNextUint32()
    sdv.setCursor(0xA0)
    const numTextures = sdv.getNextUint8()
    console.log(`${numTextures} textures, offset 0x${texOffset.toString(16)}`)
}

async function loadRawZLB(blob: File, offs: number, size: number) {
    const data = await readBlobAsync(blob)

    const uncompressed = pako.inflate(new Uint8Array(data.buffer.slice(offs, offs + size))).buffer

    const aEl = document.createElement('a')
    const downloadLinksEl = document.getElementById('download-links')!
    downloadLinksEl.appendChild(aEl)
    aEl.href = URL.createObjectURL(new Blob([uncompressed], {type: 'application/octet-stream'}))
    aEl.download = `${blob.name}.dec.bin`
    aEl.append('Download')
}

const fileInputEl = <HTMLInputElement>document.getElementById('file-input')
fileInputEl.onchange = function (event) {
    if (fileInputEl.files) {
        const file = fileInputEl.files[0]
        console.log(`Loading file ${file.name} ...`)
        loadRawZLB(file, 16, 0x4730 - 16)
        // openFile(file)
    }
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

function loadTexture(data: DataView, srcOffs: number): HTMLCanvasElement {
    const width = data.getUint8(srcOffs + 0) & 0x7f
    const height = data.getUint8(srcOffs + 1) & 0x7f
    const format = data.getUint8(srcOffs + 2)

    const canvasEl = document.createElement('canvas')
    canvasEl.width = width
    canvasEl.height = height

    const ctx = canvasEl.getContext('2d')!
    const imageData = ctx.createImageData(width, height)
    const pixels = new Uint8Array(imageData.data.buffer)

    switch (format) {
    case 0x01: 
        decodeTex_RGBA16(pixels, data, srcOffs + 8, width, height, 0, false); // FIXME: where is the line parameter stored?
        break
    case 0x03: // Appears to be 8-bit
        decodeTex_I8(pixels, data, srcOffs + 8, width, height, 0, false);
        break
    default:
        throw Error(`Unhandled texture format 0x${format.toString(16)}`)
    }

    ctx.putImageData(imageData, 0, 0)

    return canvasEl
}

async function openDBTextures(blob: File) {
    const data = await readBlobAsync(blob)

    const texturesEl = document.getElementById('textures')!

    const numTextures = data.getUint32(0)
    for (let i = 0; i < numTextures; i++) {
        const srcOffs = data.getUint32(4 + i * 4)
        const canvasEl = loadTexture(data, srcOffs)
        texturesEl.appendChild(canvasEl)
    }
}

const dbtexturesEl = <HTMLInputElement>document.getElementById('db-textures')
dbtexturesEl.onchange = function (event) {
    if (dbtexturesEl.files) {
        const file = dbtexturesEl.files[0]
        console.log(`Loading file ${file.name} ...`)
        openDBTextures(file)
    }
}