import { readBlobAsync, StreamDataView, jsonify, sliceBlob, stringToFourCC } from "./util"

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

async function openFile(blob: Blob) {
    const headerBlob = sliceBlob(blob, 0, ZLBHeader.SIZE)
    const headerDv = await readBlobAsync(headerBlob)

    const header = new ZLBHeader(new StreamDataView(headerDv))
    console.log(`Header: ${jsonify(header)}`)

    if (header.magic != stringToFourCC('ZLB\0')) {
        throw Error(`Invalid magic identifier`)
    }
}

const fileInputEl = <HTMLInputElement>document.getElementById('file-input')
fileInputEl.onchange = function (event) {
    if (fileInputEl.files) {
        const file = fileInputEl.files[0]
        console.log(`Loading file ${file.name} ...`)
        openFile(file)
    }
}