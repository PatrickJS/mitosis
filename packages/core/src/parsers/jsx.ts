import * as babel from '@babel/core';
import generate from '@babel/generator';
import { traceReferenceToModulePath } from '../helpers/trace-reference-to-module-path';
import traverse from 'traverse';
import { functionLiteralPrefix } from '../constants/function-literal-prefix';
import { methodLiteralPrefix } from '../constants/method-literal-prefix';
import { babelTransformExpression } from '../helpers/babel-transform';
import { capitalize } from '../helpers/capitalize';
import { createMitosisComponent } from '../helpers/create-mitosis-component';
import { createMitosisNode } from '../helpers/create-mitosis-node';
import { isMitosisNode } from '../helpers/is-mitosis-node';
import { replaceIdentifiers } from '../helpers/replace-idenifiers';
import { getBindingsCode } from '../helpers/get-bindings';
import { stripNewlinesInStrings } from '../helpers/replace-new-lines-in-strings';
import { JSONObject, JSONOrNode, JSONOrNodeObject } from '../types/json';
import {
  MitosisComponent,
  MitosisImport,
  MitosisExport,
} from '../types/mitosis-component';
import { MitosisNode } from '../types/mitosis-node';
import { tryParseJson } from '../helpers/json';

const jsxPlugin = require('@babel/plugin-syntax-jsx');
const tsPreset = require('@babel/preset-typescript');

export const selfClosingTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const { types } = babel;

type Context = {
  // Babel has other context
  builder: {
    component: MitosisComponent;
  };
};

const arrayToAst = (array: JSONOrNode[]) => {
  return types.arrayExpression(array.map((item) => jsonToAst(item)) as any);
};

const jsonToAst = (json: JSONOrNode): babel.Node => {
  if (types.isNode(json as any)) {
    if (types.isJSXText(json as any)) {
      return types.stringLiteral((json as any).value);
    }
    return json as babel.Node;
  }
  switch (typeof json) {
    case 'undefined':
      return types.identifier('undefined');
    case 'string':
      return types.stringLiteral(json);
    case 'number':
      return types.numericLiteral(json);
    case 'boolean':
      return types.booleanLiteral(json);
    case 'object':
      if (!json) {
        return types.nullLiteral();
      }
      if (Array.isArray(json)) {
        return arrayToAst(json);
      }
      return jsonObjectToAst(json as JSONObject);
  }
};

const jsonObjectToAst = (
  json: JSONOrNodeObject,
): babel.types.ObjectExpression => {
  if (!json) {
    return json;
  }
  const properties: babel.types.ObjectProperty[] = [];
  for (const key in json) {
    const value = json[key];
    if (value === undefined) {
      continue;
    }
    const keyAst = types.stringLiteral(key);
    const valueAst = jsonToAst(value);
    properties.push(types.objectProperty(keyAst, valueAst as any));
  }
  const newNode = types.objectExpression(properties);

  return newNode;
};

export const createFunctionStringLiteral = (node: babel.types.Node) => {
  return types.stringLiteral(`${functionLiteralPrefix}${generate(node).code}`);
};
export const createFunctionStringLiteralObjectProperty = (
  key: babel.types.Expression | babel.types.PrivateName,
  node: babel.types.Node,
) => {
  return types.objectProperty(key, createFunctionStringLiteral(node));
};

const uncapitalize = (str: string) => {
  if (!str) {
    return str;
  }

  return str[0].toLowerCase() + str.slice(1);
};

