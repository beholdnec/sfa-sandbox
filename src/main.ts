import { readBlobAsync, StreamDataView, jsonify, sliceBlob, stringToFourCC, dataViewToU8Array } from './util'
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

async function openFile(blob: File) {
    const headerBlob = sliceBlob(blob, 0, ZLBHeader.SIZE)
    const headerDv = await readBlobAsync(headerBlob)

    const header = new ZLBHeader(new StreamDataView(headerDv))
    console.log(`Header: ${jsonify(header)}`)

    if (header.magic != stringToFourCC('ZLB\0')) {
        throw Error(`Invalid magic identifier`)
    }

    const zlbBlob = sliceBlob(blob, ZLBHeader.SIZE, header.size)
    const zlbDv = await readBlobAsync(zlbBlob)
    const uncompressed = <Uint8Array>pako.inflate(dataViewToU8Array(zlbDv))

    const aEl = document.createElement('a')
    const downloadLinksEl = document.getElementById('download-links')!
    downloadLinksEl.appendChild(aEl)
    aEl.href = URL.createObjectURL(new Blob([uncompressed], {type: 'application/octet-stream'}))
    aEl.download = `${blob.name}.dec.bin`
    aEl.append('Download')

    const sdv = new StreamDataView(new DataView(uncompressed.buffer))
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