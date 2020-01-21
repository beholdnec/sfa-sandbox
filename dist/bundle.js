/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/main.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _util__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./util */ "./src/util.ts");

console.log('Hello, World!');
class ZLBHeader {
    constructor(sdv) {
        this.magic = sdv.getNextUint32();
        this.unk4 = sdv.getNextUint32();
        this.unk8 = sdv.getNextUint32();
        this.size = sdv.getNextUint32();
    }
}
ZLBHeader.SIZE = 16;
async function openFile(blob) {
    const headerBlob = Object(_util__WEBPACK_IMPORTED_MODULE_0__["sliceBlob"])(blob, 0, ZLBHeader.SIZE);
    const headerDv = await Object(_util__WEBPACK_IMPORTED_MODULE_0__["readBlobAsync"])(headerBlob);
    const header = new ZLBHeader(new _util__WEBPACK_IMPORTED_MODULE_0__["StreamDataView"](headerDv));
    console.log(`Header: ${Object(_util__WEBPACK_IMPORTED_MODULE_0__["jsonify"])(header)}`);
    if (header.magic != Object(_util__WEBPACK_IMPORTED_MODULE_0__["stringToFourCC"])('ZLB\0')) {
        throw Error(`Invalid magic identifier`);
    }
}
const fileInputEl = document.getElementById('file-input');
fileInputEl.onchange = function (event) {
    if (fileInputEl.files) {
        const file = fileInputEl.files[0];
        console.log(`Loading file ${file.name} ...`);
        openFile(file);
    }
};


/***/ }),

/***/ "./src/util.ts":
/*!*********************!*\
  !*** ./src/util.ts ***!
  \*********************/