export const parseStateObject = (object: babel.types.ObjectExpression) => {
  const properties = object.properties;
  const useProperties = properties.map((item) => {
    if (types.isObjectProperty(item)) {
      if (
        types.isFunctionExpression(item.value) ||
        types.isArrowFunctionExpression(item.value)
      ) {
        return createFunctionStringLiteralObjectProperty(item.key, item.value);
      }
    }
    if (types.isObjectMethod(item)) {
      return types.objectProperty(
        item.key,
        types.stringLiteral(
          `${methodLiteralPrefix}${
            generate({ ...item, returnType: null }).code
          }`,
        ),
      );
    }
    // Remove typescript types, e.g. from
    // { foo: ('string' as SomeType) }
    if (types.isObjectProperty(item)) {
      let value = item.value;
      if (types.isTSAsExpression(value)) {
        value = value.expression;
      }
      return types.objectProperty(item.key, value);
    }
    return item;
  });

  const newObject = types.objectExpression(useProperties);
  const obj = parseCodeJson(newObject);
  return obj;
};

const parseCodeJson = (node: babel.types.Node) => {
  const code = generate(node).code;
  return tryParseJson(code);
};

const getPropsTypeRef = (
  node: babel.types.FunctionDeclaration,
): string | undefined => {
  const param = node.params[0];
  // TODO: component function params name must be props
  if (
    babel.types.isIdentifier(param) &&
    param.name === 'props' &&
    babel.types.isTSTypeAnnotation(param.typeAnnotation)
  ) {
    const paramIdentifier = babel.types.variableDeclaration('let', [
      babel.types.variableDeclarator(param),
    ]);
    return generate(paramIdentifier)
      .code.replace(/^let\sprops:\s+/, '')
      .replace(/;/g, '');
  }
  return undefined;
};

