/**
 * Converte a árvore WebRDataJs de RObject.toJs() em valores JS simples.
 * Listas nomeadas viram objetos; vetores atômicos sem nomes permanecem arrays.
 */
export function unpackWebRJs(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (obj.type === 'null' && !Object.prototype.hasOwnProperty.call(obj, 'values')) {
    return null;
  }

  const isWebRNode =
    Object.prototype.hasOwnProperty.call(obj, 'type') &&
    Object.prototype.hasOwnProperty.call(obj, 'values');

  if (isWebRNode) {
    const rawValues = obj.values;
    const values = Array.isArray(rawValues)
      ? rawValues.map(unpackWebRJs)
      : unpackWebRJs(rawValues);

    const names = obj.names;
    const hasNames =
      Array.isArray(names) && names.some((n) => n !== null && n !== '');

    if (hasNames && Array.isArray(values)) {
      const out = {};
      for (let i = 0; i < values.length; i++) {
        const key = names[i];
        if (key !== null && key !== '') out[key] = values[i];
      }
      return out;
    }

    return values;
  }

  if (Array.isArray(obj)) return obj.map(unpackWebRJs);

  const out = {};
  for (const k of Object.keys(obj)) {
    out[k] = unpackWebRJs(obj[k]);
  }
  return out;
}

export function rScalar(value) {
  if (Array.isArray(value)) return value.length ? value[0] : undefined;
  return value;
}
