/**
 * vuex v1.0.4
 * (c) 2019 Evan You
 * @license MIT
 */
/**
 * Get the first item that pass the test
 * by second argument function
 *
 * @param {Array} list
 * @param {Function} f
 * @return {*}
 */

/**
 * forEach for object
 */
function forEachValue (obj, fn) {
  Object.keys(obj).forEach(key => fn(obj[key], key));
}

function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

function isPromise (val) {
  return val && typeof val.then === 'function'
}

function assert (condition, msg) {
  if (!condition) throw new Error(`[vuex] ${msg}`)
}

function partial (fn, arg) {
  return function () {
    return fn(arg)
  }
}

function firstUpcase (str) {
  if (typeof str !== 'string') return str
  if (!str) return str
  return str.replace(/^([a-z])/, $0 => $0.toUpperCase())
}

function fnSlice (isBefore, target, key, fn) {
  let fn_ = fn;
  if (!fn_) {
    const firstUpcaseKey = firstUpcase(key);
    const fullKey = (isBefore ? 'before' : 'after') + firstUpcaseKey;
    fn_ = target[fullKey];
    if (!fn_) return
  }
  if (target[key]) {
    const _self = target[key];
    target[key] = function (...args) {
      if (isBefore) {
        fn_.apply(this, args);
      }
      _self.apply(this, args);
      if (!isBefore) {
        fn_.apply(this, args);
      }
    };
  } else {
    target[key] = function (...args) {
      if (isBefore) {
        fn_.apply(this, args);
      } else {
        fn_.apply(this, args);
      }
    };
  }
}

const beforeSlice = fnSlice.bind(null, true);
const afterSlice = fnSlice.bind(null, false);

// Base data struct for store's module, package with some attribute and method
class Module {
  constructor (rawModule, runtime) {
    this.runtime = runtime;
    // Store some children item
    this._children = Object.create(null);
    // Store the origin module object which passed by programmer
    this._rawModule = rawModule;
    const rawState = rawModule.state;

    // Store the origin module's state
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {};
  }

  get namespaced () {
    return !!this._rawModule.namespaced
  }

  addChild (key, module) {
    this._children[key] = module;
  }

  removeChild (key) {
    delete this._children[key];
  }

  getChild (key) {
    return this._children[key]
  }

  update (rawModule) {
    this._rawModule.namespaced = rawModule.namespaced;
    if (rawModule.actions) {
      this._rawModule.actions = rawModule.actions;
    }
    if (rawModule.mutations) {
      this._rawModule.mutations = rawModule.mutations;
    }
    if (rawModule.getters) {
      this._rawModule.getters = rawModule.getters;
    }
  }

  forEachChild (fn) {
    forEachValue(this._children, fn);
  }

  forEachGetter (fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn);
    }
  }

  forEachAction (fn) {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn);
    }
  }

  forEachMutation (fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn);
    }
  }
}

class ModuleCollection {
  constructor (rawRootModule) {
    // register root module (Vuex.Store options)
    this.register([], rawRootModule, false);
  }

  get (path) {
    return path.reduce((module, key) => {
      return module.getChild(key)
    }, this.root)
  }

  getNamespace (path) {
    let module = this.root;
    return path.reduce((namespace, key) => {
      module = module.getChild(key);
      return namespace + (module.namespaced ? key + '/' : '')
    }, '')
  }

  update (rawRootModule) {
    update([], this.root, rawRootModule);
  }

  register (path, rawModule, runtime = true) {
    {
      assertRawModule(path, rawModule);
    }

    const newModule = new Module(rawModule, runtime);
    if (path.length === 0) {
      this.root = newModule;
    } else {
      const parent = this.get(path.slice(0, -1));
      parent.addChild(path[path.length - 1], newModule);
    }

    // register nested modules
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime);
      });
    }
  }

  unregister (path) {
    const parent = this.get(path.slice(0, -1));
    const key = path[path.length - 1];
    if (!parent.getChild(key).runtime) return

    parent.removeChild(key);
  }
}

function update (path, targetModule, newModule) {
  {
    assertRawModule(path, newModule);
  }

  // update target module
  targetModule.update(newModule);

  // update nested modules
  if (newModule.modules) {
    for (const key in newModule.modules) {
      if (!targetModule.getChild(key)) {
        {
          console.warn(
            `[vuex] trying to add a new module '${key}' on hot reloading, ` +
            'manual reload is needed'
          );
        }
        return
      }
      update(
        path.concat(key),
        targetModule.getChild(key),
        newModule.modules[key]
      );
    }
  }
}

const functionAssert = {
  assert: value => typeof value === 'function',
  expected: 'function'
};

const objectAssert = {
  assert: value => typeof value === 'function' ||
    (typeof value === 'object' && typeof value.handler === 'function'),
  expected: 'function or object with "handler" function'
};

const assertTypes = {
  getters: functionAssert,
  mutations: functionAssert,
  actions: objectAssert
};

function assertRawModule (path, rawModule) {
  Object.keys(assertTypes).forEach(key => {
    if (!rawModule[key]) return

    const assertOptions = assertTypes[key];

    forEachValue(rawModule[key], (value, type) => {
      assert(
        assertOptions.assert(value),
        makeAssertionMessage(path, key, type, value, assertOptions.expected)
      );
    });
  });
}