const componentFunctionToJson = (
  node: babel.types.FunctionDeclaration,
  context: Context,
): JSONOrNode => {
  const hooks: MitosisComponent['hooks'] = {};
  let state: MitosisComponent['state'] = {};
  const accessedContext: MitosisComponent['context']['get'] = {};
  const setContext: MitosisComponent['context']['set'] = {};
  const refs: MitosisComponent['refs'] = {};
  for (const item of node.body.body) {
    if (types.isExpressionStatement(item)) {
      const expression = item.expression;
      if (types.isCallExpression(expression)) {
        if (types.isIdentifier(expression.callee)) {
          if (
            expression.callee.name === 'setContext' ||
            expression.callee.name === 'provideContext'
          ) {
            const keyNode = expression.arguments[0];
            if (types.isIdentifier(keyNode)) {
              const key = keyNode.name;
              const keyPath = traceReferenceToModulePath(
                context.builder.component.imports,
                key,
              )!;
              const valueNode = expression.arguments[1];
              if (valueNode) {
                if (types.isObjectExpression(valueNode)) {
                  const value = parseStateObject(valueNode) as JSONObject;
                  setContext[keyPath] = {
                    name: keyNode.name,
                    value,
                  };
                } else {
                  const ref = generate(valueNode).code;
                  setContext[keyPath] = {
                    name: keyNode.name,
                    ref,
                  };
                }
              }
            }
          } else if (
            expression.callee.name === 'onMount' ||
            expression.callee.name === 'useEffect'
          ) {
            const firstArg = expression.arguments[0];
            if (
              types.isFunctionExpression(firstArg) ||
              types.isArrowFunctionExpression(firstArg)
            ) {
              const code = generate(firstArg.body)
                .code.trim()
                // Remove arbitrary block wrapping if any
                // AKA
                //  { console.log('hi') } -> console.log('hi')
                .replace(/^{/, '')
                .replace(/}$/, '');
              // TODO: add arguments
              hooks.onMount = { code };
            }
          } else if (expression.callee.name === 'onUpdate') {
            const firstArg = expression.arguments[0];
            const secondArg = expression.arguments[1];
            if (
              types.isFunctionExpression(firstArg) ||
              types.isArrowFunctionExpression(firstArg)
            ) {
              const code = generate(firstArg.body)
                .code.trim()
                // Remove arbitrary block wrapping if any
                // AKA
                //  { console.log('hi') } -> console.log('hi')
                .replace(/^{/, '')
                .replace(/}$/, '');
              if (
                !secondArg ||
                (types.isArrayExpression(secondArg) &&
                  secondArg.elements.length > 0)
              ) {
                const depsCode = secondArg ? generate(secondArg).code : '';

                hooks.onUpdate = [
                  ...(hooks.onUpdate || []),
                  {
                    code,
                    deps: depsCode,
                  },
                ];
              }
            }
          } else if (expression.callee.name === 'onUnMount') {
            const firstArg = expression.arguments[0];
            if (
              types.isFunctionExpression(firstArg) ||
              types.isArrowFunctionExpression(firstArg)
            ) {
              const code = generate(firstArg.body)
                .code.trim()
                // Remove arbitrary block wrapping if any
                // AKA
                //  { console.log('hi') } -> console.log('hi')
                .replace(/^{/, '')
                .replace(/}$/, '');
              hooks.onUnMount = { code };
            }
          } else if (expression.callee.name === 'onInit') {
            const firstArg = expression.arguments[0];
            if (
              types.isFunctionExpression(firstArg) ||
              types.isArrowFunctionExpression(firstArg)
            ) {
              const code = generate(firstArg.body)
                .code.trim()
                // Remove arbitrary block wrapping if any
                // AKA
                //  { console.log('hi') } -> console.log('hi')
                .replace(/^{/, '')
                .replace(/}$/, '');
              hooks.onInit = { code };
            }
          }
        }
      }
    }

    if (types.isFunctionDeclaration(item)) {
      if (types.isIdentifier(item.id)) {
        state[item.id.name] = `${functionLiteralPrefix}${generate(item).code!}`;
      }
    }

    if (types.isVariableDeclaration(item)) {
      const declaration = item.declarations[0];
      const init = declaration.init;
      if (types.isCallExpression(init)) {
        // React format, like:
        // const [foo, setFoo] = useState(...)
        if (types.isArrayPattern(declaration.id)) {
          const varName =
            types.isIdentifier(declaration.id.elements[0]) &&
            declaration.id.elements[0].name;
          if (varName) {
            const value = init.arguments[0];
            // Function as init, like:
            // useState(() => true)
            if (types.isArrowFunctionExpression(value)) {
              state[varName] = parseCodeJson(value.body);
            } else {
              // Value as init, like:
              // useState(true)
              state[varName] = parseCodeJson(value);
            }
          }
        }
        // Legacy format, like:
        // const state = useState({...})
        else if (types.isIdentifier(init.callee)) {
          if (init.callee.name === 'useState') {
            const firstArg = init.arguments[0];
            if (types.isObjectExpression(firstArg)) {
              state = parseStateObject(firstArg);
            }
          } else if (init.callee.name === 'useContext') {
            const firstArg = init.arguments[0];
            if (
              types.isVariableDeclarator(declaration) &&
              types.isIdentifier(declaration.id)
            ) {
              if (types.isIdentifier(firstArg)) {
                const varName = declaration.id.name;
                const name = firstArg.name;
                accessedContext[varName] = {
                  name,
                  path: traceReferenceToModulePath(
                    context.builder.component.imports,
                    name,
                  )!,
                };
              } else {
                const varName = declaration.id.name;
                const name = generate(firstArg).code;
                accessedContext[varName] = {
                  name,
                  path: '',
                };
              }
            }
          } else if (init.callee.name === 'useRef') {
            if (types.isIdentifier(declaration.id)) {
              const firstArg = init.arguments[0];
              const varName = declaration.id.name;
              refs[varName] = {
                argument: generate(firstArg).code,
              };
              // Typescript Parameter
              if (types.isTSTypeParameterInstantiation(init.typeParameters)) {
                refs[varName].typeParameter = generate(
                  init.typeParameters.params[0],
                ).code;
              }
            }
          }
        }
      }
    }
  }

  const theReturn = node.body.body.find((item) =>
    types.isReturnStatement(item),
  );
  const children: MitosisNode[] = [];
  if (theReturn) {
    const value = (theReturn as babel.types.ReturnStatement).argument;
    if (types.isJSXElement(value) || types.isJSXFragment(value)) {
      children.push(jsxElementToJson(value) as MitosisNode);
    }
  }

  const { exports: localExports } = context.builder.component;
  if (localExports) {
    const bindingsCode = getBindingsCode(children);
    Object.keys(localExports).forEach((name) => {
      const found = bindingsCode.find((code: string) =>
        code.match(new RegExp(`\\b${name}\\b`)),
      );
      localExports[name].usedInLocal = Boolean(found);
    });
    context.builder.component.exports = localExports;
  }

  return createMitosisComponent({
    ...context.builder.component,
    name: node.id?.name,
    state,
    children,
    refs: refs,
    hooks,
    context: {
      get: accessedContext,
      set: setContext,
    },
    propsTypeRef: getPropsTypeRef(node),
  }) as any;
};

