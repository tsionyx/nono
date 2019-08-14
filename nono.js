(function() {
    const __exports = {};
    let wasm;

    let WASM_VECTOR_LEN = 0;

    let cachedTextEncoder = new TextEncoder('utf-8');

    let cachegetUint8Memory = null;
    function getUint8Memory() {
        if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
            cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
        }
        return cachegetUint8Memory;
    }

    let passStringToWasm;
    if (typeof cachedTextEncoder.encodeInto === 'function') {
        passStringToWasm = function(arg) {


            let size = arg.length;
            let ptr = wasm.__wbindgen_malloc(size);
            let offset = 0;
            {
                const mem = getUint8Memory();
                for (; offset < arg.length; offset++) {
                    const code = arg.charCodeAt(offset);
                    if (code > 0x7F) break;
                    mem[ptr + offset] = code;
                }
            }

            if (offset !== arg.length) {
                arg = arg.slice(offset);
                ptr = wasm.__wbindgen_realloc(ptr, size, size = offset + arg.length * 3);
                const view = getUint8Memory().subarray(ptr + offset, ptr + size);
                const ret = cachedTextEncoder.encodeInto(arg, view);

                offset += ret.written;
            }
            WASM_VECTOR_LEN = offset;
            return ptr;
        };
    } else {
        passStringToWasm = function(arg) {


            let size = arg.length;
            let ptr = wasm.__wbindgen_malloc(size);
            let offset = 0;
            {
                const mem = getUint8Memory();
                for (; offset < arg.length; offset++) {
                    const code = arg.charCodeAt(offset);
                    if (code > 0x7F) break;
                    mem[ptr + offset] = code;
                }
            }

            if (offset !== arg.length) {
                const buf = cachedTextEncoder.encode(arg.slice(offset));
                ptr = wasm.__wbindgen_realloc(ptr, size, size = offset + buf.length);
                getUint8Memory().set(buf, ptr + offset);
                offset += buf.length;
            }
            WASM_VECTOR_LEN = offset;
            return ptr;
        };
    }
    /**
    * @param {number} source
    * @param {number} id
    * @param {string} content
    */
    __exports.board_with_content = function(source, id, content) {
        wasm.board_with_content(source, id, passStringToWasm(content), WASM_VECTOR_LEN);
    };

    /**
    * @param {number} source
    * @param {number} id
    * @param {number} max_solutions
    */
    __exports.solve = function(source, id, max_solutions) {
        wasm.solve(source, id, max_solutions);
    };

    /**
    * @returns {number}
    */
    __exports.white_color_code = function() {
        const ret = wasm.white_color_code();
        return ret;
    };

    let cachegetInt32Memory = null;
    function getInt32Memory() {
        if (cachegetInt32Memory === null || cachegetInt32Memory.buffer !== wasm.memory.buffer) {
            cachegetInt32Memory = new Int32Array(wasm.memory.buffer);
        }
        return cachegetInt32Memory;
    }

    let cachegetUint16Memory = null;
    function getUint16Memory() {
        if (cachegetUint16Memory === null || cachegetUint16Memory.buffer !== wasm.memory.buffer) {
            cachegetUint16Memory = new Uint16Array(wasm.memory.buffer);
        }
        return cachegetUint16Memory;
    }

    function getArrayU16FromWasm(ptr, len) {
        return getUint16Memory().subarray(ptr / 2, ptr / 2 + len);
    }

    let cachegetUint32Memory = null;
    function getUint32Memory() {
        if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
            cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
        }
        return cachegetUint32Memory;
    }

    function getArrayU32FromWasm(ptr, len) {
        return getUint32Memory().subarray(ptr / 4, ptr / 4 + len);
    }

    function getArrayI32FromWasm(ptr, len) {
        return getInt32Memory().subarray(ptr / 4, ptr / 4 + len);
    }

    const heap = new Array(32);

    heap.fill(undefined);

    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        heap[idx] = obj;
        return idx;
    }

function getObject(idx) { return heap[idx]; }

let cachedTextDecoder = new TextDecoder('utf-8');

