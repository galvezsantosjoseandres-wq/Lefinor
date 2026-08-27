'use strict';

/**
 * Motor de plantillas minimalista (sin dependencias) usado por el generador de Lefinor.
 * Soporta: {{ variable }}, {{{ variable_sin_escapar }}}, {{#each lista}}...{{/each}},
 * {{#if variable}}...{{else}}...{{/if}} y {{> nombreParcial}}.
 * Los partials aceptan parámetros literales opcionales, ej.:
 *   {{> tarjeta color="dorado" tamano="grande"}}
 * que quedan disponibles dentro del partial como variables normales ({{color}}).
 */

const TAG_RE =
  /{{{\s*([\w.]+)\s*}}}|{{#each\s+([\w.]+)\s*}}|{{\/each}}|{{#if\s+([\w.]+)\s*}}|{{else}}|{{\/if}}|{{>\s*([\w.-]+)((?:\s+[\w-]+="[^"]*")*)\s*}}|{{\s*([\w.]+)\s*}}/g;

function parsePartialParams(paramsStr) {
  const params = {};
  if (!paramsStr) return params;
  const re = /([\w-]+)="([^"]*)"/g;
  let match;
  while ((match = re.exec(paramsStr)) !== null) {
    params[match[1]] = match[2];
  }
  return params;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPath(data, key) {
  if (key === 'this') return data && data.this !== undefined ? data.this : data;
  const parts = key.split('.');
  let cur = data;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

function tokenize(template) {
  const tokens = [];
  let lastIndex = 0;
  let match;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(template)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: template.slice(lastIndex, match.index) });
    }
    const [full, rawKey, eachKey, ifKey, partialName, partialParams, varKey] = match;
    if (rawKey !== undefined) {
      tokens.push({ type: 'raw', key: rawKey });
    } else if (eachKey !== undefined) {
      tokens.push({ type: 'each-open', key: eachKey });
    } else if (full === '{{/each}}') {
      tokens.push({ type: 'each-close' });
    } else if (ifKey !== undefined) {
      tokens.push({ type: 'if-open', key: ifKey });
    } else if (full === '{{else}}') {
      tokens.push({ type: 'else' });
    } else if (full === '{{/if}}') {
      tokens.push({ type: 'if-close' });
    } else if (partialName !== undefined) {
      tokens.push({ type: 'partial', name: partialName, params: parsePartialParams(partialParams) });
    } else if (varKey !== undefined) {
      tokens.push({ type: 'var', key: varKey });
    }
    lastIndex = TAG_RE.lastIndex;
  }
  if (lastIndex < template.length) {
    tokens.push({ type: 'text', value: template.slice(lastIndex) });
  }
  return tokens;
}

function parse(tokens, stopTypes) {
  const nodes = [];
  while (tokens.length) {
    const token = tokens[0];
    if (stopTypes && stopTypes.includes(token.type)) {
      return nodes;
    }
    tokens.shift();
    switch (token.type) {
      case 'text':
        nodes.push({ type: 'text', value: token.value });
        break;
      case 'var':
        nodes.push({ type: 'var', key: token.key });
        break;
      case 'raw':
        nodes.push({ type: 'raw', key: token.key });
        break;
      case 'partial':
        nodes.push({ type: 'partial', name: token.name, params: token.params });
        break;
      case 'each-open': {
        const body = parse(tokens, ['each-close']);
        tokens.shift(); // consume each-close
        nodes.push({ type: 'each', key: token.key, body });
        break;
      }
      case 'if-open': {
        const thenBody = parse(tokens, ['else', 'if-close']);
        let elseBody = [];
        if (tokens.length && tokens[0].type === 'else') {
          tokens.shift();
          elseBody = parse(tokens, ['if-close']);
        }
        tokens.shift(); // consume if-close
        nodes.push({ type: 'if', key: token.key, thenBody, elseBody });
        break;
      }
      default:
        break;
    }
  }
  return nodes;
}

function renderNodes(nodes, data, partials) {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.value;
        break;
      case 'var':
        out += escapeHtml(getPath(data, node.key));
        break;
      case 'raw': {
        const value = getPath(data, node.key);
        out += value === undefined || value === null ? '' : String(value);
        break;
      }
      case 'partial': {
        const partialSrc = partials[node.name];
        if (!partialSrc) {
          throw new Error(`Parcial no encontrado: ${node.name}`);
        }
        const childData =
          node.params && Object.keys(node.params).length ? Object.assign({}, data, node.params) : data;
        out += render(partialSrc, childData, partials);
        break;
      }
      case 'each': {
        const arr = getPath(data, node.key);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            const childData =
              item && typeof item === 'object' && !Array.isArray(item)
                ? Object.assign({}, data, item, { this: item })
                : Object.assign({}, data, { this: item });
            out += renderNodes(node.body, childData, partials);
          }
        }
        break;
      }
      case 'if': {
        const value = getPath(data, node.key);
        const truthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
        out += renderNodes(truthy ? node.thenBody : node.elseBody, data, partials);
        break;
      }
      default:
        break;
    }
  }
  return out;
}

function render(template, data, partials = {}) {
  const tokens = tokenize(template);
  const ast = parse(tokens, null);
  return renderNodes(ast, data, partials);
}

module.exports = { render, escapeHtml, getPath };