function makeAssertionMessage (path, key, type, value, expected) {
  let buf = `${key} should be ${expected} but "${key}.${type}"`;
  if (path.length > 0) {
    buf += ` in module "${path.join('.')}"`;
  }
  buf += ` is ${JSON.stringify(value)}.`;
  return buf
}

let uid = 0;

/**
 * A dep is an observable that can have multiple
 * watcher subscribing to it.
 */
class Dep {
  // the current target watcher being evaluated.
  // this is globally unique because there could be only one
  // watcher being evaluated at any time.

  constructor () {
    this.id = uid++;
    this.subs = [];
  }

  /**
   * Add a subscriber.
   *
   * @param {Watcher} sub
   */

  addSub (sub) {
    this.subs.push(sub);
  }

  /**
   * Remove a subscriber.
   *
   * @param {Watcher} sub
   */

  removeSub (sub) {
    this.subs.$remove(sub);
  }

  /**
   * Add self as a dependency to the target watcher.
   */

  depend () {
    Dep.target.addDep(this);
  }

  /**
   * Notify all subscribers of a new value.
   */

  notify () {
    const subs = this.subs;
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  }
}
Dep.target = null;

const OB_NAME = '__ob__';
const WATCHERS_PROPERTY_NAME = '__watchers__';
const DATA_PROPTERTY_NAME = '__data__';

const DEBUGGING = typeof process !== 'undefined' &&
  "development" !== 'production';

/**
 * Define property with value.
 *
 * @param {Object} object
 * @param {String} property
 * @param {*} value
 * @param {Boolean} [enumerable]
 */

function defineValue (object, property, value, enumerable) {
  Object.defineProperty(object, property, {
    value,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  });
}

/**
 * Define property with getter and setter.
 *
 * @param {Object} object
 * @param {String} property
 * @param {Function} getter
 * @param {Function} setter
 */

function defineAccessor (object, property, getter, setter) {
  Object.defineProperty(object, property, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true
  });
}

/**
 * Array type check.
 *
 * @return {Boolean}
 */

const isArray = Array.isArray;

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 *
 * @param {*} object
 * @return {Boolean}
 */

const toString = Object.prototype.toString;
const OBJECT_STRING = '[object Object]';
function isPlainObject (object) {
  return toString.call(object) === OBJECT_STRING
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 *
 * @param {*} object
 * @return {Boolean}
 */

function isObject$1 (object) {
  return object !== null && typeof object === 'object'
}

/**
 * Function type check
 *
 * @param {*} func
 * @param {Boolean}
 */

function isFunction (func) {
  return typeof func === 'function'
}

/**
 * Iterate object
 *
 * @param {Object} object
 * @param {Function} callback
 */

function everyEntries (object, callback) {
  const keys = Object.keys(object);
  for (let i = 0, l = keys.length; i < l; i++) {
    callback(keys[i], object[keys[i]]);
  }
}

/**
 * noop is function which is nothing to do.
 */

function noop () {}

/**
 * @param {String} string
 */

const warn = typeof DEBUGGING !== undefined && DEBUGGING &&
  typeof console !== 'undefined' && console &&
  isFunction(console.warn)
  ? console.warn
  : noop;

let _Set;
if (typeof Set !== 'undefined' && Set.toString().match(/native code/)) {
  // use native Set when available.
  _Set = Set;
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = function () {
    this.set = Object.create(null);
  };
  _Set.prototype.has = function (key) {
    return this.set[key] !== undefined
  };
  _Set.prototype.add = function (key) {
    this.set[key] = 1;
  };
  _Set.prototype.clear = function () {
    this.set = Object.create(null);
  };
}

const arrayPrototype = Array.prototype;
const arrayMethods = Object.create(arrayPrototype);
const arrayMutativeMethods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
];

/**
 * Augment an target Array with arrayMethods
 *
 * @param {Array} array
 */

function amend (array) {
  Object.setPrototypeOf(array, arrayMethods);
}

/**
 * Intercept mutating methods and emit events
 */

for (
  let i = 0, l = arrayMutativeMethods.length, method;
  i < l;
  method = arrayMutativeMethods[++i]
) {
  // cache original method
  const original = arrayPrototype[method];
  defineValue(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args);
    const ob = this[OB_NAME];
    let inserted;
    switch (method) {
      case 'push':
        inserted = args;
        break
      case 'unshift':
        inserted = args;
        break
      case 'splice':
        inserted = args.slice(2);
        break
    }
    if (inserted) ob.observeArray(inserted);
    ob.dep.notify(); // notify change
    return result
  });
}

/**
 * Swap the element at the given index with a new value
 * and emits corresponding event.
 *
 * @param {Number} index
 * @param {*} value
 * @return {*} - replaced element
 */

function $set (index, value) {
  if (index >= this.length) {
    this.length = Number(index) + 1;
  }
  return this.splice(index, 1, value)[0]
}
defineValue(arrayPrototype, '$set', $set);

/**
 * Convenience method to remove the element at given index
 * or target element reference.
 *
 * @param {*} item
 * @return {*} - removed element
 */

function $remove (item) {
  if (!this.length) return
  const index = this.indexOf(item);
  if (index > -1) {
    return this.splice(index, 1)
  }
}
defineValue(arrayPrototype, '$remove', $remove);

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 *
 * @class
 * @param {Array|Object} value
 */