const jsxElementToJson = (
  node:
    | babel.types.JSXElement
    | babel.types.JSXText
    | babel.types.JSXFragment
    | babel.types.JSXExpressionContainer,
): MitosisNode | null => {
  if (types.isJSXText(node)) {
    return createMitosisNode({
      properties: {
        _text: node.value,
      },
    });
  }
  if (types.isJSXExpressionContainer(node)) {
    if (types.isJSXEmptyExpression(node.expression)) {
      return null;
    }
    // foo.map -> <For each={foo}>...</For>
    if (
      types.isCallExpression(node.expression) ||
      types.isOptionalCallExpression(node.expression)
    ) {
      const callback = node.expression.arguments[0];
      if (types.isArrowFunctionExpression(callback)) {
        if (types.isIdentifier(callback.params[0])) {
          const forArguments = callback.params
            .map((param) => (param as babel.types.Identifier)?.name)
            .filter(Boolean);
          return createMitosisNode({
            name: 'For',
            bindings: {
              each: {
                code: generate(node.expression.callee)
                  .code // Remove .map or potentially ?.map
                  .replace(/\??\.map$/, ''),
              },
            },
            scope: {
              For: forArguments,
            },
            properties: {
              _forName: forArguments[0],
              _indexName: forArguments[1],
              _collectionName: forArguments[2],
            },
            children: [jsxElementToJson(callback.body as any)!],
          });
        }
      }
    }

    // {foo && <div />} -> <Show when={foo}>...</Show>
    if (types.isLogicalExpression(node.expression)) {
      if (node.expression.operator === '&&') {
        return createMitosisNode({
          name: 'Show',
          bindings: {
            when: { code: generate(node.expression.left).code! },
          },
          children: [jsxElementToJson(node.expression.right as any)!],
        });
      } else {
        // TODO: good warning system for unsupported operators
      }
    }

    // {foo ? <div /> : <span />} -> <Show when={foo} else={<span />}>...</Show>
    if (types.isConditionalExpression(node.expression)) {
      return createMitosisNode({
        name: 'Show',
        meta: {
          else: jsxElementToJson(node.expression.alternate as any)!,
        },
        bindings: {
          when: { code: generate(node.expression.test).code! },
        },
        children: [jsxElementToJson(node.expression.consequent as any)!],
      });
    }

    // TODO: support {foo ? bar : baz}

    return createMitosisNode({
      bindings: {
        _text: { code: generate(node.expression).code },
      },
    });
  }

  if (types.isJSXFragment(node)) {
    return createMitosisNode({
      name: 'Fragment',
      children: node.children
        .map((item) => jsxElementToJson(item as any))
        .filter(Boolean) as any,
    });
  }

  const nodeName = generate(node.openingElement.name).code;

  if (nodeName === 'Show') {
    const whenAttr: babel.types.JSXAttribute | undefined =
      node.openingElement.attributes.find(
        (item) => types.isJSXAttribute(item) && item.name.name === 'when',
      ) as any;

    const elseAttr: babel.types.JSXAttribute | undefined =
      node.openingElement.attributes.find(
        (item) => types.isJSXAttribute(item) && item.name.name === 'else',
      ) as any;

    const whenValue =
      whenAttr && types.isJSXExpressionContainer(whenAttr.value)
        ? generate(whenAttr.value.expression).code
        : undefined;

    const elseValue =
      elseAttr &&
      types.isJSXExpressionContainer(elseAttr.value) &&
      jsxElementToJson(elseAttr.value.expression as any);

    return createMitosisNode({
      name: 'Show',
      meta: {
        else: elseValue || undefined,
      },
      bindings: {
        ...(whenValue ? { when: { code: whenValue } } : {}),
      },
      children: node.children
        .map((item) => jsxElementToJson(item as any))
        .filter(Boolean) as any,
    });
  }

  // <For ...> control flow component
  if (nodeName === 'For') {
    const child = node.children.find((item) =>
      types.isJSXExpressionContainer(item),
    );
    if (types.isJSXExpressionContainer(child)) {
      const childExpression = child.expression;

      if (types.isArrowFunctionExpression(childExpression)) {
        const forArguments = childExpression?.params
          .map((param) => (param as babel.types.Identifier)?.name)
          .filter(Boolean);

        return createMitosisNode({
          name: 'For',
          bindings: {
            each: {
              code: generate(
                (
                  (
                    node.openingElement
                      .attributes[0] as babel.types.JSXAttribute
                  ).value as babel.types.JSXExpressionContainer
                ).expression,
              ).code,
            },
          },
          scope: {
            For: forArguments,
          },
          properties: {
            _forName: forArguments[0],
            _indexName: forArguments[1],
            _collectionName: forArguments[2],
          },
          children: [jsxElementToJson(childExpression.body as any)!],
        });
      }
    }
  }

  return createMitosisNode({
    name: nodeName,
    properties: node.openingElement.attributes.reduce((memo, item) => {
      if (types.isJSXAttribute(item)) {
        const key = item.name.name as string;
        const value = item.value;
        if (types.isStringLiteral(value)) {
          memo[key] = value;
          return memo;
        }
      }
      return memo;
    }, {} as { [key: string]: JSONOrNode }) as any,
    bindings: node.openingElement.attributes.reduce((memo, item) => {
      if (types.isJSXAttribute(item)) {
        const key = item.name.name as string;
        const value = item.value;

        if (types.isJSXExpressionContainer(value)) {
          const { expression } = value;
          if (types.isArrowFunctionExpression(expression)) {
            if (key.startsWith('on')) {
              memo[key] = {
                code: generate(expression.body).code,
                arguments: expression.params.map(
                  (node) => (node as babel.types.Identifier)?.name,
                ),
              };
            } else {
              memo[key] = { code: generate(expression.body).code };
            }
          } else {
            memo[key] = { code: generate(expression).code };
          }

          return memo;
        }
      } else if (types.isJSXSpreadAttribute(item)) {
        // TODO: potentially like Vue store bindings and properties as array of key value pairs
        // too so can do this accurately when order matters. Also tempting to not support spread,
        // as some frameworks do not support it (e.g. Angular) tho Angular may be the only one
        memo._spread = {
          code: types.stringLiteral(generate(item.argument).code),
        };
      }
      return memo;
    }, {} as { [key: string]: JSONOrNode }) as any,
    children: node.children
      .map((item) => jsxElementToJson(item as any))
      .filter(Boolean) as any,
  });
};