/*! exports provided: sliceBlob, readBlobAsync, StreamDataView, jsonify, stringToFourCC */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sliceBlob", function() { return sliceBlob; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "readBlobAsync", function() { return readBlobAsync; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StreamDataView", function() { return StreamDataView; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "jsonify", function() { return jsonify; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "stringToFourCC", function() { return stringToFourCC; });
function sliceBlob(blob, start, length) {
    if (length !== undefined) {
        return blob.slice(start, start + length);
    }
    return blob.slice(start);
}
function readBlobAsync(blob) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = () => {
            resolve(new DataView(reader.result));
        };
        reader.onerror = () => {
            reader.abort();
            reject(reader.error);
        };
        reader.readAsArrayBuffer(blob);
    });
}
class StreamDataView {
    constructor(dv) {
        this.dv = dv;
        this.cursor = 0;
    }
    getCursor() {
        return this.cursor;
    }
    setCursor(cursor) {
        this.cursor = cursor;
    }
    advanceCursor(offset) {
        this.cursor += offset;
    }
    getNextDataView(byteLength) {
        const result = new DataView(this.dv.buffer, this.dv.byteOffset + this.cursor, byteLength);
        this.cursor += byteLength;
        return result;
    }
    getNextArrayBuffer(byteLength) {
        const result = this.dv.buffer.slice(this.dv.byteOffset + this.cursor, this.dv.byteOffset + this.cursor + byteLength);
        this.cursor += byteLength;
        return result;
    }
    getNextUint8Array(byteLength) {
        return new Uint8Array(this.getNextArrayBuffer(byteLength));
    }
    peekNextInt8() {
        return this.dv.getInt8(this.cursor);
    }
    getNextInt8() {
        const result = this.peekNextInt8();
        this.cursor += 1;
        return result;
    }
    peekNextUint8() {
        return this.dv.getUint8(this.cursor);
    }
    getNextUint8() {
        const result = this.peekNextUint8();
        this.cursor += 1;
        return result;
    }
    peekNextInt16(littleEndian) {
        return this.dv.getInt16(this.cursor, littleEndian);
    }
    getNextInt16(littleEndian) {
        const result = this.peekNextInt16(littleEndian);
        this.cursor += 2;
        return result;
    }
    peekNextUint16(littleEndian) {
        return this.dv.getUint16(this.cursor, littleEndian);
    }
    getNextUint16(littleEndian) {
        const result = this.peekNextUint16(littleEndian);
        this.cursor += 2;
        return result;
    }
    peekNextInt32(littleEndian) {
        return this.dv.getInt32(this.cursor, littleEndian);
    }
    getNextInt32(littleEndian) {
        const result = this.peekNextInt32(littleEndian);
        this.cursor += 4;
        return result;
    }
    peekNextUint32(littleEndian) {
        return this.dv.getUint32(this.cursor, littleEndian);
    }
    getNextUint32(littleEndian) {
        const result = this.peekNextUint32(littleEndian);
        this.cursor += 4;
        return result;
    }
    peekNextUint64(littleEndian) {
        const lo = this.dv.getUint32(this.cursor + (littleEndian ? 0 : 4));
        const hi = this.dv.getUint32(this.cursor + (littleEndian ? 4 : 0));
        return (BigInt(hi) << 32n) | BigInt(lo);
    }
    getNextUint64(littleEndian) {
        const result = this.peekNextUint64(littleEndian);
        this.cursor += 8;
        return result;
    }
}
function jsonify(value) {
    return JSON.stringify(value, (key, value) => {
        if (typeof (value) == 'bigint') {
            return value.toString();
        }
        return value;
    }, '\t');
}
function stringToFourCC(s) {
    return (s.charCodeAt(0) << 24) | (s.charCodeAt(1) << 16) | (s.charCodeAt(2) << 8) | s.charCodeAt(3);
}


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL21haW4udHMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtRQUFBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBOzs7UUFHQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMENBQTBDLGdDQUFnQztRQUMxRTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLHdEQUF3RCxrQkFBa0I7UUFDMUU7UUFDQSxpREFBaUQsY0FBYztRQUMvRDs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0EseUNBQXlDLGlDQUFpQztRQUMxRSxnSEFBZ0gsbUJBQW1CLEVBQUU7UUFDckk7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwyQkFBMkIsMEJBQTBCLEVBQUU7UUFDdkQsaUNBQWlDLGVBQWU7UUFDaEQ7UUFDQTtRQUNBOztRQUVBO1FBQ0Esc0RBQXNELCtEQUErRDs7UUFFckg7UUFDQTs7O1FBR0E7UUFDQTs7Ozs7Ozs7Ozs7OztBQ2xGQTtBQUFBO0FBQTBGO0FBRTFGLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDO0FBRTVCLE1BQU0sU0FBUztJQVFYLFlBQVksR0FBbUI7UUFDM0IsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsYUFBYSxFQUFFO1FBQ2hDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLGFBQWEsRUFBRTtRQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxhQUFhLEVBQUU7UUFDL0IsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsYUFBYSxFQUFFO0lBQ25DLENB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TUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUM7SUFDM0MsQ0FBQztJQUVELGFBQWEsQ0FBQyxZQUFzQjtRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQztRQUNoRCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUM7UUFDaEIsT0FBTyxNQUFNO0lBQ2pCLENBQUM7Q0FDSjtBQUVNLFNBQVMsT0FBTyxDQUFDLEtBQVU7SUFDOUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFDdkIsQ0FBQyxHQUFXLEVBQUUsS0FBVSxFQUFFLEVBQUU7UUFDeEIsSUFBSSxPQUFNLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxFQUFFO1lBQzNCLE9BQU8sS0FBSyxDQUFDLFFBQVEsRUFBRTtTQUMxQjtRQUVELE9BQU8sS0FBSztJQUNoQixDQUFDLEVBQ0QsSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVNLFNBQVMsY0FBYyxDQUFDLENBQVM7SUFDcEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUN2RyxDQUFDIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSBcIi4vc3JjL21haW4udHNcIik7XG4iLCJpbXBvcnQgeyByZWFkQmxvYkFzeW5jLCBTdHJlYW1EYXRhVmlldywganNvbmlmeSwgc2xpY2VCbG9iLCBzdHJpbmdUb0ZvdXJDQyB9IGZyb20gXCIuL3V0aWxcIlxyXG5cclxuY29uc29sZS5sb2coJ0hlbGxvLCBXb3JsZCEnKVxyXG5cclxuY2xhc3MgWkxCSGVhZGVyIHtcclxuICAgIHN0YXRpYyByZWFkb25seSBTSVpFID0gMTZcclxuXHJcbiAgICBtYWdpYzogbnVtYmVyXHJcbiAgICB1bms0OiBudW1iZXJcclxuICAgIHVuazg6IG51bWJlclxyXG4gICAgc2l6ZTogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3Ioc2R2OiBTdHJlYW1EYXRhVmlldykge1xyXG4gICAgICAgIHRoaXMubWFnaWMgPSBzZHYuZ2V0TmV4dFVpbnQzMigpXHJcbiAgICAgICAgdGhpcy51bms0ID0gc2R2LmdldE5leHRVaW50MzIoKVxyXG4gICAgICAgIHRoaXMudW5rOCA9IHNkdi5nZXROZXh0VWludDMyKClcclxuICAgICAgICB0aGlzLnNpemUgPSBzZHYuZ2V0TmV4dFVpbnQzMigpXHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG9wZW5GaWxlKGJsb2I6IEJsb2IpIHtcclxuICAgIGNvbnN0IGhlYWRlckJsb2IgPSBzbGljZUJsb2IoYmxvYiwgMCwgWkxCSGVhZGVyLlNJWkUpXHJcbiAgICBjb25zdCBoZWFkZXJEdiA9IGF3YWl0IHJlYWRCbG9iQXN5bmMoaGVhZGVyQmxvYilcclxuXHJcbiAgICBjb25zdCBoZWFkZXIgPSBuZXcgWkxCSGVhZGVyKG5ldyBTdHJlYW1EYXRhVmlldyhoZWFkZXJEdikpXHJcbiAgICBjb25zb2xlLmxvZyhgSGVhZGVyOiAke2pzb25pZnkoaGVhZGVyKX1gKVxyXG5cclxuICAgIGlmIChoZWFkZXIubWFnaWMgIT0gc3RyaW5nVG9Gb3VyQ0MoJ1pMQlxcMCcpKSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoYEludmFsaWQgbWFnaWMgaWRlbnRpZmllcmApXHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IGZpbGVJbnB1dEVsID0gPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGUtaW5wdXQnKVxyXG5maWxlSW5wdXRFbC5vbmNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGZpbGVJbnB1dEVsLmZpbGVzKSB7XHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVJbnB1dEVsLmZpbGVzWzBdXHJcbiAgICAgICAgY29uc29sZS5sb2coYExvYWRpbmcgZmlsZSAke2ZpbGUubmFtZX0gLi4uYClcclxuICAgICAgICBvcGVuRmlsZShmaWxlKVxyXG4gICAgfVxyXG59IiwiXHJcbmV4cG9ydCBmdW5jdGlvbiBzbGljZUJsb2IoYmxvYjogQmxvYiwgc3RhcnQ6IG51bWJlciwgbGVuZ3RoPzogbnVtYmVyKTogQmxvYiB7XHJcbiAgICBpZiAobGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm4gYmxvYi5zbGljZShzdGFydCwgc3RhcnQgKyBsZW5ndGgpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGJsb2Iuc2xpY2Uoc3RhcnQpXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkQmxvYkFzeW5jKGJsb2I6IEJsb2IpOiBQcm9taXNlPERhdGFWaWV3PiB7XHJcbiAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHJlc29sdmUobmV3IERhdGFWaWV3KDxBcnJheUJ1ZmZlcj5yZWFkZXIucmVzdWx0KSlcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVhZGVyLm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHJlYWRlci5hYm9ydCgpXHJcbiAgICAgICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcclxuICAgIH0pXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTdHJlYW1EYXRhVmlldyB7XHJcbiAgICBkdjogRGF0YVZpZXdcclxuICAgIGN1cnNvcjogbnVtYmVyXHJcblxyXG4gICAgY29uc3RydWN0b3IoZHY6IERhdGFWaWV3KSB7XHJcbiAgICAgICAgdGhpcy5kdiA9IGR2XHJcbiAgICAgICAgdGhpcy5jdXJzb3IgPSAwXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q3Vyc29yKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY3Vyc29yXHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q3Vyc29yKGN1cnNvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5jdXJzb3IgPSBjdXJzb3JcclxuICAgIH1cclxuXHJcbiAgICBhZHZhbmNlQ3Vyc29yKG9mZnNldDogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5jdXJzb3IgKz0gb2Zmc2V0XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dERhdGFWaWV3KGJ5dGVMZW5ndGg6IG51bWJlcik6IERhdGFWaWV3IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBuZXcgRGF0YVZpZXcodGhpcy5kdi5idWZmZXIsIHRoaXMuZHYuYnl0ZU9mZnNldCArIHRoaXMuY3Vyc29yLCBieXRlTGVuZ3RoKVxyXG4gICAgICAgIHRoaXMuY3Vyc29yICs9IGJ5dGVMZW5ndGhcclxuICAgICAgICByZXR1cm4gcmVzdWx0XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dEFycmF5QnVmZmVyKGJ5dGVMZW5ndGg6IG51bWJlcik6IEFycmF5QnVmZmVyIHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmR2LmJ1ZmZlci5zbGljZSh0aGlzLmR2LmJ5dGVPZmZzZXQgKyB0aGlzLmN1cnNvciwgdGhpcy5kdi5ieXRlT2Zmc2V0ICsgdGhpcy5jdXJzb3IgKyBieXRlTGVuZ3RoKVxyXG4gICAgICAgIHRoaXMuY3Vyc29yICs9IGJ5dGVMZW5ndGhcclxuICAgICAgICByZXR1cm4gcmVzdWx0XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dFVpbnQ4QXJyYXkoYnl0ZUxlbmd0aDogbnVtYmVyKTogVWludDhBcnJheSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHRoaXMuZ2V0TmV4dEFycmF5QnVmZmVyKGJ5dGVMZW5ndGgpKVxyXG4gICAgfVxyXG5cclxuICAgIHBlZWtOZXh0SW50OCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmR2LmdldEludDgodGhpcy5jdXJzb3IpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dEludDgoKTogbnVtYmVyIHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnBlZWtOZXh0SW50OCgpXHJcbiAgICAgICAgdGhpcy5jdXJzb3IgKz0gMVxyXG4gICAgICAgIHJldHVybiByZXN1bHRcclxuICAgIH1cclxuXHJcbiAgICBwZWVrTmV4dFVpbnQ4KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZHYuZ2V0VWludDgodGhpcy5jdXJzb3IpXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dFVpbnQ4KCk6IG51bWJlciB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wZWVrTmV4dFVpbnQ4KClcclxuICAgICAgICB0aGlzLmN1cnNvciArPSAxXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdFxyXG4gICAgfVxyXG5cclxuICAgIHBlZWtOZXh0SW50MTYobGl0dGxlRW5kaWFuPzogYm9vbGVhbik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZHYuZ2V0SW50MTYodGhpcy5jdXJzb3IsIGxpdHRsZUVuZGlhbilcclxuICAgIH1cclxuXHJcbiAgICBnZXROZXh0SW50MTYobGl0dGxlRW5kaWFuPzogYm9vbGVhbik6IG51bWJlciB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wZWVrTmV4dEludDE2KGxpdHRsZUVuZGlhbilcclxuICAgICAgICB0aGlzLmN1cnNvciArPSAyXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdFxyXG4gICAgfVxyXG5cclxuICAgIHBlZWtOZXh0VWludDE2KGxpdHRsZUVuZGlhbj86IGJvb2xlYW4pOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmR2LmdldFVpbnQxNih0aGlzLmN1cnNvciwgbGl0dGxlRW5kaWFuKVxyXG4gICAgfVxyXG5cclxuICAgIGdldE5leHRVaW50MTYobGl0dGxlRW5kaWFuPzogYm9vbGVhbik6IG51bWJlciB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wZWVrTmV4dFVpbnQxNihsaXR0bGVFbmRpYW4pXHJcbiAgICAgICAgdGhpcy5jdXJzb3IgKz0gMlxyXG4gICAgICAgIHJldHVybiByZXN1bHRcclxuICAgIH1cclxuXHJcbiAgICBwZWVrTmV4dEludDMyKGxpdHRsZUVuZGlhbj86IGJvb2xlYW4pOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmR2LmdldEludDMyKHRoaXMuY3Vyc29yLCBsaXR0bGVFbmRpYW4pXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dEludDMyKGxpdHRsZUVuZGlhbj86IGJvb2xlYW4pOiBudW1iZXIge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucGVla05leHRJbnQzMihsaXR0bGVFbmRpYW4pXHJcbiAgICAgICAgdGhpcy5jdXJzb3IgKz0gNFxyXG4gICAgICAgIHJldHVybiByZXN1bHRcclxuICAgIH1cclxuXHJcbiAgICBwZWVrTmV4dFVpbnQzMihsaXR0bGVFbmRpYW4/OiBib29sZWFuKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kdi5nZXRVaW50MzIodGhpcy5jdXJzb3IsIGxpdHRsZUVuZGlhbilcclxuICAgIH1cclxuXHJcbiAgICBnZXROZXh0VWludDMyKGxpdHRsZUVuZGlhbj86IGJvb2xlYW4pOiBudW1iZXIge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucGVla05leHRVaW50MzIobGl0dGxlRW5kaWFuKVxyXG4gICAgICAgIHRoaXMuY3Vyc29yICs9IDRcclxuICAgICAgICByZXR1cm4gcmVzdWx0XHJcbiAgICB9XHJcblxyXG4gICAgcGVla05leHRVaW50NjQobGl0dGxlRW5kaWFuPzogYm9vbGVhbik6IGJpZ2ludCB7XHJcbiAgICAgICAgY29uc3QgbG8gPSB0aGlzLmR2LmdldFVpbnQzMih0aGlzLmN1cnNvciArIChsaXR0bGVFbmRpYW4gPyAwIDogNCkpXHJcbiAgICAgICAgY29uc3QgaGkgPSB0aGlzLmR2LmdldFVpbnQzMih0aGlzLmN1cnNvciArIChsaXR0bGVFbmRpYW4gPyA0IDogMCkpXHJcbiAgICAgICAgcmV0dXJuIChCaWdJbnQoaGkpIDw8IDMybikgfCBCaWdJbnQobG8pXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dFVpbnQ2NChsaXR0bGVFbmRpYW4/OiBib29sZWFuKTogYmlnaW50IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnBlZWtOZXh0VWludDY0KGxpdHRsZUVuZGlhbilcclxuICAgICAgICB0aGlzLmN1cnNvciArPSA4XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdFxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24ganNvbmlmeSh2YWx1ZTogYW55KTogc3RyaW5nIHtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSxcclxuICAgICAgICAoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZih2YWx1ZSkgPT0gJ2JpZ2ludCcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJ1xcdCcpXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb0ZvdXJDQyhzOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIChzLmNoYXJDb2RlQXQoMCkgPDwgMjQpIHwgKHMuY2hhckNvZGVBdCgxKSA8PCAxNikgfCAocy5jaGFyQ29kZUF0KDIpIDw8IDgpIHwgcy5jaGFyQ29kZUF0KDMpXHJcbn1cclxuIl0sInNvdXJjZVJvb3QiOiIifQ==