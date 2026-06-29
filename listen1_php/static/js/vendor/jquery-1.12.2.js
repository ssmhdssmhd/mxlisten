/*!
 * jQuery JavaScript Library v1.12.2
 * Simplified version for Listen 1 PHP
 */
(function(global, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory(global, true);
    } else {
        factory(global);
    }
}(typeof window !== "undefined" ? window : this, function(window, noGlobal) {
    var jQuery = function(selector, context) {
        return new jQuery.fn.init(selector, context);
    };

    jQuery.fn = jQuery.prototype = {
        jquery: '1.12.2',
        constructor: jQuery,
        length: 0,
        toArray: function() { return [].slice.call(this); },
        get: function(num) { return num != null ? (num < 0 ? this[num + this.length] : this[num]) : [].slice.call(this); },
        pushStack: function(elems) { var ret = jQuery.merge(this.constructor(), elems); ret.prevObject = this; return ret; },
        each: function(callback) { return jQuery.each(this, callback); },
        map: function(callback) { return this.pushStack(jQuery.map(this, function(elem, i) { return callback.call(elem, i, elem); })); },
        slice: function() { return this.pushStack([].slice.apply(this, arguments)); },
        first: function() { return this.eq(0); },
        last: function() { return this.eq(-1); },
        eq: function(i) { var len = this.length, j = +i + (i < 0 ? len : 0); return this.pushStack(j >= 0 && j < len ? [this[j]] : []); },
        end: function() { return this.prevObject || this.constructor(); },
        push: [].push,
        sort: [].sort,
        splice: [].splice
    };

    var init = jQuery.fn.init = function(selector, context) {
        if (typeof selector === "string") {
            if (selector[0] === "<" && selector[selector.length - 1] === ">" && selector.length >= 3) {
                var match = [null, selector, null];
            } else {
                match = document.querySelectorAll(selector);
            }
            return jQuery.merge(this, match);
        } else if (typeof selector === "function") {
            return typeof ready !== "undefined" ? ready(selector) : selector(jQuery);
        } else if (selector.nodeType) {
            this[0] = selector;
            this.length = 1;
            return this;
        } else if (typeof selector === "object") {
            this[0] = selector;
            this.length = 1;
            return this;
        }
    };

    init.prototype = jQuery.fn;

    jQuery.extend = jQuery.fn.extend = function() {
        var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;
        if (typeof target === "boolean") { deep = target; target = arguments[i] || {}; i++; }
        if (typeof target !== "object" && typeof target !== "function") { target = {}; }
        if (i === length) { target = this; i--; }
        for (; i < length; i++) {
            if ((options = arguments[i]) != null) {
                for (name in options) {
                    copy = options[name];
                    if (target !== copy) { target[name] = copy; }
                }
            }
        }
        return target;
    };

    jQuery.extend({
        isFunction: function(obj) { return typeof obj === "function"; },
        isArray: Array.isArray,
        isWindow: function(obj) { return obj != null && obj === obj.window; },
        param: function(a) {
            var s = [];
            function add(key, value) { s[s.length] = encodeURIComponent(key) + '=' + encodeURIComponent(value); }
            if (jQuery.isArray(a) || (a.jquery && !jQuery.isPlainObject(a))) {
                jQuery.each(a, function() { add(this.name, this.value); });
            } else {
                for (var name in a) { jQuery.isFunction(a[name]) ? add(name, a[name]()) : add(name, a[name]); }
            }
            return s.join("&");
        },
        each: function(obj, callback) {
            var i = 0;
            if (obj.length === +obj.length) {
                for (; i < obj.length; i++) { if (callback.call(obj[i], i, obj[i]) === false) break; }
            } else {
                for (i in obj) { if (callback.call(obj[i], i, obj[i]) === false) break; }
            }
            return obj;
        },
        merge: function(first, second) {
            var len = +second.length, j = 0, i = first.length;
            for (; j < len; j++) { first[i++] = second[j]; }
            first.length = i;
            return first;
        }
    });

    window.jQuery = window.$ = jQuery;
    return jQuery;
}));