const getHook = (node: babel.Node) => {
  const item = node;
  if (types.isExpressionStatement(item)) {
    const expression = item.expression;
    if (types.isCallExpression(expression)) {
      if (types.isIdentifier(expression.callee)) {
        return expression;
      }
    }
  }
  return null;
};

export const METADATA_HOOK_NAME = 'useMetadata';

/**
 * Transform useMetadata({...}) onto the component JSON as
 * meta: { metadataHook: { ... }}
 *
 * This function collects metadata and removes the statement from
 * the returned nodes array
 */
const collectMetadata = (
  nodes: babel.types.Statement[],
  component: MitosisComponent,
  options: ParseMitosisOptions,
) => {
  const hookNames = new Set(
    (options.jsonHookNames || []).concat(METADATA_HOOK_NAME),
  );
  return nodes.filter((node) => {
    const hook = getHook(node);
    if (!hook) {
      return true;
    }
    if (types.isIdentifier(hook.callee) && hookNames.has(hook.callee.name)) {
      try {
        component.meta[hook.callee.name] = parseCodeJson(hook.arguments[0]);
        return false;
      } catch (e) {
        console.error(`Error parsing metadata hook ${hook.callee.name}`);
        throw e;
      }
    }
    return true;
  });
};

type ParseMitosisOptions = {
  format: 'react' | 'simple';
  jsonHookNames?: string[];
  compileAwayPackages?: string[];
};

