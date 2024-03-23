const Validation = class {
  static isHTMLElement = (el?: Element): el is HTMLElement =>
    el instanceof HTMLElement;

  static isProperty = (
    target: { [key: string]: any },
    property: string | null
  ) =>
    property !== null && target !== undefined && target[property] !== undefined;

  static isNotEmptyString = (str: string | null) =>
    str !== undefined && str !== null && str !== '';
};

export default Validation;
