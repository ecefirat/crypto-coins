
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/nav.svelte generated by Svelte v3.38.2 */

    const file$1 = "src/nav.svelte";

    function create_fragment$1(ctx) {
    	let nav;
    	let a0;
    	let t1;
    	let a1;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			a0 = element("a");
    			a0.textContent = "Home";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "About";
    			attr_dev(a0, "class", "m-4 text-lg");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$1, 1, 1, 56);
    			attr_dev(a1, "class", "m-4 text-lg");
    			attr_dev(a1, "href", "/about");
    			add_location(a1, file$1, 2, 1, 98);
    			attr_dev(nav, "class", "text-gray-100 flex justify-center w-full");
    			add_location(nav, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, a0);
    			append_dev(nav, t1);
    			append_dev(nav, a1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Nav", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.2 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (69:1) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*coin*/ ctx[6].price_change_percentage_24h.toFixed(2) + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("%");
    			t1 = text(t1_value);
    			attr_dev(p, "class", "text-red-500");
    			add_location(p, file, 69, 1, 2145);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchResult*/ 2 && t1_value !== (t1_value = /*coin*/ ctx[6].price_change_percentage_24h.toFixed(2) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(69:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (67:1) {#if coin.price_change_percentage_24h > 0}
    function create_if_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*coin*/ ctx[6].price_change_percentage_24h.toFixed(2) + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("%");
    			t1 = text(t1_value);
    			attr_dev(p, "class", "text-green-500");
    			add_location(p, file, 67, 1, 2058);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchResult*/ 2 && t1_value !== (t1_value = /*coin*/ ctx[6].price_change_percentage_24h.toFixed(2) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(67:1) {#if coin.price_change_percentage_24h > 0}",
    		ctx
    	});

    	return block;
    }

    // (58:1) {#each searchResult as coin}
    function create_each_block(ctx) {
    	let div;
    	let p0;
    	let t0_value = /*coin*/ ctx[6].market_cap_rank + "";
    	let t0;
    	let t1;
    	let t2;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t3;
    	let p1;
    	let t4_value = /*coin*/ ctx[6].name + "";
    	let t4;
    	let t5;
    	let p2;
    	let t6;
    	let t7_value = /*coin*/ ctx[6].current_price.toFixed(2) + "";
    	let t7;
    	let t8;
    	let t9;
    	let p3;
    	let t10_value = /*getNumber*/ ctx[3](/*coin*/ ctx[6].market_cap) + "";
    	let t10;
    	let t11;
    	let div_href_value;

    	function select_block_type(ctx, dirty) {
    		if (/*coin*/ ctx[6].price_change_percentage_24h > 0) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = text(".");
    			t2 = space();
    			img = element("img");
    			t3 = space();
    			p1 = element("p");
    			t4 = text(t4_value);
    			t5 = space();
    			p2 = element("p");
    			t6 = text("$ ");
    			t7 = text(t7_value);
    			t8 = space();
    			if_block.c();
    			t9 = space();
    			p3 = element("p");
    			t10 = text(t10_value);
    			t11 = space();
    			attr_dev(p0, "class", "mb-2");
    			add_location(p0, file, 62, 0, 1832);
    			attr_dev(img, "class", "w-16 h-16");
    			if (img.src !== (img_src_value = /*coin*/ ctx[6].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*coin*/ ctx[6].name);
    			add_location(img, file, 63, 0, 1876);
    			attr_dev(p1, "class", "text-lg");
    			add_location(p1, file, 64, 1, 1936);
    			add_location(p2, file, 65, 1, 1972);
    			attr_dev(p3, "class", "font-semibold");
    			add_location(p3, file, 71, 0, 2226);
    			attr_dev(div, "class", "p-4 bg-red-200 text-gray-800 text-center rounded-md shadow-sm hover:shadow-md flex flex-col items-center");
    			attr_dev(div, "href", div_href_value = "/coin/$" + /*coin*/ ctx[6].id);
    			add_location(div, file, 58, 1, 1685);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(div, t2);
    			append_dev(div, img);
    			append_dev(div, t3);
    			append_dev(div, p1);
    			append_dev(p1, t4);
    			append_dev(div, t5);
    			append_dev(div, p2);
    			append_dev(p2, t6);
    			append_dev(p2, t7);
    			append_dev(div, t8);
    			if_block.m(div, null);
    			append_dev(div, t9);
    			append_dev(div, p3);
    			append_dev(p3, t10);
    			append_dev(div, t11);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchResult*/ 2 && t0_value !== (t0_value = /*coin*/ ctx[6].market_cap_rank + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*searchResult*/ 2 && img.src !== (img_src_value = /*coin*/ ctx[6].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*searchResult*/ 2 && img_alt_value !== (img_alt_value = /*coin*/ ctx[6].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*searchResult*/ 2 && t4_value !== (t4_value = /*coin*/ ctx[6].name + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*searchResult*/ 2 && t7_value !== (t7_value = /*coin*/ ctx[6].current_price.toFixed(2) + "")) set_data_dev(t7, t7_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, t9);
    				}
    			}

    			if (dirty & /*searchResult*/ 2 && t10_value !== (t10_value = /*getNumber*/ ctx[3](/*coin*/ ctx[6].market_cap) + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*searchResult*/ 2 && div_href_value !== (div_href_value = "/coin/$" + /*coin*/ ctx[6].id)) {
    				attr_dev(div, "href", div_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(58:1) {#each searchResult as coin}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let main;
    	let h1;
    	let t2;
    	let p;
    	let t4;
    	let h3;
    	let t6;
    	let input;
    	let t7;
    	let div;
    	let mounted;
    	let dispose;
    	let each_value = /*searchResult*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "crypto-coins";
    			t2 = space();
    			p = element("p");
    			p.textContent = "for the highest 20 cryptocurrency";
    			t4 = space();
    			h3 = element("h3");
    			h3.textContent = "Market Cap Rank, Current Price, 24 Hour % Change and Market Cap Information";
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			document.title = "Crypto Coins";
    			attr_dev(h1, "class", "text-gray-100 font-semibold md:text-4xl sm:text-xl text-center mt-8 uppercase");
    			add_location(h1, file, 43, 1, 1039);
    			attr_dev(p, "class", "text-gray-300 md:text-sm sm:text-xs italic text-center");
    			add_location(p, file, 44, 1, 1148);
    			attr_dev(h3, "class", "text-gray-200 md:text-2xl sm:text-sm text-center italic my-6");
    			add_location(h3, file, 45, 1, 1253);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "w-full rounded-md text-lg p-4 border-2 border-gray-200 my-4");
    			attr_dev(input, "placeholder", "Search a currency...");
    			add_location(input, file, 47, 0, 1408);
    			attr_dev(div, "class", "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4");
    			add_location(div, file, 56, 0, 1584);
    			attr_dev(main, "class", "p-8 max-w-7xl mx-auto bg-gray-600 font-mono");
    			add_location(main, file, 41, 0, 961);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t2);
    			append_dev(main, p);
    			append_dev(main, t4);
    			append_dev(main, h3);
    			append_dev(main, t6);
    			append_dev(main, input);
    			set_input_value(input, /*search*/ ctx[0]);
    			append_dev(main, t7);
    			append_dev(main, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    					listen_dev(input, "input", /*handleSearch*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*search*/ 1 && input.value !== /*search*/ ctx[0]) {
    				set_input_value(input, /*search*/ ctx[0]);
    			}

    			if (dirty & /*searchResult, getNumber*/ 10) {
    				each_value = /*searchResult*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let coins = [];
    	let search = "";
    	let searchResult = [];

    	onMount(async () => {
    		const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=aud&order=market_cap_desc&per_page=20&page=1&sparkline=false`);
    		coins = await response.json();
    		$$invalidate(1, searchResult = coins);
    	});

    	const handleSearch = () => {
    		if (search) {
    			$$invalidate(1, searchResult = coins.filter(coin => coin.name.toLowerCase().includes(search.toLowerCase())));
    		} else {
    			$$invalidate(1, searchResult = [...coins]);
    		}
    	};

    	const getNumber = function (num) {
    		var units = ["M", "B", "T", "Q"];
    		var unit = Math.floor((num / 10).toFixed(0).toString().length);
    		var r = unit % 3;
    		var x = Math.abs(Number(num)) / Number("1.0e+" + (unit - r)).toFixed(0);
    		const mc = x.toFixed(0) + " " + units[Math.floor(unit / 3) - 2];
    		return mc;
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		search = this.value;
    		$$invalidate(0, search);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Nav,
    		coins,
    		search,
    		searchResult,
    		handleSearch,
    		getNumber
    	});

    	$$self.$inject_state = $$props => {
    		if ("coins" in $$props) coins = $$props.coins;
    		if ("search" in $$props) $$invalidate(0, search = $$props.search);
    		if ("searchResult" in $$props) $$invalidate(1, searchResult = $$props.searchResult);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [search, searchResult, handleSearch, getNumber, input_input_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