function mapReactIdentifiersInExpression(
  expression: string,
  stateProperties: string[],
) {
  const setExpressions = stateProperties.map(
    (propertyName) => `set${capitalize(propertyName)}`,
  );

  return babelTransformExpression(
    // foo -> state.foo
    replaceIdentifiers(expression, stateProperties, (name) => `state.${name}`),
    {
      CallExpression(path: babel.NodePath<babel.types.CallExpression>) {
        if (types.isIdentifier(path.node.callee)) {
          if (setExpressions.includes(path.node.callee.name)) {
            // setFoo -> foo
            const statePropertyName = uncapitalize(
              path.node.callee.name.slice(3),
            );

            // setFoo(...) -> state.foo = ...
            path.replaceWith(
              types.assignmentExpression(
                '=',
                types.identifier(`state.${statePropertyName}`),
                path.node.arguments[0] as any,
              ),
            );
          }
        }
      },
    },
  );
}

/**
 * Convert state identifiers from React hooks format to the state.* format Mitosis needs
 * e.g.
 *   text -> state.text
 *   setText(...) -> state.text = ...
 */
function mapReactIdentifiers(json: MitosisComponent) {
  const stateProperties = Object.keys(json.state);

  for (const key in json.state) {
    const value = json.state[key];
    if (typeof value === 'string' && value.startsWith(functionLiteralPrefix)) {
      json.state[key] =
        functionLiteralPrefix +
        mapReactIdentifiersInExpression(
          value.replace(functionLiteralPrefix, ''),
          stateProperties,
        );
    }
  }

  traverse(json).forEach(function (item) {
    if (isMitosisNode(item)) {
      for (const key in item.bindings) {
        const value = item.bindings[key];

        if (value) {
          item.bindings[key] = {
            code: mapReactIdentifiersInExpression(
              value.code as string,
              stateProperties,
            ),
          };
          if (value.arguments?.length) {
            item.bindings[key]!.arguments = value.arguments;
          }
        }
      }

      if (item.bindings.className) {
        if (item.bindings.class) {
          // TO-DO: it's too much work to merge 2 bindings, so just remove the old one for now.
          item.bindings.class = item.bindings.className;
          console.warn(
            `[${json.name}]: Found both 'class' and 'className' bindings: removing 'className'.`,
          );
        } else {
          item.bindings.class = item.bindings.className;
        }
        delete item.bindings.className;
      }

      if (item.properties.className) {
        if (item.properties.class) {
          item.properties.class = `${item.properties.class} ${item.properties.className}`;
          console.warn(
            `[${json.name}]: Found both 'class' and 'className' properties: merging.`,
          );
        } else {
          item.properties.class = item.properties.className;
        }
        delete item.properties.className;
      }

      if (item.properties.class && item.bindings.class) {
        console.warn(
          `[${json.name}]: Ended up with both a property and binding for 'class'.`,
        );
      }
    }
  });
}

const expressionToNode = (str: string) => {
  const code = `export default ${str}`;
  return (
    (babel.parse(code) as babel.types.File).program
      .body[0] as babel.types.ExportDefaultDeclaration
  ).declaration;
};