class Observer {
  constructor (value) {
    this.value = value;
    this.dep = new Dep();
    defineValue(value, OB_NAME, this);
    if (isArray(value)) {
      amend(value);
      this.observeArray(value);
    } else {
      this.walk(value);
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   *
   * @param {Object} object
   */

  walk (object) {
    everyEntries(object, (key, value) => this.convert(key, value));
  }

  /**
   * Observe a list of Array items.
   *
   * @param {Array} items
   */

  observeArray (items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }

  /**
   * Convert a property into getter/setter so we can emit
   * the events when the property is accessed/changed.
   *
   * @param {String} key
   * @param {*} value
   */

  convert (key, value) {
    defineReactive(this.value, key, value);
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * @param {*} value
 * @return {Observer|undefined}
 */

function observe (value) {
  if (!value || typeof value !== 'object') return
  let observer;
  if (
    Object.prototype.hasOwnProperty.call(value, OB_NAME) &&
    value[OB_NAME] instanceof Observer
  ) {
    observer = value[OB_NAME];
  } else if (
    (isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value)
  ) {
    observer = new Observer(value);
  }
  return observer
}

/**
 * Define a reactive property on an Object.
 *
 * @param {Object} object
 * @param {String} key
 * @param {*} value
 */

function defineReactive (object, key, value) {
  const dep = new Dep();

  const desc = Object.getOwnPropertyDescriptor(object, key);
  if (desc && desc.configurable === false) return

  // cater for pre-defined getter/setters
  const getter = desc && desc.get;
  const setter = desc && desc.set;

  let childOb = observe(value);

  function reactiveGetter () {
    const currentValue = getter ? getter.call(object) : value;
    if (Dep.target) {
      dep.depend();
      if (childOb) {
        childOb.dep.depend();
      }
      if (isArray(currentValue)) {
        for (let i = 0, l = currentValue.length, e; i < l; i++) {
          e = currentValue[i];
          e && e[OB_NAME] && e[OB_NAME].dep.depend();
        }
      }
    }
    return currentValue
  }
  function reactiveSetter (newValue) {
    const oldValue = getter ? getter.call(object) : value;
    if (newValue === oldValue) return
    if (setter) {
      setter.call(object, newValue);
    } else {
      value = newValue;
    }
    childOb = observe(newValue);
    dep.notify();
  }
  defineAccessor(object, key, reactiveGetter, reactiveSetter);
}

/**
 * Build a getter function. Requires eval.
 *
 * We isolate the try/catch so it doesn't affect the
 * optimization of the parse function when it is not called.
 *
 * @param {String} body
 * @return {Function|undefined}
 */

function makeGetterFunction (body) {
  try {
    /* eslint-disable no-new-func */
    return new Function('scope', `return ${body};`)
    /* eslint-enable no-new-func */
  } catch (e) {
    warn('Invalid expression. Generated function body: ' + body);
  }
}

/**
 * Parse an expression to getter.
 *
 * @param {String} expression
 * @return {Function|undefined}
 */

function parse (expression) {
  expression = String.prototype.trim.call(expression);
  return makeGetterFunction('scope.' + expression)
}

let queue = [];
let has = {};
let waiting = false;
let queueIndex;

/**
 * Reset the batcher's state.
 */

function resetBatcherState () {
  queue = [];
  has = {};
  waiting = false;
}

/**
 * Flush queue and run the watchers.
 */

function flushBatcherQueue () {
  runBatcherQueue(queue);
  resetBatcherState();
}

/**
 * Run the watchers in a single queue.
 *
 * @param {Array} queue
 */

function runBatcherQueue (queue) {
  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (queueIndex = 0; queueIndex < queue.length; queueIndex++) {
    const watcher = queue[queueIndex];
    const id = watcher.id;
    has[id] = null;
    watcher.run();
  }
}

/**
 * Defer a task to execute it asynchronously. Ideally this
 * should be executed as a microtask, so we leverage
 * MutationObserver if it's available, and fallback to
 * setTimeout(0).
 *
 * @param {Function} callback
 * @param {Object} context
 */

const nextTick = (function () {
  let callbacks = [];
  let pending = false;
  let timerFunction;
  function nextTickHandler () {
    pending = false;
    const callbackCopies = callbacks.slice(0);
    callbacks = [];
    for (let i = 0; i < callbackCopies.length; i++) {
      callbackCopies[i]();
    }
  }

  if (typeof MutationObserver !== 'undefined') {
    let counter = 1;
    /* global MutationObserver */
    const observer = new MutationObserver(nextTickHandler);
    /* global */
    const textNode = document.createTextNode(counter);
    observer.observe(textNode, { characterData: true });
    timerFunction = function () {
      counter = (counter + 1) % 2;
      textNode.data = counter;
    };
  } else {
    // webpack attempts to inject a shim for setImmediate
    // if it is used as a global, so we have to work around that to
    // avoid bundling unnecessary code.
    const inBrowser = typeof window !== 'undefined' &&
      Object.prototype.toString.call(window) !== '[object Object]';
    const context =
      inBrowser ? window : typeof global !== 'undefined' ? global : {};
    timerFunction = context.setImmediate || setTimeout;
  }
  return function (callback, context) {
    const func = context ? function () { callback.call(context); } : callback;
    callbacks.push(func);
    if (pending) return
    pending = true;
    timerFunction(nextTickHandler, 0);
  }
})();

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 *
 * @param {Watcher} watcher
 *   properties:
 *   - {Number} id
 *   - {Function} run
 */

function batch (watcher) {
  const id = watcher.id;
  if (has[id] == null) {
    has[id] = queue.length;
    queue.push(watcher);
    // queue the flush
    if (!waiting) {
      waiting = true;
      nextTick(flushBatcherQueue);
    }
  }
}

let uid$1 = 0;

class Watcher {
  /**
   * A watcher parses an expression, collects dependencies,
   * and fires callback when the expression value changes.
   *
   * @param {Object} owner
   * @param {String|Function} getter
   * @param {Function} callback
   * @param {Object} options
   *                 - {Boolean} deep
   *                 - {Boolean} sync
   *                 - {Boolean} lazy
   * @constructor
   */

  constructor (owner, getter, callback, options = {}) {
    owner[WATCHERS_PROPERTY_NAME].push(this);
    this.owner = owner;
    this.getter = getter;
    this.callback = callback;
    this.options = Object.assign({
      lazy: false,
      deep: true,
      sync: true
    }, options);
    // uid for batching
    this.id = ++uid$1;
    this.active = true;
    // for lazy watchers
    this.dirty = options.lazy;
    this.deps = [];
    this.newDeps = [];
    this.depIds = new _Set();
    this.newDepIds = new _Set();
    this.value = options.lazy
      ? undefined
      : this.get();
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */

  get () {
    this.beforeGet();
    const scope = this.owner;
    const value = this.getter.call(scope, scope);
    if (this.options.deep) {
      traverse(value);
    }
    this.afterGet();
    return value
  }

  /**
   * Prepare for dependency collection.
   */

  beforeGet () {
    Dep.target = this;
  }

  /**
   * Add a dependency to this directive.
   *
   * @param {Dep} dep
   */

  addDep (dep) {
    const id = dep.id;
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id);
      this.newDeps.push(dep);
      if (!this.depIds.has(id)) {
        dep.addSub(this);
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */

  afterGet () {
    Dep.target = null;
    let i = this.deps.length;
    while (i--) {
      const dep = this.deps[i];
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this);
      }
    }
    let tmp = this.depIds;
    this.depIds = this.newDepIds;
    this.newDepIds = tmp;
    this.newDepIds.clear();
    tmp = this.deps;
    this.deps = this.newDeps;
    this.newDeps = tmp;
    this.newDeps.length = 0;
  }

  /**
   * Will be called when a dependency changes.
   */

  update () {
    if (this.options.lazy) {
      this.dirty = true;
    } else if (this.options.sync) {
      this.run();
    } else {
      batch(this);
    }
  }

  /**
   * Will be called by the batcher.
   */

  run () {
    if (this.active) {
      const value = this.get();
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even when
        // the value is the same, because the value may have mutated;
        ((isObject$1(value) || this.options.deep))
      ) {
        const oldValue = this.value;
        this.value = value;
        this.callback.call(this.owner, value, oldValue);
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */

  evaluate () {
    // avoid overwriting another watcher that is being collected.
    const current = Dep.target;
    this.value = this.get();
    this.dirty = false;
    Dep.target = current;
  }

  /**
   * Depend on all deps collected by this watcher.
   */

  depend () {
    let i = this.deps.length;
    while (i--) {
      this.deps[i].depend();
    }
  }

  /**
   * Remove self from all dependencies' subcriber list.
   */

  teardown () {
    if (this.active) {
      let i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false;
      this.owner = this.callback = this.value = null;
    }
  }
}

/**
 * Recrusively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 *
 * @param {*} value
 */

function traverse (value) {
  let i, keys;
  if (isArray(value)) {
    i = value.length;
    while (i--) traverse(value[i]);
  } else if (isObject$1(value)) {
    keys = Object.keys(value);
    i = keys.length;
    while (i--) traverse(value[keys[i]]);
  }
}

/**
 * Create an watcher instance, returns the new watcher.
 *
 * @param {Object} owner
 * @param {String|Function} expressionOrFunction
 * @param {Function} callback
 * @param {Object} options
 *                 - {Boolean} deep
 *                 - {Boolean} sync
 *                 - {Boolean} lazy
 * @return {Watcher}
 */

function watch (owner, expressionOrFunction, callback, options) {
  // parse expression for getter
  const getter = isFunction(expressionOrFunction)
    ? expressionOrFunction
    : parse(expressionOrFunction);
  return new Watcher(owner, getter, callback, options)
}

/**
 * Make a computed getter, which can collect dependencies.
 *
 * @param {Object} owner
 * @param {Function} getter
 */

function makeComputed (owner, getter, ob) {
  const watcher = new Watcher(owner, getter, null, {
    deep: ob.deep,
    lazy: true,
    sync: ob.sync
  });
  return function computedGetter () {
    if (watcher.options.lazy && Dep.target && !Dep.target.options.lazy) {
      watcher.options.lazy = false;
      watcher.callback = function () {
        const deps = watcher.deps;
        for (let i = 0, l = deps.length; i < l; i++) {
          deps[i].notify();
        }
      };
    }
    if (watcher.dirty) {
      watcher.evaluate();
    }
    if (Dep.target) {
      watcher.depend();
    }
    return watcher.value
  }
}

// Only could be react, compute or watch
ob.default = watch$1;
ob.deep = ob.lazy = ob.sync = false;

Object.setPrototypeOf(ob, { compute, watch: watch$1, watche: watch, observe: init });

/**
 * ob
 *
 * @public
 * @param {Object} target
 * @param {*} [expression]
 * @param {*} [func]
 * @param {*} [options]
 * @return {Function} ob
 */

function ob (target, expression, func, options) {
  init(target);
  return ob.default(target, expression, func, options)
}

/**
 * Compute property
 *
 * @public
 * @param {Object} target
 * @param {String} name
 * @param {Function|Object} getterOrAccessor
 *        - Function getter
 *        - Object accessor
 *          - Function [get]  - getter
 *          - Function [set]  - setter
 *          - Boolean [cache]
 * @param {Boolean} [cache]
 */

function compute (target, name, getterOrAccessor, cache) {
  init(target);
  let getter, setter;
  if (isFunction(getterOrAccessor)) {
    getter = cache !== false
      ? makeComputed(target, getterOrAccessor, ob)
      : getterOrAccessor.bind(this);
    setter = noop;
  } else {
    getter = getterOrAccessor.get
      ? getterOrAccessor.cache !== false || cache !== false
        ? makeComputed(target, getterOrAccessor.get, ob)
        : getterOrAccessor.get.bind(this)
      : noop;
    setter = getterOrAccessor.set ? getterOrAccessor.set.bind(this) : noop;
  }
  defineAccessor(target, name, getter, setter);
}

/**
 * Watch property
 *
 * @public
 * @param {Object} target
 * @param {String|Function} expressionOrFunction
 * @param {Function} callback
 * @param {Object} [options]
 *                 - {Boolean} deep
 *                 - {Boolean} sync
 *                 - {Boolean} lazy
 * @return {Watcher}
 */

function watch$1 (target, expressionOrFunction, callback, options = ob) {
  init(target);
  return watch(target, expressionOrFunction, callback, options)
}

/**
 * @private
 * @param {Object} target
 */

function init (target) {
  if (!target || !target.hasOwnProperty || typeof target !== 'object') return
  if (target.hasOwnProperty(WATCHERS_PROPERTY_NAME)) return
  defineValue(target, WATCHERS_PROPERTY_NAME, [], false);
  defineValue(target, DATA_PROPTERTY_NAME, Object.create(null), false);
  observe(target[DATA_PROPTERTY_NAME]);
  reactSelfProperties(target);
}

/**
 * @private
 * @param {Object} target
 * @param {String} key
 * @param {*} value
 */

function reactProperty (target, key, value) {
  target[DATA_PROPTERTY_NAME][key] = value;
  defineReactive(target[DATA_PROPTERTY_NAME], key, value);
  proxy(target, key);
}

/**
 * @private
 * @param {Object} target
 */

function reactSelfProperties (target) {
  everyEntries(target, (key, value) => {
    !isFunction(value) && reactProperty(target, key, value);
  });
}

/**
 * @private
 * @param {Object} target
 * @param {String} key
 */

function proxy (target, key) {
  function getter () {
    return target[DATA_PROPTERTY_NAME][key]
  }
  function setter (value) {
    target[DATA_PROPTERTY_NAME][key] = value;
  }
  defineAccessor(target, key, getter, setter);
}

function reactive (vm, data) {
  if (!vm || !data) return
  let reactiveData = data;
  if (typeof data === 'function') {
    reactiveData = data();
  }
  Object.keys(reactiveData).forEach(key => {
    defineReactive(vm, key, vm[key]);
  });
}
function makeComputed$1 (vm, computed, config) {
  reactive(vm['_props'], config['props']);
  reactive(vm, config['data']);
  reactive(vm, config['public']);
  reactive(vm, config['protected']);
  reactive(vm, config['private']);
  defineValue(vm, WATCHERS_PROPERTY_NAME, [], false);
  Object.keys(computed).forEach(key => {
    vm.$set(key, '');
    const descriptor = Object.getOwnPropertyDescriptor(vm, key);
    const getterOrAccessor = computed[key];
    let setter, getter;
    if (isFunction(getterOrAccessor)) {
      getter = getterOrAccessor;
      setter = noop;
    } else {
      getter = getterOrAccessor.get;
      setter = getterOrAccessor.set ? getterOrAccessor.set.bind(vm) : noop;
    }
    Object.defineProperty(vm, key, {
      configurable: true,
      enumerable: true,
      get: descriptor.get,
      set: setter
    });
    ob.watche(vm, getter, (val, oldVal) => {
      if (val === oldVal) return
      descriptor.set.call(vm, val);
    }, {
      deep: true,
      lazy: false,
      sync: true
    });
    descriptor.set.call(vm, getter.call(vm));
  });
}

class Store {
  constructor (options = {}) {
    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #731

    {
      assert(typeof Promise !== 'undefined', `vuex requires a Promise polyfill in this browser.`);
      assert(this instanceof Store, `store must be called with the new operator.`);
    }

    const {
      plugins = [],
      strict = false
    } = options;

    // store internal state
    this._committing = false;
    this._actions = Object.create(null);
    this._actionSubscribers = [];
    this._mutations = Object.create(null);
    this._wrappedGetters = Object.create(null);
    this._modules = new ModuleCollection(options);
    this._modulesNamespaceMap = Object.create(null);
    this._subscribers = [];

    // bind commit and dispatch to self
    const store = this;
    const { dispatch, commit } = this;
    this.dispatch = function boundDispatch (type, payload) {
      return dispatch.call(store, type, payload)
    };
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    };

    // strict mode
    this.strict = strict;

    const state = this._modules.root.state;

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    installModule(this, state, [], this._modules.root);

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreVM(this, state);

    // apply plugins
    plugins.forEach(plugin => plugin(this));
  }

  get state () {
    return this._vm.state
  }

  set state (v) {
    {
      assert(false, `use store.replaceState() to explicit replace store state.`);
    }
  }

  commit (_type, _payload, _options) {
    // check object-style commit
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options);

    const mutation = { type, payload };

    const entry = this._mutations[type];
    if (!entry) {
      {
        console.error(`[vuex] unknown mutation type: ${type}`);
      }
      return
    }
    this._withCommit(() => {
      entry.forEach(function commitIterator (handler) {
        handler(payload);
      });
    });
    this._subscribers.forEach(sub => sub(mutation, this.state));

    if (
      
      options && options.silent
    ) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
        'Use the filter functionality in the vue-devtools'
      );
    }
  }

  dispatch (_type, _payload) {
    // check object-style dispatch
    const {
      type,
      payload
    } = unifyObjectStyle(_type, _payload);

    const action = { type, payload };
    const entry = this._actions[type];
    if (!entry) {
      {
        console.error(`[vuex] unknown action type: ${type}`);
      }
      return
    }

    try {
      this._actionSubscribers
        .filter(sub => sub.before)
        .forEach(sub => sub.before(action, this.state));
    } catch (e) {
      {
        console.warn(`[vuex] error in before action subscribers: `);
        console.error(e);
      }
    }

    const result = entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload);

    return result.then(res => {
      try {
        this._actionSubscribers
          .filter(sub => sub.after)
          .forEach(sub => sub.after(action, this.state));
      } catch (e) {
        {
          console.warn(`[vuex] error in after action subscribers: `);
          console.error(e);
        }
      }
      return res
    })
  }

  subscribe (fn) {
    return genericSubscribe(fn, this._subscribers)
  }

  subscribeAction (fn) {
    const subs = typeof fn === 'function' ? { before: fn } : fn;
    return genericSubscribe(subs, this._actionSubscribers)
  }

  watch (getter, cb, options) {
    {
      assert(typeof getter === 'function', `store.watch only accepts a function.`);
    }
    return ob.watche(this.state, () => getter(this.state, this.getters), cb, options)
  }

  replaceState (state) {
    this._withCommit(() => {
      this._vm.state = state;
    });
  }

  registerModule (path, rawModule, options = {}) {
    if (typeof path === 'string') path = [path];

    {
      assert(Array.isArray(path), `module path must be a string or an Array.`);
      assert(path.length > 0, 'cannot register the root module by using registerModule.');
    }

    this._modules.register(path, rawModule);
    installModule(this, this.state, path, this._modules.get(path), options.preserveState);
    // reset store to update getters...
    resetStoreVM(this, this.state);
  }

  unregisterModule (path) {
    if (typeof path === 'string') path = [path];

    {
      assert(Array.isArray(path), `module path must be a string or an Array.`);
    }

    this._modules.unregister(path);
    this._withCommit(() => {
      const parentState = getNestedState(this.state, path.slice(0, -1));
      console.log('Vue.delete', parentState, path[path.length - 1]);
      // Vue.delete(parentState, path[path.length - 1])
      delete parentState[path[path.length - 1]];
    });
    resetStore(this);
  }

  hotUpdate (newOptions) {
    this._modules.update(newOptions);
    resetStore(this);
  }

  _withCommit (fn) {
    const committing = this._committing;
    this._committing = true;
    fn();
    this._committing = committing;
  }
}

function genericSubscribe (fn, subs) {
  if (subs.indexOf(fn) < 0) {
    subs.push(fn);
  }
  return () => {
    const i = subs.indexOf(fn);
    if (i > -1) {
      subs.splice(i, 1);
    }
  }
}

function resetStore (store) {
  store._actions = Object.create(null);
  store._mutations = Object.create(null);
  store._wrappedGetters = Object.create(null);
  store._modulesNamespaceMap = Object.create(null);
  const state = store.state;
  // init all modules
  installModule(store, state, [], store._modules.root, true);
  // reset vm
  resetStoreVM(store, state);
}

function resetStoreVM (store, state) {
  // bind store public getters
  store.getters = {};
  const wrappedGetters = store._wrappedGetters;
  ob.observe(state);
  const getters = {};
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    // direct inline function use will lead to closure preserving oldVm.
    // using partial to return function with only arguments preserved in closure enviroment.
    ob.compute(getters, key, partial(fn, store));
    Object.defineProperty(store.getters, key, {
      get: () => store._vm.getters[key],
      enumerable: true // for local getters
    });
  });

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  store._vm = {
    state,
    getters
  };
}

