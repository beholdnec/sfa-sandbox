
export function sliceBlob(blob: Blob, start: number, length?: number): Blob {
    if (length !== undefined) {
        return blob.slice(start, start + length)
    }

    return blob.slice(start)
}

export function readBlobAsync(blob: Blob): Promise<DataView> {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
        reader.onload = () => {
            resolve(new DataView(<ArrayBuffer>reader.result))
        }
        reader.onerror = () => {
            reader.abort()
            reject(reader.error)
        }

        reader.readAsArrayBuffer(blob)
    })
}

export class StreamDataView {
    dv: DataView
    cursor: number

    constructor(dv: DataView) {
        this.dv = dv
        this.cursor = 0
    }

    getCursor(): number {
        return this.cursor
    }

    setCursor(cursor: number) {
        this.cursor = cursor
    }

    advanceCursor(offset: number) {
        this.cursor += offset
    }

    getNextDataView(byteLength: number): DataView {
        const result = new DataView(this.dv.buffer, this.dv.byteOffset + this.cursor, byteLength)
        this.cursor += byteLength
        return result
    }

    getNextArrayBuffer(byteLength: number): ArrayBuffer {
        const result = this.dv.buffer.slice(this.dv.byteOffset + this.cursor, this.dv.byteOffset + this.cursor + byteLength)
        this.cursor += byteLength
        return result
    }

    getNextUint8Array(byteLength: number): Uint8Array {
        return new Uint8Array(this.getNextArrayBuffer(byteLength))
    }

    peekNextInt8(): number {
        return this.dv.getInt8(this.cursor)
    }

    getNextInt8(): number {
        const result = this.peekNextInt8()
        this.cursor += 1
        return result
    }

    peekNextUint8(): number {
        return this.dv.getUint8(this.cursor)
    }

    getNextUint8(): number {
        const result = this.peekNextUint8()
        this.cursor += 1
        return result
    }

    peekNextInt16(littleEndian?: boolean): number {
        return this.dv.getInt16(this.cursor, littleEndian)
    }

    getNextInt16(littleEndian?: boolean): number {
        const result = this.peekNextInt16(littleEndian)
        this.cursor += 2
        return result
    }

    peekNextUint16(littleEndian?: boolean): number {
        return this.dv.getUint16(this.cursor, littleEndian)
    }

    getNextUint16(littleEndian?: boolean): number {
        const result = this.peekNextUint16(littleEndian)
        this.cursor += 2
        return result
    }

    peekNextInt32(littleEndian?: boolean): number {
        return this.dv.getInt32(this.cursor, littleEndian)
    }

    getNextInt32(littleEndian?: boolean): number {
        const result = this.peekNextInt32(littleEndian)
        this.cursor += 4
        return result
    }

    peekNextUint32(littleEndian?: boolean): number {
        return this.dv.getUint32(this.cursor, littleEndian)
    }

    getNextUint32(littleEndian?: boolean): number {
        const result = this.peekNextUint32(littleEndian)
        this.cursor += 4
        return result
    }

    peekNextUint64(littleEndian?: boolean): bigint {
        const lo = this.dv.getUint32(this.cursor + (littleEndian ? 0 : 4))
        const hi = this.dv.getUint32(this.cursor + (littleEndian ? 4 : 0))
        return (BigInt(hi) << 32n) | BigInt(lo)
    }

    getNextUint64(littleEndian?: boolean): bigint {
        const result = this.peekNextUint64(littleEndian)
        this.cursor += 8
        return result
    }
}

export function jsonify(value: any): string {
    return JSON.stringify(value,
        (key: string, value: any) => {
            if (typeof(value) == 'bigint') {
                return value.toString()
            }
            
            return value
        },
        '\t')
}

export function stringToFourCC(s: string): number {
    return (s.charCodeAt(0) << 24) | (s.charCodeAt(1) << 16) | (s.charCodeAt(2) << 8) | s.charCodeAt(3)
}
