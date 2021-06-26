
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
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
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

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (48:1) {#each coins as coin}
    function create_each_block(ctx) {
    	let a;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let h2;
    	let t1_value = /*coin*/ ctx[4].name + "";
    	let t1;
    	let t2;
    	let p;
    	let t3;
    	let t4_value = /*coin*/ ctx[4].current_price + "";
    	let t4;
    	let t5;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			h2 = element("h2");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = text("$ ");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(img, "width", "50");
    			if (img.src !== (img_src_value = /*coin*/ ctx[4].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*coin*/ ctx[4].name);
    			add_location(img, file, 52, 1, 1200);
    			add_location(h2, file, 53, 1, 1253);
    			add_location(p, file, 54, 1, 1275);
    			attr_dev(a, "class", "p-6 bg-red-200 text-gray-800 text-center rounded-md shadow-sm hover:shadow-md flex flex-col items-center");
    			attr_dev(a, "href", a_href_value = "/coin/$" + /*coin*/ ctx[4].id);
    			add_location(a, file, 48, 1, 1055);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, img);
    			append_dev(a, t0);
    			append_dev(a, h2);
    			append_dev(h2, t1);
    			append_dev(a, t2);
    			append_dev(a, p);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(a, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*coins*/ 1 && img.src !== (img_src_value = /*coin*/ ctx[4].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*coins*/ 1 && img_alt_value !== (img_alt_value = /*coin*/ ctx[4].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*coins*/ 1 && t1_value !== (t1_value = /*coin*/ ctx[4].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*coins*/ 1 && t4_value !== (t4_value = /*coin*/ ctx[4].current_price + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*coins*/ 1 && a_href_value !== (a_href_value = "/coin/$" + /*coin*/ ctx[4].id)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(48:1) {#each coins as coin}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let main;
    	let nav;
    	let t1;
    	let h1;
    	let t3;
    	let input;
    	let t4;
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	nav = new Nav({ $$inline: true });
    	let each_value = /*coins*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");
    			create_component(nav.$$.fragment);
    			t1 = space();
    			h1 = element("h1");
    			h1.textContent = "Crypto-Tracker";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			document.title = "Crypto-Tracker";
    			attr_dev(h1, "class", "text-gray-100 text-4xl text-center my-8 uppercase");
    			add_location(h1, file, 36, 1, 745);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "w-full rounded-md text-lg p-4 border-2 border-gray-200 my-4");
    			attr_dev(input, "placeholder", "Search a currency...");
    			add_location(input, file, 38, 0, 828);
    			attr_dev(div, "class", "grid gap-4 grid-cols-2 md:grid-cols-4");
    			add_location(div, file, 46, 0, 979);
    			attr_dev(main, "class", "p-8 max-w-6xl mx-auto bg-gray-600");
    			add_location(main, file, 34, 0, 686);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(nav, main, null);
    			append_dev(main, t1);
    			append_dev(main, h1);
    			append_dev(main, t3);
    			append_dev(main, input);
    			set_input_value(input, /*search*/ ctx[1]);
    			append_dev(main, t4);
    			append_dev(main, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*search*/ 2 && input.value !== /*search*/ ctx[1]) {
    				set_input_value(input, /*search*/ ctx[1]);
    			}

    			if (dirty & /*coins*/ 1) {
    				each_value = /*coins*/ ctx[0];
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(nav);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
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
    		$$invalidate(0, coins = await response.json());
    		console.log(coins);
    		console.log(typeof coins);
    		return coins;
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		search = this.value;
    		$$invalidate(1, search);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Nav,
    		coins,
    		search,
    		searchResult
    	});

    	$$self.$inject_state = $$props => {
    		if ("coins" in $$props) $$invalidate(0, coins = $$props.coins);
    		if ("search" in $$props) $$invalidate(1, search = $$props.search);
    		if ("searchResult" in $$props) searchResult = $$props.searchResult;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*search, coins*/ 3) {
    			{
    				console.log(search);

    				if (search) {
    					searchResult = coins.filter(coin => coin.name.toLowerCase().includes(search.toLowerCase()));
    				} else {
    					searchResult = coins;
    				}
    			}
    		}
    	};

    	return [coins, search, input_input_handler];
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
      props: {
        coinData: [
          {
            id: "bitcoin",
            symbol: "btc",
            name: "Bitcoin",
            image:
              "https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1547033579",
            current_price: 45178,
            market_cap: 845119336319,
            market_cap_rank: 1,
            fully_diluted_valuation: 946995790623,
            total_volume: 81422625075,
            high_24h: 46398,
            low_24h: 38840,
            price_change_24h: 1749.82,
            price_change_percentage_24h: 4.02927,
            market_cap_change_24h: 29355043065,
            market_cap_change_percentage_24h: 3.59847,
            circulating_supply: 18740850.0,
            total_supply: 21000000.0,
            max_supply: 21000000.0,
            ath: 84381,
            ath_change_percentage: -46.69518,
            ath_date: "2021-04-14T06:52:46.198Z",
            atl: 72.61,
            atl_change_percentage: 61846.89863,
            atl_date: "2013-07-05T00:00:00.000Z",
            roi: null,
            last_updated: "2021-06-23T02:16:43.664Z",
            price_change_percentage_1h_in_currency: -1.862347998253228,
            price_change_percentage_24h_in_currency: 4.029270198726281,
            price_change_percentage_7d_in_currency: -14.001904763524871,
          },
          {
            id: "ethereum",
            symbol: "eth",
            name: "Ethereum",
            image:
              "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880",
            current_price: 2667.46,
            market_cap: 309706174009,
            market_cap_rank: 2,
            fully_diluted_valuation: null,
            total_volume: 54742256432,
            high_24h: 2664.14,
            low_24h: 2306.02,
            price_change_24h: 70.18,
            price_change_percentage_24h: 2.70198,
            market_cap_change_24h: 6389938788,
            market_cap_change_percentage_24h: 2.10669,
            circulating_supply: 116402359.749,
            total_supply: null,
            max_supply: null,
            ath: 5616.82,
            ath_change_percentage: -53.20096,
            ath_date: "2021-05-12T14:41:48.623Z",
            atl: 0.596152,
            atl_change_percentage: 440830.9052,
            atl_date: "2015-10-20T00:00:00.000Z",
            roi: {
              times: 78.15831065974582,
              currency: "btc",
              percentage: 7815.831065974582,
            },
            last_updated: "2021-06-23T02:16:48.056Z",
            price_change_percentage_1h_in_currency: 1.384841791921794,
            price_change_percentage_24h_in_currency: 2.7019786527865075,
            price_change_percentage_7d_in_currency: -19.961872422802646,
          },
          {
            id: "tether",
            symbol: "usdt",
            name: "Tether",
            image:
              "https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707",
            current_price: 1.33,
            market_cap: 83772347293,
            market_cap_rank: 3,
            fully_diluted_valuation: null,
            total_volume: 139752147294,
            high_24h: 1.41,
            low_24h: 1.32,
            price_change_24h: -0.001693088922,
            price_change_percentage_24h: -0.12693,
            market_cap_change_24h: -80162949.35069275,
            market_cap_change_percentage_24h: -0.0956,
            circulating_supply: 62881737677.5629,
            total_supply: 62881737677.5629,
            max_supply: null,
            ath: 1.81,
            ath_change_percentage: -25.95306,
            ath_date: "2020-03-19T03:10:25.782Z",
            atl: 0.76805,
            atl_change_percentage: 74.23507,
            atl_date: "2015-03-02T00:00:00.000Z",
            roi: null,
            last_updated: "2021-06-23T02:05:23.888Z",
            price_change_percentage_1h_in_currency: -5.249487369860736,
            price_change_percentage_24h_in_currency: -0.126926420787805,
            price_change_percentage_7d_in_currency: 2.1032869741901337,
          },
          {
            id: "binancecoin",
            symbol: "bnb",
            name: "Binance Coin",
            image:
              "https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png?1547034615",
            current_price: 376.92,
            market_cap: 58074604780,
            market_cap_rank: 4,
            fully_diluted_valuation: 64087493656,
            total_volume: 5835549626,
            high_24h: 385.75,
            low_24h: 305.94,
            price_change_24h: 5.12,
            price_change_percentage_24h: 1.3782,
            market_cap_change_24h: 269840575,
            market_cap_change_percentage_24h: 0.46681,
            circulating_supply: 154533651.9,
            total_supply: 170533651.9,
            max_supply: 170533651.9,
            ath: 877.6,
            ath_change_percentage: -57.75524,
            ath_date: "2021-05-12T04:03:36.688Z",
            atl: 0.05053,
            atl_change_percentage: 733596.26241,
            atl_date: "2017-10-19T00:00:00.000Z",
            roi: null,
            last_updated: "2021-06-23T02:16:28.689Z",
            price_change_percentage_1h_in_currency: 1.1887859216122698,
            price_change_percentage_24h_in_currency: 1.3782015098557805,
            price_change_percentage_7d_in_currency: -21.505219248556426,
          },
          {
            id: "cardano",
            symbol: "ada",
            name: "Cardano",
            image:
              "https://assets.coingecko.com/coins/images/975/large/cardano.png?1547034860",
            current_price: 1.64,
            market_cap: 52538676722,
            market_cap_rank: 5,
            fully_diluted_valuation: 73729546831,
            total_volume: 9779220895,
            high_24h: 1.67,
            low_24h: 1.35,
            price_change_24h: 0.0070789,
            price_change_percentage_24h: 0.4334,
            market_cap_change_24h: -25021041.07736206,
            market_cap_change_percentage_24h: -0.0476,
            circulating_supply: 32066390668.4135,
            total_supply: 45000000000.0,
            max_supply: 45000000000.0,
            ath: 3.14,
            ath_change_percentage: -48.34655,
            ath_date: "2021-05-16T07:44:28.033Z",
            atl: 0.02765234,
            atl_change_percentage: 5774.71156,
            atl_date: "2017-11-02T00:00:00.000Z",
            roi: null,
            last_updated: "2021-06-23T02:16:47.577Z",
            price_change_percentage_1h_in_currency: 0.5608602088476637,
            price_change_percentage_24h_in_currency: 0.4334028758546914,
            price_change_percentage_7d_in_currency: -19.526498339531205,
          },
          {
            id: "ripple",
            symbol: "xrp",
            name: "XRP",
            image:
              "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1605778731",
            current_price: 0.791148,
            market_cap: 36253682885,
            market_cap_rank: 6,
            fully_diluted_valuation: null,
            total_volume: 8929633554,
            high_24h: 0.86588,
            low_24h: 0.697677,
            price_change_24h: -0.04626112399,
            price_change_percentage_24h: -5.52432,
            market_cap_change_24h: -2626162443.6553574,
            market_cap_change_percentage_24h: -6.75456,
            circulating_supply: 46244517593.0,
            total_supply: 100000000000.0,
            max_supply: null,
            ath: 4.32,
            ath_change_percentage: -81.90492,
            ath_date: "2018-01-07T00:00:00.000Z",
            atl: 0.00283888,
            atl_change_percentage: 27442.93721,
            atl_date: "2013-08-16T00:00:00.000Z",
            roi: null,
            last_updated: "2021-06-23T02:16:54.718Z",
            price_change_percentage_1h_in_currency: 0.41843993064593954,
            price_change_percentage_24h_in_currency: -5.524315830458817,
            price_change_percentage_7d_in_currency: -30.30155786866458,
          },
          {
            id: "dogecoin",
            symbol: "doge",
            name: "Dogecoin",
            image:
              "https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1547792256",
            current_price: 0.272005,
            market_cap: 35024960382,
            market_cap_rank: 7,
            fully_diluted_valuation: null,
            total_volume: 8679809097,
            high_24h: 0.283283,
            low_24h: 0.224131,
            price_change_24h: 0.00746824,
            price_change_percentage_24h: 2.82314,
            market_cap_change_24h: 413191047,
            market_cap_change_percentage_24h: 1.19379,
            circulating_supply: 130129604529.681,
            total_supply: null,
            max_supply: null,
            ath: 0.932641,
            ath_change_percentage: -71.81254,
            ath_date: "2021-05-08T05:08:23.458Z",
            atl: 0.00010901,
            atl_change_percentage: 241049.49987,
            atl_date: "2015-05-06T00:00:00.000Z",
            roi: null,
            last_updated: "2021-06-23T02:16:27.497Z",
            price_change_percentage_1h_in_currency: 2.47363701522031,
            price_change_percentage_24h_in_currency: 2.823142485437035,
            price_change_percentage_7d_in_currency: -34.99121473507106,
          },
          {
            id: "usd-coin",
            symbol: "usdc",
            name: "USD Coin",
            image:
              "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389",
            current_price: 1.33,
            market_cap: 33455786922,
            market_cap_rank: 8,
            fully_diluted_valuation: null,
            total_volume: 5847007560,
            high_24h: 1.36,
            low_24h: 1.3,
            price_change_24h: -0.001603274873,
            price_change_percentage_24h: -0.12037,
            market_cap_change_24h: 151508570,
            market_cap_change_percentage_24h: 0.45492,
            circulating_supply: 25189335363.9197,
            total_supply: 25118815101.0497,
            max_supply: null,
            ath: 1.83,
            ath_change_percentage: -27.34023,
            ath_date: "2020-03-13T02:35:16.858Z",
            atl: 1.15,
            atl_change_percentage: 15.35562,
            atl_date: "2021-05-19T13:14:05.611Z",
            roi: null,
            last_updated: "2021-06-23T02:16:54.712Z",
            price_change_percentage_1h_in_currency: -0.4393394244020051,
            price_change_percentage_24h_in_currency: -0.12036708857016674,
            price_change_percentage_7d_in_currency: 1.9445918235551938,
          },
          {
            id: "polkadot",
            symbol: "dot",
            name: "Polkadot",
            image:
              "https://assets.coingecko.com/coins/images/12171/large/aJGBjJFU_400x400.jpg?1597804776",
            current_price: 21.59,
            market_cap: 21641159704,
            market_cap_rank: 9,
            fully_diluted_valuation: null,
            total_volume: 3224969542,
            high_24h: 22.41,
            low_24h: 17.83,
            price_change_24h: -0.029056525729,
            price_change_percentage_24h: -0.13439,
            market_cap_change_24h: -80920956.37054825,
            market_cap_change_percentage_24h: -0.37253,
            circulating_supply: 1004104997.91021,
            total_supply: 1085052376.11919,
            max_supply: null,
            ath: 63.46,
            ath_change_percentage: -66.91208,
            ath_date: "2021-05-15T03:59:58.961Z",
            atl: 3.74,
            atl_change_percentage: 461.07763,
            atl_date: "2020-08-19T03:44:11.556Z",
            roi: null,
            last_updated: "2021-06-23T02:16:39.450Z",
            price_change_percentage_1h_in_currency: 2.4453914484800094,
            price_change_percentage_24h_in_currency: -0.13439348104279297,
            price_change_percentage_7d_in_currency: -31.20640926649405,
          },
          {
            id: "binance-usd",
            symbol: "busd",
            name: "Binance USD",
            image:
              "https://assets.coingecko.com/coins/images/9576/large/BUSD.png?1568947766",
            current_price: 1.33,
            market_cap: 13006098642,
            market_cap_rank: 10,
            fully_diluted_valuation: null,
            total_volume: 10268890366,
            high_24h: 1.37,
            low_24h: 1.3,
            price_change_24h: -0.001547517756,
            price_change_percentage_24h: -0.11609,
            market_cap_change_24h: -32743018.871896744,
            market_cap_change_percentage_24h: -0.25112,
            circulating_supply: 9763715785.54,
            total_supply: 9763715785.54,
            max_supply: null,
            ath: 1.83,
            ath_change_percentage: -27.12265,
            ath_date: "2020-03-13T02:35:42.953Z",
            atl: 1.17,
            atl_change_percentage: 14.34108,
            atl_date: "2021-05-19T13:04:37.445Z",
            roi: null,
            last_updated: "2021-06-23T02:16:55.571Z",
            price_change_percentage_1h_in_currency: -1.0737203177343897,
            price_change_percentage_24h_in_currency: -0.1160873984269768,
            price_change_percentage_7d_in_currency: 1.9811417584621178,
          },
        ],
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