function installModule (store, rootState, path, module, hot) {
  const isRoot = !path.length;
  const namespace = store._modules.getNamespace(path);

  // register in namespace map
  if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && "development" !== 'production') {
      console.error(`[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join('/')}`);
    }
    store._modulesNamespaceMap[namespace] = module;
  }

  // set state
  if (!isRoot && !hot) {
    const parentState = getNestedState(rootState, path.slice(0, -1));
    const moduleName = path[path.length - 1];
    store._withCommit(() => {
      console.log('Vue.set', parentState, moduleName, module.state);
      // Vue.set(parentState, moduleName, module.state)
      defineReactive(parentState, moduleName, module.state);
    });
  }

  const local = module.context = makeLocalContext(store, namespace, path);

  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key;
    registerMutation(store, namespacedType, mutation, local);
  });

  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key;
    const handler = action.handler || action;
    registerAction(store, type, handler, local);
  });

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key;
    registerGetter(store, namespacedType, getter, local);
  });

  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot);
  });
}

/**
 * make localized dispatch, commit, getters and state
 * if there is no namespace, just use root ones
 */
function makeLocalContext (store, namespace, path) {
  const noNamespace = namespace === '';

  const local = {
    dispatch: noNamespace ? store.dispatch : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options);
      const { payload, options } = args;
      let { type } = args;

      if (!options || !options.root) {
        type = namespace + type;
        if ( !store._actions[type]) {
          console.error(`[vuex] unknown local action type: ${args.type}, global type: ${type}`);
          return
        }
      }

      return store.dispatch(type, payload)
    },

    commit: noNamespace ? store.commit : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options);
      const { payload, options } = args;
      let { type } = args;

      if (!options || !options.root) {
        type = namespace + type;
        if ( !store._mutations[type]) {
          console.error(`[vuex] unknown local mutation type: ${args.type}, global type: ${type}`);
          return
        }
      }

      store.commit(type, payload, options);
    }
  };

  // getters and state object must be gotten lazily
  // because they will be changed by vm update
  Object.defineProperties(local, {
    getters: {
      get: noNamespace
        ? () => store.getters
        : () => makeLocalGetters(store, namespace)
    },
    state: {
      get: () => getNestedState(store.state, path)
    }
  });

  return local
}

