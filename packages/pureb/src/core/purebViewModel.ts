import Utils from '../lib/utils';
import Validation from '../lib/validation';
import ErrorMessage from '../lib/error';

export interface PurebViewModelConstructor<T> {
  html: string;
  data?: T;
  methods?: { [key: string]: Function };
  watch?: Partial<Record<keyof T, ((oldValue: T, newValue: T) => void)[]>>;
  created?: Function;
  mounted?: Function;
}

const PurebViewModel = class<
  T extends Record<string | symbol, any>,
> extends HTMLElement {
  $root!: ShadowRoot;
  $data!: T;
  $methods!: { [key: string]: Function };
  $watcher!: Record<keyof T, ((oldValue: T, newValue: T) => void)[]>;
  $ref!: { [key: string]: Element };
  $created!: Function;
  $mounted!: Function;
  isMounted!: boolean;

  constructor({
    html: __html,
    data: __data,
    methods: __methods,
    watch: __watch,
    created: __created,
    mounted: __mounted,
  }: PurebViewModelConstructor<T>) {
    super();
    this.$root = this.attachShadow({ mode: 'open' });
    this.$root.innerHTML = __html;

    this.isMounted = false;

    Object.defineProperties(this, {
      $data: {
        enumerable: true,
        value: new Proxy(__data ?? {}, {
          set: (obj: { [key: string | symbol]: T }, prop, value) => {
            if (this.$watcher[prop] && this.$watcher[prop]!.length !== 0) {
              this.$watcher[prop]!.forEach((cb) => cb(obj[prop]!, value));
            }

            obj[prop] = value;

            return true;
          },
        }),
      },
      $methods: {
        enumerable: true,
        value: __methods ?? {},
      },
      $watcher: {
        value: new Proxy(__watch ?? {}, {
          get: (obj: { [key: string | symbol]: Function[] }, prop) => {
            if (obj[prop] === undefined) {
              obj[prop] = [];
            }

            return obj[prop];
          },
        }),
      },
      $ref: {
        value: {},
      },
      $created: {
        value: __created,
      },
      $mounted: {
        value: __mounted,
      },
    });

    if (this.$created !== undefined && this.$created !== null) {
      this.$created.call(this);
    }
  }

  $emit(eventName: string, detail: any) {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        bubbles: true,
        composed: true,
        detail,
      })
    );
  }

  connectedCallback() {
    if (this.isMounted) {
      return;
    }

    this.isMounted = true;

    if (this.isConnected) {
      this.$root.querySelectorAll('*').forEach((el) => {
        for (const name of el.getAttributeNames()) {
          switch (true) {
            case name.startsWith('@'): {
              const eventName = name.slice(1);
              const handlerName = el.getAttribute(name);
              bindEvent.call(this, el, eventName, handlerName);
              break;
            }
            case name.startsWith('m-prop-'): {
              const propName = Utils.kebobToCamel(name, {
                ignorePrefix: 'm-prop',
              });
              const dataName = el.getAttribute(name);
              bindProperty.call(this, el, propName, dataName);
              break;
            }
            case name.startsWith('m-attr-'): {
              const attrName = Utils.kebobToCamel(name, {
                ignorePrefix: 'm-attr',
              });
              const dataName = el.getAttribute(name);
              bindAttribute.call(this, el, attrName, dataName);
              break;
            }
            case name.startsWith('m-bidata-') && !name.endsWith('__bind'): {
              const dataName = el.getAttribute(name);
              twoWayBinding.call(this, el, name, dataName);
              break;
            }
            case name === 'm-ref': {
              const refName = el.getAttribute(name);
              registerRef.call(this, el, refName);
            }
            default:
              break;
          }
        }
      });

      for (const name of this.getAttributeNames()) {
        if (name.startsWith('m-bidata-') && !name.endsWith('__bind')) {
          const dataName = Utils.kebobToCamel(name, {
            ignorePrefix: 'm-bidata',
          });
          twoWayBinding.call(this, this, name, dataName);
        } else if (name.startsWith('m-data-')) {
          const dataName = Utils.kebobToCamel(name, { ignorePrefix: 'm-data' });
          const value = this.getAttribute(name);
          setData.call(this, this, dataName, value);
        }
      }

      if (this.$mounted !== undefined && this.$mounted !== null) {
        setTimeout(() => this.$mounted.call(this), 0);
      }
    }
  }
};