function getStringFromWasm(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}
/**
*/
__exports.Source = Object.freeze({ WebPbnCom:0,NonogramsOrg:1, });
/**
*/
class WasmRenderer {

    static __wrap(ptr) {
        const obj = Object.create(WasmRenderer.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_wasmrenderer_free(ptr);
    }
    /**
    * @param {number} source
    * @param {number} id
    * @returns {WasmRenderer}
    */
    static from_board(source, id) {
        const ret = wasm.wasmrenderer_from_board(source, id);
        return WasmRenderer.__wrap(ret);
    }
    /**
    * @returns {number}
    */
    rows_number() {
        const ret = wasm.wasmrenderer_rows_number(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    cols_number() {
        const ret = wasm.wasmrenderer_cols_number(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    full_height() {
        const ret = wasm.wasmrenderer_full_height(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    full_width() {
        const ret = wasm.wasmrenderer_full_width(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} i
    * @returns {Uint16Array}
    */
    get_row(i) {
        const retptr = 8;
        const ret = wasm.wasmrenderer_get_row(retptr, this.ptr, i);
        const memi32 = getInt32Memory();
        const v0 = getArrayU16FromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 2);
        return v0;
    }
    /**
    * @param {number} i
    * @returns {Uint16Array}
    */
    get_column(i) {
        const retptr = 8;
        const ret = wasm.wasmrenderer_get_column(retptr, this.ptr, i);
        const memi32 = getInt32Memory();
        const v0 = getArrayU16FromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 2);
        return v0;
    }
    /**
    * @param {number} i
    * @returns {Uint32Array}
    */
    get_row_colors(i) {
        const retptr = 8;
        const ret = wasm.wasmrenderer_get_row_colors(retptr, this.ptr, i);
        const memi32 = getInt32Memory();
        const v0 = getArrayU32FromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 4);
        return v0;
    }
    /**
    * @param {number} i
    * @returns {Uint32Array}
    */
    get_column_colors(i) {
        const retptr = 8;
        const ret = wasm.wasmrenderer_get_column_colors(retptr, this.ptr, i);
        const memi32 = getInt32Memory();
        const v0 = getArrayU32FromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 4);
        return v0;
    }
    /**
    * @returns {Int32Array}
    */
    cells_as_colors() {
        const retptr = 8;
        const ret = wasm.wasmrenderer_cells_as_colors(retptr, this.ptr);
        const memi32 = getInt32Memory();
        const v0 = getArrayI32FromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 4);
        return v0;
    }
}
__exports.WasmRenderer = WasmRenderer;

function init(module) {

    let result;
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_new_59cb74e423758ede = function() {
        const ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_558ba5917b466edd = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ret0 = passStringToWasm(ret);
        const ret1 = WASM_VECTOR_LEN;
        getInt32Memory()[arg0 / 4 + 0] = ret0;
        getInt32Memory()[arg0 / 4 + 1] = ret1;
    };
    imports.wbg.__wbg_error_4bb6c2a97407129a = function(arg0, arg1) {
        const v0 = getStringFromWasm(arg0, arg1).slice();
        wasm.__wbindgen_free(arg0, arg1 * 1);
        console.error(v0);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm(arg0, arg1));
    };

    if (module instanceof URL || typeof module === 'string' || module instanceof Request) {

        const response = fetch(module);
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            result = WebAssembly.instantiateStreaming(response, imports)
            .catch(e => {
                console.warn("`WebAssembly.instantiateStreaming` failed. Assuming this is because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                return response
                .then(r => r.arrayBuffer())
                .then(bytes => WebAssembly.instantiate(bytes, imports));
            });
        } else {
            result = response
            .then(r => r.arrayBuffer())
            .then(bytes => WebAssembly.instantiate(bytes, imports));
        }
    } else {

        result = WebAssembly.instantiate(module, imports)
        .then(result => {
            if (result instanceof WebAssembly.Instance) {
                return { instance: result, module };
            } else {
                return result;
            }
        });
    }
    return result.then(({instance, module}) => {
        wasm = instance.exports;
        init.__wbindgen_wasm_module = module;

        return wasm;
    });
}

self.wasm_bindgen = Object.assign(init, __exports);

})();