function makeLocalGetters (store, namespace) {
  const gettersProxy = {};

  const splitPos = namespace.length;
  Object.keys(store.getters).forEach(type => {
    // skip if the target getter is not match this namespace
    if (type.slice(0, splitPos) !== namespace) return

    // extract local getter type
    const localType = type.slice(splitPos);

    // Add a port to the getters proxy.
    // Define as getter property because
    // we do not want to evaluate the getters in this time.
    Object.defineProperty(gettersProxy, localType, {
      get: () => store.getters[type],
      enumerable: true
    });
  });

  return gettersProxy
}

function registerMutation (store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = []);
  entry.push(function wrappedMutationHandler (payload) {
    handler.call(store, local.state, payload);
  });
}

function registerAction (store, type, handler, local) {
  const entry = store._actions[type] || (store._actions[type] = []);
  entry.push(function wrappedActionHandler (payload, cb) {
    let res = handler.call(store, {
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
      rootGetters: store.getters,
      rootState: store.state
    }, payload, cb);
    if (!isPromise(res)) {
      res = Promise.resolve(res);
    }
    if (store._devtoolHook) {
      return res.catch(err => {
        store._devtoolHook.emit('vuex:error', err);
        throw err
      })
    } else {
      return res
    }
  });
}

function registerGetter (store, type, rawGetter, local) {
  if (store._wrappedGetters[type]) {
    {
      console.error(`[vuex] duplicate getter key: ${type}`);
    }
    return
  }
  store._wrappedGetters[type] = function wrappedGetter (store) {
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      store.state, // root state
      store.getters // root getters
    )
  };
}