/**
 * Convert <Context.Provider /> to hooks formats by mutating the
 * MitosisComponent tree
 */
function extractContextComponents(json: MitosisComponent) {
  traverse(json).forEach(function (item) {
    if (isMitosisNode(item)) {
      if (item.name.endsWith('.Provider')) {
        const value = item.bindings?.value?.code;
        const name = item.name.split('.')[0];
        const refPath = traceReferenceToModulePath(json.imports, name)!;
        json.context.set[refPath] = {
          name,
          value: value
            ? parseStateObject(
                expressionToNode(value) as babel.types.ObjectExpression,
              )
            : undefined,
        };

        this.update(
          createMitosisNode({
            name: 'Fragment',
            children: item.children,
          }),
        );
      }
      // TODO: maybe support Context.Consumer:
      // if (item.name.endsWith('.Consumer')) { ... }
    }
  });
}

const isImportOrDefaultExport = (node: babel.Node) =>
  types.isExportDefaultDeclaration(node) || types.isImportDeclaration(node);

const isTypeOrInterface = (node: babel.Node) =>
  types.isTSTypeAliasDeclaration(node) ||
  types.isTSInterfaceDeclaration(node) ||
  (types.isExportNamedDeclaration(node) &&
    types.isTSTypeAliasDeclaration(node.declaration)) ||
  (types.isExportNamedDeclaration(node) &&
    types.isTSInterfaceDeclaration(node.declaration));

const collectTypes = (node: babel.Node, context: Context) => {
  const typeStr = generate(node).code;
  const { types = [] } = context.builder.component;
  types.push(typeStr);
  context.builder.component.types = types.filter(Boolean);
};

const collectInterfaces = (node: babel.Node, context: Context) => {
  const interfaceStr = generate(node).code;
  const { interfaces = [] } = context.builder.component;
  interfaces.push(interfaceStr);
  context.builder.component.interfaces = interfaces.filter(Boolean);
};

/**
 * This function takes the raw string from a Mitosis component, and converts it into a JSON that can be processed by
 * each generator function.
 *
 * @param jsx string representation of the Mitosis component
 * @returns A JSON representation of the Mitosis component
 */
