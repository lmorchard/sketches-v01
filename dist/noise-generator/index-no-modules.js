let wasm_bindgen;
(function() {
    const __exports = {};
    let wasm;

    const heap = new Array(32).fill(undefined);

    heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

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

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

const u32CvtShim = new Uint32Array(2);

const int64CvtShim = new BigInt64Array(u32CvtShim.buffer);

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}
/**
*/
class ContourMap {

    static __wrap(ptr) {
        const obj = Object.create(ContourMap.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_contourmap_free(ptr);
    }
    /**
    * @returns {ContourMap}
    */
    static new() {
        var ret = wasm.contourmap_new();
        return ContourMap.__wrap(ret);
    }
    /**
    * @returns {number}
    */
    result_noise_ptr() {
        var ret = wasm.contourmap_result_noise_ptr(this.ptr);
        return ret;
    }
    /**
    * @returns {number}
    */
    result_contour_ptr() {
        var ret = wasm.contourmap_result_contour_ptr(this.ptr);
        return ret;
    }
    /**
    * @returns {number}
    */
    width() {
        var ret = wasm.contourmap_width(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    height() {
        var ret = wasm.contourmap_height(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    isoval_count() {
        var ret = wasm.contourmap_isoval_count(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    isoval_step_size() {
        var ret = wasm.contourmap_isoval_step_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} scale
    * @param {number} z
    * @param {number} start_x
    * @param {number} step_x
    * @param {number} end_x
    * @param {number} start_y
    * @param {number} step_y
    * @param {number} end_y
    */
    update(scale, z, start_x, step_x, end_x, start_y, step_y, end_y) {
        wasm.contourmap_update(this.ptr, scale, z, start_x, step_x, end_x, start_y, step_y, end_y);
    }
}
__exports.ContourMap = ContourMap;
/**
*/
class SimplexNoiseGrid {

    static __wrap(ptr) {
        const obj = Object.create(SimplexNoiseGrid.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_simplexnoisegrid_free(ptr);
    }
    /**
    * @param {BigInt | undefined} custom_seed
    * @returns {SimplexNoiseGrid}
    */
    static new(custom_seed) {
        int64CvtShim[0] = isLikeNone(custom_seed) ? BigInt(0) : custom_seed;
        const low0 = u32CvtShim[0];
        const high0 = u32CvtShim[1];
        var ret = wasm.simplexnoisegrid_new(!isLikeNone(custom_seed), low0, high0);
        return SimplexNoiseGrid.__wrap(ret);
    }
    /**
    * @returns {number}
    */
    width() {
        var ret = wasm.simplexnoisegrid_width(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    height() {
        var ret = wasm.simplexnoisegrid_height(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    count() {
        var ret = wasm.simplexnoisegrid_count(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    cells_ptr() {
        var ret = wasm.simplexnoisegrid_cells_ptr(this.ptr);
        return ret;
    }
    /**
    * @param {number} x
    * @param {number} y
    * @returns {number}
    */
    generate(x, y) {
        var ret = wasm.simplexnoisegrid_generate(this.ptr, x, y);
        return ret;
    }
    /**
    * @param {number} x
    * @param {number} y
    * @param {number} z
    * @returns {number}
    */
    generate_3d(x, y, z) {
        var ret = wasm.simplexnoisegrid_generate_3d(this.ptr, x, y, z);
        return ret;
    }
    /**
    * @param {number} x
    * @param {number} y
    * @param {number} z
    * @param {number} w
    * @returns {number}
    */
    generate_4d(x, y, z, w) {
        var ret = wasm.simplexnoisegrid_generate_4d(this.ptr, x, y, z, w);
        return ret;
    }
    /**
    * @param {number} scale
    * @param {number} z
    * @param {number} start_x
    * @param {number} step_x
    * @param {number} end_x
    * @param {number} start_y
    * @param {number} step_y
    * @param {number} end_y
    */
    update(scale, z, start_x, step_x, end_x, start_y, step_y, end_y) {
        wasm.simplexnoisegrid_update(this.ptr, scale, z, start_x, step_x, end_x, start_y, step_y, end_y);
    }
}
__exports.SimplexNoiseGrid = SimplexNoiseGrid;

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

async function init(input) {
    if (typeof input === 'undefined') {
        let src;
        if (typeof document === 'undefined') {
            src = location.href;
        } else {
            src = document.currentScript.src;
        }
        input = src.replace(/\.js$/, '_bg.wasm');
    }
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_new_693216e109162396 = function() {
        var ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_0ddaca5d1abfb52f = function(arg0, arg1) {
        var ret = getObject(arg1).stack;
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_error_09919627ac0992f5 = function(arg0, arg1) {
        try {
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }



    const { instance, module } = await load(await input, imports);

    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;

    return wasm;
}

wasm_bindgen = Object.assign(init, __exports);

})();
