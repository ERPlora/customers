var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// @lit-labs/ssr-dom-shim/lib/element-internals.js
var ElementInternalsShim = class ElementInternals {
  get shadowRoot() {
    return this.__host.__shadowRoot;
  }
  constructor(_host) {
    this.ariaActiveDescendantElement = null;
    this.ariaAtomic = "";
    this.ariaAutoComplete = "";
    this.ariaBrailleLabel = "";
    this.ariaBrailleRoleDescription = "";
    this.ariaBusy = "";
    this.ariaChecked = "";
    this.ariaColCount = "";
    this.ariaColIndex = "";
    this.ariaColIndexText = "";
    this.ariaColSpan = "";
    this.ariaControlsElements = null;
    this.ariaCurrent = "";
    this.ariaDescribedByElements = null;
    this.ariaDescription = "";
    this.ariaDetailsElements = null;
    this.ariaDisabled = "";
    this.ariaErrorMessageElements = null;
    this.ariaExpanded = "";
    this.ariaFlowToElements = null;
    this.ariaHasPopup = "";
    this.ariaHidden = "";
    this.ariaInvalid = "";
    this.ariaKeyShortcuts = "";
    this.ariaLabel = "";
    this.ariaLabelledByElements = null;
    this.ariaLevel = "";
    this.ariaLive = "";
    this.ariaModal = "";
    this.ariaMultiLine = "";
    this.ariaMultiSelectable = "";
    this.ariaOrientation = "";
    this.ariaOwnsElements = null;
    this.ariaPlaceholder = "";
    this.ariaPosInSet = "";
    this.ariaPressed = "";
    this.ariaReadOnly = "";
    this.ariaRelevant = "";
    this.ariaRequired = "";
    this.ariaRoleDescription = "";
    this.ariaRowCount = "";
    this.ariaRowIndex = "";
    this.ariaRowIndexText = "";
    this.ariaRowSpan = "";
    this.ariaSelected = "";
    this.ariaSetSize = "";
    this.ariaSort = "";
    this.ariaValueMax = "";
    this.ariaValueMin = "";
    this.ariaValueNow = "";
    this.ariaValueText = "";
    this.role = "";
    this.form = null;
    this.labels = [];
    this.states = /* @__PURE__ */ new Set();
    this.validationMessage = "";
    this.validity = {};
    this.willValidate = true;
    this.__host = _host;
  }
  checkValidity() {
    console.warn("`ElementInternals.checkValidity()` was called on the server.This method always returns true.");
    return true;
  }
  reportValidity() {
    return true;
  }
  setFormValue() {
  }
  setValidity() {
  }
};

// @lit-labs/ssr-dom-shim/lib/events.js
var __classPrivateFieldSet = function(receiver, state, value, kind, f3) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f3.call(receiver, value) : f3 ? f3.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f3) {
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f3 : kind === "a" ? f3.call(receiver) : f3 ? f3.value : state.get(receiver);
};
var _Event_cancelable;
var _Event_bubbles;
var _Event_composed;
var _Event_defaultPrevented;
var _Event_timestamp;
var _Event_propagationStopped;
var _Event_type;
var _Event_target;
var _Event_isBeingDispatched;
var _a;
var _CustomEvent_detail;
var _b;
var NONE = 0;
var CAPTURING_PHASE = 1;
var AT_TARGET = 2;
var BUBBLING_PHASE = 3;
var enumerableProperty = { __proto__: null };
enumerableProperty.enumerable = true;
Object.freeze(enumerableProperty);
var EventShim = (_a = class Event {
  constructor(type, options = {}) {
    _Event_cancelable.set(this, false);
    _Event_bubbles.set(this, false);
    _Event_composed.set(this, false);
    _Event_defaultPrevented.set(this, false);
    _Event_timestamp.set(this, Date.now());
    _Event_propagationStopped.set(this, false);
    _Event_type.set(this, void 0);
    _Event_target.set(this, void 0);
    _Event_isBeingDispatched.set(this, void 0);
    this.NONE = NONE;
    this.CAPTURING_PHASE = CAPTURING_PHASE;
    this.AT_TARGET = AT_TARGET;
    this.BUBBLING_PHASE = BUBBLING_PHASE;
    if (arguments.length === 0)
      throw new Error(`The type argument must be specified`);
    if (typeof options !== "object" || !options) {
      throw new Error(`The "options" argument must be an object`);
    }
    const { bubbles, cancelable, composed } = options;
    __classPrivateFieldSet(this, _Event_cancelable, !!cancelable, "f");
    __classPrivateFieldSet(this, _Event_bubbles, !!bubbles, "f");
    __classPrivateFieldSet(this, _Event_composed, !!composed, "f");
    __classPrivateFieldSet(this, _Event_type, `${type}`, "f");
    __classPrivateFieldSet(this, _Event_target, null, "f");
    __classPrivateFieldSet(this, _Event_isBeingDispatched, false, "f");
  }
  initEvent(_type, _bubbles, _cancelable) {
    throw new Error("Method not implemented.");
  }
  stopImmediatePropagation() {
    this.stopPropagation();
  }
  preventDefault() {
    __classPrivateFieldSet(this, _Event_defaultPrevented, true, "f");
  }
  get target() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get currentTarget() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get srcElement() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get type() {
    return __classPrivateFieldGet(this, _Event_type, "f");
  }
  get cancelable() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f");
  }
  get defaultPrevented() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f") && __classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get timeStamp() {
    return __classPrivateFieldGet(this, _Event_timestamp, "f");
  }
  composedPath() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? [__classPrivateFieldGet(this, _Event_target, "f")] : [];
  }
  get returnValue() {
    return !__classPrivateFieldGet(this, _Event_cancelable, "f") || !__classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get bubbles() {
    return __classPrivateFieldGet(this, _Event_bubbles, "f");
  }
  get composed() {
    return __classPrivateFieldGet(this, _Event_composed, "f");
  }
  get eventPhase() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? _a.AT_TARGET : _a.NONE;
  }
  get cancelBubble() {
    return __classPrivateFieldGet(this, _Event_propagationStopped, "f");
  }
  set cancelBubble(value) {
    if (value) {
      __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
    }
  }
  stopPropagation() {
    __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
  }
  get isTrusted() {
    return false;
  }
}, _Event_cancelable = /* @__PURE__ */ new WeakMap(), _Event_bubbles = /* @__PURE__ */ new WeakMap(), _Event_composed = /* @__PURE__ */ new WeakMap(), _Event_defaultPrevented = /* @__PURE__ */ new WeakMap(), _Event_timestamp = /* @__PURE__ */ new WeakMap(), _Event_propagationStopped = /* @__PURE__ */ new WeakMap(), _Event_type = /* @__PURE__ */ new WeakMap(), _Event_target = /* @__PURE__ */ new WeakMap(), _Event_isBeingDispatched = /* @__PURE__ */ new WeakMap(), _a.NONE = NONE, _a.CAPTURING_PHASE = CAPTURING_PHASE, _a.AT_TARGET = AT_TARGET, _a.BUBBLING_PHASE = BUBBLING_PHASE, _a);
Object.defineProperties(EventShim.prototype, {
  initEvent: enumerableProperty,
  stopImmediatePropagation: enumerableProperty,
  preventDefault: enumerableProperty,
  target: enumerableProperty,
  currentTarget: enumerableProperty,
  srcElement: enumerableProperty,
  type: enumerableProperty,
  cancelable: enumerableProperty,
  defaultPrevented: enumerableProperty,
  timeStamp: enumerableProperty,
  composedPath: enumerableProperty,
  returnValue: enumerableProperty,
  bubbles: enumerableProperty,
  composed: enumerableProperty,
  eventPhase: enumerableProperty,
  cancelBubble: enumerableProperty,
  stopPropagation: enumerableProperty,
  isTrusted: enumerableProperty
});
var CustomEventShim = (_b = class CustomEvent2 extends EventShim {
  constructor(type, options = {}) {
    super(type, options);
    _CustomEvent_detail.set(this, void 0);
    __classPrivateFieldSet(this, _CustomEvent_detail, options?.detail ?? null, "f");
  }
  initCustomEvent(_type, _bubbles, _cancelable, _detail) {
    throw new Error("Method not implemented.");
  }
  get detail() {
    return __classPrivateFieldGet(this, _CustomEvent_detail, "f");
  }
}, _CustomEvent_detail = /* @__PURE__ */ new WeakMap(), _b);
Object.defineProperties(CustomEventShim.prototype, {
  detail: enumerableProperty
});
var EventShimWithRealType = EventShim;
var CustomEventShimWithRealType = CustomEventShim;

// @lit-labs/ssr-dom-shim/lib/css.js
var _a2;
var CSSRuleShim = (_a2 = class CSSRule {
  constructor() {
    this.STYLE_RULE = 1;
    this.CHARSET_RULE = 2;
    this.IMPORT_RULE = 3;
    this.MEDIA_RULE = 4;
    this.FONT_FACE_RULE = 5;
    this.PAGE_RULE = 6;
    this.NAMESPACE_RULE = 10;
    this.KEYFRAMES_RULE = 7;
    this.KEYFRAME_RULE = 8;
    this.SUPPORTS_RULE = 12;
    this.COUNTER_STYLE_RULE = 11;
    this.FONT_FEATURE_VALUES_RULE = 14;
    this.MARGIN_RULE = 9;
    this.__parentStyleSheet = null;
    this.cssText = "";
  }
  get parentRule() {
    return null;
  }
  get parentStyleSheet() {
    return this.__parentStyleSheet;
  }
  get type() {
    return 0;
  }
}, _a2.STYLE_RULE = 1, _a2.CHARSET_RULE = 2, _a2.IMPORT_RULE = 3, _a2.MEDIA_RULE = 4, _a2.FONT_FACE_RULE = 5, _a2.PAGE_RULE = 6, _a2.NAMESPACE_RULE = 10, _a2.KEYFRAMES_RULE = 7, _a2.KEYFRAME_RULE = 8, _a2.SUPPORTS_RULE = 12, _a2.COUNTER_STYLE_RULE = 11, _a2.FONT_FEATURE_VALUES_RULE = 14, _a2.MARGIN_RULE = 9, _a2);

