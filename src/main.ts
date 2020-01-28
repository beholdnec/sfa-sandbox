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

const fileInputEl = <HTMLInputElement>document.getElementById('file-input')
fileInputEl.onchange = function (event) {
    if (fileInputEl.files) {
        const file = fileInputEl.files[0]
        console.log(`Loading file ${file.name} ...`)
        openFile(file)
    }
}