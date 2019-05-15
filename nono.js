(function() {
    const __exports = {};
    let wasm;

    /**
    * @returns {number}
    */
    __exports.white_color_code = function() {
        return wasm.white_color_code();
    };

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

    let cachedGlobalArgumentPtr = null;
    function globalArgumentPtr() {
        if (cachedGlobalArgumentPtr === null) {
            cachedGlobalArgumentPtr = wasm.__wbindgen_global_argument_ptr();
        }
        return cachedGlobalArgumentPtr;
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

    let cachegetInt32Memory = null;
    function getInt32Memory() {
        if (cachegetInt32Memory === null || cachegetInt32Memory.buffer !== wasm.memory.buffer) {
            cachegetInt32Memory = new Int32Array(wasm.memory.buffer);
        }
        return cachegetInt32Memory;
    }

    function getArrayI32FromWasm(ptr, len) {
        return getInt32Memory().subarray(ptr / 4, ptr / 4 + len);
    }

    let cachedTextEncoder = new TextEncoder('utf-8');

    let cachegetUint8Memory = null;
    function getUint8Memory() {
        if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
            cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
        }
        return cachegetUint8Memory;
    }

    let WASM_VECTOR_LEN = 0;

    let passStringToWasm;
    if (typeof cachedTextEncoder.encodeInto === 'function') {
        passStringToWasm = function(arg) {

            let size = arg.length;
            let ptr = wasm.__wbindgen_malloc(size);
            let writeOffset = 0;
            while (true) {
                const view = getUint8Memory().subarray(ptr + writeOffset, ptr + size);
                const { read, written } = cachedTextEncoder.encodeInto(arg, view);
                arg = arg.substring(read);
                writeOffset += written;
                if (arg.length === 0) {
                    break;
                }
                ptr = wasm.__wbindgen_realloc(ptr, size, size * 2);
                size *= 2;
            }
            WASM_VECTOR_LEN = writeOffset;
            return ptr;
        };
    } else {
        passStringToWasm = function(arg) {

            const buf = cachedTextEncoder.encode(arg);
            const ptr = wasm.__wbindgen_malloc(buf.length);
            getUint8Memory().set(buf, ptr);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        };
    }

    let cachedTextDecoder = new TextDecoder('utf-8');

    function getStringFromWasm(ptr, len) {
        return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
    }
    /**
    * @param {number} id
    * @param {string} content
    * @returns {string}
    */
    __exports.webpbn_board = function(id, content) {
        const ptr1 = passStringToWasm(content);
        const len1 = WASM_VECTOR_LEN;
        const retptr = globalArgumentPtr();
        wasm.webpbn_board(retptr, id, ptr1, len1);
        const mem = getUint32Memory();
        const rustptr = mem[retptr / 4];
        const rustlen = mem[retptr / 4 + 1];

        const realRet = getStringFromWasm(rustptr, rustlen).slice();
        wasm.__wbindgen_free(rustptr, rustlen * 1);
        return realRet;

    };

    /**
    * @param {number} id
    * @returns {string}
    */
    __exports.solve = function(id) {
        const retptr = globalArgumentPtr();
        wasm.solve(retptr, id);
        const mem = getUint32Memory();
        const rustptr = mem[retptr / 4];
        const rustlen = mem[retptr / 4 + 1];

        const realRet = getStringFromWasm(rustptr, rustlen).slice();
        wasm.__wbindgen_free(rustptr, rustlen * 1);
        return realRet;

    };

    __exports.__wbindgen_throw = function(ptr, len) {
        throw new Error(getStringFromWasm(ptr, len));
    };

    function freeWasmRenderer(ptr) {

        wasm.__wbg_wasmrenderer_free(ptr);
    }
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
            freeWasmRenderer(ptr);
        }

        /**
        * @returns {number}
        */
        rows_number() {
            return wasm.wasmrenderer_rows_number(this.ptr);
        }
        /**
        * @returns {number}
        */
        cols_number() {
            return wasm.wasmrenderer_cols_number(this.ptr);
        }
        /**
        * @returns {number}
        */
        full_height() {
            return wasm.wasmrenderer_full_height(this.ptr);
        }
        /**
        * @returns {number}
        */
        full_width() {
            return wasm.wasmrenderer_full_width(this.ptr);
        }
        /**
        * @param {number} i
        * @returns {Uint16Array}
        */
        get_row(i) {
            const retptr = globalArgumentPtr();
            wasm.wasmrenderer_get_row(retptr, this.ptr, i);
            const mem = getUint32Memory();
            const rustptr = mem[retptr / 4];
            const rustlen = mem[retptr / 4 + 1];

            const realRet = getArrayU16FromWasm(rustptr, rustlen).slice();
            wasm.__wbindgen_free(rustptr, rustlen * 2);
            return realRet;

        }
        /**
        * @param {number} i
        * @returns {Uint16Array}
        */
        get_column(i) {
            const retptr = globalArgumentPtr();
            wasm.wasmrenderer_get_column(retptr, this.ptr, i);
            const mem = getUint32Memory();
            const rustptr = mem[retptr / 4];
            const rustlen = mem[retptr / 4 + 1];

            const realRet = getArrayU16FromWasm(rustptr, rustlen).slice();
            wasm.__wbindgen_free(rustptr, rustlen * 2);
            return realRet;

        }
        /**
        * @param {number} i
        * @returns {Uint32Array}
        */
        get_row_colors(i) {
            const retptr = globalArgumentPtr();
            wasm.wasmrenderer_get_row_colors(retptr, this.ptr, i);
            const mem = getUint32Memory();
            const rustptr = mem[retptr / 4];
            const rustlen = mem[retptr / 4 + 1];

            const realRet = getArrayU32FromWasm(rustptr, rustlen).slice();
            wasm.__wbindgen_free(rustptr, rustlen * 4);
            return realRet;

        }
        /**
        * @param {number} i
        * @returns {Uint32Array}
        */
        get_column_colors(i) {
            const retptr = globalArgumentPtr();
            wasm.wasmrenderer_get_column_colors(retptr, this.ptr, i);
            const mem = getUint32Memory();
            const rustptr = mem[retptr / 4];
            const rustlen = mem[retptr / 4 + 1];

            const realRet = getArrayU32FromWasm(rustptr, rustlen).slice();
            wasm.__wbindgen_free(rustptr, rustlen * 4);
            return realRet;

        }
        /**
        * @returns {Int32Array}
        */
        cells_as_colors() {
            const retptr = globalArgumentPtr();
            wasm.wasmrenderer_cells_as_colors(retptr, this.ptr);
            const mem = getUint32Memory();
            const rustptr = mem[retptr / 4];
            const rustlen = mem[retptr / 4 + 1];

            const realRet = getArrayI32FromWasm(rustptr, rustlen).slice();
            wasm.__wbindgen_free(rustptr, rustlen * 4);
            return realRet;

        }
        /**
        * @param {number} id
        * @returns {WasmRenderer}
        */
        static from_board(id) {
            return WasmRenderer.__wrap(wasm.wasmrenderer_from_board(id));
        }
    }
    __exports.WasmRenderer = WasmRenderer;

    const heap = new Array(32);

    heap.fill(undefined);

    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function dropObject(idx) {
        if (idx < 36) return;
        heap[idx] = heap_next;
        heap_next = idx;
    }

    __exports.__wbindgen_object_drop_ref = function(i) { dropObject(i); };

    function init(module_or_path, maybe_memory) {
        let result;
        const imports = { './nono': __exports };
        if (module_or_path instanceof URL || typeof module_or_path === 'string' || module_or_path instanceof Request) {

            const response = fetch(module_or_path);
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

            result = WebAssembly.instantiate(module_or_path, imports)
            .then(instance => {
                return { instance, module: module_or_path };
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