function getNestedState (state, path) {
  return path.length
    ? path.reduce((state, key) => state[key], state)
    : state
}

function unifyObjectStyle (type, payload, options) {
  if (isObject(type) && type.type) {
    options = payload;
    payload = type;
    type = type.type;
  }

  {
    assert(typeof type === 'string', `expects string as the type, but found ${typeof type}.`);
  }

  return { type, payload, options }
}

function install (store) {
  const injectRef = Object.getPrototypeOf(global) || global;
  if (injectRef.$store) return
  injectRef.$store = store;
  injectRef.$makeComputed = makeComputed$1;
}

/**
 * Reduce the code which written in Vue.js for getting the state.
 * @param {String} [namespace] - Module's namespace
 * @param {Object|Array} states # Object's item can be a function which accept state and getters for param, you can do something for state and getters in it.
 * @param {Object}
 */
const mapState = normalizeNamespace((namespace, states) => {
  const res = {};
  normalizeMap(states).forEach(({ key, val }) => {
    res[key] = function mappedState () {
      let state = this.$store.state;
      let getters = this.$store.getters;
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapState', namespace);
        if (!module) {
          return
        }
        state = module.context.state;
        getters = module.context.getters;
      }
      return typeof val === 'function'
        ? val.call(this, state, getters)
        : state[val]
    };
    // mark vuex getter for devtools
    res[key].vuex = true;
  });
  return res
});

