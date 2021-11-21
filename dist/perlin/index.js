import * as __SNOWPACK_ENV__ from '../../vendor/env.js';
import.meta.env = __SNOWPACK_ENV__;


let wasm;

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
/**
* Ripped straight off of Rosetta Code for a Rustlang interpretation of Perlin Noise
* https://rosettacode.org/wiki/Perlin_noise#Rust
* I don't have the foggiest idea of how this works.
* @param {number} x
* @param {number} y
* @param {number} z
* @returns {number}
*/
export function noise(x, y, z) {
    var ret = wasm.noise(x, y, z);
    return ret;
}

/**
*/
export class NoiseGrid {

    static __wrap(ptr) {
        const obj = Object.create(NoiseGrid.prototype);
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
        wasm.__wbg_noisegrid_free(ptr);
    }
    /**
    * @param {number} width
    * @param {number} height
    * @returns {NoiseGrid}
    */
    static new(width, height) {
        var ret = wasm.noisegrid_new(width, height);
        return NoiseGrid.__wrap(ret);
    }
    /**
    * @param {number} start_x
    * @param {number} start_y
    * @param {number} z
    * @param {number} factor
    */
    update(start_x, start_y, z, factor) {
        wasm.noisegrid_update(this.ptr, start_x, start_y, z, factor);
    }
    /**
    * @returns {number}
    */
    width() {
        var ret = wasm.noisegrid_width(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    height() {
        var ret = wasm.noisegrid_height(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    cells() {
        var ret = wasm.noisegrid_cells(this.ptr);
        return ret;
    }
}

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
        input = new URL('index_bg.wasm', import.meta.url);
    }
    const imports = {};
    imports.wbg = {};
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

export default init;