// @lit-labs/ssr-dom-shim/index.js
globalThis.Event ??= EventShimWithRealType;
globalThis.CustomEvent ??= CustomEventShimWithRealType;
var constructionToken = Symbol();
var isCaptureEventListener = (options) => typeof options === "boolean" ? options : options?.capture ?? false;
var enumerableProperty2 = { __proto__: null };
enumerableProperty2.enumerable = true;
Object.freeze(enumerableProperty2);
var EventTarget = class {
  constructor() {
    this.__eventListeners = /* @__PURE__ */ new Map();
    this.__captureEventListeners = /* @__PURE__ */ new Map();
  }
  addEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    let eventListeners = eventListenersMap.get(type);
    if (eventListeners === void 0) {
      eventListeners = /* @__PURE__ */ new Map();
      eventListenersMap.set(type, eventListeners);
    } else if (eventListeners.has(callback)) {
      return;
    }
    const normalizedOptions = typeof options === "object" && options ? options : {};
    normalizedOptions.signal?.addEventListener("abort", () => this.removeEventListener(type, callback, options));
    eventListeners.set(callback, normalizedOptions ?? {});
  }
  removeEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    const eventListeners = eventListenersMap.get(type);
    if (eventListeners !== void 0) {
      eventListeners.delete(callback);
      if (!eventListeners.size) {
        eventListenersMap.delete(type);
      }
    }
  }
  dispatchEvent(event) {
    let composedPath = this.__resolveFullEventPath();
    if (!event.composed && this.__host) {
      composedPath = composedPath.slice(0, composedPath.indexOf(this.__host));
    }
    let stopPropagation = false;
    let stopImmediatePropagation = false;
    let eventPhase = EventShimWithRealType.NONE;
    let target = null;
    let tmpTarget = null;
    let currentTarget = null;
    const originalStopPropagation = event.stopPropagation;
    const originalStopImmediatePropagation = event.stopImmediatePropagation;
    Object.defineProperties(event, {
      target: {
        get() {
          return target ?? tmpTarget;
        },
        ...enumerableProperty2
      },
      srcElement: {
        get() {
          return event.target;
        },
        ...enumerableProperty2
      },
      currentTarget: {
        get() {
          return currentTarget;
        },
        ...enumerableProperty2
      },
      eventPhase: {
        get() {
          return eventPhase;
        },
        ...enumerableProperty2
      },
      composedPath: {
        value: () => composedPath,
        ...enumerableProperty2
      },
      stopPropagation: {
        value: () => {
          stopPropagation = true;
          originalStopPropagation.call(event);
        },
        ...enumerableProperty2
      },
      stopImmediatePropagation: {
        value: () => {
          stopImmediatePropagation = true;
          originalStopImmediatePropagation.call(event);
        },
        ...enumerableProperty2
      }
    });
    const invokeEventListener = (listener, options, eventListenerMap) => {
      if (typeof listener === "function") {
        listener(event);
      } else if (typeof listener?.handleEvent === "function") {
        listener.handleEvent(event);
      }
      if (options.once) {
        eventListenerMap.delete(listener);
      }
    };
    const finishDispatch = () => {
      currentTarget = null;
      eventPhase = EventShimWithRealType.NONE;
      return !event.defaultPrevented;
    };
    const captureEventPath = composedPath.slice().reverse();
    target = !this.__host || !event.composed ? this : null;
    const retarget = (eventTargets) => {
      tmpTarget = this;
      while (tmpTarget.__host && eventTargets.includes(tmpTarget.__host)) {
        tmpTarget = tmpTarget.__host;
      }
    };
    for (const eventTarget of captureEventPath) {
      if (!target && (!tmpTarget || tmpTarget === eventTarget.__host)) {
        retarget(captureEventPath.slice(captureEventPath.indexOf(eventTarget)));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.CAPTURING_PHASE;
      const captureEventListeners = eventTarget.__captureEventListeners.get(event.type);
      if (captureEventListeners) {
        for (const [listener, options] of captureEventListeners) {
          invokeEventListener(listener, options, captureEventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    const bubbleEventPath = event.bubbles ? composedPath : [this];
    tmpTarget = null;
    for (const eventTarget of bubbleEventPath) {
      if (!target && (!tmpTarget || eventTarget === tmpTarget.__host)) {
        retarget(bubbleEventPath.slice(0, bubbleEventPath.indexOf(eventTarget) + 1));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.BUBBLING_PHASE;
      const eventListeners = eventTarget.__eventListeners.get(event.type);
      if (eventListeners) {
        for (const [listener, options] of eventListeners) {
          invokeEventListener(listener, options, eventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    return finishDispatch();
  }
  __resolveFullEventPath() {
    if (this.__eventPathCache) {
      return this.__eventPathCache;
    } else if (!this.__eventTargetParent) {
      return this.__eventPathCache = [this, documentShim, windowShim];
    } else {
      return this.__eventPathCache = [
        this,
        ...this.__eventTargetParent.__resolveFullEventPath()
      ];
    }
  }
};
var attributes = /* @__PURE__ */ new WeakMap();
var attributesForElement = (element) => {
  let attrs = attributes.get(element);
  if (attrs === void 0) {
    attributes.set(element, attrs = /* @__PURE__ */ new Map());
  }
  return attrs;
};
var NodeShim = class Node2 extends EventTarget {
  getRootNode(options) {
    if (options?.composed) {
      return document2;
    }
    const host = this.__host;
    return host?.__shadowRoot ?? document2;
  }
};
var DocumentShim = class Document2 extends NodeShim {
  get adoptedStyleSheets() {
    return [];
  }
  createTreeWalker() {
    return {};
  }
  createTextNode() {
    return {};
  }
  createElement() {
    return {};
  }
};
var documentShim = new DocumentShim();
var document2 = documentShim;
var WindowShim = class Window extends NodeShim {
  constructor(token) {
    super();
    if (token !== constructionToken) {
      throw new TypeError("Illegal constructor");
    }
    Object.assign(this, globalThis, {
      CustomElementRegistry,
      customElements: customElements2,
      document: document2,
      Document: DocumentShim,
      Element: ElementShim,
      EventTarget,
      HTMLElement: HTMLElementShim,
      Node: NodeShim,
      ShadowRoot: ShadowRootShim,
      window: this,
      Window: WindowShim
    });
  }
};
var ElementShim = class Element extends NodeShim {
  constructor() {
    super(...arguments);
    this.__shadowRootMode = null;
    this.__shadowRoot = null;
    this.__internals = null;
  }
  get attributes() {
    return Array.from(attributesForElement(this)).map(([name, value]) => ({
      name,
      value
    }));
  }
  get shadowRoot() {
    if (this.__shadowRootMode === "closed") {
      return null;
    }
    return this.__shadowRoot;
  }
  get localName() {
    return this.constructor.__localName;
  }
  get tagName() {
    return this.localName?.toUpperCase();
  }
  setAttribute(name, value) {
    attributesForElement(this).set(name, String(value));
  }
  removeAttribute(name) {
    attributesForElement(this).delete(name);
  }
  toggleAttribute(name, force) {
    if (this.hasAttribute(name)) {
      if (force === void 0 || !force) {
        this.removeAttribute(name);
        return false;
      }
    } else {
      if (force === void 0 || force) {
        this.setAttribute(name, "");
        return true;
      } else {
        return false;
      }
    }
    return true;
  }
  hasAttribute(name) {
    return attributesForElement(this).has(name);
  }
  attachShadow(init) {
    this.__shadowRootMode = init.mode;
    const shadowRoot = new ShadowRootShim(constructionToken, init);
    shadowRoot.__eventTargetParent = this;
    shadowRoot.__host = this;
    return this.__shadowRoot = shadowRoot;
  }
  attachInternals() {
    if (this.__internals !== null) {
      throw new Error(`Failed to execute 'attachInternals' on 'HTMLElement': ElementInternals for the specified element was already attached.`);
    }
    const internals = new ElementInternalsShim(this);
    this.__internals = internals;
    return internals;
  }
  getAttribute(name) {
    const value = attributesForElement(this).get(name);
    return value ?? null;
  }
};
var HTMLElementShim = class HTMLElement2 extends ElementShim {
};
var HTMLElementShimWithRealType = HTMLElementShim;
var ShadowRootShim = class ShadowRoot extends NodeShim {
  get host() {
    return this.__host;
  }
  constructor(constructionToken2, init) {
    super();
    if (constructionToken2 !== constructionToken2) {
      throw new TypeError("Illegal constructor");
    }
    this.mode = init.mode;
  }
};
globalThis.litServerRoot ??= Object.defineProperty(new HTMLElementShimWithRealType(), "localName", {
  // Patch localName (and tagName) to return a unique name.
  get() {
    return "lit-server-root";
  }
});
function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
var CustomElementRegistry = class {
  constructor() {
    this.__definitions = /* @__PURE__ */ new Map();
    this.__reverseDefinitions = /* @__PURE__ */ new Map();
    this.__pendingWhenDefineds = /* @__PURE__ */ new Map();
  }
  define(name, ctor) {
    if (this.__definitions.has(name)) {
      if (true) {
        console.warn(`'CustomElementRegistry' already has "${name}" defined. This may have been caused by live reload or hot module replacement in which case it can be safely ignored.
Make sure to test your application with a production build as repeat registrations will throw in production.`);
      } else {
        throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the name "${name}" has already been used with this registry`);
      }
    }
    if (this.__reverseDefinitions.has(ctor)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the constructor has already been used with this registry for the tag name ${this.__reverseDefinitions.get(ctor)}`);
    }
    ctor.__localName = name;
    this.__definitions.set(name, {
      ctor,
      // Note it's important we read `observedAttributes` in case it is a getter
      // with side-effects, as is the case in Lit, where it triggers class
      // finalization.
      //
      // TODO(aomarks) To be spec compliant, we should also capture the
      // registration-time lifecycle methods like `connectedCallback`. For them
      // to be actually accessible to e.g. the Lit SSR element renderer, though,
      // we'd need to introduce a new API for accessing them (since `get` only
      // returns the constructor).
      observedAttributes: ctor.observedAttributes ?? []
    });
    this.__reverseDefinitions.set(ctor, name);
    this.__pendingWhenDefineds.get(name)?.resolve(ctor);
    this.__pendingWhenDefineds.delete(name);
  }
  get(name) {
    const definition = this.__definitions.get(name);
    return definition?.ctor;
  }
  getName(ctor) {
    return this.__reverseDefinitions.get(ctor) ?? null;
  }
  initialize(_root) {
    throw new Error(`customElements.initialize is not currently supported in SSR. Please file a bug if you need it.`);
  }
  upgrade(_element) {
    throw new Error(`customElements.upgrade is not currently supported in SSR. Please file a bug if you need it.`);
  }
  async whenDefined(name) {
    const definition = this.__definitions.get(name);
    if (definition) {
      return definition.ctor;
    }
    let withResolvers = this.__pendingWhenDefineds.get(name);
    if (!withResolvers) {
      withResolvers = promiseWithResolvers();
      this.__pendingWhenDefineds.set(name, withResolvers);
    }
    return withResolvers.promise;
  }
};
var CustomElementRegistryShimWithRealType = CustomElementRegistry;
var customElements2 = new CustomElementRegistryShimWithRealType();
var windowShim = new WindowShim(constructionToken);

// @lit/reactive-element/node/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e7, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e7;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e7 = void 0 !== s5 && 1 === s5.length;
      e7 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e7 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e7) => {
  const o7 = 1 === t5.length ? t5[0] : e7.reduce((e8, s5, o8) => e8 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s5, o7) => {
  if (e) s5.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e7 of o7) {
    const o8 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && o8.setAttribute("nonce", n6), o8.textContent = e7.cssText, s5.appendChild(o8);
  }
};
var c = e || void 0 === t.CSSStyleSheet ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e7 = "";
  for (const s5 of t6.cssRules) e7 += s5.cssText;
  return r(e7);
})(t5) : t5;

// @lit/reactive-element/node/reactive-element.js
var { is: h, defineProperty: r2, getOwnPropertyDescriptor: o2, getOwnPropertyNames: n2, getOwnPropertySymbols: a, getPrototypeOf: c2 } = Object;
var l = globalThis;
l.customElements ??= customElements2;
var p = l.trustedTypes;
var d = p ? p.emptyScript : "";
var u = l.reactiveElementPolyfillSupport;
var f = (t5, s5) => t5;
var b = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? d : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i7 = t5;
  switch (s5) {
    case Boolean:
      i7 = null !== t5;
      break;
    case Number:
      i7 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t5);
      } catch (t6) {
        i7 = null;
      }
  }
  return i7;
} };
var m = (t5, s5) => !h(t5, s5);
var y = { attribute: true, type: String, converter: b, reflect: false, useDefault: false, hasChanged: m };
Symbol.metadata ??= Symbol("metadata"), l.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var g = class extends (globalThis.HTMLElement ?? HTMLElementShimWithRealType) {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = y) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i7 = Symbol(), e7 = this.getPropertyDescriptor(t5, i7, s5);
      void 0 !== e7 && r2(this.prototype, t5, e7);
    }
  }
  static getPropertyDescriptor(t5, s5, i7) {
    const { get: e7, set: h4 } = o2(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e7, set(s6) {
      const r6 = e7?.call(this);
      h4?.call(this, s6), this.requestUpdate(t5, r6, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(f("elementProperties"))) return;
    const t5 = c2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(f("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(f("properties"))) {
      const t6 = this.properties, s5 = [...n2(t6), ...a(t6)];
      for (const i7 of s5) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i7] of s5) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i7 = this._$Eu(t6, s5);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t5) {
    const s5 = [];
    if (Array.isArray(t5)) {
      const e7 = new Set(t5.flat(1 / 0).reverse());
      for (const t6 of e7) s5.unshift(c(t6));
    } else void 0 !== t5 && s5.push(c(t5));
    return s5;
  }
  static _$Eu(t5, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s5) {
    const i7 = this.constructor.elementProperties.get(t5), e7 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e7 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : b).toAttribute(s5, i7.type);
      this._$Em = t5, null == h4 ? this.removeAttribute(e7) : this.setAttribute(e7, h4), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i7 = this.constructor, e7 = i7._$Eh.get(t5);
    if (void 0 !== e7 && this._$Em !== e7) {
      const t6 = i7.getPropertyOptions(e7), h4 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : b;
      this._$Em = e7;
      const r6 = h4.fromAttribute(s5, t6.type);
      this[e7] = r6 ?? this._$Ej?.get(e7) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i7, e7 = false, h4) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (false === e7 && (h4 = this[t5]), i7 ??= r6.getPropertyOptions(t5), !((i7.hasChanged ?? m)(h4, s5) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i7)))) return;
      this.C(t5, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i7, reflect: e7, wrapped: h4 }, r6) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s5 ?? this[t5]), true !== h4 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t5, s5)), true === e7 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i7] of t6) {
        const { wrapped: t7 } = i7, e7 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e7 || this.C(s6, void 0, i7, e7);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
g.elementStyles = [], g.shadowRootOptions = { mode: "open" }, g[f("elementProperties")] = /* @__PURE__ */ new Map(), g[f("finalized")] = /* @__PURE__ */ new Map(), u?.({ ReactiveElement: g }), (l.reactiveElementVersions ??= []).push("2.1.2");

// lit-html/lit-html.js
var t2 = globalThis;
var i2 = (t5) => t5;
var s2 = t2.trustedTypes;
var e2 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m2 = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g2 = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i7, ...s5) => ({ _$litType$: t5, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e2 ? e2.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s5 = t5.length - 1, e7 = [];
  let n6, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t5[i8];
    let a3, u5, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u5 = c5.exec(s6), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m2 : void 0 !== u5[2] ? (y2.test(u5[2]) && (n6 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n6 ?? v, d3 = -1) : void 0 === u5[1] ? d3 = -2 : (d3 = c5.lastIndex - u5[2].length, a3 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g2) : c5 === $ || c5 === g2 ? c5 = p2 : c5 === _ || c5 === m2 ? c5 = v : (c5 = p2, n6 = void 0);
    const x2 = c5 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d3 >= 0 ? (e7.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t5, l3 + (t5[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e7];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e7) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u5 = t5.length - 1, d3 = this.parts, [f3, v3] = N(t5, i7);
    if (this.el = _S.createElement(f3, e7), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
          const i8 = v3[a3++], s5 = r6.getAttribute(t6).split(o3), e8 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e8[2], strings: s5, ctor: "." === e8[1] ? I : "?" === e8[1] ? L : "@" === e8[1] ? z : H }), r6.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3), i8 = t6.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r6.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t6[i8], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i7, s5 = t5, e7) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e7 ? s5._$Co?.[e7] : s5._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o7 && (h4?._$AO?.(false), void 0 === o7 ? h4 = void 0 : (h4 = new o7(t5), h4._$AT(t5, s5, e7)), void 0 !== e7 ? (s5._$Co ??= [])[e7] = h4 : s5._$Cl = h4), void 0 !== h4 && (i7 = M(t5, h4._$AS(t5, i7.values), h4, e7)), i7;
}
var R = class {
  constructor(t5, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e7 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e7;
    let h4 = P.nextNode(), o7 = 0, n6 = 0, r6 = s5[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i8;
        2 === r6.type ? i8 = new k(h4, h4.nextSibling, this, t5) : 1 === r6.type ? i8 = new r6.ctor(h4, r6.name, r6.strings, this, t5) : 6 === r6.type && (i8 = new Z(h4, this, t5)), this._$AV.push(i8), r6 = s5[++n6];
      }
      o7 !== r6?.index && (h4 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e7;
  }
  p(t5) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t5[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s5, e7) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s5, this.options = e7, this._$Cv = e7?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i7, _$litType$: s5 } = t5, e7 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e7) this._$AH.p(i7);
    else {
      const t6 = new R(e7, this), s6 = t6.u(this.options);
      t6.p(i7), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e7 = 0;
    for (const h4 of t5) e7 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e7], s5._$AI(h4), e7++;
    e7 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e7), i7.length = e7);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i2(t5).nextSibling;
      i2(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s5, e7, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e7, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i7 = this, s5, e7) {
    const h4 = this.strings;
    let o7 = false;
    if (void 0 === h4) t5 = M(this, t5, i7, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e8 = t5;
      let n6, r6;
      for (t5 = h4[0], n6 = 0; n6 < h4.length - 1; n6++) r6 = M(this, e8[s5 + n6], i7, n6), r6 === E && (r6 = this._$AH[n6]), o7 ||= !a2(r6) || r6 !== this._$AH[n6], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h4[n6 + 1]), this._$AH[n6] = r6;
    }
    o7 && !e7 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s5, e7, h4) {
    super(t5, i7, s5, e7, h4), this.type = 5;
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e7 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h4 = t5 !== A && (s5 === A || e7);
    e7 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i7, s5) => {
  const e7 = s5?.renderBefore ?? i7;
  let h4 = e7._$litPart$;
  if (void 0 === h4) {
    const t6 = s5?.renderBefore ?? null;
    e7._$litPart$ = h4 = new k(i7.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h4._$AI(t5), h4;
};

// lit-element/lit-element.js
var s3 = globalThis;
var i3 = class extends g {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i3._$litElement$ = true, i3["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i3 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i3 });
(s3.litElementVersions ??= []).push("4.2.2");

// @lit/reactive-element/node/decorators/property.js
var o5 = { attribute: true, type: String, converter: b, reflect: false, hasChanged: m };
var r4 = (t5 = o5, e7, r6) => {
  const { kind: n6, metadata: i7 } = r6;
  let s5 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i7, s5 = /* @__PURE__ */ new Map()), "setter" === n6 && ((t5 = Object.create(t5)).wrapped = true), s5.set(r6.name, t5), "accessor" === n6) {
    const { name: o7 } = r6;
    return { set(r7) {
      const n7 = e7.get.call(this);
      e7.set.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    }, init(e8) {
      return void 0 !== e8 && this.C(o7, void 0, t5, e8), e8;
    } };
  }
  if ("setter" === n6) {
    const { name: o7 } = r6;
    return function(r7) {
      const n7 = this[o7];
      e7.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n6);
};
function n4(t5) {
  return (e7, o7) => "object" == typeof o7 ? r4(t5, e7, o7) : ((t6, e8, o8) => {
    const r6 = e8.hasOwnProperty(o8);
    return e8.constructor.createProperty(o8, t6), r6 ? Object.getOwnPropertyDescriptor(e8, o8) : void 0;
  })(t5, e7, o7);
}

// @lit/reactive-element/node/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// @lit/reactive-element/node/decorators/base.js
var e3 = (e7, t5, c5) => (c5.configurable = true, c5.enumerable = true, Reflect.decorate && "object" != typeof t5 && Object.defineProperty(e7, t5, c5), c5);

// @lit/reactive-element/node/decorators/query.js
function e4(e7, r6) {
  return (n6, s5, i7) => {
    const o7 = (t5) => t5.renderRoot?.querySelector(e7) ?? null;
    if (r6) {
      const { get: e8, set: r7 } = "object" == typeof s5 ? n6 : i7 ?? (() => {
        const t5 = Symbol();
        return { get() {
          return this[t5];
        }, set(e9) {
          this[t5] = e9;
        } };
      })();
      return e3(n6, s5, { get() {
        let t5 = e8.call(this);
        return void 0 === t5 && (t5 = o7(this), (null !== t5 || this.hasUpdated) && r7.call(this, t5)), t5;
      } });
    }
    return e3(n6, s5, { get() {
      return o7(this);
    } });
  };
}

// @erplora/outfitkit/dist/define.js
function define(tag, ctor) {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
}

// @erplora/outfitkit/dist/shared/icons.js
var rawAdd = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 112v288m144-144H112"/></svg>';
var rawAlertCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m0 319.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.94v-.05a21.74 21.74 0 1 1 43.44 0Z"/></svg>';
var rawAlertCircleOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 0 0-5.79-6h0a5.74 5.74 0 0 0-5.68 6"/><path fill="currentColor" d="M256 367.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20"/></svg>';
var rawAppsOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="80" height="80" x="64" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/></svg>';
var rawArchiveOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M80 152v256a40.12 40.12 0 0 0 40 40h272a40.12 40.12 0 0 0 40-40V152"/><rect width="416" height="80" x="48" y="64" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="28" ry="28"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 304l-64 64l-64-64m64 41.89V224"/></svg>';
var rawArrowRedoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M448 256L272 88v96C103.57 184 64 304.77 64 424c48.61-62.24 91.6-96 208-96v96Z"/></svg>';
var rawArrowUndoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M240 424v-96c116.4 0 159.39 33.76 208 96c0-119.23-39.57-240-208-240V88L64 256Z"/></svg>';
var rawBackspaceOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M135.19 390.14a28.8 28.8 0 0 0 21.68 9.86h246.26A29 29 0 0 0 432 371.13V140.87A29 29 0 0 0 403.13 112H156.87a28.84 28.84 0 0 0-21.67 9.84L46.33 256l88.86 134.11Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34m130.01 0L206.66 192.33m130.01 0L206.66 322.34m130.01 0L206.66 192.33"/></svg>';
var rawCalendarOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="416" height="384" x="48" y="80" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="48"/><circle cx="296" cy="232" r="24" fill="currentColor"/><circle cx="376" cy="232" r="24" fill="currentColor"/><circle cx="296" cy="312" r="24" fill="currentColor"/><circle cx="376" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="312" r="24" fill="currentColor"/><circle cx="216" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="392" r="24" fill="currentColor"/><circle cx="216" cy="392" r="24" fill="currentColor"/><circle cx="296" cy="392" r="24" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128 48v32m256-32v32"/><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M464 160H48"/></svg>';
var rawCheckmarkCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m108.25 138.29l-134.4 160a16 16 0 0 1-12 5.71h-.27a16 16 0 0 1-11.89-5.3l-57.6-64a16 16 0 1 1 23.78-21.4l45.29 50.32l122.59-145.91a16 16 0 0 1 24.5 20.58"/></svg>';
var rawCheckmarkOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M416 128L192 384l-96-96"/></svg>';
var rawChevronBack = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronBackOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronDownOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 184l144 144l144-144"/></svg>';
var rawChevronForward = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronForwardOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronUpOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 328l144-144l144 144"/></svg>';
var rawClose = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34Z"/></svg>';
var rawCloseOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144m224 0L144 368"/></svg>';
var rawCloudUploadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M320 367.79h76c55 0 100-29.21 100-83.6s-53-81.47-96-83.6c-8.89-85.06-71-136.8-144-136.8c-69 0-113.44 45.79-128 91.2c-60 5.7-112 43.88-112 106.4s54 106.4 120 106.4h56"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 255.79l-64-64l-64 64m64 192.42V207.79"/></svg>';
var rawCreateOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48"/><path fill="currentColor" d="M459.94 53.25a16.06 16.06 0 0 0-23.22-.56L424.35 65a8 8 0 0 0 0 11.31l11.34 11.32a8 8 0 0 0 11.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38M399.34 90L218.82 270.2a9 9 0 0 0-2.31 3.93L208.16 299a3.91 3.91 0 0 0 4.86 4.86l24.85-8.35a9 9 0 0 0 3.93-2.31L422 112.66a9 9 0 0 0 0-12.66l-9.95-10a9 9 0 0 0-12.71 0"/></svg>';
var rawContractOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 416V304h112m-101.8 10.23L432 432M208 96v112H96m101.8-10.23L80 80m336 128H304V96m10.23 101.8L432 80M96 304h112v112m-10.23-101.8L80 432"/></svg>';
var rawDocumentAttachOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M208 64h66.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62V432a48 48 0 0 1-48 48H192a48 48 0 0 1-48-48V304"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M288 72v120a32 32 0 0 0 32 32h120"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M160 80v152a23.69 23.69 0 0 1-24 24c-12 0-24-9.1-24-24V88c0-30.59 16.57-56 48-56s48 24.8 48 55.38v138.75c0 43-27.82 77.87-72 77.87s-72-34.86-72-77.87V144"/></svg>';
var rawDocumentOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120"/></svg>';
var rawDocumentTextOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120m-232 80h160m-160 80h160"/></svg>';
var rawDownloadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 176h40a40 40 0 0 1 40 40v208a40 40 0 0 1-40 40H136a40 40 0 0 1-40-40V216a40 40 0 0 1 40-40h40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m176 272l80 80l80-80M256 48v288"/></svg>';
var rawEllipsisVertical = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><circle cx="256" cy="256" r="48" fill="currentColor"/><circle cx="256" cy="416" r="48" fill="currentColor"/><circle cx="256" cy="96" r="48" fill="currentColor"/></svg>';
var rawExpandOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320v112H320m101.8-10.23L304 304M80 192V80h112M90.2 90.23L208 208M320 80h112v112M421.77 90.2L304 208M192 432H80V320m10.23 101.8L208 304"/></svg>';
var rawFileTrayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M384 80H128c-26 0-43 14-48 40L48 272v112a48.14 48.14 0 0 0 48 48h320a48.14 48.14 0 0 0 48-48V272l-32-152c-5-27-23-40-48-40Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M48 272h144m128 0h144m-272 0a64 64 0 0 0 128 0"/></svg>';
var rawFolderOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M64 192v-72a40 40 0 0 1 40-40h75.89a40 40 0 0 1 22.19 6.72l27.84 18.56a40 40 0 0 0 22.19 6.72H408a40 40 0 0 1 40 40v40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M479.9 226.55L463.68 392a40 40 0 0 1-39.93 40H88.25a40 40 0 0 1-39.93-40L32.1 226.55A32 32 0 0 1 64 192h384.1a32 32 0 0 1 31.8 34.55"/></svg>';
var rawInformationCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 56C145.72 56 56 145.72 56 256s89.72 200 200 200s200-89.72 200-200S366.28 56 256 56m0 82a26 26 0 1 1-26 26a26 26 0 0 1 26-26m48 226h-88a16 16 0 0 1 0-32h28v-88h-16a16 16 0 0 1 0-32h32a16 16 0 0 1 16 16v104h28a16 16 0 0 1 0 32"/></svg>';
var rawMenuOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 160h352M80 256h352M80 352h352"/></svg>';
var rawNotificationsOffOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128.51 204.59q-.37 6.15-.37 12.76C128.14 304 110 320 84.33 351.43C73.69 364.45 83 384 101.62 384H320m94.5-48.7c-18.48-23.45-30.62-47.05-30.62-118c0-79.3-40.52-107.57-73.88-121.3c-4.43-1.82-8.6-6-9.95-10.55C294.21 65.54 277.82 48 256 48s-38.2 17.55-44 37.47c-1.35 4.6-5.52 8.71-10 10.53a150 150 0 0 0-18 8.79M320 384v16a64 64 0 0 1-128 0v-16"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M448 448L64 64"/></svg>';
var rawOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288L440 72"/></svg>';
var rawPlayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16Z"/></svg>';
var rawRemove = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 256H112"/></svg>';
var rawSearchOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg>';
var rawSend = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m476.59 227.05l-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52A24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4a24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8"/></svg>';
var rawSwapVerticalOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M464 208L352 96L240 208m112-94.87V416M48 304l112 112l112-112m-112 94V96"/></svg>';
var rawTrashOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320"/><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 112h352"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M192 112V72h0a23.93 23.93 0 0 1 24-24h80a23.93 23.93 0 0 1 24 24h0v40m-64 64v224m-72-224l8 224m136-224l-8 224"/></svg>';
var rawTrendingDown = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 368h112V256"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 144l121.37 121.37a32 32 0 0 0 45.26 0l50.74-50.74a32 32 0 0 1 45.26 0L448 352"/></svg>';
var rawTrendingUp = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 144h112v112"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 368l121.37-121.37a32 32 0 0 1 45.26 0l50.74 50.74a32 32 0 0 0 45.26 0L448 160"/></svg>';
var rawVolumeHighOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M126 192H56a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a15.93 15.93 0 0 1 10.14 3.54l91.47 74.89A8 8 0 0 0 240 392V120a8 8 0 0 0-12.74-6.43l-91.47 74.89A15 15 0 0 1 126 192m194 128c9.74-19.38 16-40.84 16-64c0-23.48-6-44.42-16-64m48 176c19.48-33.92 32-64.06 32-112s-12-77.74-32-112m48 272c30-46 48-91.43 48-160s-18-113-48-160"/></svg>';
var rawVolumeLowOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M189.65 192H120a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a16 16 0 0 1 10.14 3.63l91.47 75a8 8 0 0 0 12.74-6.46V119.83a8 8 0 0 0-12.74-6.44l-91.47 75a16 16 0 0 1-10.14 3.61M384 320c9.74-19.41 16-40.81 16-64c0-23.51-6-44.4-16-64"/></svg>';
var rawVolumeMuteOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M416 432L64 80"/><path fill="currentColor" d="M224 136.92v33.8a4 4 0 0 0 1.17 2.82l24 24a4 4 0 0 0 6.83-2.82v-74.15a24.53 24.53 0 0 0-12.67-21.72a23.91 23.91 0 0 0-25.55 1.83a8 8 0 0 0-.66.51l-31.94 26.15a4 4 0 0 0-.29 5.92l17.05 17.06a4 4 0 0 0 5.37.26Zm0 238.16l-78.07-63.92a32 32 0 0 0-20.28-7.16H64v-96h50.72a4 4 0 0 0 2.82-6.83l-24-24a4 4 0 0 0-2.82-1.17H56a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h69.76l91.36 74.8a8 8 0 0 0 .66.51a23.93 23.93 0 0 0 25.85 1.69A24.49 24.49 0 0 0 256 391.45v-50.17a4 4 0 0 0-1.17-2.82l-24-24a4 4 0 0 0-6.83 2.82ZM352 256c0-24.56-5.81-47.88-17.75-71.27a16 16 0 0 0-28.5 14.54C315.34 218.06 320 236.62 320 256q0 4-.31 8.13a8 8 0 0 0 2.32 6.25l19.66 19.67a4 4 0 0 0 6.75-2A147 147 0 0 0 352 256m64 0c0-51.19-13.08-83.89-34.18-120.06a16 16 0 0 0-27.64 16.12C373.07 184.44 384 211.83 384 256c0 23.83-3.29 42.88-9.37 60.65a8 8 0 0 0 1.9 8.26l16.77 16.76a4 4 0 0 0 6.52-1.27C410.09 315.88 416 289.91 416 256"/><path fill="currentColor" d="M480 256c0-74.26-20.19-121.11-50.51-168.61a16 16 0 1 0-27 17.22C429.82 147.38 448 189.5 448 256c0 47.45-8.9 82.12-23.59 113a4 4 0 0 0 .77 4.55L443 391.39a4 4 0 0 0 6.4-1C470.88 348.22 480 307 480 256"/></svg>';
var rawWarning = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M449.07 399.08L278.64 82.58c-12.08-22.44-44.26-22.44-56.35 0L51.87 399.08A32 32 0 0 0 80 446.25h340.89a32 32 0 0 0 28.18-47.17m-198.6-1.83a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.95a21.73 21.73 0 0 1 21.5-22.69h.21a21.74 21.74 0 0 1 21.73 22.7Z"/></svg>';
function bake(svg) {
  return `data:image/svg+xml;utf8,${svg}`;
}
var iconAdd = bake(rawAdd);
var iconAlertCircle = bake(rawAlertCircle);
var iconAlertCircleOutline = bake(rawAlertCircleOutline);
var iconAppsOutline = bake(rawAppsOutline);
var iconArchiveOutline = bake(rawArchiveOutline);
var iconArrowRedoOutline = bake(rawArrowRedoOutline);
var iconArrowUndoOutline = bake(rawArrowUndoOutline);
var iconBackspaceOutline = bake(rawBackspaceOutline);
var iconCalendarOutline = bake(rawCalendarOutline);
var iconCheckmarkCircle = bake(rawCheckmarkCircle);
var iconCheckmarkOutline = bake(rawCheckmarkOutline);
var iconChevronBack = bake(rawChevronBack);
var iconChevronBackOutline = bake(rawChevronBackOutline);
var iconChevronDownOutline = bake(rawChevronDownOutline);
var iconChevronForward = bake(rawChevronForward);
var iconChevronForwardOutline = bake(rawChevronForwardOutline);
var iconChevronUpOutline = bake(rawChevronUpOutline);
var iconClose = bake(rawClose);
var iconCloseOutline = bake(rawCloseOutline);
var iconCloudUploadOutline = bake(rawCloudUploadOutline);
var iconCreateOutline = bake(rawCreateOutline);
var iconDocumentAttachOutline = bake(rawDocumentAttachOutline);
var iconContractOutline = bake(rawContractOutline);
var iconDocumentOutline = bake(rawDocumentOutline);
var iconDocumentTextOutline = bake(rawDocumentTextOutline);
var iconDownloadOutline = bake(rawDownloadOutline);
var iconEllipsisVertical = bake(rawEllipsisVertical);
var iconExpandOutline = bake(rawExpandOutline);
var iconFileTrayOutline = bake(rawFileTrayOutline);
var iconFolderOpenOutline = bake(rawFolderOpenOutline);
var iconInformationCircle = bake(rawInformationCircle);
var iconMenuOutline = bake(rawMenuOutline);
var iconNotificationsOffOutline = bake(rawNotificationsOffOutline);
var iconOpenOutline = bake(rawOpenOutline);
var iconPlayOutline = bake(rawPlayOutline);
var iconRemove = bake(rawRemove);
var iconSearchOutline = bake(rawSearchOutline);
var iconSend = bake(rawSend);
var iconSwapVerticalOutline = bake(rawSwapVerticalOutline);
var iconTrashOutline = bake(rawTrashOutline);
var iconTrendingDown = bake(rawTrendingDown);
var iconTrendingUp = bake(rawTrendingUp);
var iconVolumeHighOutline = bake(rawVolumeHighOutline);
var iconVolumeLowOutline = bake(rawVolumeLowOutline);
var iconVolumeMuteOutline = bake(rawVolumeMuteOutline);
var iconWarning = bake(rawWarning);
var BY_NAME = {
  "add": iconAdd,
  "alert-circle": iconAlertCircle,
  "alert-circle-outline": iconAlertCircleOutline,
  "apps-outline": iconAppsOutline,
  "archive-outline": iconArchiveOutline,
  "arrow-redo-outline": iconArrowRedoOutline,
  "arrow-undo-outline": iconArrowUndoOutline,
  "backspace-outline": iconBackspaceOutline,
  "calendar-outline": iconCalendarOutline,
  "checkmark-circle": iconCheckmarkCircle,
  "checkmark-outline": iconCheckmarkOutline,
  "chevron-back": iconChevronBack,
  "chevron-back-outline": iconChevronBackOutline,
  "chevron-down-outline": iconChevronDownOutline,
  "chevron-forward": iconChevronForward,
  "chevron-forward-outline": iconChevronForwardOutline,
  "chevron-up-outline": iconChevronUpOutline,
  "close": iconClose,
  "close-outline": iconCloseOutline,
  "cloud-upload-outline": iconCloudUploadOutline,
  "create-outline": iconCreateOutline,
  "document-attach-outline": iconDocumentAttachOutline,
  "contract-outline": iconContractOutline,
  "document-outline": iconDocumentOutline,
  "document-text-outline": iconDocumentTextOutline,
  "download-outline": iconDownloadOutline,
  "ellipsis-vertical": iconEllipsisVertical,
  "expand-outline": iconExpandOutline,
  "file-tray-outline": iconFileTrayOutline,
  "folder-open-outline": iconFolderOpenOutline,
  "information-circle": iconInformationCircle,
  "menu-outline": iconMenuOutline,
  "notifications-off-outline": iconNotificationsOffOutline,
  "open-outline": iconOpenOutline,
  "play-outline": iconPlayOutline,
  "remove": iconRemove,
  "search-outline": iconSearchOutline,
  "send": iconSend,
  "swap-vertical-outline": iconSwapVerticalOutline,
  "trash-outline": iconTrashOutline,
  "trending-down": iconTrendingDown,
  "trending-up": iconTrendingUp,
  "volume-high-outline": iconVolumeHighOutline,
  "volume-low-outline": iconVolumeLowOutline,
  "volume-mute-outline": iconVolumeMuteOutline,
  "warning": iconWarning
};
function okIcon(value) {
  if (!value) return void 0;
  const trimmed = value.trimStart();
  if (trimmed.startsWith("<svg")) return bake(trimmed);
  return BY_NAME[value] ?? value;
}

// @erplora/outfitkit/dist/ok-inline-feedback.js
var __defProp2 = Object.defineProperty;
var __decorateClass2 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp2(target, key, result);
  return result;
};
var DEFAULT_LABELS = {
  dismiss: "Dismiss"
};
var OkInlineFeedback = class extends i3 {
  constructor() {
    super(...arguments);
    this.tone = "info";
    this.dismissible = false;
    this.hidden = false;
    this.labels = {};
    this.hasActions = false;
    this.onActionsSlotChange = (e7) => {
      const slot = e7.target;
      this.hasActions = slot.assignedNodes({ flatten: true }).length > 0;
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex.
         --tone-color y --tone-icon se reasignan por tone abajo. */
      --tone-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --background-opacity: 0.1;
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --border-radius: var(--ok-radius, var(--ion-border-radius, 8px));
      --padding: var(--ok-spacing, var(--ion-padding, 16px));
      --accent-width: 4px;
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      /* Responsive: el banner ocupa el ancho del contenedor. */
      display: block;
      width: 100%;
      font-family: var(--font);
      box-sizing: border-box;
    }
    :host([hidden]) { display: none; }

    /* Mapa de tonos → color Ionic + icono por defecto. */
    :host([tone='success']) { --tone-color: var(--ok-success, var(--ion-color-success, #2dd55b)); }
    :host([tone='warning']) { --tone-color: var(--ok-warning, var(--ion-color-warning, #ffc409)); }
    :host([tone='danger'])  { --tone-color: var(--ok-danger, var(--ion-color-danger, #c5000f)); }
    :host([tone='neutral']) { --tone-color: var(--ok-medium, var(--ion-color-medium, #5f5f5f)); }
    /* info / sin tono → primary (default ya aplicado en :host). */

    .box {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: var(--padding);
      border-radius: var(--border-radius);
      border-inline-start: var(--accent-width) solid var(--tone-color);
      /* Fondo tonal: el color del tono con baja opacidad (color-mix con fallback al borde fino). */
      background: color-mix(in srgb, var(--tone-color) calc(var(--background-opacity) * 100%), transparent);
      color: var(--color);
    }

    .icon {
      flex: 0 0 auto;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--tone-color);
      margin-top: 0.05rem;
    }

    .content {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .row {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .text {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .heading {
      font-weight: 700;
      font-size: 0.98rem;
      line-height: 1.3;
    }
    .body {
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .actions {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    /* Si no hay actions, el slot queda vacío y no ocupa espacio. */
    .actions.empty { display: none; }

    .close {
      flex: 0 0 auto;
      background: none;
      border: 0;
      cursor: pointer;
      padding: 0.15rem;
      margin: -0.15rem -0.15rem 0 0;
      color: inherit;
      opacity: 0.6;
      font-size: 1.2rem;
      line-height: 1;
      border-radius: 4px;
      transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease),
        border-color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease),
        opacity 0.15s ease, transform 120ms ease;
    }
    @media (hover: hover) {
      .close:hover { opacity: 1; background: rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07); }
    }
    .close:active { transform: scale(var(--ok-press-scale, 0.97)); }

    /* Móvil: las actions bajan bajo el texto (apiladas a ancho completo). */
    @media (max-width: 640px) {
      .row { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .close:hover,
      .close:active { transform: none; }
    }
  `;
  }
  // Textos efectivos: defaults en inglés + overrides del consumidor.
  get t() {
    return { ...DEFAULT_LABELS, ...this.labels };
  }
  // Icono por defecto según el tono (overridable por la prop `icon`).
  defaultIcon() {
    switch (this.tone) {
      case "success":
        return iconCheckmarkCircle;
      case "warning":
        return iconWarning;
      case "danger":
        return iconAlertCircle;
      case "neutral":
        return iconInformationCircle;
      case "info":
      default:
        return iconInformationCircle;
    }
  }
  // Oculta el banner y avisa al consumidor; éste puede revertir restaurando `hidden=false`.
  dismiss() {
    this.hidden = true;
    this.dispatchEvent(new CustomEvent("ok-dismiss", { bubbles: true, composed: true }));
  }
  render() {
    const iconName = this.icon ?? this.defaultIcon();
    return b2`
      <div class="box" role="status">
        <ion-icon class="icon" .icon=${okIcon(iconName)} aria-hidden="true"></ion-icon>
        <div class="content">
          <div class="row">
            <div class="text">
              ${this.heading ? b2`<div class="heading">${this.heading}</div>` : null}
              <div class="body"><slot></slot></div>
            </div>
            <div class="actions ${this.hasActions ? "" : "empty"}">
              <slot name="actions" @slotchange=${this.onActionsSlotChange}></slot>
            </div>
          </div>
        </div>
        ${this.dismissible ? b2`
              <button class="close" aria-label=${this.t.dismiss} @click=${this.dismiss}>
                <ion-icon .icon=${iconClose} aria-hidden="true"></ion-icon>
              </button>
            ` : null}
      </div>
    `;
  }
};
__decorateClass2([
  n4({ type: String, reflect: true })
], OkInlineFeedback.prototype, "tone");
__decorateClass2([
  n4({ type: String })
], OkInlineFeedback.prototype, "heading");
__decorateClass2([
  n4({ type: String })
], OkInlineFeedback.prototype, "icon");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "dismissible");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "hidden");
__decorateClass2([
  n4({ attribute: false })
], OkInlineFeedback.prototype, "labels");
__decorateClass2([
  r5()
], OkInlineFeedback.prototype, "hasActions");
define("ok-inline-feedback", OkInlineFeedback);

// lit-html/directive.js
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e5 = (t5) => (...e7) => ({ _$litDirective$: t5, values: e7 });
var i4 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e7, i7) {
    this._$Ct = t5, this._$AM = e7, this._$Ci = i7;
  }
  _$AS(t5, e7) {
    return this.update(t5, e7);
  }
  update(t5, e7) {
    return this.render(...e7);
  }
};

// lit-html/directive-helpers.js
var { I: t4 } = j;
var i5 = (o7) => o7;
var s4 = () => document.createComment("");
var v2 = (o7, n6, e7) => {
  const l3 = o7._$AA.parentNode, d3 = void 0 === n6 ? o7._$AB : n6._$AA;
  if (void 0 === e7) {
    const i7 = l3.insertBefore(s4(), d3), n7 = l3.insertBefore(s4(), d3);
    e7 = new t4(i7, n7, o7, o7.options);
  } else {
    const t5 = e7._$AB.nextSibling, n7 = e7._$AM, c5 = n7 !== o7;
    if (c5) {
      let t6;
      e7._$AQ?.(o7), e7._$AM = o7, void 0 !== e7._$AP && (t6 = o7._$AU) !== n7._$AU && e7._$AP(t6);
    }
    if (t5 !== d3 || c5) {
      let o8 = e7._$AA;
      for (; o8 !== t5; ) {
        const t6 = i5(o8).nextSibling;
        i5(l3).insertBefore(o8, d3), o8 = t6;
      }
    }
  }
  return e7;
};
var u3 = (o7, t5, i7 = o7) => (o7._$AI(t5, i7), o7);
var m3 = {};
var p3 = (o7, t5 = m3) => o7._$AH = t5;
var M2 = (o7) => o7._$AH;
var h3 = (o7) => {
  o7._$AR(), o7._$AA.remove();
};

// lit-html/directives/repeat.js
var u4 = (e7, s5, t5) => {
  const r6 = /* @__PURE__ */ new Map();
  for (let l3 = s5; l3 <= t5; l3++) r6.set(e7[l3], l3);
  return r6;
};
var c4 = e5(class extends i4 {
  constructor(e7) {
    if (super(e7), e7.type !== t3.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(e7, s5, t5) {
    let r6;
    void 0 === t5 ? t5 = s5 : void 0 !== s5 && (r6 = s5);
    const l3 = [], o7 = [];
    let i7 = 0;
    for (const s6 of e7) l3[i7] = r6 ? r6(s6, i7) : i7, o7[i7] = t5(s6, i7), i7++;
    return { values: o7, keys: l3 };
  }
  render(e7, s5, t5) {
    return this.dt(e7, s5, t5).values;
  }
  update(s5, [t5, r6, c5]) {
    const d3 = M2(s5), { values: p4, keys: a3 } = this.dt(t5, r6, c5);
    if (!Array.isArray(d3)) return this.ut = a3, p4;
    const h4 = this.ut ??= [], v3 = [];
    let m4, y3, x2 = 0, j2 = d3.length - 1, k2 = 0, w2 = p4.length - 1;
    for (; x2 <= j2 && k2 <= w2; ) if (null === d3[x2]) x2++;
    else if (null === d3[j2]) j2--;
    else if (h4[x2] === a3[k2]) v3[k2] = u3(d3[x2], p4[k2]), x2++, k2++;
    else if (h4[j2] === a3[w2]) v3[w2] = u3(d3[j2], p4[w2]), j2--, w2--;
    else if (h4[x2] === a3[w2]) v3[w2] = u3(d3[x2], p4[w2]), v2(s5, v3[w2 + 1], d3[x2]), x2++, w2--;
    else if (h4[j2] === a3[k2]) v3[k2] = u3(d3[j2], p4[k2]), v2(s5, d3[x2], d3[j2]), j2--, k2++;
    else if (void 0 === m4 && (m4 = u4(a3, k2, w2), y3 = u4(h4, x2, j2)), m4.has(h4[x2])) if (m4.has(h4[j2])) {
      const e7 = y3.get(a3[k2]), t6 = void 0 !== e7 ? d3[e7] : null;
      if (null === t6) {
        const e8 = v2(s5, d3[x2]);
        u3(e8, p4[k2]), v3[k2] = e8;
      } else v3[k2] = u3(t6, p4[k2]), v2(s5, d3[x2], t6), d3[e7] = null;
      k2++;
    } else h3(d3[j2]), j2--;
    else h3(d3[x2]), x2++;
    for (; k2 <= w2; ) {
      const e7 = v2(s5, v3[w2 + 1]);
      u3(e7, p4[k2]), v3[k2++] = e7;
    }
    for (; x2 <= j2; ) {
      const e7 = d3[x2++];
      null !== e7 && h3(e7);
    }
    return this.ut = a3, p3(s5, v3), E;
  }
});

// lit-html/directives/style-map.js
var n5 = "important";
var i6 = " !" + n5;
var o6 = e5(class extends i4 {
  constructor(t5) {
    if (super(t5), t5.type !== t3.ATTRIBUTE || "style" !== t5.name || t5.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t5) {
    return Object.keys(t5).reduce((e7, r6) => {
      const s5 = t5[r6];
      return null == s5 ? e7 : e7 + `${r6 = r6.includes("-") ? r6 : r6.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${s5};`;
    }, "");
  }
  update(e7, [r6]) {
    const { style: s5 } = e7.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(r6)), this.render(r6);
    for (const t5 of this.ft) null == r6[t5] && (this.ft.delete(t5), t5.includes("-") ? s5.removeProperty(t5) : s5[t5] = null);
    for (const t5 in r6) {
      const e8 = r6[t5];
      if (null != e8) {
        this.ft.add(t5);
        const r7 = "string" == typeof e8 && e8.endsWith(i6);
        t5.includes("-") || r7 ? s5.setProperty(t5, r7 ? e8.slice(0, -11) : e8, r7 ? n5 : "") : s5[t5] = e8;
      }
    }
    return E;
  }
});

// @erplora/outfitkit/dist/ok-data-table.js
var CSV_BOM = "\uFEFF";
var WINDOWS_1252_C1 = [
  8364,
  129,
  8218,
  402,
  8222,
  8230,
  8224,
  8225,
  710,
  8240,
  352,
  8249,
  338,
  141,
  381,
  143,
  144,
  8216,
  8217,
  8220,
  8221,
  8226,
  8211,
  8212,
  732,
  8482,
  353,
  8250,
  339,
  157,
  382,
  376
];
function decodeWindows1252(bytes) {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte >= 128 && byte <= 159 ? WINDOWS_1252_C1[byte - 128] : byte);
  }
  return text;
}
function decodeCsvBuffer(buf) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    text = decodeWindows1252(new Uint8Array(buf));
  }
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
var __defProp3 = Object.defineProperty;
var __decorateClass3 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp3(target, key, result);
  return result;
};
function decideRowActionsFit(input) {
  const { containerWidth, contentWidth, collapsed, decidedAtWidth } = input;
  if (!(containerWidth > 0)) return { collapsed, decidedAtWidth };
  if (containerWidth !== decidedAtWidth) {
    if (collapsed) return { collapsed: false, decidedAtWidth: containerWidth };
    return { collapsed: contentWidth > containerWidth, decidedAtWidth: containerWidth };
  }
  if (!collapsed && contentWidth > containerWidth) return { collapsed: true, decidedAtWidth };
  return { collapsed, decidedAtWidth };
}
var DEFAULT_LABELS2 = {
  search: "Search\u2026",
  empty: "No results",
  filters: "Filters",
  clear: "Clear",
  apply: "Apply",
  selected: "{n} selected",
  importCsv: "Import CSV",
  exportCsv: "Export CSV",
  add: "Add",
  moreActions: "More actions",
  rowsPerPage: "Rows per page",
  perPageShort: "{n} / page",
  viewList: "View as list",
  viewCards: "View as cards",
  columnsVisible: "Visible columns",
  columns: "Columns",
  actions: "Actions",
  close: "Close",
  newRecord: "New",
  form: "Form",
  filterPlaceholder: "Filter\u2026",
  from: "From",
  to: "To",
  fromOf: "{label} from",
  toOf: "{label} to",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "No values",
  selectAll: "Select all",
  selectRow: "Select row",
  select: "Select",
  showing: "Showing {from}\u2013{to} of",
  recordSingular: "record",
  recordPlural: "records",
  loadMore: "Load more"
};
var ES_LABELS = {
  search: "Buscar\u2026",
  empty: "Sin resultados",
  filters: "Filtros",
  clear: "Limpiar",
  apply: "Aplicar",
  selected: "{n} seleccionados",
  importCsv: "Importar CSV",
  exportCsv: "Exportar CSV",
  add: "A\xF1adir",
  moreActions: "M\xE1s acciones",
  rowsPerPage: "Filas por p\xE1gina",
  perPageShort: "{n} / p\xE1g.",
  viewList: "Vista lista",
  viewCards: "Vista tarjetas",
  columnsVisible: "Columnas visibles",
  columns: "Columnas",
  actions: "Acciones",
  close: "Cerrar",
  newRecord: "Nuevo",
  form: "Formulario",
  filterPlaceholder: "Filtrar\u2026",
  from: "Desde",
  to: "Hasta",
  fromOf: "{label} desde",
  toOf: "{label} hasta",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "Sin valores",
  selectAll: "Seleccionar todo",
  selectRow: "Seleccionar fila",
  select: "Seleccionar",
  showing: "Mostrando {from}\u2013{to} de",
  recordSingular: "registro",
  recordPlural: "registros",
  loadMore: "Cargar m\xE1s"
};
var _OkDataTable = class _OkDataTable2 extends i3 {
  constructor() {
    super(...arguments);
    this.columns = [];
    this.rows = [];
    this.searchKeys = [];
    this.rowKeyField = "id";
    this.pageSize = 10;
    this.labels = {};
    this.actions = [];
    this.addable = false;
    this.pageSizeOptions = [10, 25, 50, 100];
    this.fill = false;
    this.columnPicker = true;
    this.csv = false;
    this.csvName = "export.csv";
    this.serverSide = false;
    this.total = 0;
    this.page = 0;
    this.searchable = false;
    this.sortDir = "asc";
    this.filterValues = {};
    this.title = "";
    this.views = false;
    this.exportable = false;
    this.importable = false;
    this.columnSelector = false;
    this.rowClickable = false;
    this.selectable = false;
    this.inlineFilters = false;
    this.menuActions = [];
    this.q = "";
    this.clientPage = 0;
    this.clientPageSize = 0;
    this.mobileShown = 0;
    this.clientSort = "";
    this.clientSortDir = "asc";
    this.clientFilters = {};
    this.filterDraft = {};
    this.serverFilters = {};
    this.panel = "none";
    this.viewMode = "table";
    this.viewChosenByUser = false;
    this.isMobile = false;
    this.xOverflow = false;
    this.actionsTrackPx = 0;
    this.rowActionsCollapsed = false;
    this.fitDecidedAtWidth = -1;
    this.rowMenuOpen = false;
    this.hiddenKeys = /* @__PURE__ */ new Set();
    this.internalSelection = /* @__PURE__ */ new Set();
    this.menuOpen = false;
    this.onLocaleChanged = () => this.requestUpdate();
    this.onWindowResize = () => {
      this.measureXOverflow();
      this.measureRowActionsFit();
    };
    this.onSearch = (ev) => {
      const value = ev.target.value ?? "";
      if (this.serverSide) {
        this.q = value;
        this.emit("searchChange", value);
      } else {
        this.q = value;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex */
      --background: var(--ok-surface, var(--ion-card-background, var(--ion-background-color, #ffffff)));
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-muted, var(--ion-color-medium, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.55)));
      --border-color: var(--ok-border, var(--ion-color-step-150, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.12)));
      --border-color-soft: var(--ok-border-soft, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07)));
      /* Borde más marcado para los controles de la toolbar (selects/pastilla de fechas), para que se
       * distingan como controles en claro y oscuro aunque el lienzo y la superficie casi no contrasten. */
      --control-border: color-mix(in srgb, var(--color) 22%, transparent);
      /* Relieve de cabecera/pie: step-100 (definido en claro y oscuro) → contraste con el lienzo. */
      --header-background: var(--ok-surface-2, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04)));
      --row-hover: var(--ok-row-hover, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.03)));
      --primary: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --primary-contrast: var(--ok-primary-contrast, var(--ion-color-primary-contrast, #ffffff));
      --border-radius: var(--ok-radius, 16px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      display: block;
      color: var(--color);
      font-family: var(--font);
    }
    * { box-sizing: border-box; }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      /* Flat: sin borde ni elevación (directiva 2026-06-09). */
      border: 0;
      border-radius: var(--border-radius);
      overflow: hidden;
      background: var(--background);
      box-shadow: none;
    }

    /* Panel lateral derecho (drawer) DENTRO de la tabla: filtros / alta-edición. Base (sin media):
       overlay absoluto — es lo que había hasta #75 y lo que ve un navegador sin media queries. */
    .tk-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.18); z-index: 19; }
    .drawer { position: absolute; top: 0; right: 0; height: 100%; width: 340px; max-width: 88%;
      background: var(--background); border-left: 1px solid var(--border-color);
      display: flex; flex-direction: column; z-index: 20;
      animation: tk-slide-in 0.18s ease; }
    @keyframes tk-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
    /* #75 — El panel EMPUJA en escritorio y es HOJA COMPLETA en móvil; nunca tapa a medias.
       Medido en el hub (Servicios/Citas): a 1440 el overlay de 340px se pintaba ENCIMA de
       «Duración», «Acciones» y el selector de columnas, con el 90% de la tabla vacío a la
       izquierda; a 390 dejaba una tira de 45px de tabla (media lupa, medio «Co…») que hacía
       parecer el formulario un pop-up mal puesto. Square Dashboard reduce la tabla con un panel
       fijo; Fresha/Shopify/Odoo abren una hoja a pantalla completa en móvil.
       ≥ 834px: mientras hay panel, .card pasa a rejilla de DOS columnas (tabla | panel 360px):
       la tabla se estrecha (ya sabe hacer scroll-x, #67) y nada queda tapado. */
    @media (min-width: 834px) {
      .card.has-panel { display: grid; grid-template-columns: minmax(0, 1fr) 360px; grid-template-rows: auto minmax(0, 1fr) auto; }
      .card.has-panel > .bar { grid-column: 1; grid-row: 1; }
      .card.has-panel > .scroll, .card.has-panel > .cards-grid, .card.has-panel > .empty { grid-column: 1; grid-row: 2; min-height: 0; overflow: auto; }
      .card.has-panel > .pager { grid-column: 1; grid-row: 3; }
      .card.has-panel > .drawer { position: static; grid-column: 2; grid-row: 1 / -1; width: auto; max-width: none; height: auto; min-height: 0; animation: none; }
      .card.has-panel > .tk-scrim { display: none; }
    }
    /* < 834px: hoja a pantalla completa con su cabecera (título + Cerrar); sin tira residual.
       position:fixed dentro de ion-content se ancla al área de contenido (contain), que es justo el hueco
       bajo la cabecera de la app: el usuario conserva el título de la página. */
    @media (max-width: 833.98px) {
      .drawer { position: fixed; inset: 0; top: var(--ok-sheet-top, 0px); width: 100%; max-width: none; height: auto; border-left: 0; z-index: 1000; }
      .tk-scrim { display: none; }
    }
    .drawer .dh { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 0.5rem 0.6rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 1rem; }
    .drawer .db { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; }
    .fblock { display: flex; flex-direction: column; gap: 0.45rem; }
    .flabel { font-size: 13px; font-weight: 500; color: var(--color); }
    .frange { display: flex; gap: 0.5rem; }
    /* Filtros cliente: multi-select con ion-select (ventana flotante de Ionic) + rango de fechas. */
    .daterange { display: flex; gap: 0.6rem; }
    .daterange ion-input { flex: 1; }
    /* Pie del drawer de filtros: Limpiar / Aplicar. */
    .df { flex: 0 0 auto; display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; padding: 0.6rem 0.85rem; border-top: 1px solid var(--border-color); }
    .df .df-clear { margin-right: auto; }

    /* Modo fill: la tabla ocupa el alto del contenedor; filas con scroll interno; pager fijo. */
    :host([fill]) { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    :host([fill]) .card { flex: 1 1 auto; min-height: 0; }
    :host([fill]) .bar, :host([fill]) .panel, :host([fill]) .pager { flex: 0 0 auto; }
    :host([fill]) .scroll, :host([fill]) .cards-grid { flex: 1 1 auto; min-height: 0; overflow: auto; }
    /* Sin filas, renderTable/renderCards devuelven SOLO el bloque .empty (sin .scroll). En modo
       fill hay que estirarlo para que ocupe el hueco entre toolbar y pager y centre su contenido
       (icono + mensaje) en vertical; si no, queda pegado arriba con el pager a media altura. */
    :host([fill]) .empty { flex: 1 1 auto; min-height: 0; }

    /* ── Topbar / cabecera (relieve) ─────────────────────────────────────────────────────── */
    .bar { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.65rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    /* Toolbar CONSOLIDADA: TODOS los controles son hijos directos de UNA sola fila flex que
     * envuelve ELEMENTO A ELEMENTO (no por bloques): caben en una línea → una línea; los que no
     * caben bajan a la(s) línea(s) que hagan falta. El cluster derecho se empuja al borde con
     * .tk-spacer (hueco flexible) solo cuando todo cabe en una línea; al envolver, el spacer se
     * oculta y todo se apila a la izquierda.
     * ORDEN CANÓNICO (2026-06-22, izquierda→derecha): [buscador] · [filtros en línea] · ‹spacer› ·
     * [SELECTORES: columnas → filas/página] · [BOTONES: vistas → filtros(funnel) → import → export →
     * alta → ⋮ → acción primaria]. Es decir: buscador al inicio, filtros en medio, y al final los
     * selectores (columnas, luego «N por página») seguidos de los botones de acción. */
    .bar-main { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .bar-main > ion-button { --padding-start: 0.5rem; --padding-end: 0.5rem; margin: 0; }
    /* Spacer que absorbe el hueco libre en pantallas anchas (empuja el cluster derecho al borde).
     * Se oculta por debajo de 1024px para que, al envolver, los controles se apilen a la izquierda. */
    .tk-spacer { flex: 1 1 0; min-width: 0; align-self: stretch; }
    @media (max-width: 1024px) { .tk-spacer { display: none; } }
    /* Buscador a ancho completo (línea propia) en móvil; el resto envuelve debajo. */
    @media (max-width: 640px) { .search { flex-basis: 100%; max-width: none; } }
    .title-wrap { display: flex; align-items: baseline; gap: 0.5rem; }
    .title { font-size: 15px; font-weight: 600; line-height: 1; margin: 0; }
    .title-count { font-size: 12px; font-weight: 500; color: var(--color-muted); }

    /* Botón de herramienta cuadrado (filtros/import/export), look del Hub: 36×36, badge contador. */
    .toolbtn { position: relative; --padding-start: 0; --padding-end: 0; --border-radius: 10px; width: 36px; height: 36px; margin: 0; }
    .toolbtn .badge { position: absolute; top: -5px; right: -5px; min-width: 16px; height: 16px; padding: 0 3px; border-radius: 999px; background: var(--primary); color: var(--primary-contrast); font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; pointer-events: none; }

    /* Buscador (caja con icono + limpiar), look del Hub. No crece (el spacer se queda el hueco);
     * puede encoger hasta min-width y, por debajo, envuelve. */
    .search { flex: 0 1 22rem; min-width: 12rem; max-width: 24rem; }
    ion-searchbar { --background: var(--background); --border-radius: 10px; padding: 0; min-height: 36px; }
    /* Flat: el buscador quita borde y elevación vía la clase específica de Ionic 'ion-no-border'.
     * (La regla global de Ionic para .ion-no-border no cruza el Shadow DOM, así que la
     * reimplementamos aquí dentro: --box-shadow controla la elevación; ::part(native) el borde.) */
    ion-searchbar.ion-no-border { --box-shadow: none; }
    ion-searchbar.ion-no-border::part(native) { border: none; box-shadow: none; }

    /* Toggle de vista lista/tarjetas (segmento) */
    .viewseg { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--background); }
    .viewseg ion-button { --border-radius: 7px; }

    /* Botón primario (primaryAction) */
    .primary-btn { --background: var(--primary); --color: var(--primary-contrast); }
    /* #76 — El alta en MÓVIL: botón primario CON etiqueta y área táctil de 44px, en vez del «+»
       icónico de 36px al final de la barra. Fresha/Square/Shopify POS ponen la acción primaria
       de la lista como botón visible con texto (o FAB), nunca como icono anónimo.
       #113 — Y en ESCRITORIO igual: Odoo («New»), Business Central, Shopify («Add product»),
       WooCommerce, Lightspeed y Fresha rotulan y rellenan la acción principal de un listado; NN/g
       reserva el botón sin rótulo para lo universal (buscar, cerrar). Aquí solo cambia la ALTURA:
       36px para alinear con .toolbtn y el buscador, y los 44px táctiles vuelven abajo con el
       resto de objetivos de puntero grueso. */
    .add-btn { min-height: 36px; --border-radius: 10px; --padding-start: 0.9rem; --padding-end: 1rem; margin: 0; font-weight: 600; }
    .add-btn ion-icon { margin-inline-end: 0.35rem; }

    /* Selects de la toolbar: fondo + borde visibles (como el buscador y la pastilla de fechas) para
     * que se distingan como controles en claro y oscuro (sin fondo eran invisibles en dark). */
    .tk-cols { min-width: 6.5rem; max-width: 9rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.3rem; --padding-bottom: 0.3rem; }
    .vsep { width: 1px; align-self: stretch; background: var(--border-color); margin: 0.3rem 0.25rem; }

    /* Selector de filas/página en la toolbar (consolidado) */
    /* max-width: ion-select es display:block (sin core.css el host estira a la
     * línea entera cuando .bar-end hace wrap) — se capa como .tk-cols. */
    .tk-psize { min-width: 4.25rem; max-width: 5.5rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }

    /* Filtros EN LÍNEA en la toolbar (select / rango de fechas) */
    .tk-filter { min-width: 8.5rem; max-width: 13rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.7rem; --padding-end: 0.5rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }
    .tk-daterange { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.6rem; min-height: 38px; border: 1px solid var(--control-border); border-radius: 10px; background: var(--background); color: var(--color-muted); font-size: 13px; }
    .tk-daterange ion-icon { font-size: 15px; flex: 0 0 auto; }
    .tk-daterange ion-input { --background: transparent; --padding-start: 0; --padding-end: 0; --padding-top: 2px; --padding-bottom: 2px; --color: var(--color); min-height: 26px; width: 6.8rem; font-size: 13px; }
    .tk-daterange .arr { color: var(--color-muted); }

    /* Barra contextual de selección */
    .selbar { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.7rem; border-radius: 10px;
      font-size: 13px; color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .selbar .sel-clear { margin-left: auto; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer; font-weight: 500; color: inherit; background: none; border: 0; font: inherit; }
    .selbar .sel-clear:hover { text-decoration: underline; }

    /* Acordeones (alta / filtros en modo tarjetas) */
    .panel { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    .filters-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.6rem; }

    /* ── Vista lista en CSS GRID (no <table>): permite ancho por columna ──────────────────── */
    /* #67 — La barra horizontal es PERMANENTE cuando hay desbordamiento: la overlay de macOS se
       esconde a los pocos ms y deja la tabla sin ninguna pista de que sigue a la derecha. Al
       declarar ::-webkit-scrollbar el navegador pinta la clásica, que ocupa sitio y se ve. */
    .scroll { overflow-x: auto; }
    .scroll::-webkit-scrollbar { height: 10px; }
    .scroll::-webkit-scrollbar-track { background: transparent; }
    .scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color) 25%, transparent); border-radius: 6px; }
    .scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color) 40%, transparent); }
    /* #120 - The grid floor is the SUM OF THE COLUMN MINIMUMS (min-content), not its maximum
       size. With max-content the grid sizes itself to what the widest column asks for and, in
       doing so, every 1fr track ends up as wide AS THAT ONE: at 834px each column measured
       148.86px for content asking between 10px (a "4") and 100px ("Familia Perez"). The table
       always overflowed and the pinned actions column sat on top of Pax and Estado. With
       min-content the grid fits its container as long as the minimums fit, and 1fr shares out the
       leftover space; horizontal scroll shows up only when not even the minimums fit. */
    .grid { min-width: min-content; font-size: 14px; }
    .grow { display: grid; align-items: center; gap: 0.5rem; padding: 0 1rem; }
    .ghead { position: sticky; top: 0; z-index: 2; border-bottom: 1px solid var(--border-color);
      background: var(--header-background); padding-top: 0.55rem; padding-bottom: 0.55rem; }
    .gcell { display: flex; align-items: center; min-width: 0; }
    .gcell > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gcell.right { justify-content: flex-end; text-align: right; }
    .gcell.center { justify-content: center; text-align: center; }
    /* #67 - PINNED ACTIONS COLUMN. When the grid overflows (since #120 only when not even the
       column minimums fit; before that it happened with six columns and room to spare) the button
       that opens the record went off screen: at 1440px it sat 335px past the edge with nothing to
       give it away. It stays stuck to the right edge, like Zendesk/Freshdesk/Shopify. With
       background:inherit it takes the row background (which is opaque for this very reason), so it
       keeps hover and selection without anything showing through. */
    .gcell.actions-col { position: sticky; right: 0; z-index: 1; background: inherit;
      margin-right: -1rem; padding-right: 1rem; }
    /* La sombra solo aparece cuando de verdad hay algo escondido a la izquierda (clase x-overflow);
       si la tabla cabe entera no se pinta nada. */
    .scroll.x-overflow .gcell.actions-col { box-shadow: -10px 0 10px -10px color-mix(in srgb, var(--color) 45%, transparent); }
    /* #120 - The pinned header has to be OPAQUE. background:inherit took --header-background,
       which is a 4% alpha TINT (measured rgba(24,24,27,0.04)): when the grid overflows the
       "Acciones" header went see-through and "PAX" and "ESTADO" could be read through it - the
       "PAXCIONESTAD" of the issue. It now sits on the opaque table background with the tint laid
       back on top, the same way .grow-data:hover does. */
    .ghead .gcell.actions-col { z-index: 3;
      background: linear-gradient(var(--header-background), var(--header-background)), var(--background); }
    .gh { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
    .gh.sortable { cursor: pointer; user-select: none; white-space: nowrap; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    @media (hover: hover) {
      .gh.sortable:hover { color: var(--color); }
    }
    /* Caret de orden (3 estados, icono Ionic): neutral atenuado / activo en color primario. */
    .caret { display: inline-flex; align-items: center; margin-left: 0.25rem; flex: 0 0 auto; font-size: 13px; opacity: 0.3; }
    .caret.on { opacity: 1; color: var(--primary); }
    .grow-data { background: var(--background); border-bottom: 1px solid var(--border-color-soft); padding-top: 0.6rem; padding-bottom: 0.6rem; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    .grow-data:last-child { border-bottom: 0; }
    @media (hover: hover) {
      .grow-data:hover { background: linear-gradient(var(--row-hover), var(--row-hover)), var(--background); }
    }
    .grow-data:active { transform: scale(0.995); }
    .grow-data.selected { background: linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--primary) 10%, transparent)), var(--background); }
    /* #67 — Fila clicable (opt-in row-clickable): es lo primero que intenta el usuario y lo que
       hacen Odoo, Jira SM, Shopify o Square en sus listados. */
    .grow-data.clickable { cursor: pointer; }
    .grow-data.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    .selcb { display: flex; align-items: center; justify-content: center; }
    .filters-grow { padding-top: 0.4rem; padding-bottom: 0.6rem; }
    .filters-grow input, .filters-grow select { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px; padding: 0.3rem 0.4rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .range { display: flex; gap: 0.25rem; }

    /* ── Vista tarjetas ──────────────────────────────────────────────────────────────────── */
    /* Cada tarjeta mide SU contenido (no se estira al alto de la fila ni del contenedor):
       - grid-auto-rows: max-content → cada fila implícita = alto de su contenido. CLAVE: sin esto,
         en modo fill (grid de alto fijo + align-content:start) cuando las tarjetas no caben el
         navegador encoge los tracks de fila y las tarjetas se solapan.
       - align-content: start → empaqueta las filas arriba (no reparte el hueco sobrante estirando).
       - align-items: start → en una fila multi-columna cada tarjeta mide su propio contenido.
       En modo fill el grid es flex-child con overflow:auto → cuando las tarjetas no caben aparece el
       scroll DENTRO de la tabla (no crece hacia fuera). */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 0.75rem; padding: 1rem; grid-auto-rows: max-content; align-content: start; align-items: start; }
    /* Tarjeta = ion-card NATIVO de Ionic: su fondo, radio, elevación y padding son los de Ionic y NO
       se sobrescriben. Aquí solo se ajusta lo que el contexto de rejilla exige (margin) y los huecos
       que Ionic no trae (cabecera en fila, filas clave-valor, barra de acciones, resalte de selección). */
    ion-card.rcard { margin: 0; } /* la rejilla aporta el gap → sin esto el margin por defecto de ion-card lo duplica */
    ion-card.rcard.selected { outline: 2px solid var(--primary); outline-offset: -2px; }
    /* #74 — Tarjeta clicable (opt-in row-clickable): la mitad de #67 que faltaba. La vista de
       tarjetas es la que la tabla elige SOLA en móvil, así que sin esto el registro no se podía
       abrir desde un teléfono (medido con combos 0.1.4: 0 rowClick a 390px). */
    ion-card.rcard.clickable { cursor: pointer; }
    ion-card.rcard.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    @media (prefers-reduced-motion: reduce) {
      .gh.sortable:hover, .gh.sortable:active,
      .grow-data:hover, .grow-data:active { transform: none; }
    }
    /* Header: ion-card-header as a single row (icon + title + checkbox), keeping Ionic's padding.
       #79 — flex-direction/flex-wrap are SPELLED OUT on purpose: in ios mode (the mode the Hub
       shell pins, ADR-0143) Ionic's own host CSS gives ion-card-header a column direction, so a
       rule that only sets display:flex inherits it and the three children stack on three lines.
       Under md the same rule looked right, which is why it shipped. */
    ion-card-header.rcard-head { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 0.5rem; }
    .rcard-head .rc-icon { display: inline-flex; color: var(--primary); }
    .rcard-head .rc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    /* Cuerpo: ion-card-content (padding Ionic por defecto) con las filas clave-valor apiladas. */
    ion-card-content.rcard-body { display: flex; flex-direction: column; gap: 0.4rem; }
    .rrow { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 13px; }
    .rrow .rk { color: var(--color-muted); }
    .rrow .rv { font-weight: 500; text-align: right; color: var(--color); }
    /* Barra de acciones (Ionic no trae "card actions"): pie alineado a la derecha, fondo transparente. */
    .ractions { display: flex; justify-content: flex-end; gap: 0.25rem; padding: 0 0.5rem 0.5rem; }
    /* ERPlora/appointments#154 - a card's action row must NEVER clip.
       The assumption was that they always fit across the card. With the eight actions an
       appointment carries they do not: on a 411dp phone the card leaves 363px and the buttons ask
       for 380px (8 x 44px of tap floor + 7 gaps of 4px). Without wrapping, justify-content:
       flex-end takes that difference off the START side, so the FIRST button - Cobrar - hung off
       the left edge of the card, clipped, with no scrollbar and nothing to say it was there.
       The wrap is scoped to the card on purpose: the LIST view's row is measured by its
       scrollWidth to pin the column track (#121), and a row that wraps changes width with the
       track it is measured against, which is the loop that measure avoids. */
    .ractions .actions { flex-wrap: wrap; }

    /* ── Estado vacío ────────────────────────────────────────────────────────────────────── */
    .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    .empty .empty-ic { display: grid; place-items: center; width: 3.25rem; height: 3.25rem; border-radius: 999px; background: var(--header-background); font-size: 26px; }

    .actions { display: flex; gap: 0.25rem; justify-content: flex-end; }
    /* #121 - The buttons NEVER shrink. Their track is pinned to the width measured here
       (the scrollWidth of .actions); if they could shrink, a narrow track would shrink the
       measurement, which would shrink the track again. flex: 0 0 auto is what makes the
       measurement a property of the CONTENT instead of a property of the current layout. */
    .actions ion-button { flex: 0 0 auto; }
    /* #122 - Header of the actions column while the buttons are folded into the menu. "ACCIONES"
       measures 62.83px and the folded track is 44px: painted, it spills out of its own cell and
       over "Estado" - the very thing the issue is about. The column keeps its name for assistive
       tech and paints nothing. */
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip-path: inset(50%); white-space: nowrap; border: 0; }
    /* Las acciones de fila son icon-only y de tamaño small en escritorio. En tablet/móvil se
     * amplía el host completo (no solo el icono) para que el área táctil alcance 44×44 px. */
    @media (pointer: coarse), (max-width: 834px) {
      .actions ion-button { min-width: 44px; min-height: 44px; margin: 0; }
      .toolbtn { width: 44px; height: 44px; }
      .add-btn { min-height: 44px; }
      .pager .nav ion-button { min-width: 44px; min-height: 44px; margin: 0; }
    }
    /* Spinner de acción en curso (loading): contenido dentro del ion-button small (Ionic lo fija
     * a 28px en el :host, por eso width/height y no font-size). Cubre tabla y tarjetas: los
     * botones de fila siempre van dentro de .actions. */
    .actions ion-spinner { width: 18px; height: 18px; }

    /* ── Pie: contador + paginación ──────────────────────────────────────────────────────── */
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.55rem 1rem; border-top: 1px solid var(--border-color); background: var(--header-background); font-size: 12.5px; color: var(--color-muted); }
    .pager .left { display: flex; align-items: center; gap: 0.6rem; }
    .pager .strong { font-weight: 600; color: var(--color); }
    .psize { font: inherit; font-size: 12.5px; padding: 0.2rem 0.35rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .pager .nav { display: flex; align-items: center; gap: 0.2rem; }
    /* #78 — Pie en MÓVIL: un solo control «Cargar más» en lugar del pager numerado (Shopify
       IndexTable, Fresha, Square y Material hacen lo mismo: nadie pinta botones de página en un
       teléfono). Sin atributo fill: el sólido por defecto de Ionic es el único que pinta caja en
       modo ios (outfitkit#82 / ADR-0143). Los 44px son el área táctil mínima. */
    .pager .load-more { min-height: 44px; margin: 0; --padding-start: 1rem; --padding-end: 1rem; font-size: 13px; }
    .pager .nav .pp { font-weight: 600; color: var(--color); padding: 0 0.25rem; }
    /* Pager numerado: botón por página + «…» en los saltos (look del Hub). */
    /* #92 — min-width/height at 44px so a numbered page button matches the prev/next ion-button's
       own 44px tap target (line above): before this they were visibly smaller than their neighbors. */
    .pnum { min-width: var(--ok-tap-min, 44px); height: var(--ok-tap-min, 44px); padding: 0 0.4rem; border: 1px solid transparent; border-radius: 8px; background: none; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--color); cursor: pointer; transition: background 0.12s, border-color 0.12s; }
    .pnum:hover { background: var(--row-hover); }
    .pnum.on { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
    .pgap { padding: 0 0.15rem; color: var(--color-muted); }
    ion-button { --box-shadow: none; }
  `;
  }
  static {
    this.MOBILE_BREAKPOINT = 640;
  }
  connectedCallback() {
    super.connectedCallback();
    if (typeof window !== "undefined") {
      window.addEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.addEventListener("resize", this.onWindowResize);
    }
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.mq = window.matchMedia(`(max-width: ${_OkDataTable2.MOBILE_BREAKPOINT}px)`);
      this.isMobile = this.mq.matches;
      const handler = (e7) => {
        const matches = "matches" in e7 ? e7.matches : this.mq?.matches ?? false;
        if (this.isMobile === matches) return;
        this.isMobile = matches;
        if (matches && this.cardViewEnabled) this.viewMode = "cards";
        else if (!matches && this.viewMode === "cards") this.viewMode = "table";
      };
      this.mq.addEventListener("change", handler);
      this._mqHandler = handler;
    }
  }
  /** #67 — Recalcula si la vista lista desborda a lo ancho (`scrollWidth > clientWidth`).
   *
   * Se mide después de renderizar, que es cuando el navegador ya conoce los anchos, y solo se
   * escribe el estado si CAMBIA: asignarlo siempre reprogramaría un render en bucle. */
  measureXOverflow() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    const overflow = !!scroll && scroll.scrollWidth > scroll.clientWidth;
    if (this.xOverflow !== overflow) this.xOverflow = overflow;
  }
  /** #121 — Ancho natural de los botones de acción de una fila, para clavar su pista en px.
   *
   * Se lee del `scrollWidth` de `.actions`, que es el ancho de SU CONTENIDO: como los botones
   * llevan `flex: 0 0 auto` nunca se encogen, así que la medida no depende de lo ancha que sea la
   * pista en ese momento. Eso es lo que la hace estable: clavar la pista al ancho natural no
   * cambia el ancho natural, así que la siguiente medida sale igual y no hay bucle. */
  measureActionsTrack() {
    if (!this.actions.length) {
      if (this.actionsTrackPx !== 0) this.actionsTrackPx = 0;
      return;
    }
    const el = this.renderRoot?.querySelector?.(".grow-data .gcell.actions-col .actions");
    const width = el ? Math.ceil(el.scrollWidth) : 0;
    if (width > 0 && width !== this.actionsTrackPx) this.actionsTrackPx = width;
  }
  /** #122 — Decide si los botones de acción de la fila caben o se pliegan en el menú «⋮».
   *  El criterio y la garantía de que no oscila viven en `decideRowActionsFit`. */
  measureRowActionsFit() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) return;
    const next = decideRowActionsFit({
      containerWidth: scroll.clientWidth,
      contentWidth: scroll.scrollWidth,
      collapsed: this.rowActionsCollapsed,
      decidedAtWidth: this.fitDecidedAtWidth
    });
    this.fitDecidedAtWidth = next.decidedAtWidth;
    if (this.rowActionsCollapsed !== next.collapsed) this.rowActionsCollapsed = next.collapsed;
  }
  /** Engancha el observador al contenedor de scroll del render actual (cambia entre vistas). */
  observeXOverflow() {
    if (typeof ResizeObserver === "undefined") return;
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) return;
    this.xObserver ??= new ResizeObserver(() => {
      this.measureXOverflow();
      this.measureActionsTrack();
      this.measureRowActionsFit();
    });
    this.xObserver.disconnect();
    this.xObserver.observe(scroll);
    const grid = scroll.querySelector(".grid");
    if (grid) this.xObserver.observe(grid);
  }
  updated(changed) {
    this.observeXOverflow();
    this.measureXOverflow();
    if (changed.has("columns") || changed.has("actions") || changed.has("hiddenKeys") || changed.has("selectable")) {
      this.fitDecidedAtWidth = -1;
    }
    this.measureActionsTrack();
    this.measureRowActionsFit();
    if (changed.has("panel")) this.syncSheetTop();
  }
  /** #75 — Where the mobile sheet starts. `position: fixed; inset: 0` painted it from y=0 and the
   *  app's `ion-header` (its own stacking context, above the content) covered the sheet's title and
   *  its only Close button — measured at 390×844 in the Appointments parity page. CSS inside a
   *  shadow root cannot know where the content area begins, so on open the table measures the
   *  closest `ion-content` (walking through shadow hosts) and hands the offset over as a custom
   *  property; on close it is removed. Without an `ion-content` around, the sheet keeps y=0. */
  syncSheetTop() {
    if (this.panel === "none") {
      this.style.removeProperty("--ok-sheet-top");
      return;
    }
    let node = this;
    let content = null;
    while (node && !content) {
      const parent = node.parentNode ?? node.getRootNode?.()?.host ?? null;
      if (parent && parent.nodeType === Node.ELEMENT_NODE && parent.tagName === "ION-CONTENT") content = parent;
      node = parent === node ? null : parent;
    }
    const top = content ? Math.max(0, Math.round(content.getBoundingClientRect().top)) : 0;
    this.style.setProperty("--ok-sheet-top", `${top}px`);
  }
  disconnectedCallback() {
    if (typeof window !== "undefined") {
      window.removeEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.removeEventListener("resize", this.onWindowResize);
    }
    this.xObserver?.disconnect();
    this.xObserver = void 0;
    if (this.mq) {
      const handler = this._mqHandler;
      if (handler) this.mq.removeEventListener("change", handler);
      this.mq = void 0;
    }
    super.disconnectedCallback();
  }
  // ── i18n: idioma del documento ← overrides explícitos de `.labels` ─────────────────────────
  get t() {
    const lang = typeof document === "undefined" ? "en" : document.documentElement.lang.toLowerCase();
    return { ...lang.startsWith("es") ? ES_LABELS : DEFAULT_LABELS2, ...this.labels };
  }
  /** Placeholder efectivo del buscador (prop explícita → label i18n → default inglés). */
  get effSearchPlaceholder() {
    return this.searchPlaceholder ?? this.t.search;
  }
  /** Mensaje efectivo de estado vacío (prop explícita → label i18n → default inglés). */
  get effEmptyMessage() {
    return this.emptyMessage ?? this.t.empty;
  }
  // ── Resolución de alias (compat + documentados) ──────────────────────────────────────────
  get effPageSizes() {
    return this.pageSizes ?? this.pageSizeOptions;
  }
  get effColumnPicker() {
    return this.columnPicker || this.columnSelector;
  }
  get effExport() {
    return this.csv || this.exportable;
  }
  get effImport() {
    return this.csv || this.importable;
  }
  /** ¿Está habilitado el conmutador de vista lista/tarjetas? */
  get viewToggle() {
    if (Array.isArray(this.views)) return this.views.length > 1;
    return this.views === true;
  }
  /** ¿Está disponible la vista tarjetas? (presente en `views` o `views === true`). */
  get cardViewEnabled() {
    if (Array.isArray(this.views)) return this.views.some((v3) => v3 === "cards" || v3 === "card");
    return this.views === true;
  }
  /** Columnas actualmente visibles (respeta el column chooser). */
  get visibleColumns() {
    return this.hiddenKeys.size ? this.columns.filter((c5) => !this.hiddenKeys.has(c5.key)) : this.columns;
  }
  setVisibleColumns(keys) {
    const visible = new Set(keys);
    this.hiddenKeys = new Set(this.columns.map((c5) => c5.key).filter((k2) => !visible.has(k2)));
    this.emit("columnsChange", { visible: keys });
  }
  // ── Selección ─────────────────────────────────────────────────────────────────────────────
  keyOf(row) {
    if (typeof this.rowKey === "function") return String(this.rowKey(row) ?? "");
    if (typeof this.rowKey === "string") return String(row[this.rowKey] ?? "");
    return String(row[this.rowKeyField] ?? "");
  }
  /** #143 — `<prefix>-<suffix>`, or `nothing` (= the attribute is not painted) when the host gave
   *  no prefix. A blank prefix counts as absent: `" "` would leave dangling `-add` hooks, identical
   *  on every table of the screen, which is exactly what the prefix prevents. */
  tid(suffix) {
    const prefix = this.testid?.trim();
    return prefix ? `${prefix}-${suffix}` : A;
  }
  get selection() {
    return this.selectedKeys ?? this.internalSelection;
  }
  setSelection(next) {
    if (!this.selectedKeys) this.internalSelection = next;
    this.emit("selectionChange", { keys: [...next] });
    this.requestUpdate();
  }
  toggleRow(key) {
    const next = new Set(this.selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.setSelection(next);
  }
  toggleAll(visible) {
    const keys = visible.map((r6) => this.keyOf(r6));
    const allOn = keys.length > 0 && keys.every((k2) => this.selection.has(k2));
    const next = new Set(this.selection);
    if (allOn) keys.forEach((k2) => next.delete(k2));
    else keys.forEach((k2) => next.add(k2));
    this.setSelection(next);
  }
  // ── CSV ─────────────────────────────────────────────────────────────────────────────────────
  csvEscape(v3) {
    const s5 = v3 === null || v3 === void 0 ? "" : String(v3);
    return /[",\n\r]/.test(s5) ? `"${s5.replace(/"/g, '""')}"` : s5;
  }
  /** Exporta las filas a CSV (cabeceras = column.key). Si no hay filas, exporta solo la estructura. */
  exportCsv() {
    const cols = this.columns;
    const head = cols.map((c5) => this.csvEscape(c5.key)).join(",");
    const lines = this.rows.map((r6) => cols.map((c5) => this.csvEscape(r6[c5.key])).join(","));
    const csv = [head, ...lines].join("\r\n");
    const blob = new Blob([CSV_BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a3 = document.createElement("a");
    a3.href = url;
    a3.download = this.csvName;
    a3.click();
    URL.revokeObjectURL(url);
    this.emit("csvExport", { rows: this.rows.length });
    this.emit("export", { rows: this.rows.length });
  }
  parseCsv(text) {
    const out = [];
    let row = [];
    let field = "";
    let q = false;
    for (let i7 = 0; i7 < text.length; i7++) {
      const c5 = text[i7];
      if (q) {
        if (c5 === '"') {
          if (text[i7 + 1] === '"') {
            field += '"';
            i7++;
          } else q = false;
        } else field += c5;
      } else if (c5 === '"') q = true;
      else if (c5 === ",") {
        row.push(field);
        field = "";
      } else if (c5 === "\n" || c5 === "\r") {
        if (c5 === "\r" && text[i7 + 1] === "\n") i7++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") out.push(row);
        row = [];
      } else field += c5;
    }
    if (field !== "" || row.length) {
      row.push(field);
      out.push(row);
    }
    const headers = out.shift() ?? [];
    const rows2 = out.map((r6) => Object.fromEntries(headers.map((h4, i7) => [h4, r6[i7] ?? ""])));
    return { headers, rows: rows2 };
  }
  async onImportFile(ev) {
    const input = ev.target;
    const file = input.files?.[0];
    if (!file) return;
    const text = decodeCsvBuffer(await file.arrayBuffer());
    const { headers, rows: rows2 } = this.parseCsv(text);
    this.emit("csvImport", { headers, rows: rows2 });
    this.emit("import", { headers, rows: rows2 });
    input.value = "";
  }
  toggle(p4) {
    if (p4 === "filters" && this.panel !== "filters") {
      this.filterDraft = this.cloneFilters(this.clientFilters);
    }
    this.panel = this.panel === p4 ? "none" : p4;
  }
  // ── Filtros en memoria (modo cliente): borrador → aplicar. ───────────────────────────────────
  cloneFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      out[k2] = { values: f3.values ? new Set(f3.values) : void 0, from: f3.from, to: f3.to };
    }
    return out;
  }
  // Fija el conjunto de valores seleccionados de una columna (multi-select del drawer = ion-select).
  setFilterValues(key, values) {
    const next = this.cloneFilters(this.filterDraft);
    const clean = (values ?? []).filter((v3) => v3 != null && v3 !== "");
    if (clean.length) next[key] = { ...next[key], values: new Set(clean) };
    else next[key] = { ...next[key], values: void 0 };
    this.filterDraft = next;
  }
  setFilterRange(key, edge, value) {
    const next = this.cloneFilters(this.filterDraft);
    next[key] = { ...next[key], [edge]: value };
    this.filterDraft = next;
  }
  applyFilters() {
    const clean = {};
    for (const [k2, f3] of Object.entries(this.filterDraft)) {
      if (f3.values && f3.values.size > 0 || f3.from || f3.to) clean[k2] = f3;
    }
    this.clientFilters = clean;
    this.clientPage = 0;
    this.mobileShown = 0;
    this.panel = "none";
    this.emit("filterChange", { filters: this.serializeFilters(clean) });
  }
  clearFilters() {
    this.filterDraft = {};
  }
  serializeFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      if (f3.values && f3.values.size > 0) out[k2] = [...f3.values];
      else if (f3.from || f3.to) out[k2] = { from: f3.from ?? "", to: f3.to ?? "" };
    }
    return out;
  }
  /** Abre el panel lateral (API pública para el módulo, p.ej. "editar" abre el form pre-rellenado). */
  open(panel = "create") {
    this.panel = panel;
  }
  /** Cierra el panel lateral. */
  close() {
    this.panel = "none";
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
  get hasSearch() {
    return this.searchable || this.searchKeys.length > 0;
  }
  /** Columnas filtrables (con control en el panel de filtros). En cliente y en servidor. */
  get filterColumns() {
    return this.columns.filter((c5) => c5.filterable);
  }
  /** ¿Hay que mostrar el botón de Filtros? (cualquier columna filtrable). */
  get hasFilterRow() {
    return this.filterColumns.length > 0;
  }
  /** Nº de filtros activos → badge del botón Filtros. En servidor cuenta `filterValues` (#106): sin
   *  esto el embudo no daba NINGUNA señal de que la lista venía acotada. */
  get activeFilterCount() {
    if (this.serverSide) {
      return Object.keys(this.serverFilters).filter((k2) => this.serverFilterState(k2) !== void 0).length;
    }
    return Object.values(this.clientFilters).filter(
      (f3) => f3.values && f3.values.size > 0 || f3.from || f3.to
    ).length;
  }
  // ── Estado de filtro VISIBLE (#106) ──────────────────────────────────────────────────────────
  /** Traduce un valor de `filterValues` (la forma que emite `filterChange`) a la forma interna que
   *  usan los `render*Filter`. `undefined` = ese filtro no está puesto. */
  serverFilterState(key) {
    const raw = this.serverFilters[key];
    if (raw === void 0 || raw === null || raw === "") return void 0;
    if (Array.isArray(raw)) {
      const values = raw.filter((v3) => v3 !== null && v3 !== void 0 && v3 !== "").map((v3) => String(v3));
      return values.length ? { values: new Set(values) } : void 0;
    }
    if (typeof raw === "object") {
      const range = raw;
      const from = range.from === null || range.from === void 0 || range.from === "" ? void 0 : String(range.from);
      const to = range.to === null || range.to === void 0 || range.to === "" ? void 0 : String(range.to);
      return from !== void 0 || to !== void 0 ? { from, to } : void 0;
    }
    return { values: /* @__PURE__ */ new Set([String(raw)]) };
  }
  /** Estado de filtro efectivo de una columna: servidor → `filterValues`/espejo; cliente → memoria. */
  filterStateOf(key) {
    return this.serverSide ? this.serverFilterState(key) : this.clientFilters[key];
  }
  /** Fija (o borra) el valor visible de un filtro en el espejo de servidor. */
  setServerFilter(key, value) {
    const next = { ...this.serverFilters };
    const empty = value === void 0 || value === null || value === "" || Array.isArray(value) && value.length === 0;
    if (empty) delete next[key];
    else next[key] = value;
    this.serverFilters = next;
  }
  /** Fija UN extremo de un rango en el espejo. Los dos extremos viajan en eventos SEPARADOS
   *  (`{from}` y luego `{to}`), así que aquí se MEZCLA: reemplazar borraría el otro extremo. */
  setServerRangeEdge(key, edge, value) {
    const prev = this.serverFilters[key];
    const base = prev && typeof prev === "object" && !Array.isArray(prev) ? { ...prev } : {};
    base[edge] = value;
    const alive = (v3) => v3 !== void 0 && v3 !== null && v3 !== "";
    this.setServerFilter(key, alive(base.from) || alive(base.to) ? base : void 0);
  }
  /** Valor crudo de una columna para ordenar/filtrar (usa format si lo hay, si no row[key]). */
  rawValue(col, row) {
    if (col.format) return col.format(row);
    return row[col.key];
  }
  /** Valores distintos de una columna (para los chips del filtro multi-select). */
  distinctValues(col) {
    const set = /* @__PURE__ */ new Set();
    for (const row of this.rows) {
      const v3 = this.rawValue(col, row);
      if (v3 != null && v3 !== "") set.add(String(v3));
    }
    return [...set].sort((a3, b3) => a3.localeCompare(b3));
  }
  /** Filas tras buscar + filtrar + ordenar EN MEMORIA (solo modo cliente). */
  get clientFiltered() {
    let result = this.rows;
    const needle = this.q.trim().toLowerCase();
    if (needle && this.searchKeys.length) {
      result = result.filter(
        (r6) => this.searchKeys.some((k2) => String(r6[k2] ?? "").toLowerCase().includes(needle))
      );
    }
    const fkeys = Object.keys(this.clientFilters);
    if (fkeys.length) {
      result = result.filter(
        (row) => fkeys.every((key) => {
          const f3 = this.clientFilters[key];
          const col = this.columns.find((c5) => c5.key === key);
          if (!col) return true;
          if (f3.values && f3.values.size > 0) {
            return f3.values.has(String(this.rawValue(col, row) ?? ""));
          }
          if (f3.from || f3.to) {
            const raw = this.rawValue(col, row);
            const t5 = raw == null ? NaN : new Date(raw).getTime();
            const from = f3.from ? new Date(f3.from).getTime() : -Infinity;
            const to = f3.to ? new Date(f3.to).getTime() + 864e5 - 1 : Infinity;
            return !Number.isNaN(t5) && t5 >= from && t5 <= to;
          }
          return true;
        })
      );
    }
    if (this.clientSort) {
      const col = this.columns.find((c5) => c5.key === this.clientSort);
      if (col) {
        const dir = this.clientSortDir === "asc" ? 1 : -1;
        result = [...result].sort((a3, b3) => {
          const va = this.rawValue(col, a3);
          const vb = this.rawValue(col, b3);
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });
      }
    }
    return result;
  }
  cell(col, row) {
    if (col.format) return col.format(row);
    const v3 = row[col.key];
    return v3 === null || v3 === void 0 ? "" : String(v3);
  }
  /** ¿Es ordenable la columna? Servidor: opt-in (`sortable`). Cliente: por defecto SÍ (como el Hub),
   *  salvo `sortable: false` explícito. */
  isSortable(col) {
    return this.serverSide ? !!col.sortable : col.sortable !== false;
  }
  onHeaderClick(col) {
    if (!this.isSortable(col)) return;
    if (this.serverSide) {
      const dir = this.sort === col.key && this.sortDir === "asc" ? "desc" : "asc";
      this.emit("sortChange", { sort: col.key, dir });
      return;
    }
    this.mobileShown = 0;
    if (this.clientSort === col.key) {
      this.clientSortDir = this.clientSortDir === "asc" ? "desc" : "asc";
    } else {
      this.clientSort = col.key;
      this.clientSortDir = "asc";
    }
  }
  onFilterInput(col, ev) {
    const value = ev.target.value ?? "";
    this.setServerFilter(col.key, value);
    this.emit("filterChange", { col: col.key, value });
  }
  onRangeInput(col, edge, ev) {
    const raw = ev.target.value ?? "";
    const v3 = raw === "" ? "" : Number(raw);
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  onDateRangeInput(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  // ── Filtros EN LÍNEA (toolbar) ────────────────────────────────────────────────────────────
  // En modo cliente escriben directamente `clientFilters` (filtran en memoria); en servidor solo
  // emiten `filterChange`. Reutilizan la misma forma de filtro que el drawer (values / from / to).
  setClientFilter(key, patch) {
    const next = { ...this.clientFilters };
    const merged = { ...next[key], ...patch };
    const empty = (!merged.values || merged.values.size === 0) && !merged.from && !merged.to;
    if (empty) delete next[key];
    else next[key] = merged;
    this.clientFilters = next;
    this.clientPage = 0;
    this.mobileShown = 0;
  }
  // ion-select (select/multiselect) del panel de filtros (renderFilterControl). En servidor emite
  // `filterChange`; en cliente escribe `clientFilters` (multiselect ⇒ filtra por inclusión).
  onFilterSelect(col, value, multi) {
    if (this.serverSide) {
      const next = value ?? (multi ? [] : "");
      this.setServerFilter(col.key, next);
      this.emit("filterChange", { col: col.key, value: next });
      return;
    }
    if (multi) {
      const arr = Array.isArray(value) ? value.map((v3) => String(v3)) : value != null && value !== "" ? [String(value)] : [];
      this.setClientFilter(col.key, { values: arr.length ? new Set(arr) : void 0 });
    } else {
      const v3 = String(value ?? "");
      this.setClientFilter(col.key, { values: v3 ? /* @__PURE__ */ new Set([v3]) : void 0 });
    }
  }
  onInlineRange(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    if (this.serverSide) {
      this.setServerRangeEdge(col.key, edge, v3);
      this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
      return;
    }
    this.setClientFilter(col.key, { [edge]: v3 || void 0 });
  }
  // Menú overflow: ancla el popover al botón vía el evento de click (compatible con Shadow DOM).
  openMenu(ev) {
    this.menuEv = ev;
    this.menuOpen = true;
  }
  /** #122 — Abre el menú «⋮» de UNA fila. Un solo popover para toda la tabla (uno por fila serían
   *  tantos como filas), anclado por evento porque `trigger` no resuelve dentro de Shadow DOM. */
  openRowMenu(ev, row) {
    ev.stopPropagation();
    this.rowMenuEv = ev;
    this.rowMenuRow = row;
    this.rowMenuOpen = true;
  }
  /** #122 — Las mismas acciones de la fila, como lista. Respeta `disabled`/`loading` por fila: una
   *  acción que no se puede pulsar en su botón tampoco se puede pulsar aquí. */
  renderRowMenu() {
    const row = this.rowMenuRow;
    if (!this.actions.length || !row) return A;
    const key = this.keyOf(row);
    return b2`
      <ion-popover
        class="row-menu"
        .isOpen=${this.rowMenuOpen}
        .event=${this.rowMenuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.rowMenuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${this.actions.map((a3) => {
      const disabled = a3.loading?.(row) === true || a3.disabled?.(row) === true;
      const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
      return b2`
                <!-- #143 — The action is named the SAME collapsed or not, so one spec works at any
                     width. It carries the hook only while the direct buttons are NOT there: the
                     popover survives its dismissal («rowMenuRow» is not cleared), and if the table
                     widened again there would be TWO elements with the hook and «getByTestId»
                     would pick one at random. -->
                <ion-item
                  button
                  data-testid=${this.rowActionsCollapsed ? this.tid(`row-${key}-${a3.id}`) : A}
                  ?disabled=${disabled}
                  aria-disabled=${disabled ? "true" : A}
                  .detail=${false}
                  @click=${() => {
        if (disabled) return;
        this.rowMenuOpen = false;
        this.emit("rowAction", { actionId: a3.id, row });
      }}
                >
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} color=${a3.color ?? A}></ion-icon>` : A}
                  <ion-label color=${a3.color ?? A}>${label}</ion-label>
                </ion-item>
              `;
    })}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Aplica la vista inicial declarada (`default-view`) una sola vez, tras el primer render. Es la
  // forma robusta de arrancar en tarjetas sin depender de fijar `viewMode` por referencia (que
  // falla si la tabla monta detrás de un `v-if`/loading y el ref aún es null).
  firstUpdated() {
    this.applyInitialView();
  }
  /** Re-evalúa la vista inicial cada render mientras el usuario no haya elegido a mano.
   *
   * `firstUpdated` NO basta: decide una sola vez, y los consumidores que asignan las props por JS
   * DESPUÉS de insertar el elemento —lo normal en páginas renderizadas por el servidor— llegan
   * tarde. En ese momento `cardViewEnabled` aún era `false`, así que no se conmutaba; y el
   * listener de `matchMedia` solo dispara al CAMBIAR el viewport, cosa que en un móvil no pasa
   * nunca. La tabla se quedaba con scroll lateral para siempre.
   *
   * Medido en Android contra producción el 2026-08-02 con el bundle ya actualizado:
   *   `views` antes de insertar  → tarjetas
   *   `views` después de insertar → tabla   ← lo que hace la página
   */
  willUpdate(changed) {
    this.applyInitialView();
    if (changed.has("filterValues")) this.serverFilters = { ...this.filterValues ?? {} };
    if (changed.has("search") && this.search !== void 0) {
      this.q = this.search;
      if (!this.serverSide) {
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    }
    if (!this.serverSide && changed.has("rows") && this.mobileShown !== 0) this.mobileShown = 0;
  }
  applyInitialView() {
    if (this.viewChosenByUser) return;
    if (this.isMobile && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "cards" && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "table") {
      this.viewMode = "table";
    }
  }
  setViewMode(mode) {
    this.viewChosenByUser = true;
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.emit("viewChange", mode);
  }
  // Control de filtro de una columna, con componentes Ionic (mismos inputs que el form de alta).
  renderFilterControl(col) {
    if (!col.filterable) return A;
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          label=${col.header}
          label-placement="stacked"
          fill="outline" mode="md"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${current}
          @ionChange=${(e7) => this.onFilterSelect(col, e7.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${this.t.select}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    if (type === "range" || type === "daterange") {
      const t5 = type === "daterange" ? "date" : "number";
      const onEdge = type === "daterange" ? this.onDateRangeInput.bind(this) : this.onRangeInput.bind(this);
      return b2`
        <div class="fblock">
          <span class="flabel">${col.header}</span>
          <div class="frange">
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.from : this.t.gte}
              .value=${f3?.from ?? ""}
              @ionInput=${(e7) => onEdge(col, "from", e7)}></ion-input>
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.to : this.t.lte}
              .value=${f3?.to ?? ""}
              @ionInput=${(e7) => onEdge(col, "to", e7)}></ion-input>
          </div>
        </div>
      `;
    }
    const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
    return b2`
      <ion-input
        type=${inputType}
        fill="outline" mode="md"
        label=${col.header}
        label-placement="stacked"
        placeholder=${this.t.filterPlaceholder}
        .value=${this.selectValue(f3, false)}
        @ionInput=${(e7) => this.onFilterInput(col, e7)}
      ></ion-input>
    `;
  }
  /** Valor para un control de un solo valor (`ion-select`/`ion-input`) o multi (`ion-select
   *  multiple`) a partir del estado de filtro interno. '' / [] = sin filtro. */
  selectValue(f3, multi) {
    const values = [...f3?.values ?? /* @__PURE__ */ new Set()];
    if (multi) return values;
    return values.length ? values[0] : "";
  }
  // Controles de filtro COMPACTOS para la toolbar (modo `inlineFilters`). Solo select y rango de
  // fechas (los del screenshot); el resto de tipos siguen disponibles vía el drawer si no se activa
  // `inlineFilters`. Look: «Todos los Estados» (placeholder) / «01/10/25 → 18/10/25».
  renderInlineFilters() {
    const cols = this.filterColumns.filter((c5) => {
      const t5 = c5.filterType ?? "text";
      return t5 === "select" || t5 === "multiselect" || t5 === "date" || t5 === "daterange";
    });
    if (!cols.length) return A;
    return b2`${cols.map((c5) => this.renderInlineFilter(c5))}`;
  }
  renderInlineFilter(col) {
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          class="tk-filter"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          aria-label=${col.header}
          placeholder=${col.header}
          .value=${current}
          @ionChange=${(e7) => this.onFilterSelect(col, e7.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${col.header}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    return b2`
      <span class="tk-daterange" role="group" aria-label=${col.header}>
        <ion-icon .icon=${iconCalendarOutline}></ion-icon>
        <ion-input type="date" aria-label=${this.t.fromOf.replace("{label}", col.header)} .value=${f3?.from ?? ""} @ionChange=${(e7) => this.onInlineRange(col, "from", e7)}></ion-input>
        <span class="arr">→</span>
        <ion-input type="date" aria-label=${this.t.toOf.replace("{label}", col.header)} .value=${f3?.to ?? ""} @ionChange=${(e7) => this.onInlineRange(col, "to", e7)}></ion-input>
      </span>
    `;
  }
  // Menú overflow («⋮») con ion-popover anclado por evento (Shadow-DOM-safe).
  renderOverflowMenu() {
    if (!this.menuActions.length) return A;
    return b2`
      <ion-button class="toolbtn" fill="clear" aria-label=${this.t.moreActions} @click=${(e7) => this.openMenu(e7)}>
        <ion-icon slot="icon-only" .icon=${iconEllipsisVertical}></ion-icon>
      </ion-button>
      <ion-popover
        .isOpen=${this.menuOpen}
        .event=${this.menuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.menuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${this.menuActions.map(
      (a3) => b2`
                <ion-item button .detail=${false} @click=${() => {
        this.menuOpen = false;
        this.emit("menuAction", { actionId: a3.id });
      }}>
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} color=${a3.color ?? A}></ion-icon>` : A}
                  <ion-label color=${a3.color ?? A}>${a3.label}</ion-label>
                </ion-item>
              `
    )}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Row action buttons, shared by the table and the card views.
  //
  // `collapsible` = the LIST view, the only one that folds its buttons into a "⋮" menu when the
  // columns leave it no width (#122). The CARD view does not fold; it WRAPS instead, see
  // `.ractions .actions` in the stylesheet.
  //
  // This comment used to claim that a card's actions "always fit across the card". They do not,
  // and nobody had measured it (#132 / ERPlora/appointments#154): with the eight actions an
  // appointment carries, the row asks for 380px and the card gives 379px at 411dp, 237px at 768px
  // and 272px at 1440px — so the first button hung off the card at ALL THREE widths, not just on
  // a phone. If you add a view that lays these buttons out, MEASURE it.
  actionButtons(row, collapsible = false) {
    if (!this.actions.length) return A;
    const key = this.keyOf(row);
    if (collapsible && this.rowActionsCollapsed) {
      return b2`
        <div class="actions">
          <ion-button
            size="small"
            fill="clear"
            color="medium"
            data-testid=${this.tid(`row-${key}-menu`)}
            aria-label=${this.t.moreActions}
            title=${this.t.moreActions}
            aria-haspopup="menu"
            @click=${(e7) => this.openRowMenu(e7, row)}
          >
            <ion-icon slot="icon-only" .icon=${okIcon(iconEllipsisVertical)}></ion-icon>
          </ion-button>
        </div>
      `;
    }
    return b2`
      <div class="actions">
        ${this.actions.map(
      (a3) => {
        const loading = a3.loading?.(row) === true;
        const disabled = loading || a3.disabled?.(row) === true;
        const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
        return b2`
            <ion-button
              size="small"
              fill="clear"
              color=${a3.color ?? "medium"}
              data-testid=${this.tid(`row-${key}-${a3.id}`)}
              ?disabled=${disabled}
              aria-disabled=${disabled ? "true" : A}
              aria-label=${label}
              title=${label}
              @click=${() => this.emit("rowAction", { actionId: a3.id, row })}
            >
              ${loading ? b2`<ion-spinner slot="icon-only" name="dots"></ion-spinner>` : a3.icon ? b2`<ion-icon slot="icon-only" .icon=${okIcon(a3.icon)}></ion-icon>` : label}
            </ion-button>
          `;
      }
    )}
      </div>
    `;
  }
  // Botón de barra icon-only (filtros / alta / conmutador de vista). `on` = estado activo.
  // `badge` opcional → contador (p.ej. nº de filtros activos), look del Hub.
  toolButton(icon, on, onClick, label, badge, testid = A) {
    return b2`
      <ion-button class="toolbtn" size="small" fill=${on ? "solid" : "outline"} data-testid=${testid} title=${label} aria-label=${label} @click=${onClick}>
        <ion-icon slot="icon-only" .icon=${okIcon(icon)}></ion-icon>
        ${badge && badge > 0 ? b2`<span class="badge">${badge}</span>` : A}
      </ion-button>
    `;
  }
  /** Plantilla de columnas del grid de la vista lista: [checkbox] [columnas…] [acciones]. */
  gridTemplate() {
    return [
      this.selectable ? "2.75rem" : null,
      // #120 - 5.5rem (88px) is the narrowest a data column can be and stay readable: ~11
      // characters at 14px, plus the ellipsis `.gcell > span` already applies. With the previous
      // floor (8rem = 128px) the six columns of a bookings list did not fit the counter tablet
      // (128x6 + 188 for actions + gaps = 1036px against 834) and the pinned column ended up on
      // top of the data. With 5.5rem they fit (796px) and `1fr` stretches them to 94px each.
      ...this.visibleColumns.map((c5) => c5.width ?? "minmax(5.5rem,1fr)"),
      // #121 - a LENGTH, not `max-content`. The header and every row are separate grids that
      // share this string, and a content-sized track is not a length: each grid resolves it
      // against ITS OWN content - the word "ACCIONES" (62.83px) in the header, four buttons
      // (188px) in the row. The leftover the `1fr` columns share then differed between the two,
      // and the header slid right, up to 125px by the last column (measured at 834px).
      // `actionsTrackPx` is the width of the buttons MEASURED on screen, so it also keeps #120's
      // contract: the track never shrinks under its content (an `auto` track collapsed to 16px
      // and the buttons spilled over the neighbouring column). Until the first measurement lands
      // - one frame - `max-content` reserves the same room it always did.
      this.actions.length ? this.actionsTrackPx > 0 ? `${this.actionsTrackPx}px` : "max-content" : null
    ].filter(Boolean).join(" ");
  }
  /** Lista de páginas a mostrar en el pager numerado (1-based): primera, última, vecinas de la
   *  actual y «…» donde haya saltos. P.ej. en página 1 de 52 → [1,2,3,'…',52]. */
  pageList(cur1, total) {
    if (total <= 7) return Array.from({ length: total }, (_2, i7) => i7 + 1);
    const want = /* @__PURE__ */ new Set([1, total, cur1, cur1 - 1, cur1 + 1]);
    if (cur1 <= 3) [2, 3].forEach((p4) => want.add(p4));
    if (cur1 >= total - 2) [total - 1, total - 2].forEach((p4) => want.add(p4));
    const sorted = [...want].filter((p4) => p4 >= 1 && p4 <= total).sort((a3, b3) => a3 - b3);
    const out = [];
    let prev = 0;
    for (const p4 of sorted) {
      if (p4 - prev > 1) out.push("\u2026");
      out.push(p4);
      prev = p4;
    }
    return out;
  }
  render() {
    const ps = this.serverSide ? this.pageSize : this.clientPageSize || this.pageSize;
    let visible;
    let pages;
    let current;
    let count;
    if (this.serverSide) {
      visible = this.rows;
      count = this.total;
      pages = Math.max(1, Math.ceil(this.total / ps));
      current = Math.min(this.page, pages - 1);
    } else {
      const filtered = this.clientFiltered;
      count = filtered.length;
      pages = Math.max(1, Math.ceil(filtered.length / ps));
      current = Math.min(this.clientPage, pages - 1);
      visible = this.isMobile ? filtered.slice(0, Math.min(this.mobileShown || ps, count)) : filtered.slice(current * ps, current * ps + ps);
    }
    const served = this.serverSide ? (current + 1) * ps : Math.min(this.mobileShown || ps, count);
    const canLoadMore = this.isMobile && served < count;
    const loadMore = () => {
      if (this.serverSide) this.emit("pageChange", current + 1);
      else this.mobileShown = Math.min((this.mobileShown || ps) + ps, count);
    };
    const goTo = (p4) => {
      if (this.serverSide) this.emit("pageChange", p4);
      else this.clientPage = p4;
    };
    const setPageSize = (n6) => {
      if (this.serverSide) this.emit("pageSizeChange", n6);
      else {
        this.clientPageSize = n6;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
    const searchbar = b2`<ion-searchbar class="ion-no-border" data-testid=${this.tid("search")} .value=${this.q} placeholder=${this.effSearchPlaceholder} debounce="250" @ionInput=${this.onSearch}></ion-searchbar>`;
    const selCount = this.selection.size;
    const showTopbar = !!this.title || this.hasSearch || this.viewToggle || this.effColumnPicker || this.effExport || this.effImport || this.hasFilterRow || this.addable || !!this.primaryAction;
    return b2`
      <div class=${`card${this.panel !== "none" ? " has-panel" : ""}`}>
        ${showTopbar ? b2`
              <div class="bar">
                <div class="bar-main">
                  ${this.title ? b2`<div class="title-wrap"><h2 class="title">${this.title}</h2><span class="title-count">${count}</span></div>` : A}
                  ${this.hasSearch ? b2`<div class="search">${searchbar}</div>` : A}
                  ${this.inlineFilters ? this.renderInlineFilters() : A}
                  <span class="tk-spacer"></span>
                    ${this.effColumnPicker && !this.isMobile ? b2`
                          <ion-select
                            class="tk-cols"
                            multiple
                            interface="popover"
                            aria-label=${this.t.columnsVisible}
                            .value=${this.visibleColumns.map((c5) => c5.key)}
                            .selectedText=${this.t.columns}
                            @ionChange=${(e7) => this.setVisibleColumns(e7.detail.value)}
                          >
                            ${this.columns.map((c5) => b2`<ion-select-option value=${c5.key}>${c5.header}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.effPageSizes.length && !this.isMobile ? b2`
                          <ion-select
                            class="tk-psize"
                            interface="popover"
                            aria-label=${this.t.rowsPerPage}
                            .value=${ps}
                            @ionChange=${(e7) => setPageSize(Number(e7.detail.value))}
                          >
                            ${this.effPageSizes.map((n6) => b2`<ion-select-option .value=${n6}>${n6}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.viewToggle ? b2`
                          <span class="viewseg">
                            ${this.toolButton("list-outline", this.viewMode === "table", () => this.setViewMode("table"), this.t.viewList)}
                            ${this.toolButton("grid-outline", this.viewMode === "cards", () => this.setViewMode("cards"), this.t.viewCards)}
                          </span>
                        ` : A}
                    ${this.hasFilterRow && !this.inlineFilters ? this.toolButton("funnel-outline", this.panel === "filters" || this.activeFilterCount > 0, () => this.toggle("filters"), this.t.filters, this.activeFilterCount) : A}
                    ${this.effImport ? b2`
                          ${this.toolButton("cloud-upload-outline", false, () => this.renderRoot.querySelector(".tk-file")?.click(), this.t.importCsv)}
                          <!-- #143 — The import hook goes on the INPUT, not on the button that
                               triggers it: what a spec drives is «setInputFiles», and nobody opens
                               the button's native dialog from a test. Same criterion as
                               «GrantFilePicker.vue» in the Hub (the hook goes on the control, not
                               on its disguise). -->
                          <input class="tk-file" data-testid=${this.tid("csv-import")} type="file" accept=".csv,text/csv" hidden @change=${(e7) => this.onImportFile(e7)} />
                        ` : A}
                    ${this.effExport ? this.toolButton("download-outline", false, () => this.exportCsv(), this.t.exportCsv, void 0, this.tid("csv-export")) : A}
                    <!-- #113 — Mismo botón en los dos viewports: la acción principal de la pantalla
                         se lee, no se adivina. En escritorio era un «+» de 36px idéntico a los
                         iconos de vista/filtrar/exportar, y era el último de cuatro. -->
                    ${this.addable ? b2`
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("add")} size="small" @click=${() => this.toggle("create")}>
                            <ion-icon slot="start" .icon=${okIcon("add")}></ion-icon>${this.t.add}
                          </ion-button>
                        ` : A}
                    ${this.renderOverflowMenu()}
                    ${this.primaryAction ? b2`
                          <!-- #143 — Its own hook and NOT «-add»: «addable» and «primaryAction» are
                               two different buttons that may coexist, and both are really used
                               («addable» in the modules, «primaryAction» in the SaaS screens).
                               Sharing the name would give two elements with the same hook as soon
                               as a screen declared both. -->
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("primary-action")} size="small" @click=${() => this.emit("primaryAction", {})}>
                            <ion-icon slot="start" .icon=${okIcon(this.primaryAction.icon ?? "add")}></ion-icon>${this.primaryAction.label}
                          </ion-button>
                        ` : A}
                    <!-- El módulo proyecta aquí acciones globales adicionales. -->
                    <slot name="toolbar"></slot>
                </div>
                ${this.selectable && selCount > 0 ? b2`
                      <div class="selbar">
                        <strong>${this.t.selected.replace("{n}", String(selCount))}</strong>
                        <button class="sel-clear" @click=${() => this.setSelection(/* @__PURE__ */ new Set())}>
                          <ion-icon .icon=${iconClose} style="font-size:14px"></ion-icon> ${this.t.clear}
                        </button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.viewMode === "cards" && this.cardViewEnabled ? this.renderCards(visible) : this.renderTable(visible)}

        ${pages > 1 || this.effPageSizes.length ? b2`
              <div class="pager">
                <div class="left">
                  <span>
                    ${pages > 1 ? b2`${this.t.showing.replace("{from}", String(this.isMobile && !this.serverSide ? 1 : current * ps + 1)).replace("{to}", String(Math.min(served, count)))} ` : A}
                    <span class="strong">${count}</span> ${count === 1 ? this.t.recordSingular : this.t.recordPlural}
                  </span>
                  ${!showTopbar && this.effPageSizes.length ? b2`
                        <select class="psize" @change=${(e7) => setPageSize(Number(e7.target.value))}>
                          ${this.effPageSizes.map((n6) => b2`<option value=${n6} ?selected=${n6 === ps}>${this.t.perPageShort.replace("{n}", String(n6))}</option>`)}
                        </select>
                      ` : A}
                </div>
                ${this.isMobile ? canLoadMore ? b2`<ion-button class="load-more" data-testid=${this.tid("load-more")} size="small" @click=${loadMore}>${this.t.loadMore}</ion-button>` : A : pages > 1 ? b2`
                      <div class="nav">
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-prev")} ?disabled=${current === 0} @click=${() => goTo(current - 1)}><ion-icon slot="icon-only" .icon=${iconChevronBack}></ion-icon></ion-button>
                        ${this.pageList(current + 1, pages).map(
      (p4) => p4 === "\u2026" ? b2`<span class="pgap">…</span>` : b2`<button class=${`pnum${p4 === current + 1 ? " on" : ""}`} @click=${() => goTo(p4 - 1)}>${p4}</button>`
    )}
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-next")} ?disabled=${current >= pages - 1} @click=${() => goTo(current + 1)}><ion-icon slot="icon-only" .icon=${iconChevronForward}></ion-icon></ion-button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.panel !== "none" ? this.renderDrawer() : A}
      </div>
    `;
  }
  // Panel lateral derecho DENTRO de la tabla (no empuja contenido; igual en lista y tarjetas).
  renderDrawer() {
    const isFilters = this.panel === "filters";
    const clientFilters = isFilters && !this.serverSide;
    return b2`
      <div class="tk-scrim" @click=${() => this.close()}></div>
      <aside class="drawer" role="dialog" aria-label=${isFilters ? this.t.filters : this.t.form}>
        <header class="dh">
          <strong>${isFilters ? this.t.filters : this.t.newRecord}</strong>
          <ion-button fill="clear" size="small" aria-label=${this.t.close} @click=${() => this.close()}><ion-icon slot="icon-only" .icon=${iconClose}></ion-icon></ion-button>
        </header>
        <div class="db">
          ${isFilters ? clientFilters ? this.filterColumns.map((c5) => this.renderClientFilter(c5)) : this.filterColumns.map((c5) => b2`<div class="fblock">${this.renderFilterControl(c5)}</div>`) : b2`<slot name="create"></slot>`}
        </div>
        ${clientFilters ? b2`
              <footer class="df">
                <button class="sel-clear df-clear" ?disabled=${Object.keys(this.filterDraft).length === 0} @click=${() => this.clearFilters()}>${this.t.clear}</button>
                <ion-button class="primary-btn" size="small" @click=${() => this.applyFilters()}>${this.t.apply}</ion-button>
              </footer>
            ` : A}
      </aside>
    `;
  }
  // Control de filtro CLIENTE de una columna: chips multi-select (select) o rango de fechas.
  renderClientFilter(col) {
    const label = col.header;
    if (col.filterType === "daterange" || col.filterType === "date") {
      const f3 = this.filterDraft[col.key] ?? {};
      return b2`
        <div class="fblock">
          <span class="flabel">${label}</span>
          <div class="daterange">
            <ion-input type="date" label=${this.t.from} label-placement="stacked" fill="outline" mode="md" .value=${f3.from ?? ""} @ionChange=${(e7) => this.setFilterRange(col.key, "from", e7.detail.value ?? "")}></ion-input>
            <ion-input type="date" label=${this.t.to} label-placement="stacked" fill="outline" mode="md" .value=${f3.to ?? ""} @ionChange=${(e7) => this.setFilterRange(col.key, "to", e7.detail.value ?? "")}></ion-input>
          </div>
        </div>
      `;
    }
    const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
    const selected = [...this.filterDraft[col.key]?.values ?? /* @__PURE__ */ new Set()];
    return b2`
      <div class="fblock">
        <ion-select
          label=${label}
          label-placement="stacked"
          fill="outline" mode="md"
          multiple
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${selected}
          @ionChange=${(e7) => this.setFilterValues(col.key, e7.detail.value ?? [])}
        >
          ${opts.length === 0 ? b2`<ion-select-option .disabled=${true} value="">${this.t.noValues}</ion-select-option>` : opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      </div>
    `;
  }
  /** #67 — Enter/Espacio activan la fila clicable (y, desde #74, la tarjeta): si se llega con el
   *  tabulador, el ratón no puede ser el único camino. Espacio además NO debe desplazar la página. */
  onRowKeydown(e7, row) {
    if (e7.key !== "Enter" && e7.key !== " " && e7.key !== "Spacebar") return;
    e7.preventDefault();
    this.emit("rowClick", { row });
  }
  emptyState() {
    return b2`
      <div class="empty">
        <span class="empty-ic"><ion-icon .icon=${iconFileTrayOutline}></ion-icon></span>
        <span>${this.effEmptyMessage}</span>
      </div>
    `;
  }
  // Vista LISTA en CSS GRID (no <table>): permite ancho por columna y cabecera sticky.
  renderTable(visible) {
    if (visible.length === 0) return this.emptyState();
    const cols = this.visibleColumns;
    const tpl = { gridTemplateColumns: this.gridTemplate() };
    const allOn = this.selectable && visible.length > 0 && visible.every((r6) => this.selection.has(this.keyOf(r6)));
    const alignCls = (a3) => a3 === "right" ? "right" : a3 === "center" ? "center" : "left";
    return b2`
      <div class=${`scroll${this.xOverflow ? " x-overflow" : ""}`}>
        <div class="grid" role="table">
          <!-- Cabecera -->
          <div class="grow ghead" role="row" style=${o6(tpl)}>
            ${this.selectable ? b2`<span class="selcb"><ion-checkbox .checked=${allOn} aria-label=${this.t.selectAll} @ionChange=${() => this.toggleAll(visible)}></ion-checkbox></span>` : A}
            ${cols.map((c5) => {
      const sortable = this.isSortable(c5);
      const active = sortable && (this.serverSide ? this.sort === c5.key : this.clientSort === c5.key);
      const dir = this.serverSide ? this.sortDir : this.clientSortDir;
      const caretIcon = !active ? iconSwapVerticalOutline : dir === "asc" ? iconChevronUpOutline : iconChevronDownOutline;
      return b2`
                <div
                  class=${`gcell gh ${alignCls(c5.align)}${sortable ? " sortable" : ""}${c5.pinned === "end" ? " actions-col" : ""}`}
                  role="columnheader"
                  @click=${() => this.onHeaderClick(c5)}
                >
                  <span>${c5.header}</span>
                  ${sortable ? b2`<span class=${`caret${active ? " on" : ""}`}><ion-icon .icon=${okIcon(caretIcon)}></ion-icon></span>` : A}
                </div>
              `;
    })}
            ${this.actions.length ? b2`<div class="gcell gh right actions-col" role="columnheader">
                  ${this.rowActionsCollapsed ? b2`<span class="sr-only">${this.t.actions}</span>` : b2`<span>${this.t.actions}</span>`}
                </div>` : A}
          </div>

          <!-- Filas -->
          ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        return b2`
                <div
                  class=${`grow grow-data${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                  role="row"
                  data-testid=${this.tid(`row-${key}`)}
                  style=${o6(tpl)}
                  tabindex=${this.rowClickable ? "0" : A}
                  @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                  @keydown=${this.rowClickable ? (e7) => this.onRowKeydown(e7, row) : A}
                >
                  ${this.selectable ? b2`<span class="selcb" @click=${(e7) => e7.stopPropagation()}><ion-checkbox .checked=${selected} aria-label=${this.t.selectRow} @ionChange=${() => this.toggleRow(key)}></ion-checkbox></span>` : A}
                  ${cols.map(
          (c5) => b2`<div class=${`gcell ${alignCls(c5.align)}${c5.pinned === "end" ? " actions-col" : ""}`} role="cell">${c5.render ? c5.render(row) : b2`<span>${this.cell(c5, row)}</span>`}</div>`
        )}
                  ${this.actions.length ? b2`<div class="gcell right actions-col" role="cell" @click=${(e7) => e7.stopPropagation()}>${this.actionButtons(row, true)}</div>` : A}
                </div>
              `;
      }
    )}
        </div>
      </div>
      ${this.renderRowMenu()}
    `;
  }
  renderCards(visible) {
    if (visible.length === 0) return this.emptyState();
    const hasHead = !!this.cardTitle || !!this.cardIcon || this.selectable;
    return b2`
      <div class="cards-grid">
        ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        const icon = this.cardIcon?.(row);
        return b2`
              <ion-card
                class=${`rcard${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                data-testid=${this.tid(`row-${key}`)}
                role=${this.rowClickable ? "button" : A}
                tabindex=${this.rowClickable ? "0" : A}
                @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                @keydown=${this.rowClickable ? (e7) => this.onRowKeydown(e7, row) : A}
              >
                ${hasHead ? b2`
                      <ion-card-header class="rcard-head">
                        ${icon != null && icon !== "" ? b2`<span class="rc-icon">${typeof icon === "string" ? b2`<ion-icon .icon=${okIcon(icon)}></ion-icon>` : icon}</span>` : A}
                        <span class="rc-title">${this.cardTitle ? this.cardTitle(row) : A}</span>
                        ${this.selectable ? b2`<ion-checkbox .checked=${selected} aria-label=${this.t.select} @click=${(e7) => e7.stopPropagation()} @ionChange=${() => this.toggleRow(key)}></ion-checkbox>` : A}
                      </ion-card-header>
                    ` : A}
                <ion-card-content class="rcard-body">
                  ${this.renderCard ? this.renderCard(row) : this.visibleColumns.map(
          (c5) => b2`<div class="rrow"><span class="rk">${c5.header}</span><span class="rv">${c5.render ? c5.render(row) : this.cell(c5, row)}</span></div>`
        )}
                </ion-card-content>
                ${this.actions.length ? b2`<div class="ractions" @click=${(e7) => e7.stopPropagation()}>${this.actionButtons(row)}</div>` : A}
              </ion-card>
            `;
      }
    )}
      </div>
    `;
  }
};
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "columns");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "rows");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "searchKeys");
__decorateClass3([
  n4({ attribute: "row-key-field" })
], _OkDataTable.prototype, "rowKeyField");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "rowKey");
__decorateClass3([
  n4({ type: Number, attribute: "page-size" })
], _OkDataTable.prototype, "pageSize");
__decorateClass3([
  n4({ attribute: "empty-message" })
], _OkDataTable.prototype, "emptyMessage");
__decorateClass3([
  n4({ attribute: "search-placeholder" })
], _OkDataTable.prototype, "searchPlaceholder");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "labels");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "actions");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "addable");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizeOptions");
__decorateClass3([
  n4({ type: Boolean, reflect: true })
], _OkDataTable.prototype, "fill");
__decorateClass3([
  n4({ type: Boolean, attribute: "column-picker" })
], _OkDataTable.prototype, "columnPicker");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "csv");
__decorateClass3([
  n4({ attribute: "csv-name" })
], _OkDataTable.prototype, "csvName");
__decorateClass3([
  n4({ type: Boolean, attribute: "server-side" })
], _OkDataTable.prototype, "serverSide");
__decorateClass3([
  n4({ type: Number })
], _OkDataTable.prototype, "total");
__decorateClass3([
  n4({ type: Number })
], _OkDataTable.prototype, "page");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "searchable");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "search");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "sort");
__decorateClass3([
  n4({ attribute: "sort-dir" })
], _OkDataTable.prototype, "sortDir");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "filterValues");
__decorateClass3([
  n4()
], _OkDataTable.prototype, "title");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "views");
__decorateClass3([
  n4({ attribute: "default-view" })
], _OkDataTable.prototype, "defaultView");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "exportable");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "importable");
__decorateClass3([
  n4({ type: Boolean, attribute: "column-selector" })
], _OkDataTable.prototype, "columnSelector");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizes");
__decorateClass3([
  n4({ type: Boolean, attribute: "row-clickable" })
], _OkDataTable.prototype, "rowClickable");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "selectable");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "selectedKeys");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "primaryAction");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "inlineFilters");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "menuActions");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardTitle");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardIcon");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "renderCard");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "testid");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "q");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientPage");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientPageSize");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "mobileShown");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientSort");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientSortDir");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientFilters");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "filterDraft");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "serverFilters");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "panel");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "viewMode");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "isMobile");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "xOverflow");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "actionsTrackPx");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "rowActionsCollapsed");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "rowMenuOpen");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "hiddenKeys");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "internalSelection");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "menuOpen");
var OkDataTable = _OkDataTable;
define("ok-data-table", OkDataTable);

// @erplora/module-sdk/src/index.ts
var DATA_TABLE_LABELS_ES = {
  search: "Buscar\u2026",
  empty: "Sin resultados",
  filters: "Filtros",
  clear: "Limpiar",
  apply: "Aplicar",
  selected: "{n} seleccionados",
  importCsv: "Importar CSV",
  exportCsv: "Exportar CSV",
  add: "A\xF1adir",
  moreActions: "M\xE1s acciones",
  rowsPerPage: "Filas por p\xE1gina",
  perPageShort: "{n} / p\xE1g.",
  viewList: "Vista lista",
  viewCards: "Vista tarjetas",
  columnsVisible: "Columnas visibles",
  columns: "Columnas",
  actions: "Acciones",
  close: "Cerrar",
  newRecord: "Nuevo",
  form: "Formulario",
  filterPlaceholder: "Filtrar\u2026",
  from: "Desde",
  to: "Hasta",
  fromOf: "{label} desde",
  toOf: "{label} hasta",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "Sin valores",
  selectAll: "Seleccionar todo",
  selectRow: "Seleccionar fila",
  select: "Seleccionar",
  showing: "Mostrando {from}\u2013{to} de",
  recordSingular: "registro",
  recordPlural: "registros"
};
var DATA_TABLE_LABELS_EN = {
  search: "Search\u2026",
  empty: "No results",
  filters: "Filters",
  clear: "Clear",
  apply: "Apply",
  selected: "{n} selected",
  importCsv: "Import CSV",
  exportCsv: "Export CSV",
  add: "Add",
  moreActions: "More actions",
  rowsPerPage: "Rows per page",
  perPageShort: "{n} / page",
  viewList: "List view",
  viewCards: "Card view",
  columnsVisible: "Visible columns",
  columns: "Columns",
  actions: "Actions",
  close: "Close",
  newRecord: "New",
  form: "Form",
  filterPlaceholder: "Filter\u2026",
  from: "From",
  to: "To",
  fromOf: "{label} from",
  toOf: "{label} to",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "No values",
  selectAll: "Select all",
  selectRow: "Select row",
  select: "Select",
  showing: "Showing {from}\u2013{to} of",
  recordSingular: "record",
  recordPlural: "records"
};
function dataTableLabels(locale = "es") {
  return locale.toLowerCase().startsWith("en") ? DATA_TABLE_LABELS_EN : DATA_TABLE_LABELS_ES;
}
function isEmpty(v3) {
  return v3 === null || v3 === void 0 || v3 === "";
}
var ListController = class {
  constructor(client, queryName, onChange = () => {
  }, opts = {}) {
    this.client = client;
    this.queryName = queryName;
    this.onChange = onChange;
    this.rows = [];
    this.total = 0;
    this.loading = false;
    this.error = "";
    /** Descarta respuestas obsoletas si llegan fuera de orden (race de cargas concurrentes). */
    this.seq = 0;
    this.state = {
      page: 0,
      pageSize: opts.pageSize ?? 50,
      search: "",
      sort: opts.sort,
      dir: opts.dir ?? "asc",
      filters: { ...opts.filters ?? {} },
      context: { ...opts.context ?? {} }
    };
  }
  /** Nº de páginas según el total del servidor (mínimo 1). */
  get pageCount() {
    return Math.max(1, Math.ceil(this.total / this.state.pageSize));
  }
  /** (Re)carga la página actual desde el servidor. */
  async load() {
    const s5 = this.state;
    const mySeq = ++this.seq;
    this.loading = true;
    this.error = "";
    this.onChange();
    try {
      const page = await this.client.queryPage(this.queryName, {
        limit: s5.pageSize,
        offset: s5.page * s5.pageSize,
        search: s5.search,
        sort: s5.sort,
        dir: s5.dir,
        filters: s5.filters,
        params: s5.context
      });
      if (mySeq !== this.seq) return;
      this.rows = page.rows ?? [];
      this.total = page.total ?? this.rows.length;
    } catch (e7) {
      if (mySeq !== this.seq) return;
      this.rows = [];
      this.total = 0;
      this.error = e7 instanceof Error ? e7.message : "Error cargando datos";
    } finally {
      if (mySeq === this.seq) {
        this.loading = false;
        this.onChange();
      }
    }
  }
  setPage(page) {
    this.state.page = Math.max(0, page);
    void this.load();
  }
  setSort(sort, dir) {
    this.state.sort = sort;
    this.state.dir = dir;
    this.state.page = 0;
    void this.load();
  }
  setSearch(search) {
    this.state.search = search;
    this.state.page = 0;
    void this.load();
  }
  /** Cambia el nº de filas por página y recarga desde la página 0. */
  setPageSize(pageSize) {
    this.state.pageSize = Math.max(1, pageSize);
    this.state.page = 0;
    void this.load();
  }
  /** Aplica/quita un filtro de columna; valores vacíos lo eliminan. Vuelve a la página 0. */
  setFilter(col, value) {
    if (isEmpty(value)) {
      delete this.state.filters[col];
    } else if (typeof value === "object" && value !== null) {
      const prev = this.state.filters[col] ?? {};
      const merged = { ...prev, ...value };
      const cleaned = Object.fromEntries(Object.entries(merged).filter(([, v3]) => !isEmpty(v3)));
      if (Object.keys(cleaned).length === 0) delete this.state.filters[col];
      else this.state.filters[col] = cleaned;
    } else {
      this.state.filters[col] = value;
    }
    this.state.page = 0;
    void this.load();
  }
  /** Fija/actualiza los params de contexto obligatorios (p.ej. al seleccionar el padre).
   *  Vuelve a la página 0 y recarga. Pasa `{}` o keys con valor vacío para limpiar. */
  setContext(context) {
    this.state.context = { ...context };
    this.state.page = 0;
    void this.load();
  }
  reset() {
    this.state.page = 0;
    this.state.search = "";
    this.state.filters = {};
    void this.load();
  }
};
function createListController(client, queryName, onChange = () => {
}, opts = {}) {
  return new ListController(client, queryName, onChange, opts);
}

// locales/es.json
var es_default = {
  name: "Clientes",
  description: "Fichero de clientes con grupos, etiquetas, campos propios, notas e historial de actividad.",
  navigation: {
    customers: {
      label: "Clientes"
    },
    groups: {
      label: "Grupos"
    },
    tags: {
      label: "Etiquetas"
    },
    fields: {
      label: "Campos"
    }
  },
  ui: {
    customers: "Clientes",
    active: "Activos",
    vip: "VIP",
    revenue: "Ingresos",
    colName: "Nombre",
    colEmail: "Email",
    colPhone: "Tel\xE9fono",
    colStage: "Etapa",
    colSpent: "Gastado",
    actionView: "Ver",
    actionEdit: "Editar",
    actionDelete: "Eliminar",
    stageLead: "Lead",
    stageProspect: "Prospecto",
    stageFirstPurchase: "1\xAA compra",
    stageActive: "Activo",
    stageAtRisk: "En riesgo",
    stageDormant: "Inactivo",
    stageChurned: "Perdido",
    stageVip: "VIP",
    channelNone: "Ninguno",
    channelEmail: "Email",
    channelSms: "SMS",
    channelWhatsapp: "WhatsApp",
    channelPhone: "Tel\xE9fono",
    placeholderName: "Nombre",
    placeholderEmail: "Email",
    addCustomer: "A\xF1adir",
    moreDetails: "M\xE1s datos",
    saving: "Guardando\u2026",
    searchCustomers: "Buscar nombre o email\u2026",
    loading: "Cargando\u2026",
    emptyCustomers: "Sin clientes.",
    deleteCustomerTitle: "Eliminar cliente",
    deleteCustomerConfirm: "\xBFEliminar {name}? La ficha deja de estar disponible (borrado l\xF3gico).",
    deleting: "Eliminando\u2026",
    cancel: "Cancelar",
    errCreate: "No se pudo crear",
    errUpdate: "No se pudo actualizar",
    errDelete: "No se pudo eliminar",
    errCustomerNotFound: "Cliente no encontrado",
    errLoadCustomer: "No se pudo cargar el cliente",
    errSaveMembership: "No se pudo guardar la asignaci\xF3n",
    errAddNote: "No se pudo a\xF1adir la nota",
    customerUpdated: "Cliente actualizado",
    customerDeleted: "Cliente {name} eliminado",
    groupsAssigned: "Grupos asignados",
    tagsAssigned: "Etiquetas asignadas",
    noteAdded: "Nota a\xF1adida",
    fieldNif: "NIF/CIF",
    fieldCompany: "Empresa",
    fieldAddress: "Direcci\xF3n",
    fieldCity: "Ciudad",
    fieldPostalCode: "C\xF3digo postal",
    fieldCountry: "Pa\xEDs",
    countryNone: "Sin pa\xEDs",
    countrySearch: "Busca un pa\xEDs\u2026",
    countryNoMatch: "Ning\xFAn pa\xEDs coincide",
    fieldBirthday: "Cumplea\xF1os",
    fieldAnniversary: "Aniversario",
    fieldSource: "Origen",
    fieldPreferredChannel: "Canal preferido",
    fieldInternalNotes: "Notas internas",
    fieldActive: "Activo",
    save: "Guardar",
    back: "\u2190 Volver",
    edit: "Editar",
    delete: "Eliminar",
    noGroupsDefined: "No hay grupos definidos.",
    noTagsDefined: "No hay etiquetas definidos.",
    saveGroups: "Guardar grupos",
    saveTags: "Guardar etiquetas",
    detailPurchases: "Compras",
    detailLastPurchase: "\xDAltima compra",
    yes: "S\xED",
    no: "No",
    groupsHeading: "Grupos",
    tagsHeading: "Etiquetas",
    addNote: "A\xF1adir nota",
    noteLabel: "Nota",
    add: "A\xF1adir",
    activityHeading: "Actividad",
    noActivity: "Sin actividad registrada.",
    activityNoteAdded: "Nota a\xF1adida",
    activityPurchaseRecorded: "Compra registrada",
    activityPurchaseVoided: "Compra anulada",
    activityConsentGranted: "Consentimiento dado",
    activityConsentWithdrawn: "Consentimiento retirado",
    activityCustomerErased: "Datos personales borrados",
    activityCustomerMerged: "Ficha duplicada fusionada en esta",
    activityTypeNote: "Nota",
    activityTypePurchase: "Compra",
    activityTypePurchaseVoided: "Anulaci\xF3n",
    activityTypeConsentGranted: "Consentimiento",
    activityTypeConsentWithdrawn: "Consentimiento",
    activityTypeErased: "Borrado",
    activityTypeMerged: "Fusi\xF3n",
    groupsTitle: "Grupos de clientes",
    newGroup: "Nuevo grupo",
    colDescription: "Descripci\xF3n",
    colCustomers: "Clientes",
    colOrder: "Orden",
    searchGroup: "Buscar grupo\u2026",
    emptyGroups: "Sin grupos.",
    newGroupTitle: "Nuevo grupo",
    editGroupTitle: "Editar \xB7 {name}",
    fieldDescription: "Descripci\xF3n",
    fieldColor: "Color",
    fieldOrder: "Orden",
    deleteGroupTitle: "Eliminar grupo",
    deleteGroupConfirm: "\xBFEliminar {name}? Los clientes asignados pierden el grupo.",
    groupCreated: "Grupo creado",
    groupUpdated: "Grupo actualizado",
    groupDeleted: "Grupo {name} eliminado",
    errSaveGroup: "No se pudo guardar el grupo",
    errDeleteGroup: "No se pudo eliminar el grupo",
    tagsTitle: "Etiquetas de clientes",
    newTag: "Nueva etiqueta",
    colColor: "Color",
    searchTag: "Buscar etiqueta\u2026",
    emptyTags: "Sin etiquetas.",
    newTagTitle: "Nueva etiqueta",
    editTagTitle: "Editar \xB7 {name}",
    fieldActiveTag: "Activa",
    deleteTagTitle: "Eliminar etiqueta",
    deleteTagConfirm: "\xBFEliminar {name}? Los clientes asignados pierden la etiqueta.",
    tagCreated: "Etiqueta creada",
    tagUpdated: "Etiqueta actualizada",
    tagDeleted: "Etiqueta {name} eliminada",
    errSaveTag: "No se pudo guardar la etiqueta",
    errDeleteTag: "No se pudo eliminar la etiqueta",
    fieldsTitle: "Campos personalizados",
    newField: "Nuevo campo",
    colType: "Tipo",
    colRequired: "Obligatorio",
    searchField: "Buscar campo\u2026",
    emptyFields: "Sin campos personalizados.",
    typeText: "Texto",
    typeNumber: "N\xFAmero",
    typeDate: "Fecha",
    typeBoolean: "S\xED/No",
    typeSelect: "Selecci\xF3n",
    typeTextarea: "Texto largo",
    newFieldTitle: "Nuevo campo personalizado",
    editFieldTitle: "Editar \xB7 {name}",
    fieldType: "Tipo",
    fieldOptions: "Opciones (separadas por coma)",
    fieldRequired: "Obligatorio",
    deleteFieldTitle: "Eliminar campo",
    deleteFieldConfirm: "\xBFEliminar {name}? Los valores guardados dejan de mostrarse.",
    fieldCreated: "Campo creado",
    fieldUpdated: "Campo actualizado",
    fieldDeleted: "Campo {name} eliminado",
    errSaveField: "No se pudo guardar el campo",
    errDeleteField: "No se pudo eliminar el campo",
    assignCustomer: "Asignar cliente",
    chooseCustomer: "Elegir cliente",
    searchPosCustomer: "Buscar por nombre, tel\xE9fono, email\u2026",
    noResults: "Sin resultados.",
    noCustomers: "No hay clientes.",
    removeCustomer: "Quitar cliente",
    errLoadCustomers: "No se pudieron cargar los clientes",
    customFields: "Campos personalizados",
    posNoPermission: "No tienes permiso para consultar clientes.",
    errCustomerSnapshot: "No se pudieron cargar los datos fiscales de {name}. Vuelve a pulsar para reintentar.",
    errLinkOrder: "La venta sigue, pero el cliente no se pudo asociar al pedido: no aparecer\xE1 en su historial.",
    errLinkOrderNoPermission: "La venta sigue, pero no tienes permiso para asociar clientes a pedidos: no aparecer\xE1 en su historial.",
    retry: "Reintentar",
    quickAddCustomer: "+ Nuevo cliente \xAB{term}\xBB",
    quickName: "Nombre",
    quickPhone: "Tel\xE9fono",
    quickNameRequired: "El nombre es obligatorio.",
    quickCreate: "Crear y asignar",
    importing: "Importando\u2026",
    importSummary: "Importaci\xF3n: {total} filas \u2014 {created} creadas, {skipped} omitidas, {failed} fallidas.",
    importRow: "Fila {row}",
    importRows: "Filas {rows}",
    importReasonName: "falta el nombre",
    importReasonEmail: "el email no es v\xE1lido",
    importReasonCountry: "pa\xEDs no reconocido \u2014 importado tal cual, rev\xEDsalo en la ficha",
    close: "Cerrar",
    eraseData: "Borrar datos personales",
    eraseDataTitle: "Borrar datos personales (RGPD)",
    eraseDataConfirm: "Sustituye los datos personales de {name} por marcadores, vac\xEDa sus notas, historial y campos personalizados, y no se puede deshacer. Las ventas y facturas conservan su referencia. Queda una entrada de auditor\xEDa con qui\xE9n, cu\xE1ndo y por qu\xE9.",
    eraseReason: "Motivo (queda en la auditor\xEDa)",
    customerErased: "Datos personales borrados.",
    errErase: "No se pudieron borrar los datos personales",
    mergeWith: "Fusionar con\u2026",
    mergeTitle: "Fusionar una ficha duplicada",
    mergeHint: "Elige la ficha duplicada de {name}. Se queda {name}; la que elijas se fusiona en ella.",
    mergeSearch: "Buscar la ficha duplicada",
    mergeSearching: "Buscando\u2026",
    mergeNoCandidates: "No hay otra ficha que coincida.",
    errMergeSearch: "No se pudieron buscar las fichas. Vuelve a intentarlo.",
    mergeConfirm: "{absorbed} se fusionar\xE1 en {surviving}: sus citas, ventas, reservas, conversaciones, bonos, notas y consentimientos pasan a {surviving}, los datos que falten se completan con los suyos y {absorbed} desaparece de la lista. No se puede deshacer.",
    mergeSubmit: "Fusionar",
    merging: "Fusionando\u2026",
    mergeChange: "Elegir otra",
    customerMerged: "{name} se ha fusionado en esta ficha.",
    errMerge: "No se pudieron fusionar las fichas.",
    consentHeading: "Consentimiento de marketing",
    consentIntro: "Una decisi\xF3n por canal, con la fecha, de d\xF3nde vino y la frase que se le ense\xF1\xF3 al cliente. Aqu\xED no se rellena nada editando la ficha.",
    consentNotice: "Quiero recibir ofertas y novedades de este negocio por este canal. Puedo darme de baja cuando quiera.",
    consentAskHint: "L\xE9elo en voz alta y pulsa solo si dice que s\xED. Esta frase exacta es la que queda guardada como prueba, junto a tu nombre y la hora.",
    consentRecord: "Registrar consentimiento",
    consentConfirm: "Ha dicho que s\xED",
    consentWithdraw: "Retirar",
    consentClose: "Cerrarlo",
    consentGranted: "Dado",
    consentWithdrawn: "Retirado",
    consentLegacy: "Marcado antes de que hubiera registro \u2014 no sirve como prueba. Vuelve a preguntar.",
    consentNeverAsked: "Nunca se le ha preguntado",
    consentAnyChannel: "Canal sin especificar",
    consentHistoryHeading: "Todo lo que se decidi\xF3",
    consentNoHistory: "Todav\xEDa no se ha registrado nada.",
    consentRecorded: "Consentimiento registrado.",
    consentWithdrawnMsg: "Consentimiento retirado. Est\xE1 en vigor desde ya.",
    errConsent: "No se ha podido registrar el consentimiento."
  },
  errors: {
    "customers.customer_unavailable": "Ese cliente no est\xE1 disponible en este negocio.",
    "customers.field_invalid_boolean": "Valor s\xED/no no v\xE1lido: {message}",
    "customers.field_invalid_date": "Fecha no v\xE1lida (usa AAAA-MM-DD): {message}",
    "customers.field_invalid_number": "N\xFAmero no v\xE1lido: {message}",
    "customers.field_invalid_option": "El valor no est\xE1 entre las opciones del campo: {message}",
    "customers.field_required": "Falta un campo obligatorio: {message}",
    "customers.field_unavailable": "Ese campo no est\xE1 disponible en este negocio (puede haberse borrado).",
    "customers.group_unavailable": "Ese grupo no est\xE1 disponible en este negocio (puede haberse borrado).",
    "customers.tag_unavailable": "Esa etiqueta no est\xE1 disponible en este negocio (puede haberse borrado)."
  }
};

// locales/en.json
var en_default = {
  name: "Customers",
  navigation: {
    customers: {
      label: "Customers"
    },
    groups: {
      label: "Groups"
    },
    tags: {
      label: "Tags"
    },
    fields: {
      label: "Fields"
    }
  },
  ui: {
    customers: "Customers",
    active: "Active",
    vip: "VIP",
    revenue: "Revenue",
    colName: "Name",
    colEmail: "Email",
    colPhone: "Phone",
    colStage: "Stage",
    colSpent: "Spent",
    actionView: "View",
    actionEdit: "Edit",
    actionDelete: "Delete",
    stageLead: "Lead",
    stageProspect: "Prospect",
    stageFirstPurchase: "1st purchase",
    stageActive: "Active",
    stageAtRisk: "At risk",
    stageDormant: "Dormant",
    stageChurned: "Churned",
    stageVip: "VIP",
    channelNone: "None",
    channelEmail: "Email",
    channelSms: "SMS",
    channelWhatsapp: "WhatsApp",
    channelPhone: "Phone",
    placeholderName: "Name",
    placeholderEmail: "Email",
    addCustomer: "Add",
    moreDetails: "More details",
    saving: "Saving\u2026",
    searchCustomers: "Search name or email\u2026",
    loading: "Loading\u2026",
    emptyCustomers: "No customers.",
    deleteCustomerTitle: "Delete customer",
    deleteCustomerConfirm: "Delete {name}? The record will no longer be available (soft delete).",
    deleting: "Deleting\u2026",
    cancel: "Cancel",
    errCreate: "Could not create",
    errUpdate: "Could not update",
    errDelete: "Could not delete",
    errCustomerNotFound: "Customer not found",
    errLoadCustomer: "Could not load the customer",
    errSaveMembership: "Could not save the assignment",
    errAddNote: "Could not add the note",
    customerUpdated: "Customer updated",
    customerDeleted: "Customer {name} deleted",
    groupsAssigned: "Groups assigned",
    tagsAssigned: "Tags assigned",
    noteAdded: "Note added",
    fieldNif: "Tax ID",
    fieldCompany: "Company",
    fieldAddress: "Address",
    fieldCity: "City",
    fieldPostalCode: "Postal code",
    fieldCountry: "Country",
    countryNone: "No country",
    countrySearch: "Search a country\u2026",
    countryNoMatch: "No country matches",
    fieldBirthday: "Birthday",
    fieldAnniversary: "Anniversary",
    fieldSource: "Source",
    fieldPreferredChannel: "Preferred channel",
    fieldInternalNotes: "Internal notes",
    fieldActive: "Active",
    save: "Save",
    back: "\u2190 Back",
    edit: "Edit",
    delete: "Delete",
    noGroupsDefined: "No groups defined.",
    noTagsDefined: "No tags defined.",
    saveGroups: "Save groups",
    saveTags: "Save tags",
    detailPurchases: "Purchases",
    detailLastPurchase: "Last purchase",
    yes: "Yes",
    no: "No",
    groupsHeading: "Groups",
    tagsHeading: "Tags",
    addNote: "Add note",
    noteLabel: "Note",
    add: "Add",
    activityHeading: "Activity",
    noActivity: "No activity recorded.",
    activityNoteAdded: "Note added",
    activityPurchaseRecorded: "Purchase recorded",
    activityPurchaseVoided: "Purchase voided",
    activityConsentGranted: "Consent given",
    activityConsentWithdrawn: "Consent withdrawn",
    activityCustomerErased: "Customer data erased",
    activityCustomerMerged: "Duplicate customer merged into this one",
    activityTypeNote: "Note",
    activityTypePurchase: "Purchase",
    activityTypePurchaseVoided: "Void",
    activityTypeConsentGranted: "Consent",
    activityTypeConsentWithdrawn: "Consent",
    activityTypeErased: "Erasure",
    activityTypeMerged: "Merge",
    groupsTitle: "Customer groups",
    newGroup: "New group",
    colDescription: "Description",
    colCustomers: "Customers",
    colOrder: "Order",
    searchGroup: "Search group\u2026",
    emptyGroups: "No groups.",
    newGroupTitle: "New group",
    editGroupTitle: "Edit \xB7 {name}",
    fieldDescription: "Description",
    fieldColor: "Color",
    fieldOrder: "Order",
    deleteGroupTitle: "Delete group",
    deleteGroupConfirm: "Delete {name}? Assigned customers lose the group.",
    groupCreated: "Group created",
    groupUpdated: "Group updated",
    groupDeleted: "Group {name} deleted",
    errSaveGroup: "Could not save the group",
    errDeleteGroup: "Could not delete the group",
    tagsTitle: "Customer tags",
    newTag: "New tag",
    colColor: "Color",
    searchTag: "Search tag\u2026",
    emptyTags: "No tags.",
    newTagTitle: "New tag",
    editTagTitle: "Edit \xB7 {name}",
    fieldActiveTag: "Active",
    deleteTagTitle: "Delete tag",
    deleteTagConfirm: "Delete {name}? Assigned customers lose the tag.",
    tagCreated: "Tag created",
    tagUpdated: "Tag updated",
    tagDeleted: "Tag {name} deleted",
    errSaveTag: "Could not save the tag",
    errDeleteTag: "Could not delete the tag",
    fieldsTitle: "Custom fields",
    newField: "New field",
    colType: "Type",
    colRequired: "Required",
    searchField: "Search field\u2026",
    emptyFields: "No custom fields.",
    typeText: "Text",
    typeNumber: "Number",
    typeDate: "Date",
    typeBoolean: "Yes/No",
    typeSelect: "Select",
    typeTextarea: "Long text",
    newFieldTitle: "New custom field",
    editFieldTitle: "Edit \xB7 {name}",
    fieldType: "Type",
    fieldOptions: "Options (comma-separated)",
    fieldRequired: "Required",
    deleteFieldTitle: "Delete field",
    deleteFieldConfirm: "Delete {name}? Saved values will no longer be shown.",
    fieldCreated: "Field created",
    fieldUpdated: "Field updated",
    fieldDeleted: "Field {name} deleted",
    errSaveField: "Could not save the field",
    errDeleteField: "Could not delete the field",
    assignCustomer: "Assign customer",
    chooseCustomer: "Choose customer",
    searchPosCustomer: "Search by name, phone, email\u2026",
    noResults: "No results.",
    noCustomers: "No customers.",
    removeCustomer: "Remove customer",
    errLoadCustomers: "Could not load the customers",
    customFields: "Custom fields",
    posNoPermission: "You do not have permission to look up customers.",
    errCustomerSnapshot: "Could not load {name}'s fiscal data. Tap again to retry.",
    errLinkOrder: "The sale goes on, but the customer could not be attached to the order: it will not show in their history.",
    errLinkOrderNoPermission: "The sale goes on, but you do not have permission to attach customers to orders: it will not show in their history.",
    retry: "Retry",
    quickAddCustomer: "+ New customer \u201C{term}\u201D",
    quickName: "Name",
    quickPhone: "Phone",
    quickNameRequired: "A name is required.",
    quickCreate: "Create and assign",
    importing: "Importing\u2026",
    importSummary: "Import: {total} rows \u2014 {created} created, {skipped} skipped, {failed} failed.",
    importRow: "Row {row}",
    importRows: "Rows {rows}",
    importReasonName: "name is required",
    importReasonEmail: "email is not valid",
    importReasonCountry: "country not recognised \u2014 imported as written, review it on the customer",
    close: "Close",
    eraseData: "Erase personal data",
    eraseDataTitle: "Erase personal data (GDPR)",
    eraseDataConfirm: "This replaces {name}'s personal data by markers, blanks their notes, timeline and custom fields, and cannot be undone. Sales and invoices keep their reference. An audit entry records who, when and why.",
    eraseReason: "Reason (kept in the audit)",
    customerErased: "Personal data erased.",
    errErase: "Could not erase the personal data",
    mergeWith: "Merge with\u2026",
    mergeTitle: "Merge a duplicate customer",
    mergeHint: "Pick the duplicate of {name}. {name} stays; the one you pick is merged into it.",
    mergeSearch: "Search the duplicate",
    mergeSearching: "Searching\u2026",
    mergeNoCandidates: "No other customer matches.",
    errMergeSearch: "Could not search the customers. Try again.",
    mergeConfirm: "{absorbed} will be merged into {surviving}: its appointments, sales, bookings, conversations, prepaid packages, notes and consents move to {surviving}, empty fields are filled from it, and {absorbed} disappears from the list. This cannot be undone.",
    mergeSubmit: "Merge",
    merging: "Merging\u2026",
    mergeChange: "Pick another",
    customerMerged: "{name} was merged into this customer.",
    errMerge: "Could not merge the customers.",
    consentHeading: "Marketing consent",
    consentIntro: "One decision per channel, with the date, where it came from and the words the customer was shown. Nothing here is filled in by editing the sheet.",
    consentNotice: "I want to receive offers and news from this business through this channel. I can unsubscribe whenever I want.",
    consentAskHint: "Read it out loud and only press if they say yes. This exact sentence is what gets stored as the record, together with your name and the time.",
    consentRecord: "Record consent",
    consentConfirm: "They said yes",
    consentWithdraw: "Withdraw",
    consentClose: "Close it",
    consentGranted: "Given",
    consentWithdrawn: "Withdrawn",
    consentLegacy: "Ticked before there was any record \u2014 cannot be relied on. Ask again.",
    consentNeverAsked: "Never asked",
    consentAnyChannel: "Unspecified channel",
    consentHistoryHeading: "Everything that was decided",
    consentNoHistory: "Nothing has been recorded yet.",
    consentRecorded: "Consent recorded.",
    consentWithdrawnMsg: "Consent withdrawn. It is in force from now on.",
    errConsent: "The consent could not be recorded."
  },
  errors: {
    "customers.customer_unavailable": "That customer is not available in this business.",
    "customers.field_invalid_boolean": "Invalid yes/no value: {message}",
    "customers.field_invalid_date": "Invalid date (use YYYY-MM-DD): {message}",
    "customers.field_invalid_number": "Invalid number: {message}",
    "customers.field_invalid_option": "Value not among the field's options: {message}",
    "customers.field_required": "A required field is missing: {message}",
    "customers.field_unavailable": "That field is not available in this business (it may have been deleted).",
    "customers.group_unavailable": "That group is not available in this business (it may have been deleted).",
    "customers.tag_unavailable": "That tag is not available in this business (it may have been deleted)."
  }
};

// ui/lib/domain-error-text.ts
var SOURCE_LANG = "en";
function textFor(catalog, lang, code) {
  const dict = catalog[lang];
  const text = dict?.errors?.[code];
  return typeof text === "string" && text.trim() ? text : "";
}
function domainErrorText(catalog, locale, e7) {
  const code = e7?.code;
  if (typeof code !== "string" || !code) return "";
  const text = textFor(catalog, locale, code) || textFor(catalog, SOURCE_LANG, code);
  if (!text.includes(PLACEHOLDER)) return text;
  const message = e7 instanceof Error ? e7.message : "";
  if (alreadySpoken(catalog, code, message)) return message;
  return text.replaceAll(PLACEHOLDER, message);
}
var PLACEHOLDER = "{message}";
function alreadySpoken(catalog, code, message) {
  if (!message) return false;
  for (const lang of Object.keys(catalog)) {
    const template = textFor(catalog, lang, code);
    const at = template.indexOf(PLACEHOLDER);
    if (at < 0) continue;
    const prefix = template.slice(0, at);
    const suffix = template.slice(at + PLACEHOLDER.length);
    if (message.length < prefix.length + suffix.length) continue;
    if (message.startsWith(prefix) && message.endsWith(suffix)) return true;
  }
  return false;
}

// ui/components/erp-customers-fields/erp-customers-fields.ts
var CATALOG = { es: es_default, en: en_default };
function erplora() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function can(permission) {
  return erplora().hasPermission?.(permission) ?? true;
}
function domainErrorText2(e7, fallbackKey) {
  const declared = domainErrorText(CATALOG, erplora().locale, e7);
  if (declared) return declared;
  return (e7 instanceof Error ? e7.message : "") || erplora().t(CATALOG, fallbackKey);
}
var TYPE_KEY = {
  text: "ui.typeText",
  number: "ui.typeNumber",
  date: "ui.typeDate",
  boolean: "ui.typeBoolean",
  select: "ui.typeSelect",
  textarea: "ui.typeTextarea"
};
var typeLabel = (value) => TYPE_KEY[value] ? erplora().t(CATALOG, TYPE_KEY[value]) : value;
var ErpCustomersFields = class extends i3 {
  constructor() {
    super(...arguments);
    this.saving = false;
    this.formError = "";
    this.pageError = "";
    this.formMsg = "";
    this.editing = null;
    this.editTitleInHeader = false;
    this.pendingDelete = null;
    this.fName = "";
    this.fType = "text";
    this.fOptions = "";
    this.fRequired = false;
    this.fSortOrder = "0";
    this.fActive = true;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* La tabla llena el alto de la vista: scroll interno en las filas + pie siempre visible. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .panel { flex:0 0 auto; border:1px solid var(--ion-border-color,#e7e2d6); border-radius: var(--ok-radius-sm, 10px); padding:.75rem 1rem; margin:0 0 1rem; background:var(--ok-surface-2, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04))); }
    .panel h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    /* El panel del data-table es una columna estrecha: los campos van apilados, no en fila. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form h3 { margin:0; font-size:1rem; }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
    /* pm#392 — a danger button paints from HERE, never from \`color="danger"\`: Ionic resolves
       \`color=\` through a GLOBAL \`.ion-color-danger\` rule that does not reach inside this shadow
       root, so a solid button came out as white text on a transparent background (invisible).
       Custom properties do inherit through the boundary, so the theme token still applies. */
    ion-button.tone-danger:not([fill]) {
      --background: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger-shade, #ad000d);
      --background-focused: var(--ion-color-danger-shade, #ad000d);
      --background-hover: var(--ion-color-danger-tint, #cb1a27);
      --color: var(--ion-color-danger-contrast, #fff);
    }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora().t(CATALOG, k2);
    return [
      { key: "name", header: t5("ui.colName"), sortable: true, filterable: true, filterType: "text" },
      {
        key: "field_type",
        header: t5("ui.colType"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: Object.keys(TYPE_KEY).map((value) => ({ value, label: typeLabel(value) })),
        format: (r6) => typeLabel(r6.field_type)
      },
      {
        key: "is_required",
        header: t5("ui.colRequired"),
        sortable: true,
        filterable: true,
        // Dominio CERRADO (0/1) que el servidor filtra por `eq`: se elige, no se teclea.
        filterType: "select",
        options: [
          { value: "1", label: t5("ui.yes") },
          { value: "0", label: t5("ui.no") }
        ],
        format: (r6) => r6.is_required ? t5("ui.yes") : t5("ui.no")
      },
      { key: "sort_order", header: t5("ui.colOrder"), align: "right", sortable: true }
    ];
  }
  get rowActions() {
    const t5 = (k2) => erplora().t(CATALOG, k2);
    if (!can("customers.manage_custom_fields")) return [];
    return [
      { id: "edit", label: t5("ui.actionEdit"), icon: "create-outline" },
      { id: "delete", label: t5("ui.actionDelete"), icon: "trash-outline", color: "danger" }
    ];
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora(), "customers.fields.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "sort_order",
      dir: "asc"
    });
    await this.ctrl.load();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  /** Referencia al ok-data-table para abrir/cerrar su panel lateral (alta y edición). */
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited record under a «New» header, and the submit would UPDATE it. */
  onTableClick(e7) {
    if (!this.editing) return;
    const addId = "customers-fields-table-add";
    if (e7.composedPath().some((n6) => n6 instanceof HTMLElement && n6.dataset.testid === addId)) this.resetForm();
  }
  /** Wired natively, not with a Lit `@click` on the tag: `<ok-data-table>` carries `testid`, not
   *  `data-testid` (outfitkit#143), and a template binding would read as an action element that
   *  demands one. */
  firstUpdated() {
    this.renderRoot.querySelector("ok-data-table")?.addEventListener("click", (e7) => this.onTableClick(e7));
  }
  resetForm() {
    this.editing = null;
    this.fName = "";
    this.fType = "text";
    this.fOptions = "";
    this.fRequired = false;
    this.fSortOrder = "0";
    this.fActive = true;
    this.formError = "";
  }
  async startEdit(f3) {
    if (!can("customers.manage_custom_fields")) return;
    this.editing = f3;
    this.fName = f3.name;
    this.fType = f3.field_type || "text";
    this.fOptions = this.optionsToText(f3.options);
    this.fRequired = Boolean(f3.is_required);
    this.fSortOrder = String(f3.sort_order ?? 0);
    this.fActive = Boolean(f3.is_active);
    this.formError = "";
    this.formMsg = "";
    const title = erplora().t(CATALOG, "ui.editFieldTitle", { name: f3.name });
    const table = this.dataTable();
    table?.open("edit", { title });
    await table?.updateComplete;
    this.editTitleInHeader = table?.shadowRoot?.querySelector('[role="dialog"]')?.getAttribute("aria-label") === title;
  }
  /** options en BD = JSON array serializado; en el form se edita una opción por coma. */
  optionsToText(options) {
    try {
      const arr = JSON.parse(options || "[]");
      return Array.isArray(arr) ? arr.join(", ") : "";
    } catch {
      return "";
    }
  }
  optionsPayload() {
    if (this.fType !== "select") return "[]";
    const arr = this.fOptions.split(",").map((s5) => s5.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }
  onRowAction(ev) {
    if (!can("customers.manage_custom_fields")) return;
    const f3 = ev.detail.row;
    if (ev.detail.actionId === "edit") void this.startEdit(f3);
    if (ev.detail.actionId === "delete") {
      this.pendingDelete = f3;
      this.formMsg = "";
      this.pageError = "";
    }
  }
  async save(ev) {
    ev.preventDefault();
    if (!this.fName.trim()) return;
    if (!can("customers.manage_custom_fields")) return;
    const editing = this.editing;
    this.saving = true;
    this.formError = "";
    this.pageError = "";
    try {
      if (editing) {
        await erplora().command("customers.fields.update", {
          field_id: editing.id,
          name: this.fName.trim(),
          field_type: this.fType,
          options: this.optionsPayload(),
          is_required: this.fRequired ? 1 : 0,
          sort_order: Number(this.fSortOrder) || 0,
          is_active: this.fActive ? 1 : 0
        });
        this.formMsg = erplora().t(CATALOG, "ui.fieldUpdated");
      } else {
        await erplora().command("customers.fields.create", {
          name: this.fName.trim(),
          field_type: this.fType,
          options: this.optionsPayload(),
          is_required: this.fRequired ? 1 : 0,
          sort_order: Number(this.fSortOrder) || 0
        });
        this.formMsg = erplora().t(CATALOG, "ui.fieldCreated");
      }
      this.resetForm();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e7) {
      this.formError = e7 instanceof Error ? e7.message : erplora().t(CATALOG, "ui.errSaveField");
    } finally {
      this.saving = false;
    }
  }
  async confirmDelete() {
    if (!this.pendingDelete || !can("customers.manage_custom_fields")) return;
    this.saving = true;
    this.pageError = "";
    try {
      await erplora().command("customers.fields.delete", { field_id: this.pendingDelete.id });
      this.formMsg = erplora().t(CATALOG, "ui.fieldDeleted", { name: this.pendingDelete.name });
      this.pendingDelete = null;
      await this.ctrl.load();
    } catch (e7) {
      this.pageError = domainErrorText2(e7, "ui.errDeleteField");
    } finally {
      this.saving = false;
    }
  }
  /** Formulario del panel `create`: SIEMPRE proyectado (si solo se pintara al editar, el «+» de la
   *  barra abriría un panel vacío). En alta `editing` es null; en edición trae la fila. */
  renderForm() {
    const t5 = (k2, p4) => erplora().t(CATALOG, k2, p4);
    const editing = this.editing;
    return b2`<form slot="create" class="form" data-testid="customers-fields-form" @submit=${(e7) => this.save(e7)}>
      ${editing && !this.editTitleInHeader ? b2`<h3 data-testid="customers-fields-editing">${t5("ui.editFieldTitle", { name: editing.name })}</h3>` : A}
      <ion-input mode="md" fill="outline" data-testid="customers-fields-name" label=${t5("ui.colName")} label-placement="floating" .value=${this.fName} @ionInput=${(e7) => this.fName = e7.target.value}></ion-input>
      <ion-select mode="md" fill="outline" data-testid="customers-fields-type" label=${t5("ui.fieldType")} label-placement="floating" .value=${this.fType} @ionChange=${(e7) => this.fType = e7.target.value}>
        ${Object.keys(TYPE_KEY).map((v3) => b2`<ion-select-option value=${v3}>${typeLabel(v3)}</ion-select-option>`)}
      </ion-select>
      ${this.fType === "select" ? b2`<ion-input mode="md" fill="outline" data-testid="customers-fields-options" label=${t5("ui.fieldOptions")} label-placement="floating" .value=${this.fOptions} @ionInput=${(e7) => this.fOptions = e7.target.value}></ion-input>` : A}
      <ion-input mode="md" type="number" fill="outline" data-testid="customers-fields-order" label=${t5("ui.fieldOrder")} label-placement="floating" min="0" .value=${this.fSortOrder} @ionInput=${(e7) => this.fSortOrder = e7.target.value}></ion-input>
      <ion-checkbox data-testid="customers-fields-required" .checked=${this.fRequired} @ionChange=${(e7) => this.fRequired = e7.target.checked}>${t5("ui.fieldRequired")}</ion-checkbox>
      ${editing ? b2`<ion-checkbox data-testid="customers-fields-active" .checked=${this.fActive} @ionChange=${(e7) => this.fActive = e7.target.checked}>${t5("ui.fieldActive")}</ion-checkbox>` : A}
      <!-- pm#478: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
           and a banner on the page underneath it is never seen. -->
      ${this.formError ? b2`<ok-inline-feedback data-testid="customers-fields-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
      <ion-button type="submit" size="small" data-testid="customers-fields-submit" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? t5("ui.saving") : t5("ui.save")}</ion-button>
      ${editing ? b2`<ion-button size="small" fill="outline" data-testid="customers-fields-cancel" @click=${() => this.resetForm()}>${t5("ui.cancel")}</ion-button>` : A}
    </form>`;
  }
  renderDeleteConfirm() {
    if (!this.pendingDelete) return A;
    const t5 = (k2, p4) => erplora().t(CATALOG, k2, p4);
    return b2`<section class="panel">
      <h3>${t5("ui.deleteFieldTitle")}</h3>
      <p>${t5("ui.deleteFieldConfirm", { name: this.pendingDelete.name })}</p>
      <ion-button size="small" class="tone-danger" data-testid="customers-fields-delete-submit" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t5("ui.deleting") : t5("ui.delete")}</ion-button>
      <ion-button size="small" fill="outline" data-testid="customers-fields-delete-cancel" @click=${() => this.pendingDelete = null}>${t5("ui.cancel")}</ion-button>
    </section>`;
  }
  /** pm#478: the refusal appears ABOVE the button that was pressed, at the foot of the form — on a
   *  phone that can leave it off the sheet. Bring it into view once it has painted itself: scrolled
   *  before, the banner still measures 0 px and ends up under the tab bar. */
  updated(changed) {
    super.updated(changed);
    if (changed.has("formError") && this.formError) void this.revealFormError();
  }
  async revealFormError() {
    const banner = this.renderRoot.querySelector('[data-testid="customers-fields-form-error"]');
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: "center" });
  }
  render() {
    const t5 = (k2) => erplora().t(CATALOG, k2);
    return b2`<div class="page">
      ${this.pageError ? b2`<ok-inline-feedback data-testid="customers-fields-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
      ${this.formMsg ? b2`<p class="ok" data-testid="customers-fields-form-msg">${this.formMsg}</p>` : A}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error ? b2`<ok-inline-feedback data-testid="customers-fields-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
      <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
           same edit panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
      <ok-data-table testid="customers-fields-table" .serverSide=${true} .fill=${true} .labels=${dataTableLabels(erplora().locale)} .views=${true} .cardTitle=${(r6) => String(r6.name ?? "\u2014")} .cardIcon=${() => "layers-outline"} .addable=${can("customers.manage_custom_fields")} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.searchField")} .actions=${this.rowActions} .rowClickable=${true} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyFields")} @rowAction=${(e7) => this.onRowAction(e7)} @rowClick=${(e7) => {
      if (can("customers.manage_custom_fields")) void this.startEdit(e7.detail.row);
    }} @pageChange=${(e7) => this.ctrl.setPage(e7.detail)} @pageSizeChange=${(e7) => this.ctrl.setPageSize(e7.detail)} @sortChange=${(e7) => this.ctrl.setSort(e7.detail.sort, e7.detail.dir)} @searchChange=${(e7) => this.ctrl.setSearch(e7.detail)} @filterChange=${(e7) => this.ctrl.setFilter(e7.detail.col, e7.detail.value)}>
        ${this.renderForm()}
      </ok-data-table>
    </div>`;
  }
};
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "pageError", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "formMsg", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "editing", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "editTitleInHeader", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "pendingDelete", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "fName", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "fType", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "fOptions", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "fRequired", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "fSortOrder", 2);
__decorateClass([
  r5()
], ErpCustomersFields.prototype, "fActive", 2);
define("erp-customers-fields", ErpCustomersFields);

// ui/components/erp-customers-groups/erp-customers-groups.ts
var CATALOG2 = { es: es_default, en: en_default };
function erplora2() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function can2(permission) {
  return erplora2().hasPermission?.(permission) ?? true;
}
function domainErrorText3(e7, fallbackKey) {
  const declared = domainErrorText(CATALOG2, erplora2().locale, e7);
  if (declared) return declared;
  return (e7 instanceof Error ? e7.message : "") || erplora2().t(CATALOG2, fallbackKey);
}
var ErpCustomersGroups = class extends i3 {
  constructor() {
    super(...arguments);
    this.saving = false;
    this.formError = "";
    this.pageError = "";
    this.formMsg = "";
    this.editing = null;
    this.editTitleInHeader = false;
    this.pendingDelete = null;
    this.fName = "";
    this.fDescription = "";
    this.fColor = "primary";
    this.fSortOrder = "0";
    this.fActive = true;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* La tabla llena el alto de la vista: scroll interno en las filas + pie siempre visible. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .panel { flex:0 0 auto; border:1px solid var(--ion-border-color,#e7e2d6); border-radius: var(--ok-radius-sm, 10px); padding:.75rem 1rem; margin:0 0 1rem; background:var(--ok-surface-2, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04))); }
    .panel h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    /* El panel del data-table es una columna estrecha: los campos van apilados, no en fila. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form h3 { margin:0; font-size:1rem; }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
    /* pm#392 — a danger button paints from HERE, never from \`color="danger"\`: Ionic resolves
       \`color=\` through a GLOBAL \`.ion-color-danger\` rule that does not reach inside this shadow
       root, so a solid button came out as white text on a transparent background (invisible).
       Custom properties do inherit through the boundary, so the theme token still applies. */
    ion-button.tone-danger:not([fill]) {
      --background: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger-shade, #ad000d);
      --background-focused: var(--ion-color-danger-shade, #ad000d);
      --background-hover: var(--ion-color-danger-tint, #cb1a27);
      --color: var(--ion-color-danger-contrast, #fff);
    }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    return [
      { key: "name", header: t5("ui.colName"), sortable: true, filterable: true, filterType: "text" },
      { key: "description", header: t5("ui.colDescription"), sortable: true },
      { key: "customer_count", header: t5("ui.colCustomers"), align: "right", sortable: true },
      { key: "sort_order", header: t5("ui.colOrder"), align: "right", sortable: true }
    ];
  }
  get rowActions() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    const actions = [];
    if (can2("customers.change_customergroup")) {
      actions.push({ id: "edit", label: t5("ui.actionEdit"), icon: "create-outline" });
    }
    if (can2("customers.delete_customergroup")) {
      actions.push({ id: "delete", label: t5("ui.actionDelete"), icon: "trash-outline", color: "danger" });
    }
    return actions;
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora2(), "customers.groups.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "name",
      dir: "asc"
    });
    await this.ctrl.load();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  /** Referencia al ok-data-table para abrir/cerrar su panel lateral (alta y edición). */
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited record under a «New» header, and the submit would UPDATE it. */
  onTableClick(e7) {
    if (!this.editing) return;
    const addId = "customers-groups-table-add";
    if (e7.composedPath().some((n6) => n6 instanceof HTMLElement && n6.dataset.testid === addId)) this.resetForm();
  }
  /** Wired natively, not with a Lit `@click` on the tag: `<ok-data-table>` carries `testid`, not
   *  `data-testid` (outfitkit#143), and a template binding would read as an action element that
   *  demands one. */
  firstUpdated() {
    this.renderRoot.querySelector("ok-data-table")?.addEventListener("click", (e7) => this.onTableClick(e7));
  }
  resetForm() {
    this.editing = null;
    this.fName = "";
    this.fDescription = "";
    this.fColor = "primary";
    this.fSortOrder = "0";
    this.fActive = true;
    this.formError = "";
  }
  async startEdit(g3) {
    if (!can2("customers.change_customergroup")) return;
    this.editing = g3;
    this.fName = g3.name;
    this.fDescription = g3.description ?? "";
    this.fColor = g3.color || "primary";
    this.fSortOrder = String(g3.sort_order ?? 0);
    this.fActive = Boolean(g3.is_active);
    this.formError = "";
    this.formMsg = "";
    const title = erplora2().t(CATALOG2, "ui.editGroupTitle", { name: g3.name });
    const table = this.dataTable();
    table?.open("edit", { title });
    await table?.updateComplete;
    this.editTitleInHeader = table?.shadowRoot?.querySelector('[role="dialog"]')?.getAttribute("aria-label") === title;
  }
  onRowAction(ev) {
    const g3 = ev.detail.row;
    if (ev.detail.actionId === "edit" && can2("customers.change_customergroup")) void this.startEdit(g3);
    if (ev.detail.actionId === "delete" && can2("customers.delete_customergroup")) {
      this.pendingDelete = g3;
      this.formMsg = "";
      this.pageError = "";
    }
  }
  async save(ev) {
    ev.preventDefault();
    if (!this.fName.trim()) return;
    const editing = this.editing;
    if (!can2(editing ? "customers.change_customergroup" : "customers.add_customergroup")) return;
    this.saving = true;
    this.formError = "";
    this.pageError = "";
    try {
      if (editing) {
        await erplora2().command("customers.groups.update", {
          group_id: editing.id,
          name: this.fName.trim(),
          description: this.fDescription.trim(),
          color: this.fColor.trim() || "primary",
          sort_order: Number(this.fSortOrder) || 0,
          is_active: this.fActive ? 1 : 0
        });
        this.formMsg = erplora2().t(CATALOG2, "ui.groupUpdated");
      } else {
        await erplora2().command("customers.groups.create", {
          name: this.fName.trim(),
          description: this.fDescription.trim(),
          color: this.fColor.trim() || "primary",
          sort_order: Number(this.fSortOrder) || 0
        });
        this.formMsg = erplora2().t(CATALOG2, "ui.groupCreated");
      }
      this.resetForm();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e7) {
      this.formError = e7 instanceof Error ? e7.message : erplora2().t(CATALOG2, "ui.errSaveGroup");
    } finally {
      this.saving = false;
    }
  }
  async confirmDelete() {
    if (!this.pendingDelete || !can2("customers.delete_customergroup")) return;
    this.saving = true;
    this.pageError = "";
    try {
      await erplora2().command("customers.groups.delete", { group_id: this.pendingDelete.id });
      this.formMsg = erplora2().t(CATALOG2, "ui.groupDeleted", { name: this.pendingDelete.name });
      this.pendingDelete = null;
      await this.ctrl.load();
    } catch (e7) {
      this.pageError = domainErrorText3(e7, "ui.errDeleteGroup");
    } finally {
      this.saving = false;
    }
  }
  /** Formulario del panel `create`: SIEMPRE proyectado (si solo se pintara al editar, el «+» de la
   *  barra abriría un panel vacío). En alta `editing` es null; en edición trae la fila. */
  renderForm() {
    const t5 = (k2, p4) => erplora2().t(CATALOG2, k2, p4);
    const editing = this.editing;
    return b2`<form slot="create" class="form" data-testid="customers-groups-form" @submit=${(e7) => this.save(e7)}>
      ${editing && !this.editTitleInHeader ? b2`<h3 data-testid="customers-groups-editing">${t5("ui.editGroupTitle", { name: editing.name })}</h3>` : A}
      <ion-input mode="md" fill="outline" data-testid="customers-groups-name" label=${t5("ui.colName")} label-placement="floating" .value=${this.fName} @ionInput=${(e7) => this.fName = e7.target.value}></ion-input>
      <ion-input mode="md" fill="outline" data-testid="customers-groups-description" label=${t5("ui.fieldDescription")} label-placement="floating" .value=${this.fDescription} @ionInput=${(e7) => this.fDescription = e7.target.value}></ion-input>
      <ion-input mode="md" fill="outline" data-testid="customers-groups-color" label=${t5("ui.fieldColor")} label-placement="floating" .value=${this.fColor} @ionInput=${(e7) => this.fColor = e7.target.value}></ion-input>
      <ion-input mode="md" type="number" fill="outline" data-testid="customers-groups-order" label=${t5("ui.fieldOrder")} label-placement="floating" min="0" .value=${this.fSortOrder} @ionInput=${(e7) => this.fSortOrder = e7.target.value}></ion-input>
      ${editing ? b2`<ion-checkbox data-testid="customers-groups-active" .checked=${this.fActive} @ionChange=${(e7) => this.fActive = e7.target.checked}>${t5("ui.fieldActive")}</ion-checkbox>` : A}
      <!-- pm#478: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
           and a banner on the page underneath it is never seen. -->
      ${this.formError ? b2`<ok-inline-feedback data-testid="customers-groups-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
      <ion-button type="submit" size="small" data-testid="customers-groups-submit" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? t5("ui.saving") : t5("ui.save")}</ion-button>
      ${editing ? b2`<ion-button size="small" fill="outline" data-testid="customers-groups-cancel" @click=${() => this.resetForm()}>${t5("ui.cancel")}</ion-button>` : A}
    </form>`;
  }
  renderDeleteConfirm() {
    if (!this.pendingDelete) return A;
    const t5 = (k2, p4) => erplora2().t(CATALOG2, k2, p4);
    return b2`<section class="panel">
      <h3>${t5("ui.deleteGroupTitle")}</h3>
      <p>${t5("ui.deleteGroupConfirm", { name: this.pendingDelete.name })}</p>
      <ion-button size="small" class="tone-danger" data-testid="customers-groups-delete-submit" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t5("ui.deleting") : t5("ui.delete")}</ion-button>
      <ion-button size="small" fill="outline" data-testid="customers-groups-delete-cancel" @click=${() => this.pendingDelete = null}>${t5("ui.cancel")}</ion-button>
    </section>`;
  }
  /** pm#478: the refusal appears ABOVE the button that was pressed, at the foot of the form — on a
   *  phone that can leave it off the sheet. Bring it into view once it has painted itself: scrolled
   *  before, the banner still measures 0 px and ends up under the tab bar. */
  updated(changed) {
    super.updated(changed);
    if (changed.has("formError") && this.formError) void this.revealFormError();
  }
  async revealFormError() {
    const banner = this.renderRoot.querySelector('[data-testid="customers-groups-form-error"]');
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: "center" });
  }
  render() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    return b2`<div class="page">
      ${this.pageError ? b2`<ok-inline-feedback data-testid="customers-groups-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
      ${this.formMsg ? b2`<p class="ok" data-testid="customers-groups-form-msg">${this.formMsg}</p>` : A}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error ? b2`<ok-inline-feedback data-testid="customers-groups-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
      <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
           same edit panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
      <ok-data-table testid="customers-groups-table" .serverSide=${true} .fill=${true} .labels=${dataTableLabels(erplora2().locale)} .views=${true} .cardTitle=${(r6) => String(r6.name ?? "\u2014")} .cardIcon=${() => "people-outline"} .addable=${can2("customers.add_customergroup")} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.searchGroup")} .actions=${this.rowActions} .rowClickable=${true} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyGroups")} @rowAction=${(e7) => this.onRowAction(e7)} @rowClick=${(e7) => {
      if (can2("customers.change_customergroup")) void this.startEdit(e7.detail.row);
    }} @pageChange=${(e7) => this.ctrl.setPage(e7.detail)} @pageSizeChange=${(e7) => this.ctrl.setPageSize(e7.detail)} @sortChange=${(e7) => this.ctrl.setSort(e7.detail.sort, e7.detail.dir)} @searchChange=${(e7) => this.ctrl.setSearch(e7.detail)} @filterChange=${(e7) => this.ctrl.setFilter(e7.detail.col, e7.detail.value)}>
        ${this.renderForm()}
      </ok-data-table>
    </div>`;
  }
};
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "pageError", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "formMsg", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "editing", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "editTitleInHeader", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "pendingDelete", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "fName", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "fDescription", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "fColor", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "fSortOrder", 2);
__decorateClass([
  r5()
], ErpCustomersGroups.prototype, "fActive", 2);
define("erp-customers-groups", ErpCustomersGroups);

// @erplora/outfitkit/dist/ok-kpi.js
var __defProp4 = Object.defineProperty;
var __decorateClass4 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp4(target, key, result);
  return result;
};
var OkKpi = class extends i3 {
  constructor() {
    super(...arguments);
    this.trend = "flat";
  }
  static {
    this.styles = i`
    :host {
      display: block;
      width: 100%;
      /* Tokens propios estilo Ionic (overridables): --ok-* → --ion-* → hex. */
      --background: var(--ok-card-background, var(--ion-card-background, var(--ion-background-color, #ffffff)));
      --color: var(--ok-text-color, var(--ion-text-color, #1f2933));
      --label-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
      --border-color: var(--ok-border-color, var(--ion-border-color, rgba(0, 0, 0, 0.08)));
      --border-radius: var(--ok-radius, 12px);
      --box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
      --padding: 1rem 1.125rem;
      /* Colores de tendencia. */
      --trend-up-color: var(--ok-color-success, var(--ion-color-success, #2dd36f));
      --trend-down-color: var(--ok-color-danger, var(--ion-color-danger, #eb445a));
      --trend-flat-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
    }

    .card {
      box-sizing: border-box;
      width: 100%;
      background: var(--background);
      color: var(--color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      box-shadow: var(--box-shadow);
      padding: var(--padding);
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    /* Fila superior: label + icono opcional. */
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--label-color);
    }

    .label-icon {
      font-size: 1.25rem;
      color: var(--label-color);
      flex: 0 0 auto;
    }

    .value {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.1;
    }

    /* Delta: flecha + texto, coloreado según tendencia. */
    .delta {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .delta ion-icon {
      font-size: 1rem;
    }
    .delta.up {
      color: var(--trend-up-color);
    }
    .delta.down {
      color: var(--trend-down-color);
    }
    .delta.flat {
      color: var(--trend-flat-color);
    }

    ::slotted(*) {
      margin-top: 0.25rem;
    }
  `;
  }
  /** Devuelve el icono de flecha según la tendencia (SVG horneado, ver base/icons.ts). */
  trendIcon() {
    if (this.trend === "up") return iconTrendingUp;
    if (this.trend === "down") return iconTrendingDown;
    return iconRemove;
  }
  render() {
    return b2`
      <div class="card">
        <div class="top">
          ${this.label ? b2`<p class="label">${this.label}</p>` : null}
          ${this.icon ? b2`<ion-icon class="label-icon" .icon=${okIcon(this.icon)} aria-hidden="true"></ion-icon>` : null}
        </div>
        ${this.value ? b2`<p class="value">${this.value}</p>` : null}
        ${this.delta ? b2`<span class="delta ${this.trend}">
              <ion-icon .icon=${this.trendIcon()} aria-hidden="true"></ion-icon>${this.delta}
            </span>` : null}
        <slot></slot>
      </div>
    `;
  }
};
__decorateClass4([
  n4()
], OkKpi.prototype, "label");
__decorateClass4([
  n4()
], OkKpi.prototype, "value");
__decorateClass4([
  n4()
], OkKpi.prototype, "delta");
__decorateClass4([
  n4()
], OkKpi.prototype, "trend");
__decorateClass4([
  n4()
], OkKpi.prototype, "icon");
define("ok-kpi", OkKpi);

// @erplora/outfitkit/dist/ok-combo.js
var __defProp5 = Object.defineProperty;
var __decorateClass5 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp5(target, key, result);
  return result;
};
var DEFAULT_LABELS3 = {
  placeholder: "Search\u2026",
  empty: "No results"
};
var OkCombo = class extends i3 {
  constructor() {
    super(...arguments);
    this.options = [];
    this.value = "";
    this.placeholder = "";
    this.labels = {};
    this.query = "";
    this.open = false;
    this.activeIndex = -1;
    this.onDocClick = (e7) => {
      if (!this.open) return;
      if (!e7.composedPath().includes(this)) this.close();
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex */
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-text-muted, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.55));
      --primary-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --primary-contrast: var(--ok-primary-contrast, var(--ion-color-primary-contrast, #ffffff));
      --background: var(--ok-surface, var(--ion-background-color, #ffffff));
      --hover-bg: var(--ok-hover, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.06));
      --border-color: var(--ok-border, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.18));
      --border-radius: var(--ok-radius, 8px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
      --shadow: var(--ok-shadow, 0 6px 24px rgba(0, 0, 0, 0.14));

      /* Por defecto ocupa el ancho del contenedor y es responsive. */
      display: block;
      width: 100%;
      max-width: 100%;
      position: relative;
      color: var(--color);
      font-family: var(--font);
      font-size: 0.95rem;
    }
    .field {
      position: relative;
      width: 100%;
    }
    /* El ion-input se estiliza vía sus propias vars (estilo Ionic). */
    ion-input {
      --background: var(--background);
      --color: var(--color);
      --placeholder-color: var(--color-muted);
      --border-radius: var(--border-radius);
      width: 100%;
    }
    /* Chevron decorativo a la derecha del campo. */
    .chevron {
      position: absolute;
      right: 0.6rem;
      top: 50%;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      color: var(--color-muted);
      pointer-events: none;
      transition: transform 0.18s ease;
    }
    :host([data-open]) .chevron {
      transform: translateY(-50%) rotate(180deg);
    }
    /* Dropdown de resultados: posicionado bajo el campo, ancho del contenedor. */
    .dropdown {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 4px);
      z-index: 50;
      max-height: 16rem;
      overflow-y: auto;
      margin: 0;
      padding: 0.25rem;
      list-style: none;
      background: var(--background);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow);
      box-sizing: border-box;
    }
    .option {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 0.6rem;
      border-radius: calc(var(--border-radius) - 2px);
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: background-color var(--ok-transition, 150ms ease),
        color var(--ok-transition, 150ms ease),
        border-color var(--ok-transition, 150ms ease),
        box-shadow var(--ok-transition, 150ms ease), transform 120ms ease;
    }
    @media (hover: hover) {
      .option:hover {
        background: var(--hover-bg);
      }
    }
    .option:active {
      transform: scale(var(--ok-press-scale, 0.97));
    }
    .option.active {
      background: var(--primary-color);
      color: var(--primary-contrast);
    }
    @media (prefers-reduced-motion: reduce) {
      .option:hover,
      .option:active {
        transform: none;
      }
    }
    .empty {
      padding: 0.6rem;
      color: var(--color-muted);
      text-align: center;
    }
  `;
  }
  // Textos efectivos: defaults inglés sobreescritos por los pasados desde fuera.
  get t() {
    return { ...DEFAULT_LABELS3, ...this.labels };
  }
  // Placeholder efectivo: prop explícita si se pasó, si no el de los labels.
  get effectivePlaceholder() {
    return this.placeholder || this.t.placeholder;
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.onDocClick, true);
  }
  disconnectedCallback() {
    document.removeEventListener("click", this.onDocClick, true);
    super.disconnectedCallback();
  }
  // Texto a mostrar en el input: si está escribiendo usa la query, si no, el label del value.
  get displayText() {
    if (this.open) return this.query;
    const current = this.options.find((o7) => o7.value === this.value);
    return current ? current.label : this.query;
  }
  // Opciones que casan con la query (case-insensitive, substring).
  get filtered() {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter((o7) => o7.label.toLowerCase().includes(q));
  }
  close() {
    this.open = false;
    this.activeIndex = -1;
  }
  // Maneja la escritura en el ion-input: actualiza query, abre dropdown y emite `ok-input`.
  handleInput(e7) {
    const detail = e7.detail;
    const value = detail?.value ?? "";
    this.query = value;
    this.open = true;
    this.activeIndex = -1;
    this.dispatchEvent(
      new CustomEvent("ok-input", {
        detail: { query: value },
        bubbles: true,
        composed: true
      })
    );
  }
  // Elige una opción: fija value, rellena input, cierra y emite `ok-change`.
  choose(option) {
    this.value = option.value;
    this.query = option.label;
    this.close();
    this.dispatchEvent(
      new CustomEvent("ok-change", {
        detail: { value: option.value, label: option.label },
        bubbles: true,
        composed: true
      })
    );
  }
  // Navegación por teclado sobre la lista filtrada.
  handleKeydown(e7) {
    const items = this.filtered;
    switch (e7.key) {
      case "ArrowDown":
        e7.preventDefault();
        if (!this.open) this.open = true;
        if (items.length) this.activeIndex = (this.activeIndex + 1) % items.length;
        break;
      case "ArrowUp":
        e7.preventDefault();
        if (!this.open) this.open = true;
        if (items.length)
          this.activeIndex = (this.activeIndex - 1 + items.length) % items.length;
        break;
      case "Enter":
        if (this.open && this.activeIndex >= 0 && items[this.activeIndex]) {
          e7.preventDefault();
          this.choose(items[this.activeIndex]);
        }
        break;
      case "Escape":
        if (this.open) {
          e7.preventDefault();
          this.close();
        }
        break;
    }
  }
  render() {
    const items = this.filtered;
    this.toggleAttribute("data-open", this.open);
    return b2`<div class="field">
      <ion-input
        .label=${this.label ?? ""}
        label-placement=${this.label ? "stacked" : "start"}
        fill="outline" mode="md"
        .value=${this.displayText}
        placeholder=${this.effectivePlaceholder}
        @ionInput=${(e7) => this.handleInput(e7)}
        @ionFocus=${() => {
      this.open = true;
    }}
        @keydown=${(e7) => this.handleKeydown(e7)}
      ></ion-input>
      <span class="chevron">
        <ion-icon .icon=${iconChevronDownOutline}></ion-icon>
      </span>
      ${this.open ? b2`<ul class="dropdown" role="listbox">
            ${items.length ? items.map(
      (option, i7) => b2`<li
                    role="option"
                    class=${`option ${i7 === this.activeIndex ? "active" : ""}`.trim()}
                    aria-selected=${option.value === this.value ? "true" : "false"}
                    @mouseenter=${() => {
        this.activeIndex = i7;
      }}
                    @click=${() => this.choose(option)}
                  >
                    ${option.label}
                  </li>`
    ) : b2`<li class="empty">${this.t.empty}</li>`}
          </ul>` : ""}
    </div>`;
  }
};
__decorateClass5([
  n4({ attribute: false })
], OkCombo.prototype, "options");
__decorateClass5([
  n4()
], OkCombo.prototype, "value");
__decorateClass5([
  n4()
], OkCombo.prototype, "placeholder");
__decorateClass5([
  n4()
], OkCombo.prototype, "label");
__decorateClass5([
  n4({ attribute: false })
], OkCombo.prototype, "labels");
__decorateClass5([
  r5()
], OkCombo.prototype, "query");
__decorateClass5([
  r5()
], OkCombo.prototype, "open");
__decorateClass5([
  r5()
], OkCombo.prototype, "activeIndex");
define("ok-combo", OkCombo);

// ui/lib/country.ts
var NOT_A_COUNTRY = /* @__PURE__ */ new Set(["EU", "EZ", "QO", "UN", "XA", "XB", "ZZ"]);
var HOME_COUNTRY = "ES";
var SPANISH_REGIONS = /* @__PURE__ */ new Set(["IC", "EA"]);
function canonical(code) {
  try {
    return Intl.getCanonicalLocales(`und-${code}`)[0].slice(4);
  } catch {
    return "";
  }
}
var REGION_CODES = (() => {
  const names = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
  const out = [];
  for (let a3 = 65; a3 <= 90; a3++) {
    for (let b3 = 65; b3 <= 90; b3++) {
      const code = String.fromCharCode(a3, b3);
      const name = names.of(code);
      if (name && name !== code && canonical(code) === code && !NOT_A_COUNTRY.has(code) && !SPANISH_REGIONS.has(code)) out.push(code);
    }
  }
  return out;
})();
var CODES = new Set(REGION_CODES);
function normalize(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}
var byLanguage = /* @__PURE__ */ new Map();
function namesIn(lang) {
  let index = byLanguage.get(lang);
  if (!index) {
    index = /* @__PURE__ */ new Map();
    try {
      const names = new Intl.DisplayNames([lang], { type: "region", fallback: "none" });
      for (const code of REGION_CODES) {
        const name = names.of(code);
        if (name) index.set(normalize(name), code);
      }
      for (const code of SPANISH_REGIONS) {
        const name = names.of(code);
        if (name) index.set(normalize(name), HOME_COUNTRY);
      }
    } catch {
    }
    byLanguage.set(lang, index);
  }
  return index;
}
function countryCode(raw, lang) {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (/^[a-z]{2}$/i.test(text)) {
    const code = canonical(text.toUpperCase());
    if (SPANISH_REGIONS.has(code)) return HOME_COUNTRY;
    return CODES.has(code) ? code : "";
  }
  const key = normalize(text);
  for (const l3 of /* @__PURE__ */ new Set(["es", "en", ...lang ? [lang] : []])) {
    const code = namesIn(l3).get(key);
    if (code) return code;
  }
  return "";
}
var optionsByLanguage = /* @__PURE__ */ new Map();
function countryOptions(lang) {
  const cached = optionsByLanguage.get(lang);
  if (cached) return cached;
  let names = null;
  try {
    names = new Intl.DisplayNames([lang, "en"], { type: "region", fallback: "none" });
  } catch {
  }
  const option = (value) => {
    const name = names?.of(value);
    return { value, label: name ? `${name} (${value})` : value };
  };
  let compare;
  try {
    compare = new Intl.Collator(lang).compare;
  } catch {
    compare = (a3, b3) => a3 < b3 ? -1 : a3 > b3 ? 1 : 0;
  }
  const rest = REGION_CODES.filter((c5) => c5 !== HOME_COUNTRY).map(option);
  rest.sort((a3, b3) => compare(a3.label, b3.label));
  const options = [option(HOME_COUNTRY), ...rest];
  optionsByLanguage.set(lang, options);
  return options;
}
function countryName(raw, lang) {
  const text = (raw ?? "").trim();
  const code = countryCode(text, lang);
  if (!code) return text;
  try {
    return new Intl.DisplayNames([lang, "en"], { type: "region", fallback: "none" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// ui/components/erp-customers-list/erp-customers-list.ts
var CATALOG3 = { es: es_default, en: en_default };
function erplora3() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function domainErrorText4(e7, fallbackKey) {
  const declared = domainErrorText(CATALOG3, erplora3().locale, e7);
  if (declared) return declared;
  return (e7 instanceof Error ? e7.message : "") || erplora3().t(CATALOG3, fallbackKey);
}
function can3(permission) {
  const client = erplora3();
  return typeof client.hasPermission === "function" ? client.hasPermission(permission) : true;
}
var STAGE_KEY = {
  lead: "ui.stageLead",
  prospect: "ui.stageProspect",
  first_purchase: "ui.stageFirstPurchase",
  active: "ui.stageActive",
  at_risk: "ui.stageAtRisk",
  dormant: "ui.stageDormant",
  churned: "ui.stageChurned",
  vip: "ui.stageVip"
};
var CHANNEL_KEY = {
  none: "ui.channelNone",
  email: "ui.channelEmail",
  sms: "ui.channelSms",
  whatsapp: "ui.channelWhatsapp",
  phone: "ui.channelPhone"
};
var stageLabel = (value) => STAGE_KEY[value] ? erplora3().t(CATALOG3, STAGE_KEY[value]) : value;
var channelLabel = (value) => CHANNEL_KEY[value] ? erplora3().t(CATALOG3, CHANNEL_KEY[value]) : value;
var ACTIVITY_TITLE_KEY = {
  "activity.note_added": "ui.activityNoteAdded",
  "activity.purchase_recorded": "ui.activityPurchaseRecorded",
  "activity.purchase_voided": "ui.activityPurchaseVoided",
  "activity.consent_granted": "ui.activityConsentGranted",
  "activity.consent_withdrawn": "ui.activityConsentWithdrawn",
  "activity.customer_erased": "ui.activityCustomerErased",
  "activity.customer_merged": "ui.activityCustomerMerged"
};
var LEGACY_TITLE = {
  "Note added": "ui.activityNoteAdded",
  "Purchase recorded": "ui.activityPurchaseRecorded",
  "Purchase voided": "ui.activityPurchaseVoided",
  "Consent given": "ui.activityConsentGranted",
  "Consent withdrawn": "ui.activityConsentWithdrawn",
  "Customer data erased": "ui.activityCustomerErased"
};
var ACTIVITY_TYPE_KEY = {
  note: "ui.activityTypeNote",
  purchase: "ui.activityTypePurchase",
  purchase_voided: "ui.activityTypePurchaseVoided",
  consent_granted: "ui.activityTypeConsentGranted",
  consent_withdrawn: "ui.activityTypeConsentWithdrawn",
  erased: "ui.activityTypeErased",
  merged: "ui.activityTypeMerged"
};
var activityTitle = (title) => {
  const key = ACTIVITY_TITLE_KEY[title] ?? LEGACY_TITLE[title];
  return key ? erplora3().t(CATALOG3, key) : title;
};
var activityTypeLabel = (value) => ACTIVITY_TYPE_KEY[value] ? erplora3().t(CATALOG3, ACTIVITY_TYPE_KEY[value]) : value;
function formatTimestamp(value) {
  if (!value) return "\u2014";
  const ms = String(value).replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(erplora3().locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
var CONSENT_CHANNELS = ["email", "whatsapp", "sms"];
var CONSENT_NOTICE_VERSION = "counter-v1";
var CONSENT_STATE_KEY = {
  granted: "ui.consentGranted",
  withdrawn: "ui.consentWithdrawn",
  legacy_unverified: "ui.consentLegacy"
};
var EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  tax_id: "",
  address: "",
  city: "",
  postal_code: "",
  country: "",
  notes: "",
  lifecycle_stage: "lead",
  source: "walk_in",
  company_name: "",
  birthday: "",
  anniversary: "",
  preferred_channel: "none",
  // No consent here: it is not a field of the sheet any more (customers#10).
  is_active: true
};
var SHEET_ESSENTIALS = ["name", "phone", "email", "tax_id", "company_name"];
var SHEET_MORE = [
  "address",
  "city",
  "postal_code",
  "country",
  "birthday",
  "anniversary",
  "source",
  "lifecycle_stage",
  "preferred_channel",
  "notes"
];
var SHEET_FIELD_LABEL = {
  name: "ui.colName",
  email: "ui.colEmail",
  phone: "ui.colPhone",
  tax_id: "ui.fieldNif",
  company_name: "ui.fieldCompany",
  address: "ui.fieldAddress",
  city: "ui.fieldCity",
  postal_code: "ui.fieldPostalCode",
  country: "ui.fieldCountry",
  birthday: "ui.fieldBirthday",
  anniversary: "ui.fieldAnniversary",
  source: "ui.fieldSource",
  lifecycle_stage: "ui.colStage",
  preferred_channel: "ui.fieldPreferredChannel",
  notes: "ui.fieldInternalNotes",
  is_active: "ui.fieldActive"
};
var _ErpCustomersList = class _ErpCustomersList extends i3 {
  constructor() {
    super(...arguments);
    this.newForm = { ...EMPTY_FORM };
    this.saving = false;
    this.formError = "";
    this.createError = "";
    this.formMsg = "";
    this.stats = null;
    this.pendingDelete = null;
    this.detail = null;
    this.editing = false;
    this.form = { ...EMPTY_FORM };
    this.activities = [];
    this.fieldValues = [];
    this.groups = [];
    this.tags = [];
    this.groupIds = [];
    this.tagIds = [];
    this.newNote = "";
    this.consentState = [];
    this.consentHistory = [];
    this.consentAsking = "";
    /** Each sheet opening takes a number; an answer that comes back after a newer opening (or
     *  «Close») is dropped (pm#459). */
    this.detailSeq = 0;
    this.pendingErase = false;
    this.eraseReason = "";
    this.importing = false;
    this.importReport = null;
    this.mergeOpen = false;
    this.mergeTerm = "";
    this.mergeCandidates = [];
    this.mergeState = "idle";
    this.mergeTarget = null;
    /** Guards against a stale search answer painting over a newer one (same pattern as the till's search). */
    this.mergeSeq = 0;
    /** HOST of the `customers.detail` slot (ADR-0043 §3bis). Other modules hang their block on the
     *  customer sheet here (appointments: the visit history) without `customers` knowing them: the
     *  fillers are resolved by literal slot name through the SDK, mounted in `.detail-slot`, and told
     *  WHICH customer is open by a `CustomEvent` on the filler element — never by props or calls. */
    this.detailFillers = [];
    this.detailSlotResolved = false;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* Lista: la tabla llena el alto (scroll interno en las filas + pie siempre visible); las KPIs
       y los avisos quedan fijos arriba. La ficha es un documento: scrollea entera. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .page > .kpis, .page > .panel, .page > p { flex:0 0 auto; }
    .detail-page { flex:1 1 auto; min-height:0; overflow:auto; }
    .import-list { margin:.25rem 0 0; padding-left:1.1rem; font-size:.85rem; max-height:9rem; overflow:auto; }
    header { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    header h2 { flex:1 1 auto; min-width:0; margin:0; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    .kpis { display:grid; grid-template-columns:repeat(auto-fill, minmax(11rem, 1fr)); gap:.5rem; margin:0 0 1rem; }
    /* El panel de alta del data-table es una columna estrecha: los campos van apilados, no en fila. */
    .create-form { display:flex; flex-direction:column; gap:.7rem; }
    /* «Más datos»: un <details> nativo. 44px de zona táctil en el resumen — el panel de alta se usa
       de pie, con una mano y sin teclado. */
    .create-form details.more > summary { cursor:pointer; padding:.6rem .25rem; min-height:44px; display:flex; align-items:center; font-weight:600; font-size:.9rem; }
    .create-form details.more > div { margin-top:.7rem; }
    .form { display:flex; gap:.75rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1.25rem; }
    .form ion-input, .form ion-select, .form ion-textarea { flex:1 1 11rem; min-width:9rem; }
    .panel { border:1px solid var(--ion-border-color,#e7e2d6); border-radius: var(--ok-radius-sm, 10px); padding:.75rem 1rem; margin:0 0 1rem; background:var(--ok-surface-2, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04))); }
    .grid2 { display:grid; grid-template-columns:repeat(auto-fill, minmax(13rem, 1fr)); gap:.75rem; }
    .meta { display:grid; grid-template-columns:repeat(auto-fill, minmax(12rem, 1fr)); gap:.25rem .75rem; margin:.5rem 0; }
    .meta dt { font-size:.72rem; text-transform:uppercase; opacity:.6; }
    .meta dd { margin:0 0 .4rem; font-weight:600; }
    .chips { display:flex; gap:.4rem; flex-wrap:wrap; margin:.35rem 0; }
    .check { display:inline-flex; align-items:center; gap:.35rem; margin:.15rem .9rem .15rem 0; }
    .timeline { list-style:none; margin:.5rem 0 0; padding:0; }
    .timeline li { border-left:3px solid var(--ion-border-color,#e7e2d6); padding:.25rem 0 .55rem .75rem; }
    .timeline .t { font-weight:600; }
    .timeline .d { font-size:.85rem; opacity:.85; }
    .timeline .when { font-size:.75rem; opacity:.55; }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
    .muted { opacity:.6; }
    .merge-candidates { max-height:18rem; overflow:auto; margin:.5rem 0; background:transparent; }
    footer.actions { display:flex; gap:.5rem; margin-top:.5rem; flex-wrap:wrap; }
    /* pm#392 — a danger button paints from HERE, never from \`color="danger"\`: Ionic resolves
       \`color=\` through a GLOBAL \`.ion-color-danger\` rule that does not reach inside this shadow
       root, so a solid button came out as white text on a transparent background (invisible).
       Custom properties do inherit through the boundary, so the theme token still applies. */
    ion-button.tone-danger:not([fill]) {
      --background: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger-shade, #ad000d);
      --background-focused: var(--ion-color-danger-shade, #ad000d);
      --background-hover: var(--ion-color-danger-tint, #cb1a27);
      --color: var(--ion-color-danger-contrast, #fff);
    }
    ion-button.tone-danger[fill] {
      --border-color: var(--ion-color-danger, #c5000f);
      --color: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger, #c5000f);
      --background-focused: var(--ion-color-danger, #c5000f);
    }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return [
      { key: "name", header: t5("ui.colName"), sortable: true, filterable: true, filterType: "text" },
      { key: "email", header: t5("ui.colEmail"), sortable: true, filterable: true, filterType: "text" },
      { key: "phone", header: t5("ui.colPhone"), sortable: true, filterable: true, filterType: "text" },
      {
        key: "lifecycle_stage",
        header: t5("ui.colStage"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: Object.keys(STAGE_KEY).map((value) => ({ value, label: stageLabel(value) })),
        format: (r6) => stageLabel(r6.lifecycle_stage)
      },
      {
        key: "total_spent",
        header: t5("ui.colSpent"),
        align: "right",
        sortable: true,
        filterable: true,
        filterType: "range",
        // total_spent es CÉNTIMOS (customers.record_purchase acumula el total del evento,
        // contrato inter-módulo ADR-0123): formatMoney divide. toFixed(2) pintaba ×100.
        format: (r6) => erplora3().formatMoney(Number(r6.total_spent || 0))
      }
    ];
  }
  get rowActions() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return [
      { id: "view", label: t5("ui.actionView"), icon: "eye-outline" },
      ...can3("customers.delete_customer") ? [{ id: "delete", label: t5("ui.actionDelete"), icon: "trash-outline", color: "danger" }] : []
    ];
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora3(), "customers.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "name",
      dir: "asc"
    });
    await Promise.all([this.ctrl.load(), this.loadStats()]);
    try {
      const a3 = erplora3().on("customer.created", () => {
        this.ctrl.load();
        this.loadStats();
      });
      const b3 = erplora3().on("customer.updated", () => {
        this.ctrl.load();
        this.loadStats();
      });
      const c5 = erplora3().on("customer.deleted", () => {
        this.ctrl.load();
        this.loadStats();
      });
      const d3 = erplora3().on("customer.merged", () => {
        this.ctrl.load();
        this.loadStats();
      });
      this.unsub = () => {
        a3();
        b3();
        c5();
        d3();
      };
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    this.unsub?.();
    super.disconnectedCallback();
  }
  /** Dinero en CÉNTIMOS → texto con moneda (ADR-0123). El toFixed(2) directo pintaba ×100. */
  fmt(n6) {
    return n6 == null ? "\u2014" : erplora3().formatMoney(Number(n6));
  }
  async loadStats() {
    try {
      const rows2 = await erplora3().query("customers.stats");
      this.stats = rows2?.[0] ?? null;
    } catch {
    }
  }
  static {
    // — CSV import (customers#15) → `customers.bulk_create` (WASM, cap 50, one transaction per batch),
    // never `customers.create` row by row. Rows are validated HERE first (name required, email shape)
    // and the invalid ones are SKIPPED WITH A REASON — never silenced. A batch that the server rejects
    // is reported with its reason (row range) and the next batches still run. The report stays on
    // screen until the next import. "Resumable / 10k rows / dry-run" is deferred on purpose.
    this.IMPORT_BATCH = 50;
  }
  static {
    this.EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }
  static {
    /** Header aliases (export headers + Spanish ones a spreadsheet produces). */
    this.CSV_ALIASES = {
      name: ["name", "Nombre", "nombre"],
      email: ["email", "Email", "correo", "Correo"],
      phone: ["phone", "Tel\xE9fono", "telefono", "Telefono", "tel"],
      tax_id: ["tax_id", "NIF", "nif", "CIF", "cif"],
      company_name: ["company_name", "Empresa", "empresa"],
      address: ["address", "Direcci\xF3n", "direccion"],
      city: ["city", "Ciudad", "ciudad"],
      postal_code: ["postal_code", "CP", "cp", "C\xF3digo postal"],
      country: ["country", "Pa\xEDs", "pais"],
      lifecycle_stage: ["lifecycle_stage"],
      notes: ["notes", "Notas", "notas"]
    };
  }
  static csvValue(row, key) {
    for (const alias of _ErpCustomersList.CSV_ALIASES[key] ?? [key]) {
      const v3 = row[alias];
      if (v3 != null && String(v3).trim() !== "") return String(v3).trim();
    }
    return "";
  }
  async onCsvImport(ev) {
    if (!can3("customers.add_customer")) return;
    const rows2 = ev.detail?.rows ?? [];
    const report = { total: rows2.length, created: 0, skipped: [], failed: [], warnings: [] };
    const valid = [];
    rows2.forEach((r6, i7) => {
      const row = i7 + 1;
      const name = _ErpCustomersList.csvValue(r6, "name");
      const email = _ErpCustomersList.csvValue(r6, "email");
      if (!name) {
        report.skipped.push({ row, reason: "ui.importReasonName" });
        return;
      }
      if (email && !_ErpCustomersList.EMAIL_SHAPE.test(email)) {
        report.skipped.push({ row, reason: "ui.importReasonEmail" });
        return;
      }
      const stage = _ErpCustomersList.csvValue(r6, "lifecycle_stage") || "lead";
      const rawCountry = _ErpCustomersList.csvValue(r6, "country");
      const code = countryCode(rawCountry, erplora3().locale);
      if (rawCountry && !code) report.warnings.push({ row, reason: "ui.importReasonCountry" });
      const country = code || rawCountry;
      valid.push({ row, item: {
        name,
        email,
        phone: _ErpCustomersList.csvValue(r6, "phone"),
        tax_id: _ErpCustomersList.csvValue(r6, "tax_id"),
        company_name: _ErpCustomersList.csvValue(r6, "company_name"),
        address: _ErpCustomersList.csvValue(r6, "address"),
        city: _ErpCustomersList.csvValue(r6, "city"),
        postal_code: _ErpCustomersList.csvValue(r6, "postal_code"),
        country,
        notes: _ErpCustomersList.csvValue(r6, "notes"),
        lifecycle_stage: STAGE_KEY[stage] ? stage : "lead",
        source: "import"
      } });
    });
    this.importing = true;
    this.importReport = null;
    try {
      for (let i7 = 0; i7 < valid.length; i7 += _ErpCustomersList.IMPORT_BATCH) {
        const batch = valid.slice(i7, i7 + _ErpCustomersList.IMPORT_BATCH);
        const range = `${batch[0].row}-${batch[batch.length - 1].row}`;
        try {
          await erplora3().command("customers.bulk_create", { items: batch.map((b3) => b3.item) });
          report.created += batch.length;
        } catch (e7) {
          report.failed.push({ rows: range, reason: e7 instanceof Error && e7.message ? e7.message : erplora3().t(CATALOG3, "ui.errCreate") });
        }
      }
    } finally {
      this.importing = false;
      this.importReport = report;
    }
    await Promise.all([this.ctrl.load(), this.loadStats()]);
  }
  renderImportReport() {
    const r6 = this.importReport;
    if (!r6) return A;
    const t5 = (k2, p4) => erplora3().t(CATALOG3, k2, p4);
    const tone = r6.failed.length ? "danger" : r6.skipped.length || r6.warnings.length ? "warning" : "success";
    return b2`<ok-inline-feedback class="import-report" data-testid="customers-list-import-report" tone=${tone} icon=${r6.failed.length ? "alert-circle-outline" : "checkmark-outline"}>
      <strong>${t5("ui.importSummary", { total: r6.total, created: r6.created, skipped: r6.skipped.length, failed: r6.failed.reduce((n6, f3) => n6 + (Number(f3.rows.split("-")[1] ?? f3.rows) - Number(f3.rows.split("-")[0]) + 1), 0) })}</strong>
      ${r6.skipped.length ? b2`<ul class="import-list">${r6.skipped.slice(0, 20).map((s5) => b2`<li>${t5("ui.importRow", { row: s5.row })}: ${t5(s5.reason)}</li>`)}
        ${r6.skipped.length > 20 ? b2`<li>…</li>` : A}</ul>` : A}
      ${r6.warnings.length ? b2`<ul class="import-list import-warnings">${r6.warnings.slice(0, 20).map((w2) => b2`<li>${t5("ui.importRow", { row: w2.row })}: ${t5(w2.reason)}</li>`)}
        ${r6.warnings.length > 20 ? b2`<li>…</li>` : A}</ul>` : A}
      ${r6.failed.length ? b2`<ul class="import-list">${r6.failed.map((f3) => b2`<li>${t5("ui.importRows", { rows: f3.rows })}: ${f3.reason}</li>`)}</ul>` : A}
      <ion-button size="small" fill="clear" data-testid="customers-list-import-report-close" @click=${() => this.importReport = null}>${t5("ui.close")}</ion-button>
    </ok-inline-feedback>`;
  }
  /** Referencia al ok-data-table para cerrar su panel lateral tras el alta. */
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  // — Alta (panel `create` de la tabla) —
  //
  // UN solo command con la ficha entera (customers#51). Lo que se escriba en «Más datos» viaja en
  // la misma llamada: el alta no se parte nunca en `create` + `update`, que es lo que obligaba a
  // guardar a medias y reabrir. Y sigue bastando el NOMBRE (customers#32): el resto son opcionales
  // y viajan vacíos, que es lo que el schema espera.
  async create(ev) {
    ev.preventDefault();
    const f3 = this.newForm;
    if (!can3("customers.add_customer") || !f3.name.trim()) return;
    this.saving = true;
    this.createError = "";
    this.formError = "";
    try {
      await erplora3().command("customers.create", {
        name: f3.name.trim(),
        email: f3.email.trim(),
        phone: f3.phone.trim(),
        tax_id: f3.tax_id.trim(),
        address: f3.address.trim(),
        city: f3.city.trim(),
        postal_code: f3.postal_code.trim(),
        country: f3.country.trim(),
        avatar: "",
        notes: f3.notes,
        lifecycle_stage: f3.lifecycle_stage,
        source: f3.source.trim() || "walk_in",
        company_name: f3.company_name.trim(),
        birthday: f3.birthday || null,
        anniversary: f3.anniversary || null,
        preferred_channel: f3.preferred_channel
        // No consent: creating a customer is not somebody saying yes (customers#10). The decision
        // is its own action, with its evidence, on the sheet.
      });
      this.newForm = { ...EMPTY_FORM };
      this.dataTable()?.close();
      await Promise.all([this.ctrl.load(), this.loadStats()]);
    } catch (e7) {
      this.createError = domainErrorText4(e7, "ui.errCreate");
    } finally {
      this.saving = false;
    }
  }
  // — Detail —
  /** True when the sheet now shows ANOTHER customer: an answer for `id` must not land on it. With
   *  no sheet open the answer is kept (callers that load before opening rely on it). */
  sheetMovedOn(id) {
    return this.detail !== null && this.detail.id !== id;
  }
  async openDetail(id) {
    const seq = ++this.detailSeq;
    this.formError = "";
    this.formMsg = "";
    this.pendingDelete = null;
    this.editing = false;
    this.closeMerge();
    try {
      const rows2 = await erplora3().query("customers.get", { customer_id: id });
      if (seq !== this.detailSeq) return;
      const customer = rows2?.[0];
      if (!customer) {
        this.formError = erplora3().t(CATALOG3, "ui.errCustomerNotFound");
        return;
      }
      if (this.detail?.id !== customer.id) {
        this.activities = [];
        this.fieldValues = [];
        this.groupIds = [];
        this.tagIds = [];
        this.consentState = [];
        this.consentHistory = [];
      }
      this.detail = customer;
      this.consentAsking = "";
      await Promise.all([this.loadActivities(id), this.loadMemberships(id), this.loadFieldValues(id), this.loadConsent(id), this.resolveDetailSlot()]);
    } catch (e7) {
      if (seq !== this.detailSeq) return;
      this.formError = e7 instanceof Error ? e7.message : erplora3().t(CATALOG3, "ui.errLoadCustomer");
    }
  }
  async loadFieldValues(id) {
    try {
      const rows2 = await erplora3().query("customers.fields.values", { customer_id: id });
      if (this.sheetMovedOn(id)) return;
      this.fieldValues = rows2 ?? [];
    } catch {
      if (this.sheetMovedOn(id)) return;
      this.fieldValues = [];
    }
  }
  /** The consent panel reads the LEDGER, never `d.marketing_consent`: that column is a derived
   *  mirror kept for older readers, and the sheet is the one place where the difference between
   *  «they said yes on 3 August, by email, after reading this» and «1» has to be visible. */
  async loadConsent(id) {
    const client = erplora3();
    try {
      const [state, history] = await Promise.all([
        client.query("customers.consent.state", { customer_id: id }),
        client.query("customers.consent.history", { customer_id: id })
      ]);
      if (this.sheetMovedOn(id)) return;
      this.consentState = state ?? [];
      this.consentHistory = history ?? [];
    } catch {
      if (this.sheetMovedOn(id)) return;
      this.consentState = [];
      this.consentHistory = [];
    }
  }
  /** The address the consent is being given FOR, as it stands right now. Empty when the sheet has
   *  none — a phone consent on a sheet with no phone is still a fact worth keeping. */
  contactPoint(channel) {
    const d3 = this.detail;
    if (!d3) return "";
    return channel === "email" ? d3.email ?? "" : d3.phone ?? "";
  }
  async recordConsent(channel) {
    if (!can3("customers.change_customer") || !this.detail || this.saving) return;
    this.saving = true;
    this.formError = "";
    try {
      await erplora3().command("customers.consent.grant", {
        customer_id: this.detail.id,
        purpose: "marketing",
        channel,
        contact_point: this.contactPoint(channel),
        source: "counter",
        // The wording travels VERBATIM, not as a key: catalogues change, and «the sentence that was
        // on screen in January» cannot be recovered from today's file (EDPB 05/2020 §108).
        notice_text: erplora3().t(CATALOG3, "ui.consentNotice"),
        notice_version: CONSENT_NOTICE_VERSION
      });
      this.consentAsking = "";
      this.formMsg = erplora3().t(CATALOG3, "ui.consentRecorded");
      await Promise.all([this.loadConsent(this.detail.id), this.ctrl.load()]);
    } catch (e7) {
      this.formError = domainErrorText4(e7, "ui.errConsent");
    } finally {
      this.saving = false;
    }
  }
  /** Withdrawing is ONE tap, with no dialog and no compulsory reason: it must be at least as easy
   *  as giving (art. 7.3), and a form that demands a justification to unsubscribe is the dark
   *  pattern that article exists against. */
  async withdrawConsent(channel) {
    if (!can3("customers.change_customer") || !this.detail || this.saving) return;
    this.saving = true;
    this.formError = "";
    try {
      await erplora3().command("customers.consent.withdraw", {
        customer_id: this.detail.id,
        purpose: "marketing",
        channel,
        contact_point: this.contactPoint(channel),
        source: "counter",
        reason: ""
      });
      this.formMsg = erplora3().t(CATALOG3, "ui.consentWithdrawnMsg");
      await Promise.all([this.loadConsent(this.detail.id), this.ctrl.load()]);
    } catch (e7) {
      this.formError = domainErrorText4(e7, "ui.errConsent");
    } finally {
      this.saving = false;
    }
  }
  /** Edita en memoria el valor de un campo; se persiste al guardar la ficha. */
  setFieldValue(fieldId, value) {
    this.fieldValues = this.fieldValues.map((f3) => f3.id === fieldId ? { ...f3, value } : f3);
  }
  async loadActivities(id) {
    try {
      const rows2 = await erplora3().query("customers.activities", { customer_id: id });
      if (this.sheetMovedOn(id)) return;
      this.activities = rows2 ?? [];
    } catch {
      if (this.sheetMovedOn(id)) return;
      this.activities = [];
    }
  }
  async loadMemberships(id) {
    try {
      const [groupsPage, tagsPage, gids, tids] = await Promise.all([
        erplora3().queryAll("customers.groups.list"),
        erplora3().queryAll("customers.tags.list"),
        erplora3().query("customers.group_ids", { customer_id: id }),
        erplora3().query("customers.tag_ids", { customer_id: id })
      ]);
      if (this.sheetMovedOn(id)) return;
      this.groups = Array.isArray(groupsPage) ? groupsPage : [];
      this.tags = Array.isArray(tagsPage) ? tagsPage : [];
      this.groupIds = (gids ?? []).map((r6) => String(r6.id));
      this.tagIds = (tids ?? []).map((r6) => String(r6.id));
    } catch {
    }
  }
  async resolveDetailSlot() {
    if (this.detailSlotResolved) return;
    this.detailSlotResolved = true;
    const sdk = globalThis.erplora;
    if (!sdk?.loadSlot) return;
    let resolved = [];
    try {
      resolved = await sdk.loadSlot("customers.detail") ?? [];
    } catch {
      resolved = [];
    }
    this.detailFillers = resolved.map((f3) => ({ component: f3.component, el: document.createElement(f3.component) }));
    this.requestUpdate();
  }
  /** (Re)mounts the fillers in the sheet and tells them the open customer; idempotent across re-renders. */
  ensureDetailSlotMounted() {
    const host = this.renderRoot.querySelector(".detail-slot");
    if (!host || !this.detail) return;
    for (const f3 of this.detailFillers) {
      if (f3.el.parentElement !== host) host.appendChild(f3.el);
      f3.el.dispatchEvent(new CustomEvent("erp:customer-detail", {
        detail: { customer_id: this.detail.id, customer_name: this.detail.name },
        bubbles: false
      }));
    }
  }
  updated(changed) {
    super.updated(changed);
    this.ensureDetailSlotMounted();
    if (changed.has("createError") && this.createError) void this.revealCreateError();
  }
  /** pm#478: the refusal appears ABOVE «Add customer», at the foot of a long form — on a phone that
   *  can leave it off the sheet. Bring it into view once it has painted itself: scrolled before, the
   *  banner still measures 0 px and ends up under the tab bar. */
  async revealCreateError() {
    const banner = this.renderRoot.querySelector('[data-testid="customers-list-create-error"]');
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: "center" });
  }
  closeDetail() {
    this.detailSeq++;
    this.detail = null;
    this.pendingErase = false;
    this.editing = false;
    this.pendingDelete = null;
    this.closeMerge();
    this.formError = "";
    this.formMsg = "";
  }
  onRowAction(ev) {
    const row = ev.detail.row;
    if (ev.detail.actionId === "view") this.openDetail(String(row.id));
    if (ev.detail.actionId === "delete" && can3("customers.delete_customer")) {
      this.pendingDelete = row;
      this.formMsg = "";
      this.formError = "";
    }
  }
  // — Edición → customers.update (set completo de binds, ver schemas/update.json) —
  startEdit() {
    if (!this.detail || !can3("customers.change_customer")) return;
    const d3 = this.detail;
    this.form = {
      name: d3.name ?? "",
      email: d3.email ?? "",
      phone: d3.phone ?? "",
      tax_id: d3.tax_id ?? "",
      address: d3.address ?? "",
      city: d3.city ?? "",
      postal_code: d3.postal_code ?? "",
      // A legacy free-text country opens as the code it names; text that names none is kept (customers#72).
      country: countryCode(d3.country, erplora3().locale) || (d3.country ?? "").trim(),
      notes: d3.notes ?? "",
      lifecycle_stage: d3.lifecycle_stage || "lead",
      source: d3.source || "walk_in",
      company_name: d3.company_name ?? "",
      birthday: d3.birthday ?? "",
      anniversary: d3.anniversary ?? "",
      preferred_channel: d3.preferred_channel || "none",
      is_active: Boolean(d3.is_active)
    };
    this.editing = true;
    this.formError = "";
    this.formMsg = "";
  }
  async saveEdit(ev) {
    ev.preventDefault();
    if (!can3("customers.change_customer") || !this.detail || !this.form.name.trim()) return;
    this.saving = true;
    this.formError = "";
    try {
      const customerId = this.detail.id;
      await erplora3().command("customers.update_with_fields", {
        customer_id: customerId,
        name: this.form.name.trim(),
        email: this.form.email.trim(),
        phone: this.form.phone.trim(),
        tax_id: this.form.tax_id.trim(),
        address: this.form.address.trim(),
        city: this.form.city.trim(),
        postal_code: this.form.postal_code.trim(),
        country: this.form.country.trim(),
        notes: this.form.notes,
        lifecycle_stage: this.form.lifecycle_stage,
        source: this.form.source.trim() || "walk_in",
        company_name: this.form.company_name.trim(),
        birthday: this.form.birthday || null,
        anniversary: this.form.anniversary || null,
        preferred_channel: this.form.preferred_channel,
        // No `marketing_consent`: the sheet does not decide consent any more (customers#10). The
        // command ignores the bind and the schema marks it deprecated; sending it would only put
        // back the pretence that editing a sheet is how somebody says yes.
        is_active: this.form.is_active ? 1 : 0,
        // Every field travels, the empty ones too: clearing a field ("no longer uses that dye") is a
        // real change, not a no-op.
        fields: this.fieldValues.map((f3) => ({ field_id: f3.id, value: f3.value ?? "" }))
      });
      this.editing = false;
      this.formMsg = erplora3().t(CATALOG3, "ui.customerUpdated");
      await Promise.all([this.openDetail(this.detail.id), this.ctrl.load()]);
    } catch (e7) {
      this.formError = domainErrorText4(e7, "ui.errUpdate");
    } finally {
      this.saving = false;
    }
  }
  // — Borrado (soft-delete) → customers.delete, confirmación en dos pasos —
  async confirmDelete() {
    if (!can3("customers.delete_customer") || !this.pendingDelete) return;
    const target = this.pendingDelete;
    this.saving = true;
    this.formError = "";
    try {
      await erplora3().command("customers.delete", { customer_id: target.id });
      this.pendingDelete = null;
      if (this.detail?.id === target.id) this.closeDetail();
      this.formMsg = erplora3().t(CATALOG3, "ui.customerDeleted", { name: target.name });
      await Promise.all([this.ctrl.load(), this.loadStats()]);
    } catch (e7) {
      this.formError = domainErrorText4(e7, "ui.errDelete");
    } finally {
      this.saving = false;
    }
  }
  // — Grupos / etiquetas → set_groups / set_tags (reemplazo de colección) —
  toggleId(list, id) {
    return list.includes(id) ? list.filter((x2) => x2 !== id) : [...list, id];
  }
  async saveMembership(kind) {
    if (!can3("customers.change_customer") || !this.detail) return;
    this.saving = true;
    this.formError = "";
    try {
      if (kind === "groups") {
        await erplora3().command("customers.set_groups", { customer_id: this.detail.id, ids: this.groupIds });
      } else {
        await erplora3().command("customers.set_tags", { customer_id: this.detail.id, ids: this.tagIds });
      }
      this.formMsg = erplora3().t(CATALOG3, kind === "groups" ? "ui.groupsAssigned" : "ui.tagsAssigned");
      await this.loadMemberships(this.detail.id);
    } catch (e7) {
      this.formError = e7 instanceof Error ? e7.message : erplora3().t(CATALOG3, "ui.errSaveMembership");
    } finally {
      this.saving = false;
    }
  }
  // — Notes → ONE command: `notes.add` writes the note AND its timeline entry in one transaction
  // (customers#14). Chaining `activity.add` from here left invisible notes when the second call
  // failed, and any other producer (the automation kernel) never made the second call at all.
  async addNote(ev) {
    ev.preventDefault();
    if (!can3("customers.add_note") || !this.detail || !this.newNote.trim()) return;
    const content = this.newNote.trim();
    this.saving = true;
    this.formError = "";
    try {
      await erplora3().command("customers.notes.add", {
        customer_id: this.detail.id,
        content,
        author_name: ""
      });
      this.newNote = "";
      this.formMsg = erplora3().t(CATALOG3, "ui.noteAdded");
      await this.loadActivities(this.detail.id);
    } catch (e7) {
      this.formError = e7 instanceof Error ? e7.message : erplora3().t(CATALOG3, "ui.errAddNote");
    } finally {
      this.saving = false;
    }
  }
  // — Render —
  renderStats() {
    if (!this.stats) return A;
    const s5 = this.stats;
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return b2`<div class="kpis">
      <ok-kpi data-testid="customers-list-kpi-total" label=${t5("ui.customers")} value=${String(s5.total ?? 0)}></ok-kpi>
      <ok-kpi data-testid="customers-list-kpi-active" label=${t5("ui.active")} value=${String(s5.active ?? 0)}></ok-kpi>
      <ok-kpi data-testid="customers-list-kpi-vip" label=${t5("ui.vip")} value=${String(s5.vip ?? 0)}></ok-kpi>
      <ok-kpi data-testid="customers-list-kpi-revenue" label=${t5("ui.revenue")} value=${this.fmt(s5.total_revenue)}></ok-kpi>
    </div>`;
  }
  // — GDPR erasure (customers#11) → ONE transactional command `customers.anonymize`. Two steps with a
  // reason: irreversible, and the reason lands on the audit entry. Only `customers.erase_customer`
  // (admin by default); the soft-delete keeps every piece of PII and is a different button. —
  async confirmErase() {
    if (!can3("customers.erase_customer") || !this.detail) return;
    const target = this.detail;
    this.saving = true;
    this.formError = "";
    try {
      await erplora3().command("customers.anonymize", { customer_id: target.id, reason: this.eraseReason.trim() });
      this.pendingErase = false;
      this.closeDetail();
      this.formMsg = erplora3().t(CATALOG3, "ui.customerErased");
      await Promise.all([this.ctrl.load(), this.loadStats()]);
    } catch (e7) {
      this.formError = domainErrorText4(e7, "ui.errErase");
    } finally {
      this.saving = false;
    }
  }
  // — Merge (customers#86/#87) → ONE transactional command `customers.merge`. The OPEN sheet is
  // always the survivor: picking «which one survives» would be one more decision at the counter,
  // and opening the other sheet and merging from there already covers that case.
  openMerge() {
    if (!can3("customers.merge_customer") || !this.detail) return;
    this.formError = "";
    this.formMsg = "";
    this.pendingDelete = null;
    this.pendingErase = false;
    this.mergeOpen = true;
    this.mergeTarget = null;
    this.mergeTerm = "";
    void this.searchMerge("");
  }
  closeMerge() {
    this.mergeOpen = false;
    this.mergeTarget = null;
    this.mergeCandidates = [];
    this.mergeTerm = "";
    this.mergeState = "idle";
    if (this.mergeTimer) {
      clearTimeout(this.mergeTimer);
      this.mergeTimer = void 0;
    }
  }
  onMergeSearchInput(e7) {
    const value = e7.detail?.value ?? e7.target.value;
    this.mergeTerm = String(value ?? "");
    if (this.mergeTimer) clearTimeout(this.mergeTimer);
    const term = this.mergeTerm;
    this.mergeTimer = setTimeout(() => {
      void this.searchMerge(term);
    }, 250);
  }
  /** Same shape as the till's search (customers-pos): a stale answer is dropped by SEQUENCE, not
   *  by time — the debounce above already keeps the request count low. */
  async searchMerge(q) {
    const seq = ++this.mergeSeq;
    this.mergeState = "searching";
    try {
      const r6 = await erplora3().query("customers.list", {
        search: q,
        limit: 20,
        sort: "name",
        dir: "asc"
      });
      if (seq !== this.mergeSeq) return;
      const rows2 = Array.isArray(r6) ? r6 : r6?.rows ?? [];
      this.mergeCandidates = rows2.filter((c5) => String(c5.id) !== String(this.detail?.id));
      this.mergeState = this.mergeCandidates.length ? "idle" : "empty";
    } catch {
      if (seq !== this.mergeSeq) return;
      this.mergeCandidates = [];
      this.mergeState = "error";
    }
  }
  async confirmMerge() {
    if (!can3("customers.merge_customer") || !this.detail || !this.mergeTarget || this.saving) return;
    const survivingId = this.detail.id;
    const target = this.mergeTarget;
    this.saving = true;
    this.formError = "";
    try {
      await erplora3().command("customers.merge", { surviving_id: survivingId, absorbed_id: target.id });
      await Promise.all([this.openDetail(survivingId), this.ctrl.load(), this.loadStats()]);
      this.formMsg = erplora3().t(CATALOG3, "ui.customerMerged", { name: target.name });
    } catch (e7) {
      this.formError = domainErrorText4(e7, "ui.errMerge");
    } finally {
      this.saving = false;
    }
  }
  renderEraseConfirm() {
    if (!this.pendingErase || !this.detail || !can3("customers.erase_customer")) return A;
    const t5 = (k2, p4) => erplora3().t(CATALOG3, k2, p4);
    return b2`<section class="panel">
      <h3>${t5("ui.eraseDataTitle")}</h3>
      <p>${t5("ui.eraseDataConfirm", { name: this.detail.name })}</p>
      <ion-input mode="md" fill="outline" data-testid="customers-list-erase-reason" label=${t5("ui.eraseReason")} label-placement="floating" .value=${this.eraseReason}
        @ionInput=${(e7) => this.eraseReason = String(e7.target.value ?? "")}></ion-input>
      <footer class="actions">
        <ion-button size="small" class="tone-danger" data-testid="customers-list-erase-submit" ?disabled=${this.saving} @click=${() => this.confirmErase()}>${this.saving ? t5("ui.deleting") : t5("ui.eraseData")}</ion-button>
        <ion-button size="small" fill="outline" data-testid="customers-list-erase-cancel" @click=${() => this.pendingErase = false}>${t5("ui.cancel")}</ion-button>
      </footer>
    </section>`;
  }
  /**
   * **The merge panel** (customers#86) — one screen, two steps: pick the duplicate, then read what
   * is going to happen to it before it disappears. The survivor is always the sheet already open.
   */
  renderMergePanel() {
    if (!this.mergeOpen || !this.detail || !can3("customers.merge_customer")) return A;
    const t5 = (k2, p4) => erplora3().t(CATALOG3, k2, p4);
    const detail = this.detail;
    const target = this.mergeTarget;
    return b2`<section class="panel" data-testid="customers-list-merge-panel">
      <h3>${t5("ui.mergeTitle")}</h3>
      ${target ? b2`<div data-testid="customers-list-merge-confirm">
            <p>${t5("ui.mergeConfirm", { absorbed: target.name, surviving: detail.name })}</p>
            <footer class="actions">
              <ion-button size="small" class="tone-danger" data-testid="customers-list-merge-submit" ?disabled=${this.saving} @click=${() => this.confirmMerge()}>${this.saving ? t5("ui.merging") : t5("ui.mergeSubmit")}</ion-button>
              <ion-button size="small" fill="outline" data-testid="customers-list-merge-change" @click=${() => this.mergeTarget = null}>${t5("ui.mergeChange")}</ion-button>
              <ion-button size="small" fill="clear" data-testid="customers-list-merge-cancel" @click=${() => this.closeMerge()}>${t5("ui.cancel")}</ion-button>
            </footer>
          </div>` : b2`<p>${t5("ui.mergeHint", { name: detail.name })}</p>
            <ion-input mode="md" fill="outline" data-testid="customers-list-merge-search" label=${t5("ui.mergeSearch")} label-placement="floating" .value=${this.mergeTerm}
              @ionInput=${(e7) => this.onMergeSearchInput(e7)}></ion-input>
            ${this.mergeState === "searching" ? b2`<p class="muted" data-testid="customers-list-merge-searching">${t5("ui.mergeSearching")}</p>` : this.mergeState === "error" ? b2`<ok-inline-feedback data-testid="customers-list-merge-error" tone="danger" icon="alert-circle-outline">${t5("ui.errMergeSearch")}</ok-inline-feedback>
                    <ion-button size="small" fill="outline" data-testid="customers-list-merge-retry" @click=${() => this.searchMerge(this.mergeTerm)}>${t5("ui.retry")}</ion-button>` : this.mergeState === "empty" ? b2`<p class="muted" data-testid="customers-list-merge-empty">${t5("ui.mergeNoCandidates")}</p>` : b2`<ion-list class="merge-candidates">
                      ${this.mergeCandidates.map((c5) => b2`<ion-item button detail="false" data-testid=${`customers-list-merge-candidate-${c5.id}`}
                        @click=${() => {
      this.mergeTarget = c5;
      this.formError = "";
    }}>
                        <ion-label><h3>${c5.name}</h3><p>${[c5.email, c5.phone].filter(Boolean).join(" \xB7 ")}</p></ion-label>
                      </ion-item>`)}
                    </ion-list>`}
            <footer class="actions">
              <ion-button size="small" fill="outline" data-testid="customers-list-merge-cancel" @click=${() => this.closeMerge()}>${t5("ui.cancel")}</ion-button>
            </footer>`}
    </section>`;
  }
  renderDeleteConfirm() {
    if (!this.pendingDelete || !can3("customers.delete_customer")) return A;
    const t5 = (k2, p4) => erplora3().t(CATALOG3, k2, p4);
    return b2`<section class="panel">
      <h3>${t5("ui.deleteCustomerTitle")}</h3>
      <p>${t5("ui.deleteCustomerConfirm", { name: this.pendingDelete.name })}</p>
      <footer class="actions">
        <ion-button size="small" class="tone-danger" data-testid="customers-list-delete-submit" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t5("ui.deleting") : t5("ui.delete")}</ion-button>
        <ion-button size="small" fill="outline" data-testid="customers-list-delete-cancel" @click=${() => this.pendingDelete = null}>${t5("ui.cancel")}</ion-button>
      </footer>
    </section>`;
  }
  /** Campos personalizados (ADR-0132): los pinta su `field_type`, no un input de texto para todo.
   *  Un `select` con opciones es un dominio CERRADO: pintarlo como texto libre lo rompe. */
  renderCustomFields() {
    if (!this.fieldValues.length) return A;
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    const set = (id) => (e7) => this.setFieldValue(id, String(e7.target.value ?? ""));
    return b2`<section class="custom-fields">
      <h3>${t5("ui.customFields")}</h3>
      <div class="grid2">
        ${this.fieldValues.map((f3) => {
      const label = f3.is_required ? `${f3.name} *` : f3.name;
      if (f3.field_type === "select") {
        let opts = [];
        try {
          opts = JSON.parse(f3.options || "[]");
        } catch {
          opts = [];
        }
        return b2`<ion-select mode="md" data-field=${f3.id} data-testid=${`customers-list-field-${f3.id}`} fill="outline" label=${label} label-placement="floating"
              .value=${f3.value} @ionChange=${set(f3.id)}>
              ${opts.map((o7) => b2`<ion-select-option value=${o7}>${o7}</ion-select-option>`)}
            </ion-select>`;
      }
      if (f3.field_type === "textarea") {
        return b2`<ion-textarea mode="md" data-field=${f3.id} data-testid=${`customers-list-field-${f3.id}`} fill="outline" label=${label} label-placement="floating"
              auto-grow .value=${f3.value} @ionInput=${set(f3.id)}></ion-textarea>`;
      }
      if (f3.field_type === "boolean") {
        return b2`<ion-checkbox data-field=${f3.id} data-testid=${`customers-list-field-${f3.id}`} .checked=${f3.value === "1"}
              @ionChange=${(e7) => this.setFieldValue(f3.id, e7.target.checked ? "1" : "")}>
              ${label}
            </ion-checkbox>`;
      }
      const type = f3.field_type === "number" ? "number" : f3.field_type === "date" ? "date" : "text";
      return b2`<ion-input mode="md" data-field=${f3.id} data-testid=${`customers-list-field-${f3.id}`} type=${type} fill="outline" label=${label}
            label-placement="floating" .value=${f3.value} @ionInput=${set(f3.id)}></ion-input>`;
    })}
      </div>
    </section>`;
  }
  // `mode="md"` on EVERY control that declares `fill` — here and everywhere else in this module
  // (customers#48). Ionic implements `fill` for `md` only:
  //
  //     const hasOutlineFill = mode === 'md' && this.fill === 'outline';
  //
  // and the Hub pins Ionic to `ios` globally (ADR-0143, hub#760). Without the per-control mode the
  // attribute is a SILENT no-op: no box, no border, no surface — a form that reads as static text.
  // Nothing throws, so the guard that keeps it from creeping back is a test:
  // `tests/ionic_fill_needs_md.test.py` (source, runs in the module gate) and `fill-needs-md.test.ts`
  // (render).
  /**
   * ONE field of the customer sheet, drawn the same way wherever it appears — the add panel and the
   * edit form (customers#51). Before this, the add panel had a hand-written form of its own with two
   * inputs in it, which is how the two screens drifted apart in the first place: adding a field to
   * the sheet only ever reached one of them.
   *
   * `scope` is only there for the `data-testid` (customers#70): the two screens never share the
   * DOM, but a spec that fills `customers-list-sheet-create-name` says which flow it is driving,
   * and a failure names the screen instead of «the name field».
   */
  sheetField(key, form, patch, scope) {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    const label = t5(SHEET_FIELD_LABEL[key]);
    const value = String(form[key] ?? "");
    if (key === "lifecycle_stage" || key === "preferred_channel") {
      const options = key === "lifecycle_stage" ? STAGE_KEY : CHANNEL_KEY;
      const label_ = key === "lifecycle_stage" ? stageLabel : channelLabel;
      return b2`<ion-select mode="md" data-sheet-field=${key} data-testid=${`customers-list-sheet-${scope}-${key}`} fill="outline" label=${label}
        label-placement="floating" .value=${value}
        @ionChange=${(e7) => patch({ [key]: e7.target.value })}>
        ${Object.keys(options).map((v3) => b2`<ion-select-option value=${v3}>${label_(v3)}</ion-select-option>`)}
      </ion-select>`;
    }
    if (key === "country") return this.countryField(form, label, patch, scope);
    if (key === "notes") {
      return b2`<ion-textarea mode="md" data-sheet-field=${key} data-testid=${`customers-list-sheet-${scope}-${key}`} fill="outline" label=${label}
        label-placement="floating" auto-grow .value=${value}
        @ionInput=${(e7) => patch({ notes: e7.target.value })}></ion-textarea>`;
    }
    const type = key === "email" ? "email" : key === "birthday" || key === "anniversary" ? "date" : "text";
    return b2`<ion-input mode="md" data-sheet-field=${key} data-testid=${`customers-list-sheet-${scope}-${key}`} type=${type} fill="outline" label=${label}
      label-placement="floating" .value=${value}
      @ionInput=${(e7) => patch({ [key]: e7.target.value })}></ion-input>`;
  }
  /**
   * The country is PICKED from a searchable list and stored as its ISO code (customers#72): typed by
   * hand, «Fr.» or a typo reached the till unread and the invoice went out as Spain. `ok-combo`, as
   * in `taxes` (taxes#41): 249 options in a plain select is a scroll nobody finishes. A file written
   * before whose text cannot be read keeps it as an option of its own, so it stays visible and an
   * unrelated edit never erases it; «No country» is how it is cleared.
   */
  countryField(form, label, patch, scope) {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    const countries = countryOptions(erplora3().locale);
    const value = form.country;
    const legacy = value && !countries.some((o7) => o7.value === value) ? [{ value, label: value }] : [];
    return b2`<ok-combo data-sheet-field="country" data-testid=${`customers-list-sheet-${scope}-country`} label=${label}
      .options=${[{ value: "", label: t5("ui.countryNone") }, ...legacy, ...countries]}
      .value=${value}
      .labels=${{ placeholder: t5("ui.countrySearch"), empty: t5("ui.countryNoMatch") }}
      @ok-change=${(e7) => patch({ country: e7.detail.value })}></ok-combo>`;
  }
  renderEditForm() {
    const f3 = this.form;
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    const field = (key) => this.sheetField(key, f3, (part) => this.form = { ...this.form, ...part }, "edit");
    return b2`<form data-testid="customers-list-edit-form" @submit=${(e7) => this.saveEdit(e7)}>
      <div class="grid2">
        ${[...SHEET_ESSENTIALS, ...SHEET_MORE].filter((k2) => k2 !== "notes").map(field)}
      </div>
      <div class="form">
        ${field("notes")}
      </div>
      ${this.renderCustomFields()}
      <!-- There is NO consent checkbox here any more (customers#10). A tick on an edit form is a
           consent with no purpose, no channel, no record of what the person was shown and no author
           — and a pre-ticked box is invalid outright (EDPB 05/2020 §168, AEPD FAQ-0211). The
           decision lives in its own panel below, as an action with its evidence. -->
      <label class="check"><ion-checkbox data-testid="customers-list-edit-active" .checked=${f3.is_active}
        @ionChange=${(e7) => this.form = { ...this.form, is_active: e7.target.checked }}></ion-checkbox> ${t5("ui.fieldActive")}</label>
      <footer class="actions">
        <ion-button type="submit" size="small" data-testid="customers-list-edit-submit" ?disabled=${this.saving || !f3.name.trim()}>${this.saving ? t5("ui.saving") : t5("ui.save")}</ion-button>
        <ion-button size="small" fill="outline" data-testid="customers-list-edit-cancel" @click=${() => this.editing = false}>${t5("ui.cancel")}</ion-button>
      </footer>
    </form>`;
  }
  renderMembership(kind) {
    const isGroups = kind === "groups";
    const items = isGroups ? this.groups : this.tags;
    const selected = isGroups ? this.groupIds : this.tagIds;
    const editable = can3("customers.change_customer");
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    if (!items.length) {
      return b2`<p data-testid=${`customers-list-membership-${kind}-empty`}>${t5(isGroups ? "ui.noGroupsDefined" : "ui.noTagsDefined")}</p>`;
    }
    return b2`<div>
      <div class="chips">
        ${items.map((it) => b2`<label class="check">
          <ion-checkbox data-testid=${`customers-list-membership-${kind}-item-${it.id}`} .checked=${selected.includes(String(it.id))}
            ?disabled=${!editable}
            @ionChange=${() => {
      if (!editable) return;
      if (isGroups) this.groupIds = this.toggleId(this.groupIds, String(it.id));
      else this.tagIds = this.toggleId(this.tagIds, String(it.id));
    }}></ion-checkbox>
          ${it.name}
        </label>`)}
      </div>
      ${editable ? b2`<ion-button size="small" data-testid=${`customers-list-membership-${kind}-save`} ?disabled=${this.saving} @click=${() => this.saveMembership(kind)}>${t5(isGroups ? "ui.saveGroups" : "ui.saveTags")}</ion-button>` : A}
    </div>`;
  }
  /**
   * **The consent panel** (customers#10) — the sheet's answer to «may we write to this person, and
   * can we prove it».
   *
   * One row per channel with its effective state and ONE action, because that is what the market
   * converged on for a counter (Klaviyo, Mailchimp, Shopify, Fresha all key consent by channel) and
   * because a single yes/no forced «yes to the newsletter» and «yes to WhatsApp» into one answer.
   * Granting asks for confirmation and SHOWS the exact sentence that will be stored as the proof;
   * withdrawing is one tap. That asymmetry is deliberate and it is the law's: giving consent has to
   * be an informed, affirmative act, and taking it back has to be at least as easy (art. 7.3).
   */
  renderConsent() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    const editable = can3("customers.change_customer");
    const byChannel = new Map(this.consentState.map((row) => [row.channel, row]));
    const channels = [...CONSENT_CHANNELS, ...this.consentState.map((r6) => r6.channel)].filter(
      (c5, i7, all) => all.indexOf(c5) === i7
    );
    return b2`<section class="panel">
      <h3>${t5("ui.consentHeading")}</h3>
      <p class="muted">${t5("ui.consentIntro")}</p>
      ${channels.map((channel) => {
      const row = byChannel.get(channel);
      const state = row?.state ?? "never_asked";
      const asking = this.consentAsking === channel;
      return b2`<div class="consent-row" data-consent=${channel} data-testid=${`customers-list-consent-${channel}-row`}>
          <div class="consent-what">
            <strong>${channel === "any" ? t5("ui.consentAnyChannel") : channelLabel(channel)}</strong>
            <span class="muted">${t5(CONSENT_STATE_KEY[state] ?? "ui.consentNeverAsked")}</span>
            ${row?.occurred_at ? b2`<span class="muted">${formatTimestamp(row.occurred_at)}${row.contact_point ? ` \xB7 ${row.contact_point}` : ""}</span>` : A}
          </div>
          ${!editable ? A : state === "granted" ? b2`<ion-button size="small" fill="outline" class="tone-danger" data-act="withdraw"
                  data-testid=${`customers-list-consent-${channel}-withdraw`}
                  ?disabled=${this.saving} @click=${() => this.withdrawConsent(channel)}
                  >${t5("ui.consentWithdraw")}</ion-button>` : channel === "any" ? b2`<ion-button size="small" fill="outline" class="tone-danger" data-act="withdraw"
                  data-testid=${`customers-list-consent-${channel}-withdraw`}
                    ?disabled=${this.saving} @click=${() => this.withdrawConsent(channel)}
                    >${t5("ui.consentClose")}</ion-button>` : asking ? A : b2`<ion-button size="small" data-act="grant"
                      data-testid=${`customers-list-consent-${channel}-grant`} ?disabled=${this.saving}
                      @click=${() => {
        this.consentAsking = channel;
        this.formError = "";
      }}
                      >${t5("ui.consentRecord")}</ion-button>`}
          ${asking ? b2`<div class="consent-ask" data-testid=${`customers-list-consent-${channel}-ask`}>
                <!-- Shown, then stored word for word: this is the evidence, so the operator reads
                     to the customer exactly what will end up in the record. -->
                <p>${t5("ui.consentNotice")}</p>
                <p class="muted">${t5("ui.consentAskHint")}</p>
                <ion-button size="small" data-act="grant-confirm"
                  data-testid=${`customers-list-consent-${channel}-grant-confirm`} ?disabled=${this.saving}
                  @click=${() => this.recordConsent(channel)}>${t5("ui.consentConfirm")}</ion-button>
                <ion-button size="small" fill="outline" data-act="grant-cancel"
                  data-testid=${`customers-list-consent-${channel}-grant-cancel`}
                  @click=${() => {
        this.consentAsking = "";
      }}>${t5("ui.cancel")}</ion-button>
              </div>` : A}
        </div>`;
    })}
      <h4>${t5("ui.consentHistoryHeading")}</h4>
      ${this.consentHistory.length ? b2`<ul class="timeline">
            ${this.consentHistory.map((f3) => b2`<li data-consent-fact=${f3.id} data-testid=${`customers-list-consent-fact-${f3.id}`}>
              <div class="t">
                ${t5(CONSENT_STATE_KEY[f3.state] ?? "ui.consentNeverAsked")} —
                ${f3.channel === "any" ? t5("ui.consentAnyChannel") : channelLabel(f3.channel)}
                <small>(${f3.source || "\u2014"})</small>
              </div>
              ${f3.notice_text ? b2`<div class="d">${f3.notice_text}</div>` : A}
              ${f3.reason ? b2`<div class="d">${f3.reason}</div>` : A}
              <div class="when">${formatTimestamp(f3.occurred_at)}${f3.recorded_by ? ` \xB7 ${f3.recorded_by}` : ""}</div>
            </li>`)}
          </ul>` : b2`<p class="muted" data-testid="customers-list-consent-history-empty">${t5("ui.consentNoHistory")}</p>`}
    </section>`;
  }
  renderDetail() {
    const d3 = this.detail;
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return b2`<div class="detail-page">
      <header>
        <h2>${d3.name}</h2>
        <ion-button size="small" fill="outline" data-testid="customers-list-back" @click=${() => this.closeDetail()}>${t5("ui.back")}</ion-button>
        ${this.editing || !can3("customers.change_customer") ? A : b2`<ion-button size="small" data-testid="customers-list-edit" @click=${() => this.startEdit()}>${t5("ui.edit")}</ion-button>`}
        ${can3("customers.delete_customer") ? b2`<ion-button size="small" class="tone-danger" fill="outline" data-testid="customers-list-delete" @click=${() => {
      this.pendingDelete = d3;
      this.closeMerge();
    }}>${t5("ui.delete")}</ion-button>` : A}
        ${can3("customers.merge_customer") ? b2`<ion-button size="small" fill="outline" data-testid="customers-list-merge" @click=${() => this.openMerge()}>${t5("ui.mergeWith")}</ion-button>` : A}
        ${can3("customers.erase_customer") ? b2`<ion-button class="erase tone-danger" size="small" fill="clear" data-testid="customers-list-erase" @click=${() => {
      this.pendingErase = true;
      this.eraseReason = "";
      this.formError = "";
      this.closeMerge();
    }}>${t5("ui.eraseData")}</ion-button>` : A}
      </header>
      ${this.formError ? b2`<ok-inline-feedback data-testid="customers-list-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
      ${this.formMsg ? b2`<p class="ok" data-testid="customers-list-form-msg">${this.formMsg}</p>` : A}
      ${this.renderDeleteConfirm()}
      ${this.renderEraseConfirm()}
      ${this.renderMergePanel()}
      <section class="panel">
        ${this.editing ? this.renderEditForm() : b2`<dl class="meta">
          <div><dt>${t5("ui.colEmail")}</dt><dd>${d3.email || "\u2014"}</dd></div>
          <div><dt>${t5("ui.colPhone")}</dt><dd>${d3.phone || "\u2014"}</dd></div>
          <div><dt>${t5("ui.fieldNif")}</dt><dd>${d3.tax_id || "\u2014"}</dd></div>
          <div><dt>${t5("ui.fieldCompany")}</dt><dd>${d3.company_name || "\u2014"}</dd></div>
          <div><dt>${t5("ui.fieldAddress")}</dt><dd>${[d3.address, d3.postal_code, d3.city, countryName(d3.country, erplora3().locale)].filter(Boolean).join(", ") || "\u2014"}</dd></div>
          <div><dt>${t5("ui.colStage")}</dt><dd>${stageLabel(d3.lifecycle_stage)}</dd></div>
          <div><dt>${t5("ui.fieldSource")}</dt><dd>${d3.source || "\u2014"}</dd></div>
          <div><dt>${t5("ui.fieldPreferredChannel")}</dt><dd>${channelLabel(d3.preferred_channel)}</dd></div>
          <div><dt>${t5("ui.detailPurchases")}</dt><dd>${d3.total_purchases ?? 0}</dd></div>
          <div><dt>${t5("ui.colSpent")}</dt><dd>${this.fmt(d3.total_spent)}</dd></div>
          <div><dt>${t5("ui.detailLastPurchase")}</dt><dd>${d3.last_purchase_date || "\u2014"}</dd></div>
          <div><dt>${t5("ui.fieldActive")}</dt><dd>${d3.is_active ? t5("ui.yes") : t5("ui.no")}</dd></div>
        </dl>`}
      </section>
      ${can3("customers.view_customergroup") || can3("customers.view_customertag") ? b2`<section class="panel">
            ${can3("customers.view_customergroup") ? b2`<h3>${t5("ui.groupsHeading")}</h3>${this.renderMembership("groups")}` : A}
            ${can3("customers.view_customertag") ? b2`<h3 style="margin-top:.75rem">${t5("ui.tagsHeading")}</h3>${this.renderMembership("tags")}` : A}
          </section>` : A}
      ${this.renderConsent()}
      ${can3("customers.add_note") || can3("customers.view_activity") ? b2`<section class="panel">
            ${can3("customers.add_note") ? b2`<h3>${t5("ui.addNote")}</h3>
                  <form class="form" data-testid="customers-list-note-form" @submit=${(e7) => this.addNote(e7)}>
                    <ion-textarea mode="md" fill="outline" data-testid="customers-list-note-text" label=${t5("ui.noteLabel")} label-placement="floating" auto-grow .value=${this.newNote}
                      @ionInput=${(e7) => this.newNote = e7.target.value}></ion-textarea>
                    <ion-button type="submit" size="small" data-testid="customers-list-note-submit" ?disabled=${this.saving || !this.newNote.trim()}>${t5("ui.add")}</ion-button>
                  </form>` : A}
            ${can3("customers.view_activity") ? b2`<h3>${t5("ui.activityHeading")}</h3>
                  ${this.activities.length ? b2`<ul class="timeline">
                    ${this.activities.map((a3) => b2`<li data-testid=${`customers-list-activity-item-${a3.id}`}>
                      <div class="t">${activityTitle(a3.title)} <small>· ${activityTypeLabel(a3.activity_type)}</small></div>
                      ${a3.description ? b2`<div class="d">${a3.description}</div>` : A}
                      <div class="when">${formatTimestamp(a3.created_at)}</div>
                    </li>`)}
                  </ul>` : b2`<p data-testid="customers-list-activity-empty">${t5("ui.noActivity")}</p>`}` : A}
          </section>` : A}
      ${this.detailFillers.length ? b2`<section class="panel detail-slot" data-testid="customers-list-detail-slot"></section>` : A}
    </div>`;
  }
  /**
   * **El alta, en un solo paso** (customers#51) — SIEMPRE proyectada en el panel `create` de la
   * tabla (si sólo se pintara al pulsar el «+», el panel abriría vacío).
   *
   * Los mismos campos que la ficha, con el reparto del mercado: identidad y datos fiscales a la
   * vista, el resto tras «Más datos». El desplegable es un `<details>` nativo —teclado y lector de
   * pantalla gratis, sin componente nuevo, y ya hay precedente en `flows`— y arranca cerrado: el
   * alta de mostrador tiene que seguir siendo escribir un nombre y pulsar.
   *
   * Sólo el NOMBRE bloquea el botón. Lo demás es opcional (customers#32): un ultramarinos vende sin
   * NIF, un asesor no.
   */
  renderCreateForm() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    const field = (key) => this.sheetField(key, this.newForm, (part) => this.newForm = { ...this.newForm, ...part }, "create");
    return b2`<form slot="create" class="create-form" data-testid="customers-list-create-form" @submit=${(e7) => this.create(e7)}>
      ${SHEET_ESSENTIALS.map(field)}
      <details class="more">
        <summary data-testid="customers-list-more-details">${t5("ui.moreDetails")}</summary>
        <div class="create-form">${SHEET_MORE.map(field)}</div>
      </details>
      <!-- pm#478: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
           and a banner on the page underneath it is never seen. -->
      ${this.createError ? b2`<ok-inline-feedback data-testid="customers-list-create-error" tone="danger" icon="alert-circle-outline">${this.createError}</ok-inline-feedback>` : A}
      <ion-button type="submit" size="small" data-testid="customers-list-create-submit" ?disabled=${this.saving || !this.newForm.name.trim()}>${this.saving ? t5("ui.saving") : t5("ui.addCustomer")}</ion-button>
    </form>`;
  }
  render() {
    if (this.detail) return this.renderDetail();
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return b2`<div class="page">
        ${this.renderStats()}
        ${this.formError ? b2`<ok-inline-feedback data-testid="customers-list-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
        ${this.formMsg ? b2`<p class="ok" data-testid="customers-list-form-msg">${this.formMsg}</p>` : A}
        ${this.importing ? b2`<p class="ok" data-testid="customers-list-importing">${t5("ui.importing")}</p>` : A}
        ${this.renderImportReport()}
        ${this.renderDeleteConfirm()}
        ${this.ctrl?.error ? b2`<ok-inline-feedback data-testid="customers-list-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
        <!-- The «View» button is not the only door: rowClickable makes the whole row open the
             same ficha (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
        <ok-data-table testid="customers-list-table" .serverSide=${true} .fill=${true} .labels=${dataTableLabels(erplora3().locale)} .views=${true} .cardTitle=${(r6) => String(r6.name ?? "\u2014")} .cardIcon=${() => "person-outline"} .addable=${can3("customers.add_customer")} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.searchCustomers")} .actions=${this.rowActions} .rowClickable=${true} .importable=${can3("customers.add_customer")} .exportable=${can3("customers.export_customer")} .csvName=${"customers.csv"} .columnPicker=${true} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyCustomers")} @rowAction=${(e7) => this.onRowAction(e7)} @rowClick=${(e7) => this.openDetail(String(e7.detail.row.id))} @csvImport=${(e7) => this.onCsvImport(e7)} @pageChange=${(e7) => this.ctrl.setPage(e7.detail)} @pageSizeChange=${(e7) => this.ctrl.setPageSize(e7.detail)} @sortChange=${(e7) => this.ctrl.setSort(e7.detail.sort, e7.detail.dir)} @searchChange=${(e7) => this.ctrl.setSearch(e7.detail)} @filterChange=${(e7) => this.ctrl.setFilter(e7.detail.col, e7.detail.value)}>
          ${this.renderCreateForm()}
        </ok-data-table>
      </div>`;
  }
};
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "newForm", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "saving", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "formError", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "createError", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "formMsg", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "stats", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "pendingDelete", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "detail", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "editing", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "form", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "activities", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "fieldValues", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "groups", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "tags", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "groupIds", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "tagIds", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "newNote", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "consentState", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "consentHistory", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "consentAsking", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "pendingErase", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "eraseReason", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "importing", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "importReport", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "mergeOpen", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "mergeTerm", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "mergeCandidates", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "mergeState", 2);
__decorateClass([
  r5()
], _ErpCustomersList.prototype, "mergeTarget", 2);
var ErpCustomersList = _ErpCustomersList;
define("erp-customers-list", ErpCustomersList);

// lit-html/directives/class-map.js
var e6 = e5(class extends i4 {
  constructor(t5) {
    if (super(t5), t5.type !== t3.ATTRIBUTE || "class" !== t5.name || t5.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t5) {
    return " " + Object.keys(t5).filter((s5) => t5[s5]).join(" ") + " ";
  }
  update(s5, [i7]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s5.strings && (this.nt = new Set(s5.strings.join(" ").split(/\s/).filter((t5) => "" !== t5)));
      for (const t5 in i7) i7[t5] && !this.nt?.has(t5) && this.st.add(t5);
      return this.render(i7);
    }
    const r6 = s5.element.classList;
    for (const t5 of this.st) t5 in i7 || (r6.remove(t5), this.st.delete(t5));
    for (const t5 in i7) {
      const s6 = !!i7[t5];
      s6 === this.st.has(t5) || this.nt?.has(t5) || (s6 ? (r6.add(t5), this.st.add(t5)) : (r6.remove(t5), this.st.delete(t5)));
    }
    return E;
  }
});

// @erplora/outfitkit/dist/ok-spotlight-search.js
var __defProp6 = Object.defineProperty;
var __decorateClass6 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp6(target, key, result);
  return result;
};
var OkSpotlightSearch = class extends i3 {
  constructor() {
    super(...arguments);
    this.open = false;
    this.placeholder = "";
    this.value = "";
    this.triggerIcon = "";
    this.triggerLabel = "";
  }
  static {
    this.styles = i`
    :host {
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-text-muted, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.6));
      --panel-bg: var(--ok-surface, var(--ion-background-color, #ffffff));
      --scrim-bg: var(--ok-scrim, rgba(0, 0, 0, 0.28));
      --border-soft: var(--ok-border-soft, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.1));
      --radius: var(--ok-radius, 16px);
      --shadow: var(--ok-shadow, 0 24px 80px rgba(0, 0, 0, 0.35));
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
      display: contents;
    }

    /* Botón-trigger opcional (icon-only). #92 -- 44px, sin vecino con el que solapar. */
    button.trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--ok-tap-min, 44px);
      height: var(--ok-tap-min, 44px);
      padding: 0;
      border: 0;
      border-radius: 10px;
      background: none;
      color: var(--color-muted);
      cursor: pointer;
    }
    button.trigger[data-assigned] { color: var(--ok-primary, var(--ion-color-primary, #3880ff)); }
    button.trigger ion-icon { font-size: 1.35rem; }

    /* El <dialog> flota arriba-centro, translúcido con blur (Spotlight). El top layer lo saca de
       cualquier containing block. */
    dialog {
      margin: 10vh auto auto;
      width: min(92vw, 36rem);
      max-height: 72vh;
      padding: 0;
      border: none;
      border-radius: var(--radius);
      overflow: hidden;
      color: var(--color);
      font-family: var(--font);
      background: color-mix(in srgb, var(--panel-bg) 80%, transparent);
      -webkit-backdrop-filter: blur(22px) saturate(180%);
      backdrop-filter: blur(22px) saturate(180%);
      box-shadow: var(--shadow), 0 0 0 1px rgba(128, 128, 128, 0.18);
    }
    dialog::backdrop {
      background: var(--scrim-bg);
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
    }

    /* Fila del input hero + cierre. */
    .top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 0.85rem;
      border-bottom: 1px solid var(--border-soft);
    }
    .top .lupa { flex: 0 0 auto; font-size: 1.25rem; color: var(--color-muted); }
    .top input {
      flex: 1 1 auto;
      min-width: 0;
      border: 0;
      outline: none;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 1.05rem;
    }
    .top input::placeholder { color: var(--color-muted); }
    /* #92 -- 44px; the middle of the row is a flexible <input>, so a bigger close button just
       grows into free space, no overlap. */
    .top .close {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--ok-tap-min, 44px);
      height: var(--ok-tap-min, 44px);
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: none;
      color: var(--color-muted);
      cursor: pointer;
    }
    .top .close ion-icon { font-size: 1.2rem; }

    /* Cuerpo scrollable: aquí caen los resultados del consumidor (slot por defecto). */
    .results { max-height: 56vh; overflow-y: auto; padding: 0.35rem; }
    .footer:not(:empty) { border-top: 1px solid var(--border-soft); padding: 0.3rem 0.6rem; }

    @media (max-width: 560px) {
      dialog { margin: 0 auto auto; width: 100vw; max-width: 100vw; max-height: 100vh; height: auto; border-radius: 0; }
    }
  `;
  }
  // ── API pública ──────────────────────────────────────────────────────────
  openSearch() {
    if (this.open) return;
    this.open = true;
    this.emitOpen(true);
  }
  close() {
    if (!this.open) return;
    this.open = false;
    this.emitOpen(false);
  }
  toggle() {
    this.open ? this.close() : this.openSearch();
  }
  emitOpen(open) {
    this.dispatchEvent(new CustomEvent("ok-open", { detail: { open }, bubbles: true, composed: true }));
  }
  onInput(e7) {
    this.value = e7.target.value;
    this.dispatchEvent(new CustomEvent("ok-input", { detail: { value: this.value }, bubbles: true, composed: true }));
  }
  // Sincroniza `open` ↔ el <dialog> nativo (top layer). try/catch porque happy-dom (tests) no
  // implementa showModal/close; ahí `open` sigue siendo la verdad.
  updated() {
    const d3 = this.renderRoot.querySelector("dialog");
    if (!d3) return;
    try {
      if (this.open && !d3.open) {
        d3.showModal();
        this.input?.focus();
      } else if (!this.open && d3.open) {
        d3.close();
      }
    } catch {
    }
  }
  render() {
    return b2`
      ${this.triggerIcon ? b2`<button class="trigger" ?data-assigned=${this.open} aria-label=${this.triggerLabel || this.placeholder}
            title=${this.triggerLabel || this.placeholder} @click=${() => this.openSearch()}>
            <ion-icon .icon=${okIcon(this.triggerIcon)}></ion-icon>
          </button>` : A}

      <dialog aria-label=${this.triggerLabel || this.placeholder}
        @close=${() => {
      if (this.open) {
        this.open = false;
        this.emitOpen(false);
      }
    }}
        @click=${(e7) => {
      if (e7.target === e7.currentTarget) this.close();
    }}>
        <div class="top">
          <ion-icon class="lupa" .icon=${iconSearchOutline}></ion-icon>
          <input type="text" .value=${this.value} placeholder=${this.placeholder}
            aria-label=${this.placeholder} autocomplete="off" spellcheck="false"
            @input=${(e7) => this.onInput(e7)} />
          <button class="close" aria-label="Cerrar" @click=${() => this.close()}>
            <ion-icon .icon=${iconCloseOutline}></ion-icon>
          </button>
        </div>
        <div class="results"><slot></slot></div>
        <div class="footer"><slot name="footer"></slot></div>
      </dialog>
    `;
  }
};
__decorateClass6([
  n4({ type: Boolean, reflect: true })
], OkSpotlightSearch.prototype, "open");
__decorateClass6([
  n4()
], OkSpotlightSearch.prototype, "placeholder");
__decorateClass6([
  n4()
], OkSpotlightSearch.prototype, "value");
__decorateClass6([
  n4({ attribute: "trigger-icon" })
], OkSpotlightSearch.prototype, "triggerIcon");
__decorateClass6([
  n4({ attribute: "trigger-label" })
], OkSpotlightSearch.prototype, "triggerLabel");
__decorateClass6([
  e4(".top input")
], OkSpotlightSearch.prototype, "input");
define("ok-spotlight-search", OkSpotlightSearch);

// @erplora/outfitkit/dist/ok-empty-state.js
var __defProp7 = Object.defineProperty;
var __decorateClass7 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp7(target, key, result);
  return result;
};
var OkEmptyState = class extends i3 {
  constructor() {
    super(...arguments);
    this.icon = "file-tray-outline";
  }
  static {
    this.styles = i`
    /* Ancho máximo del contenedor; bloque a 100%. */
    :host {
      display: block;
      width: 100%;
      /* Tokens propios estilo Ionic (overridables): --ok-* → --ion-* → hex. */
      --icon-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
      --heading-color: var(--ok-text-color, var(--ion-text-color, #1f2933));
      --message-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
      --icon-size: 64px;
      --padding: 2.5rem 1.25rem;
    }

    /* Centrado vertical y horizontal del contenido. */
    .wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.5rem;
      padding: var(--padding);
      box-sizing: border-box;
      width: 100%;
    }

    ion-icon {
      font-size: var(--icon-size);
      color: var(--icon-color);
      opacity: 0.5; /* atenuado */
      margin-bottom: 0.25rem;
    }

    .heading {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--heading-color);
    }

    .message {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--message-color);
      max-width: 38ch;
    }

    /* Acción debajo del texto. */
    .action {
      margin-top: 1rem;
    }

    /* Oculta los wrappers si no hay contenido. */
    .heading:empty,
    .message:empty {
      display: none;
    }
  `;
  }
  render() {
    return b2`
      <div class="wrap">
        <ion-icon .icon=${okIcon(this.icon)} aria-hidden="true"></ion-icon>
        ${this.heading ? b2`<h2 class="heading">${this.heading}</h2>` : null}
        ${this.message ? b2`<p class="message">${this.message}</p>` : null}
        <slot></slot>
        <div class="action">
          <slot name="action"></slot>
        </div>
      </div>
    `;
  }
};
__decorateClass7([
  n4()
], OkEmptyState.prototype, "icon");
__decorateClass7([
  n4()
], OkEmptyState.prototype, "heading");
__decorateClass7([
  n4()
], OkEmptyState.prototype, "message");
define("ok-empty-state", OkEmptyState);

// ui/components/erp-customers-pos-search/erp-customers-pos-search.ts
var CATALOG4 = { es: es_default, en: en_default };
function erplora4() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function rows(r6) {
  if (Array.isArray(r6)) return r6;
  if (r6 && typeof r6 === "object" && Array.isArray(r6.rows)) return r6.rows;
  return [];
}
function direccionFiscal(c5) {
  const localidad = [c5.postal_code, c5.city].filter(Boolean).join(" ");
  return [c5.address, localidad, countryName(c5.country, erplora4().locale)].filter((p4) => p4 && String(p4).trim()).join(", ");
}
var VACIO = {
  customer_id: null,
  customer_name: "",
  customer_tax_id: "",
  customer_address: "",
  customer_country: ""
};
function can4(permission) {
  const c5 = erplora4();
  return typeof c5.hasPermission === "function" ? c5.hasPermission(permission) : true;
}
var isForbidden = (e7) => e7?.code === "permission_denied";
var looksLikePhone = (v3) => /^[+\d][\d\s().-]{5,}$/.test(v3.trim());
var LINK_MESSAGES = {
  permission_denied: "ui.errLinkOrderNoPermission"
};
function linkFailureMessage(e7) {
  const code = e7?.code;
  const key = (typeof code === "string" ? LINK_MESSAGES[code] : void 0) ?? "ui.errLinkOrder";
  return erplora4().t(CATALOG4, key);
}
var ErpCustomersPosSearch = class extends i3 {
  constructor() {
    super(...arguments);
    this.open = false;
    this.results = [];
    this.q = "";
    this.selectedName = "";
    this.loading = false;
    this.error = "";
    this.state = "idle";
    this.quickOpen = false;
    this.quickName = "";
    this.quickPhone = "";
    this.quickError = "";
    this.creating = false;
    /** Sequence of the last search issued: an older answer arriving later is dropped. */
    this.searchSeq = 0;
    this.onReset = () => {
      this.selectedId = void 0;
      this.selectedName = "";
    };
    this.onLocaleChange = () => this.requestUpdate();
    /** El cobro EXIGE cliente y no lo hay (`sales.require_customer` → `erp:customer-required`,
     *  sales#222). Se abre el buscador como si lo hubiera tocado el cajero: mismo camino que el
     *  `ok-open` del trigger, así que la carga inicial y el estado salen de un único sitio.
     *  IDEMPOTENTE — si ya está abierto no vuelve a buscar (el POS puede reavisar en cada intento). */
    this.onCustomerRequired = () => {
      if (this.open) return;
      this.onOkOpen(true);
    };
    /** El POS abrió un pedido → `customers` escribe SU junction cliente↔pedido (ADR-0141).
     *  Simétrico a lo que hace `tables`: el dueño de la asociación es quien la escribe; el pedido
     *  no guarda `customer_id` y `sales` no llama a este módulo. */
    this.onOrderLinked = async (e7) => {
      const d3 = e7.detail;
      if (!d3?.order_id || !this.selectedId) return;
      try {
        await erplora4().command("customers.orders.link", { customer_id: this.selectedId, order_id: d3.order_id });
      } catch (err) {
        this.reportLinkFailure(err);
      }
    };
  }
  static {
    // El CHROME del buscador (overlay Spotlight + input + ✕ + trigger) lo pone `ok-spotlight-search`
    // (OutfitKit). Aquí solo estilamos los RESULTADOS que proyectamos en su slot.
    this.styles = i`
    :host { display:contents; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    .list { background:transparent; }
    ion-list.list { background:transparent; }
    .list ion-item { --background:transparent; border-radius: var(--ok-radius-sm, 10px); }
    .list .sel { --background: color-mix(in srgb, var(--ion-color-primary,#0091ce) 16%, transparent); }
    .empty { color:#8b897f; text-align:center; padding:1.5rem 0; }
    .err { color:#d9480f; padding:.6rem 1rem; }
    .quick { display:flex; flex-direction:column; gap:.5rem; padding:.5rem .75rem; }
    .quick .row { display:flex; gap:.5rem; align-items:flex-end; }
    .quick ion-input { flex:1; }
    .quick-add { --padding-start:.75rem; min-height:44px; }
    .retry { min-height:44px; }
    /* pm#392 — \`color="primary"\` paints nothing inside this shadow root; the token does. */
    ion-icon.selected-mark { color: var(--ion-color-primary, #0054e9); }
  `;
  }
  /** Un fallo que no se ve no existe: rastro para el runtime + aviso traducido para el cajero. */
  reportLinkFailure(err) {
    console.warn("[customers] customers.orders.link failed; the sale goes on without customer history", err);
    const c5 = erplora4();
    try {
      c5.notify?.({ type: "warning", message: linkFailureMessage(err) });
    } catch (notifyErr) {
      console.warn("[customers] the shell could not show the link warning", notifyErr);
    }
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("erp:customer-context-reset", this.onReset);
    this.addEventListener("erp:customer-required", this.onCustomerRequired);
    this.addEventListener("erp:order-linked", this.onOrderLinked);
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
  }
  disconnectedCallback() {
    this.removeEventListener("erp:customer-context-reset", this.onReset);
    this.removeEventListener("erp:customer-required", this.onCustomerRequired);
    this.removeEventListener("erp:order-linked", this.onOrderLinked);
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  /** Sincroniza el abierto/cerrado del overlay (ok-spotlight-search) y carga al abrir. */
  onOkOpen(open) {
    this.open = open;
    if (open && !this.results.length) void this.search("");
  }
  async search(q) {
    const seq = ++this.searchSeq;
    this.loading = true;
    this.error = "";
    this.state = "searching";
    try {
      const r6 = await erplora4().query("customers.list", { search: q, limit: 20, sort: "name", dir: "asc" });
      if (seq !== this.searchSeq) return;
      this.results = rows(r6);
      this.state = this.results.length ? "idle" : "empty";
    } catch (e7) {
      if (seq !== this.searchSeq) return;
      this.results = [];
      if (isForbidden(e7)) {
        this.state = "forbidden";
        this.error = erplora4().t(CATALOG4, "ui.posNoPermission");
      } else {
        this.state = "error";
        this.error = e7 instanceof Error && e7.message ? e7.message : erplora4().t(CATALOG4, "ui.errLoadCustomers");
      }
    } finally {
      if (seq === this.searchSeq) this.loading = false;
    }
  }
  /** Retry keeps the term the cashier typed (customers#18). */
  retry() {
    void this.search(this.q);
  }
  onInput(v3) {
    this.q = v3;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.search(v3), 300);
  }
  emit(snap) {
    this.dispatchEvent(new CustomEvent("erp:customer-context", {
      detail: snap,
      bubbles: true,
      composed: true
    }));
  }
  closeOverlay() {
    this.renderRoot.querySelector("ok-spotlight-search")?.close?.();
  }
  async pick(c5) {
    this.error = "";
    let ficha;
    try {
      ficha = rows(await erplora4().query("customers.get", { customer_id: c5.id }))[0];
    } catch (e7) {
      this.state = isForbidden(e7) ? "forbidden" : "error";
      this.error = isForbidden(e7) ? erplora4().t(CATALOG4, "ui.posNoPermission") : erplora4().t(CATALOG4, "ui.errCustomerSnapshot", { name: c5.name });
      return;
    }
    if (!ficha) {
      this.state = "error";
      this.error = erplora4().t(CATALOG4, "ui.errCustomerNotFound");
      return;
    }
    this.selectedId = c5.id;
    this.selectedName = ficha.name || c5.name;
    this.closeOverlay();
    this.emit({
      customer_id: c5.id,
      customer_name: ficha.name || c5.name,
      customer_tax_id: ficha.tax_id ?? "",
      customer_address: direccionFiscal(ficha),
      customer_country: countryCode(ficha.country, erplora4().locale)
    });
  }
  // — Quick add (customers#18). Market: Square, Toast, Lightspeed, Shopify POS, Fresha all offer
  // «+ new customer» from the search itself with name/phone only. If the term looks like a phone it
  // pre-fills the phone; otherwise the name. Duplicate guard: an exact phone match among the current
  // results is picked instead of created (no double customer for one WhatsApp number). —
  openQuickAdd() {
    if (!can4("customers.add_customer")) return;
    const term = this.q.trim();
    this.quickName = looksLikePhone(term) ? "" : term;
    this.quickPhone = looksLikePhone(term) ? term : "";
    this.quickError = "";
    this.quickOpen = true;
  }
  async quickCreate() {
    if (!can4("customers.add_customer") || this.creating) return;
    const name = this.quickName.trim();
    const phone = this.quickPhone.trim();
    if (!name) {
      this.quickError = erplora4().t(CATALOG4, "ui.quickNameRequired");
      return;
    }
    const dup = phone ? this.results.find((r6) => (r6.phone ?? "").replace(/\s+/g, "") === phone.replace(/\s+/g, "")) : void 0;
    if (dup) {
      this.quickOpen = false;
      await this.pick(dup);
      return;
    }
    this.creating = true;
    this.quickError = "";
    try {
      const out = await erplora4().command("customers.create", { name, phone, source: "walk_in" });
      const id = out?.new_ids?.[0];
      if (!id) throw new Error(erplora4().t(CATALOG4, "ui.errCreate"));
      this.quickOpen = false;
      await this.pick({ id, name, phone });
    } catch (e7) {
      this.quickError = e7 instanceof Error && e7.message ? e7.message : erplora4().t(CATALOG4, "ui.errCreate");
    } finally {
      this.creating = false;
    }
  }
  clear() {
    this.selectedId = void 0;
    this.selectedName = "";
    this.closeOverlay();
    this.emit(VACIO);
  }
  render() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return b2`
      <ok-spotlight-search
        trigger-icon=${this.selectedId ? "person" : "person-add-outline"}
        trigger-label=${this.selectedName || t5("ui.assignCustomer")}
        placeholder=${t5("ui.searchPosCustomer")}
        .open=${this.open}
        .value=${this.q}
        @ok-open=${(e7) => this.onOkOpen(e7.detail.open)}
        @ok-input=${(e7) => this.onInput(e7.detail.value)}>
        ${this.error ? b2`<ok-inline-feedback data-testid="customers-pos-error" tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : A}
        ${this.state === "error" ? b2`<ion-button class="retry" data-testid="customers-pos-retry" expand="block" fill="outline" size="small" @click=${() => this.retry()}>${t5("ui.retry")}</ion-button>` : A}
        <ion-list class="list" lines="none">
          ${this.results.map((c5) => b2`
            <ion-item button detail="false" data-testid=${`customers-pos-result-${c5.id}`} class=${e6({ sel: this.selectedId === c5.id })} @click=${() => void this.pick(c5)}>
              <ion-label>
                <h3>${c5.name}</h3>
                ${c5.phone || c5.email ? b2`<p>${c5.phone || c5.email}</p>` : A}
              </ion-label>
              ${this.selectedId === c5.id ? b2`<ion-icon slot="end" name="checkmark-outline" class="selected-mark"></ion-icon>` : A}
            </ion-item>`)}
          ${this.state === "empty" ? b2`<ok-empty-state data-testid="customers-pos-empty" icon=${this.q ? "search-outline" : "people-outline"} message=${this.q ? t5("ui.noResults") : t5("ui.noCustomers")}></ok-empty-state>` : A}
          ${this.state === "searching" ? b2`<div class="empty" data-testid="customers-pos-searching">${t5("ui.loading")}</div>` : A}
        </ion-list>
        ${this.q.trim() && can4("customers.add_customer") && this.state !== "forbidden" && this.state !== "searching" && !this.quickOpen ? b2`<ion-button class="quick-add" data-testid="customers-pos-quick-add" expand="block" fill="clear" @click=${() => this.openQuickAdd()}>
              <ion-icon slot="start" name="person-add-outline"></ion-icon>${erplora4().t(CATALOG4, "ui.quickAddCustomer", { term: this.q.trim() })}
            </ion-button>` : A}
        ${this.quickOpen ? b2`<form class="quick" data-testid="customers-pos-quick-form" @submit=${(e7) => {
      e7.preventDefault();
      void this.quickCreate();
    }}>
            <div class="row">
              <ion-input mode="md" fill="outline" data-testid="customers-pos-quick-name" label=${t5("ui.quickName")} label-placement="floating" .value=${this.quickName} @ionInput=${(e7) => this.quickName = String(e7.target.value ?? "")}></ion-input>
              <ion-input mode="md" fill="outline" type="tel" inputmode="tel" data-testid="customers-pos-quick-phone" label=${t5("ui.quickPhone")} label-placement="floating" .value=${this.quickPhone} @ionInput=${(e7) => this.quickPhone = String(e7.target.value ?? "")}></ion-input>
            </div>
            ${this.quickError ? b2`<ok-inline-feedback data-testid="customers-pos-quick-error" tone="danger" icon="alert-circle-outline">${this.quickError}</ok-inline-feedback>` : A}
            <div class="row">
              <ion-button type="submit" size="small" data-testid="customers-pos-quick-submit" ?disabled=${this.creating}>${this.creating ? t5("ui.saving") : t5("ui.quickCreate")}</ion-button>
              <ion-button size="small" fill="clear" data-testid="customers-pos-quick-cancel" @click=${() => this.quickOpen = false}>${t5("ui.cancel")}</ion-button>
            </div>
          </form>` : A}
        ${this.selectedId ? b2`<ion-button slot="footer" class="clear" data-testid="customers-pos-clear" fill="clear" size="small" @click=${() => this.clear()}>${t5("ui.removeCustomer")}</ion-button>` : A}
      </ok-spotlight-search>
    `;
  }
};
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "open", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "results", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "q", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "selectedId", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "selectedName", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "loading", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "error", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "state", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "quickOpen", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "quickName", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "quickPhone", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "quickError", 2);
__decorateClass([
  r5()
], ErpCustomersPosSearch.prototype, "creating", 2);
define("erp-customers-pos-search", ErpCustomersPosSearch);

// ui/components/erp-customers-tags/erp-customers-tags.ts
var CATALOG5 = { es: es_default, en: en_default };
function erplora5() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function can5(permission) {
  return erplora5().hasPermission?.(permission) ?? true;
}
function domainErrorText5(e7, fallbackKey) {
  const declared = domainErrorText(CATALOG5, erplora5().locale, e7);
  if (declared) return declared;
  return (e7 instanceof Error ? e7.message : "") || erplora5().t(CATALOG5, fallbackKey);
}
var ErpCustomersTags = class extends i3 {
  constructor() {
    super(...arguments);
    this.saving = false;
    this.formError = "";
    this.pageError = "";
    this.formMsg = "";
    this.editing = null;
    this.editTitleInHeader = false;
    this.pendingDelete = null;
    this.fName = "";
    this.fColor = "primary";
    this.fActive = true;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* La tabla llena el alto de la vista: scroll interno en las filas + pie siempre visible. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .panel { flex:0 0 auto; border:1px solid var(--ion-border-color,#e7e2d6); border-radius: var(--ok-radius-sm, 10px); padding:.75rem 1rem; margin:0 0 1rem; background:var(--ok-surface-2, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04))); }
    .panel h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    /* El panel del data-table es una columna estrecha: los campos van apilados, no en fila. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form h3 { margin:0; font-size:1rem; }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
    /* pm#392 — a danger button paints from HERE, never from \`color="danger"\`: Ionic resolves
       \`color=\` through a GLOBAL \`.ion-color-danger\` rule that does not reach inside this shadow
       root, so a solid button came out as white text on a transparent background (invisible).
       Custom properties do inherit through the boundary, so the theme token still applies. */
    ion-button.tone-danger:not([fill]) {
      --background: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger-shade, #ad000d);
      --background-focused: var(--ion-color-danger-shade, #ad000d);
      --background-hover: var(--ion-color-danger-tint, #cb1a27);
      --color: var(--ion-color-danger-contrast, #fff);
    }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora5().t(CATALOG5, k2);
    return [
      { key: "name", header: t5("ui.colName"), sortable: true, filterable: true, filterType: "text" },
      { key: "color", header: t5("ui.colColor"), sortable: true }
    ];
  }
  get rowActions() {
    const t5 = (k2) => erplora5().t(CATALOG5, k2);
    const actions = [];
    if (can5("customers.change_customertag")) {
      actions.push({ id: "edit", label: t5("ui.actionEdit"), icon: "create-outline" });
    }
    if (can5("customers.delete_customertag")) {
      actions.push({ id: "delete", label: t5("ui.actionDelete"), icon: "trash-outline", color: "danger" });
    }
    return actions;
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora5(), "customers.tags.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "name",
      dir: "asc"
    });
    await this.ctrl.load();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  /** Referencia al ok-data-table para abrir/cerrar su panel lateral (alta y edición). */
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited record under a «New» header, and the submit would UPDATE it. */
  onTableClick(e7) {
    if (!this.editing) return;
    const addId = "customers-tags-table-add";
    if (e7.composedPath().some((n6) => n6 instanceof HTMLElement && n6.dataset.testid === addId)) this.resetForm();
  }
  /** Wired natively, not with a Lit `@click` on the tag: `<ok-data-table>` carries `testid`, not
   *  `data-testid` (outfitkit#143), and a template binding would read as an action element that
   *  demands one. */
  firstUpdated() {
    this.renderRoot.querySelector("ok-data-table")?.addEventListener("click", (e7) => this.onTableClick(e7));
  }
  resetForm() {
    this.editing = null;
    this.fName = "";
    this.fColor = "primary";
    this.fActive = true;
    this.formError = "";
  }
  async startEdit(tag) {
    if (!can5("customers.change_customertag")) return;
    this.editing = tag;
    this.fName = tag.name;
    this.fColor = tag.color || "primary";
    this.fActive = Boolean(tag.is_active);
    this.formError = "";
    this.formMsg = "";
    const title = erplora5().t(CATALOG5, "ui.editTagTitle", { name: tag.name });
    const table = this.dataTable();
    table?.open("edit", { title });
    await table?.updateComplete;
    this.editTitleInHeader = table?.shadowRoot?.querySelector('[role="dialog"]')?.getAttribute("aria-label") === title;
  }
  onRowAction(ev) {
    const tag = ev.detail.row;
    if (ev.detail.actionId === "edit" && can5("customers.change_customertag")) void this.startEdit(tag);
    if (ev.detail.actionId === "delete" && can5("customers.delete_customertag")) {
      this.pendingDelete = tag;
      this.formMsg = "";
      this.pageError = "";
    }
  }
  async save(ev) {
    ev.preventDefault();
    if (!this.fName.trim()) return;
    const editing = this.editing;
    if (!can5(editing ? "customers.change_customertag" : "customers.add_customertag")) return;
    this.saving = true;
    this.formError = "";
    this.pageError = "";
    try {
      if (editing) {
        await erplora5().command("customers.tags.update", {
          tag_id: editing.id,
          name: this.fName.trim(),
          color: this.fColor.trim() || "primary",
          is_active: this.fActive ? 1 : 0
        });
        this.formMsg = erplora5().t(CATALOG5, "ui.tagUpdated");
      } else {
        await erplora5().command("customers.tags.create", {
          name: this.fName.trim(),
          color: this.fColor.trim() || "primary"
        });
        this.formMsg = erplora5().t(CATALOG5, "ui.tagCreated");
      }
      this.resetForm();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e7) {
      this.formError = e7 instanceof Error ? e7.message : erplora5().t(CATALOG5, "ui.errSaveTag");
    } finally {
      this.saving = false;
    }
  }
  async confirmDelete() {
    if (!this.pendingDelete || !can5("customers.delete_customertag")) return;
    this.saving = true;
    this.pageError = "";
    try {
      await erplora5().command("customers.tags.delete", { tag_id: this.pendingDelete.id });
      this.formMsg = erplora5().t(CATALOG5, "ui.tagDeleted", { name: this.pendingDelete.name });
      this.pendingDelete = null;
      await this.ctrl.load();
    } catch (e7) {
      this.pageError = domainErrorText5(e7, "ui.errDeleteTag");
    } finally {
      this.saving = false;
    }
  }
  /** Formulario del panel `create`: SIEMPRE proyectado (si solo se pintara al editar, el «+» de la
   *  barra abriría un panel vacío). En alta `editing` es null; en edición trae la fila. */
  renderForm() {
    const t5 = (k2, p4) => erplora5().t(CATALOG5, k2, p4);
    const editing = this.editing;
    return b2`<form slot="create" class="form" data-testid="customers-tags-form" @submit=${(e7) => this.save(e7)}>
      ${editing && !this.editTitleInHeader ? b2`<h3 data-testid="customers-tags-editing">${t5("ui.editTagTitle", { name: editing.name })}</h3>` : A}
      <ion-input mode="md" fill="outline" data-testid="customers-tags-name" label=${t5("ui.colName")} label-placement="floating" .value=${this.fName} @ionInput=${(e7) => this.fName = e7.target.value}></ion-input>
      <ion-input mode="md" fill="outline" data-testid="customers-tags-color" label=${t5("ui.fieldColor")} label-placement="floating" .value=${this.fColor} @ionInput=${(e7) => this.fColor = e7.target.value}></ion-input>
      ${editing ? b2`<ion-checkbox data-testid="customers-tags-active" .checked=${this.fActive} @ionChange=${(e7) => this.fActive = e7.target.checked}>${t5("ui.fieldActiveTag")}</ion-checkbox>` : A}
      <!-- pm#478: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
           and a banner on the page underneath it is never seen. -->
      ${this.formError ? b2`<ok-inline-feedback data-testid="customers-tags-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
      <ion-button type="submit" size="small" data-testid="customers-tags-submit" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? t5("ui.saving") : t5("ui.save")}</ion-button>
      ${editing ? b2`<ion-button size="small" fill="outline" data-testid="customers-tags-cancel" @click=${() => this.resetForm()}>${t5("ui.cancel")}</ion-button>` : A}
    </form>`;
  }
  renderDeleteConfirm() {
    if (!this.pendingDelete) return A;
    const t5 = (k2, p4) => erplora5().t(CATALOG5, k2, p4);
    return b2`<section class="panel">
      <h3>${t5("ui.deleteTagTitle")}</h3>
      <p>${t5("ui.deleteTagConfirm", { name: this.pendingDelete.name })}</p>
      <ion-button size="small" class="tone-danger" data-testid="customers-tags-delete-submit" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t5("ui.deleting") : t5("ui.delete")}</ion-button>
      <ion-button size="small" fill="outline" data-testid="customers-tags-delete-cancel" @click=${() => this.pendingDelete = null}>${t5("ui.cancel")}</ion-button>
    </section>`;
  }
  /** pm#478: the refusal appears ABOVE the button that was pressed, at the foot of the form — on a
   *  phone that can leave it off the sheet. Bring it into view once it has painted itself: scrolled
   *  before, the banner still measures 0 px and ends up under the tab bar. */
  updated(changed) {
    super.updated(changed);
    if (changed.has("formError") && this.formError) void this.revealFormError();
  }
  async revealFormError() {
    const banner = this.renderRoot.querySelector('[data-testid="customers-tags-form-error"]');
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: "center" });
  }
  render() {
    const t5 = (k2) => erplora5().t(CATALOG5, k2);
    return b2`<div class="page">
      ${this.pageError ? b2`<ok-inline-feedback data-testid="customers-tags-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
      ${this.formMsg ? b2`<p class="ok" data-testid="customers-tags-form-msg">${this.formMsg}</p>` : A}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error ? b2`<ok-inline-feedback data-testid="customers-tags-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
      <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
           same edit panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
      <ok-data-table testid="customers-tags-table" .serverSide=${true} .fill=${true} .labels=${dataTableLabels(erplora5().locale)} .views=${true} .cardTitle=${(r6) => String(r6.name ?? "\u2014")} .cardIcon=${() => "pricetag-outline"} .addable=${can5("customers.add_customertag")} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.searchTag")} .actions=${this.rowActions} .rowClickable=${true} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyTags")} @rowAction=${(e7) => this.onRowAction(e7)} @rowClick=${(e7) => {
      if (can5("customers.change_customertag")) void this.startEdit(e7.detail.row);
    }} @pageChange=${(e7) => this.ctrl.setPage(e7.detail)} @pageSizeChange=${(e7) => this.ctrl.setPageSize(e7.detail)} @sortChange=${(e7) => this.ctrl.setSort(e7.detail.sort, e7.detail.dir)} @searchChange=${(e7) => this.ctrl.setSearch(e7.detail)} @filterChange=${(e7) => this.ctrl.setFilter(e7.detail.col, e7.detail.value)}>
        ${this.renderForm()}
      </ok-data-table>
    </div>`;
  }
};
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "pageError", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "formMsg", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "editing", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "editTitleInHeader", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "pendingDelete", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "fName", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "fColor", 2);
__decorateClass([
  r5()
], ErpCustomersTags.prototype, "fActive", 2);
define("erp-customers-tags", ErpCustomersTags);