/**
 * Reduce the code which written in Vue.js for committing the mutation
 * @param {String} [namespace] - Module's namespace
 * @param {Object|Array} mutations # Object's item can be a function which accept `commit` function as the first param, it can accept anthor params. You can commit mutation and do any other things in this function. specially, You need to pass anthor params from the mapped function.
 * @return {Object}
 */
const mapMutations = normalizeNamespace((namespace, mutations) => {
  const res = {};
  normalizeMap(mutations).forEach(({ key, val }) => {
    res[key] = function mappedMutation (...args) {
      // Get the commit method from store
      let commit = this.$store.commit;
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapMutations', namespace);
        if (!module) {
          return
        }
        commit = module.context.commit;
      }
      return typeof val === 'function'
        ? val.apply(this, [commit].concat(args))
        : commit.apply(this.$store, [val].concat(args))
    };
  });
  return res
});

/**
 * Reduce the code which written in Vue.js for getting the getters
 * @param {String} [namespace] - Module's namespace
 * @param {Object|Array} getters
 * @return {Object}
 */
const mapGetters = normalizeNamespace((namespace, getters) => {
  const res = {};
  normalizeMap(getters).forEach(({ key, val }) => {
    // The namespace has been mutated by normalizeNamespace
    val = namespace + val;
    res[key] = function mappedGetter () {
      if (namespace && !getModuleByNamespace(this.$store, 'mapGetters', namespace)) {
        return
      }
      if ( !(val in this.$store.getters)) {
        console.error(`[vuex] unknown getter: ${val}`);
        return
      }
      return this.$store.getters[val]
    };
    // mark vuex getter for devtools
    res[key].vuex = true;
  });
  return res
});

