const Utils = class {
  static kebobToCamel = (
    str: string,
    options: {
      prefix?: string;
      ignorePrefix?: string;
    } = { prefix: '', ignorePrefix: '' }
  ) => {
    const { prefix, ignorePrefix } = options;

    let ignoredStr = str;

    if (
      ignorePrefix !== undefined &&
      ignorePrefix !== null &&
      ignorePrefix !== ''
    ) {
      ignoredStr = ignoredStr.replace(new RegExp(`^${ignorePrefix}-`), '');
    }

    const camelStr = ignoredStr
      .split('-')
      .filter((s) => s !== '')
      .reduce((r, s) => (r = r + `${s[0]!.toUpperCase()}${s.slice(1)}`));

    if (prefix !== undefined && prefix !== null && prefix !== '') {
      return `${prefix}${camelStr.replace(/^([a-z])/, (_, p) =>
        p.toUpperCase()
      )}`;
    }

    return camelStr;
  };
};

export default Utils;
