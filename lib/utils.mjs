/*
 * Author: A.G.
 *   Date: 2021/11/06
 */

export function sliceCallbackWithTimeout(args, guardedCount = 0, slicingFromBeginning = false, allowNullCallback = false) { // TODO: allowNullCallback
    let ret = { };
    let sliceCount = 0;

    if (!Array.isArray(args)) { // IArguments -> []
        args = Array.from(args);
    }

    if (guardedCount > 0) { // Cut guarded items at beginning.
        ret.args = args.splice(0, guardedCount); // Pass to returned object.
    } else {
        ret.args = [];
    }

    if (slicingFromBeginning) {
        let i;
        for ( i = 0; i < args.length; i++ ) { // Scan for argument of type function.
            if (typeof args[i] === "function") {
                ret.callback = args[i];
                if (typeof args[i + 1] === "number") {
                    ret.timeout = Math.trunc(args[i + 1]);
                    sliceCount = 2;
                } else {
                    sliceCount = 1;
                }
                break;
            }
        }
        ret.args.push(...args.splice(0, i));
        ret.vargs = args.slice(sliceCount);
    } else {
        sliceCount = -args.length; // By default, slice all presented args.
        if (args.length >= 2) {
            if (typeof args[args.length - 1] === "function") {
                ret.callback = args[args.length - 1];
                sliceCount = 1;
            } else if (typeof args[args.length - 1] === "number" && typeof args[args.length - 2] === "function") {
                ret.callback = args[args.length - 2];
                ret.timeout = Math.trunc(args[args.length - 1]);
                sliceCount = 2;
            }
        } else if (args.length >= 1) {
            if (typeof args[args.length - 1] === "function") {
                ret.callback = args[args.length - 1];
                sliceCount = 1;
            }
        }
        ret.args.push(...args.slice(0, -sliceCount));
        ret.vargs = [];
    }

    return ret;
}