/**
 * Reduce the code which written in Vue.js for dispatch the action
 * @param {String} [namespace] - Module's namespace
 * @param {Object|Array} actions # Object's item can be a function which accept `dispatch` function as the first param, it can accept anthor params. You can dispatch action and do any other things in this function. specially, You need to pass anthor params from the mapped function.
 * @return {Object}
 */
const mapActions = normalizeNamespace((namespace, actions) => {
  const res = {};
  normalizeMap(actions).forEach(({ key, val }) => {
    res[key] = function mappedAction (...args) {
      // get dispatch function from store
      let dispatch = this.$store.dispatch;
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapActions', namespace);
        if (!module) {
          return
        }
        dispatch = module.context.dispatch;
      }
      return typeof val === 'function'
        ? val.apply(this, [dispatch].concat(args))
        : dispatch.apply(this.$store, [val].concat(args))
    };
  });
  return res
});

/**
 * Rebinding namespace param for mapXXX function in special scoped, and return them by simple object
 * @param {String} namespace
 * @return {Object}
 */
const createNamespacedHelpers = (namespace) => ({
  mapState: mapState.bind(null, namespace),
  mapGetters: mapGetters.bind(null, namespace),
  mapMutations: mapMutations.bind(null, namespace),
  mapActions: mapActions.bind(null, namespace)
});

/**
 * Normalize the map
 * normalizeMap([1, 2, 3]) => [ { key: 1, val: 1 }, { key: 2, val: 2 }, { key: 3, val: 3 } ]
 * normalizeMap({a: 1, b: 2, c: 3}) => [ { key: 'a', val: 1 }, { key: 'b', val: 2 }, { key: 'c', val: 3 } ]
 * @param {Array|Object} map
 * @return {Object}
 */
function normalizeMap (map) {
  return Array.isArray(map)
    ? map.map(key => ({ key, val: key }))
    : Object.keys(map).map(key => ({ key, val: map[key] }))
}

/**
 * Return a function expect two param contains namespace and map. it will normalize the namespace and then the param's function will handle the new namespace and the map.
 * @param {Function} fn
 * @return {Function}
 */
function normalizeNamespace (fn) {
  return (namespace, map) => {
    if (typeof namespace !== 'string') {
      map = namespace;
      namespace = '';
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/';
    }
    return fn(namespace, map)
  }
}

/**
 * Search a special module from store by namespace. if module not exist, print error message.
 * @param {Object} store
 * @param {String} helper
 * @param {String} namespace
 * @return {Object}
 */
function getModuleByNamespace (store, helper, namespace) {
  const module = store._modulesNamespaceMap[namespace];
  if ( !module) {
    console.error(`[vuex] module namespace not found in ${helper}(): ${namespace}`);
  }
  return module
}

function Component (config) {
  const computed = config.computed;
  delete config.computed;
  const watch = config.watch;
  delete config.watch;
  beforeSlice(config, 'onInit', function (...args) {
    this.$store = global.$store;
    computed && global.$makeComputed(this, computed, config);
    if (watch) {
      Object.keys(watch).forEach(key => {
        this.$watch(key, watch[key]);
      });
    }
    if (config.beforeCreate) {
      config.beforeCreate.apply(this, args);
    }
  });
  beforeSlice(config, 'onReady', function (...args) {
    if (config.created) {
      config.created.apply(this, args);
    }
  });
  if (config.methods) {
    Object.keys(config.methods).forEach(key => {
      if (config[key]) return
      config[key] = config.methods[key];
    });
    delete config.methods;
  }
  if (watch) {
    Object.keys(watch).forEach((key, index) => {
      if (typeof watch[key] === 'function') {
        const callbackname = 'on_Data_Change' + '_' + index;
        config[callbackname] = watch[key];
        watch[key] = callbackname;
      }
    });
  }
  return config
}

var index_esm = {
  Store,
  install,
  version: '1.0.4',
  Component,
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers
};

export default index_esm;
export { Component, Store, createNamespacedHelpers, install, mapActions, mapGetters, mapMutations, mapState };