function bindEvent(
  this: InstanceType<typeof PurebViewModel<any>>,
  target: Element,
  name: string,
  handlerName: string | null
) {
  if (!Validation.isHTMLElement(target)) {
    console.error(ErrorMessage['isNotHTMLElementMsg']);
    return;
  }

  if (!Validation.isProperty(this.$methods, handlerName)) {
    console.error(ErrorMessage['isNotPropertyMsg'], handlerName);
    return;
  }

  if (!handlerName) return;

  target.addEventListener(
    name,
    (evt) => this.$methods[handlerName]?.call(this, evt)
  );
}

function twoWayBinding(
  this: InstanceType<typeof PurebViewModel<any>>,
  target: Element,
  attrName: string,
  dataName: string | null
) {
  if (!Validation.isHTMLElement(target)) {
    console.error(ErrorMessage['isNotHTMLElementMsg']);
    return;
  }

  if (!Validation.isProperty(this.$data, dataName)) {
    console.error(ErrorMessage['isNotPropertyMsg'], dataName);
    return;
  }

  if (!dataName) return;

  new MutationObserver((_) => {
    const value = target.getAttribute(`${attrName}__bind`);

    if (this.$data[dataName] !== value) {
      this.$data[dataName] = value;
    }
  }).observe(target, {
    attributes: true,
    attributeFilter: [`${attrName}__bind`],
  });

  target.setAttribute(`${attrName}__bind`, this.$data[dataName]);
  this.$watcher[dataName]?.push((_, newValue) =>
    target.setAttribute(`${attrName}__bind`, newValue)
  );
}

function bindProperty<T extends Element, K extends keyof T>(
  this: InstanceType<typeof PurebViewModel<any>>,
  target: T,
  propName: string,
  dataName: string | null
) {
  if (!Validation.isHTMLElement(target)) {
    console.error(ErrorMessage['isNotHTMLElementMsg']);
    return;
  }

  if (!Validation.isProperty(target, propName)) {
    console.error(ErrorMessage['isNotPropertyMsg']);
    return;
  }

  if (!Validation.isProperty(this.$data, dataName)) {
    console.error(ErrorMessage['isNotPropertyMsg']);
    return;
  }

  if (!dataName) return;

  target[propName as K] = this.$data[dataName];
  this.$watcher[dataName]?.push(
    (_, newValue) => (target[propName as K] = newValue)
  );
}

function bindAttribute(
  this: InstanceType<typeof PurebViewModel<any>>,
  target: Element,
  attrName: string,
  dataName: string | null
) {
  if (!Validation.isHTMLElement(target)) {
    console.error(ErrorMessage['isNotHTMLElementMsg']);
    return;
  }

  if (!Validation.isProperty(this.$data, dataName)) {
    console.error(ErrorMessage['isNotPropertyMsg']);
    return;
  }

  if (!dataName) return;

  target.setAttribute(attrName, this.$data[dataName]);
  this.$watcher[dataName]?.push((_, newValue) =>
    target.setAttribute(attrName, newValue)
  );
}

function setData(
  this: InstanceType<typeof PurebViewModel<any>>,
  target: Element,
  dataName: string,
  value: any
) {
  if (!Validation.isHTMLElement(target)) {
    console.error(ErrorMessage['isNotHTMLElementMsg']);
    return;
  }

  if (!Validation.isProperty(this.$data, dataName)) {
    console.error(ErrorMessage['isNotPropertyMsg'], dataName);
    return;
  }

  this.$data[dataName] = value;
}

function registerRef(
  this: InstanceType<typeof PurebViewModel<any>>,
  target: Element,
  refName: string | null
) {
  if (!Validation.isHTMLElement(target)) {
    console.error(ErrorMessage['isNotHTMLElementMsg']);
    return;
  }

  if (!Validation.isNotEmptyString(refName)) {
    console.error(ErrorMessage['isEmptyStringMsg']);
    return;
  }

  if (Validation.isProperty(this.$ref, refName)) {
    console.error(ErrorMessage['isAlreadyRegisteredRefMsg']);
    return;
  }

  if (!refName) return;

  this.$ref[refName] = target;
}

export default PurebViewModel;