export function parseJsx(
  jsx: string,
  options: Partial<ParseMitosisOptions> = {},
): MitosisComponent {
  const useOptions: ParseMitosisOptions = {
    format: 'react',
    ...options,
  };

  let subComponentFunctions: string[] = [];

  const output = babel.transform(jsx, {
    configFile: false,
    babelrc: false,
    comments: false,
    presets: [[tsPreset, { isTSX: true, allExtensions: true }]],
    plugins: [
      jsxPlugin,
      (): babel.PluginObj<Context> => ({
        visitor: {
          JSXExpressionContainer(path, context) {
            if (types.isJSXEmptyExpression(path.node.expression)) {
              path.remove();
            }
          },
          Program(path, context) {
            if (context.builder) {
              return;
            }
            context.builder = {
              component: createMitosisComponent(),
            };

            const keepStatements = path.node.body.filter(
              (statement) =>
                isImportOrDefaultExport(statement) ||
                isTypeOrInterface(statement),
            );

            const exportsOrLocalVariables = path.node.body.filter(
              (statement) =>
                !isImportOrDefaultExport(statement) &&
                !isTypeOrInterface(statement) &&
                !types.isExpressionStatement(statement),
            );

            context.builder.component.exports = exportsOrLocalVariables.reduce(
              (pre, node) => {
                let name, isFunction;
                if (
                  babel.types.isExportNamedDeclaration(node) &&
                  babel.types.isVariableDeclaration(node.declaration) &&
                  babel.types.isIdentifier(node.declaration.declarations[0].id)
                ) {
                  name = node.declaration.declarations[0].id.name;
                  isFunction = babel.types.isFunction(
                    node.declaration.declarations[0].init,
                  );
                } else if (
                  babel.types.isVariableDeclaration(node) &&
                  babel.types.isIdentifier(node.declarations[0].id)
                ) {
                  name = node.declarations[0].id.name;
                  isFunction = babel.types.isFunction(
                    node.declarations[0].init,
                  );
                }
                if (name) {
                  pre[name] = {
                    code: generate(node).code,
                    isFunction,
                  };
                } else {
                  console.warn('export statement without name', node);
                }
                return pre;
              },
              {} as MitosisExport,
            );

            let cutStatements = path.node.body.filter(
              (statement) => !isImportOrDefaultExport(statement),
            );

            subComponentFunctions = path.node.body
              .filter(
                (node) =>
                  !types.isExportDefaultDeclaration(node) &&
                  types.isFunctionDeclaration(node),
              )
              .map((node) => `export default ${generate(node).code!}`);

            cutStatements = collectMetadata(
              cutStatements,
              context.builder.component,
              useOptions,
            );

            // TODO: support multiple? e.g. for others to add imports?
            context.builder.component.hooks.preComponent = {
              code: generate(types.program(cutStatements)).code,
            };

            path.replaceWith(types.program(keepStatements));
          },
          FunctionDeclaration(path, context) {
            const { node } = path;
            if (types.isIdentifier(node.id)) {
              const name = node.id.name;
              if (name[0].toUpperCase() === name[0]) {
                path.replaceWith(
                  jsonToAst(componentFunctionToJson(node, context)),
                );
              }
            }
          },
          ImportDeclaration(path, context) {
            // @builder.io/mitosis or React imports compile away
            const customPackages = options?.compileAwayPackages || [];
            if (
              [
                'react',
                '@builder.io/mitosis',
                '@emotion/react',
                ...customPackages,
              ].includes(path.node.source.value)
            ) {
              path.remove();
              return;
            }
            const importObject: MitosisImport = {
              imports: {},
              path: path.node.source.value,
            };
            for (const specifier of path.node.specifiers) {
              if (types.isImportSpecifier(specifier)) {
                importObject.imports[
                  (specifier.imported as babel.types.Identifier).name
                ] = specifier.local.name;
              } else if (types.isImportDefaultSpecifier(specifier)) {
                importObject.imports[specifier.local.name] = 'default';
              } else if (types.isImportNamespaceSpecifier(specifier)) {
                importObject.imports[specifier.local.name] = '*';
              }
            }
            context.builder.component.imports.push(importObject);

            path.remove();
          },
          ExportDefaultDeclaration(path) {
            path.replaceWith(path.node.declaration);
          },
          JSXElement(path) {
            const { node } = path;
            path.replaceWith(jsonToAst(jsxElementToJson(node)));
          },
          ExportNamedDeclaration(path, context) {
            const { node } = path;
            const newTypeStr = generate(node).code;
            if (babel.types.isTSInterfaceDeclaration(node.declaration)) {
              collectInterfaces(path.node, context);
            }
            if (babel.types.isTSTypeAliasDeclaration(node.declaration)) {
              collectTypes(path.node, context);
            }
          },
          TSTypeAliasDeclaration(path, context) {
            collectTypes(path.node, context);
          },
          TSInterfaceDeclaration(path, context) {
            collectInterfaces(path.node, context);
          },
        },
      }),
    ],
  });

  const toParse = stripNewlinesInStrings(
    output!
      .code!.trim()
      // Occasional issues where comments get kicked to the top. Full fix should strip these sooner
      .replace(/^\/\*[\s\S]*?\*\/\s*/, '')
      // Weird bug with adding a newline in a normal at end of a normal string that can't have one
      // If not one-off find full solve and cause
      .replace(/\n"/g, '"')
      .replace(/^\({/, '{')
      .replace(/}\);$/, '}'),
  );
  const parsed = tryParseJson(toParse);

  mapReactIdentifiers(parsed);
  extractContextComponents(parsed);

  parsed.subComponents = subComponentFunctions.map((item) =>
    parseJsx(item, useOptions),
  );

  return parsed;
}
