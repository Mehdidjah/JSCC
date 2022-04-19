function traverser(ast, visitor) {
  function traverseArray(array, parent) {
    array.forEach(child => {
      traverseNode(child, parent);
    });
  }

  function traverseNode(node, parent) {
    if (!node || typeof node !== 'object') {
      return;
    }

    const methods = visitor[node.type];

    if (methods && typeof methods.enter === 'function') {
      methods.enter(node, parent);
    }

    switch (node.type) {
      case 'Program':
        if (node.body && Array.isArray(node.body)) {
          traverseArray(node.body, node);
        }
        break;

      case 'CodeCave':
        if (node.params && Array.isArray(node.params)) {
          traverseArray(node.params, node);
        }
        break;

      case 'CodeDomain':
        if (node.params && Array.isArray(node.params)) {
          traverseArray(node.params, node);
        }
        break;

      case 'Arr':
        if (node.params && Array.isArray(node.params)) {
          traverseArray(node.params, node);
        }
        break;

      case 'NumberLiteral':
      case 'StringLiteral':
      case 'Word':
      case 'Delimiter':
      case 'Terminator':
      case 'Equal':
      case 'Pointer':
      case 'IncByOne':
      case 'DecByOne':
      case 'Arrow':
      case 'Plus':
      case 'Minus':
      case 'IncByNum':
      case 'DecByNum':
      case 'ForwardSlash':
      case 'ComparisonE':
      case 'ComparisonN':
      case 'Macro':
      case 'Not':
      case 'Colon':
      case 'Less':
      case 'Greater':
      case 'LessOrEqual':
      case 'GreaterOrEqual':
      case 'Dot':
      case 'XorEqual':
      case 'OrOr':
      case 'Pipe':
      case 'AndAnd':
      case 'And':
      case 'Question':
      case 'Hex':
      case 'Tab':
      case 'VTab':
      case 'Oct':
      case 'Newline':
      case 'CRet':
      case 'Alert':
      case 'Backspace':
      case 'QueMark':
      case 'Xor':
        break;

      default:
        if (process && process.env && process.env.NODE_ENV === 'development') {
          console.warn(`Traverser: Unknown node type '${node.type}'`);
        }
        break;
    }

    if (methods && typeof methods.exit === 'function') {
      methods.exit(node, parent);
    }
  }

  traverseNode(ast, null);
}

function transformer(ast) {
  const newAst = {
    type: 'Program',
    body: []
  };

  ast._context = newAst.body;

  function createSimpleVisitor(type) {
    return {
      enter(node, parent) {
        if (parent && parent._context) {
          parent._context.push({
            type: type,
            value: node.value
          });
        }
      }
    };
  }

  const visitor = {
    NumberLiteral: createSimpleVisitor('NumberLiteral'),
    Word: createSimpleVisitor('Word'),
    IncByOne: createSimpleVisitor('IncByOne'),
    DecByOne: createSimpleVisitor('DecByOne'),
    Arrow: createSimpleVisitor('Arrow'),
    OrOr: {
      enter(node, parent) {
        if (parent && parent._context) {
          parent._context.push({
            type: 'Or',
            value: node.value
          });
        }
      }
    },
    Pipe: createSimpleVisitor('Pipe'),
    And: createSimpleVisitor('And'),
    AndAnd: createSimpleVisitor('AndAnd'),
    Tab: createSimpleVisitor('Tab'),
    VTab: createSimpleVisitor('VTab'),
    Hex: createSimpleVisitor('Hex'),
    Oct: createSimpleVisitor('Oct'),
    Newline: createSimpleVisitor('Newline'),
    CRet: createSimpleVisitor('CRet'),
    Alert: createSimpleVisitor('Alert'),
    Backspace: createSimpleVisitor('Backspace'),
    QueMark: createSimpleVisitor('QueMark'),
    Plus: createSimpleVisitor('Plus'),
    Minus: createSimpleVisitor('Minus'),
    IncByNum: createSimpleVisitor('IncByNum'),
    DecByNum: createSimpleVisitor('DecByNum'),
    ForwardSlash: createSimpleVisitor('ForwardSlash'),
    ComparisonE: createSimpleVisitor('ComparisonE'),
    ComparisonN: createSimpleVisitor('ComparisonN'),
    Macro: createSimpleVisitor('Macro'),
    Not: createSimpleVisitor('Not'),
    Colon: createSimpleVisitor('Colon'),
    Dot: createSimpleVisitor('Dot'),
    Question: createSimpleVisitor('Question'),
    Less: createSimpleVisitor('Less'),
    Greater: createSimpleVisitor('Greater'),
    GreaterOrEqual: createSimpleVisitor('GreaterOrEqual'),
    LessOrEqual: createSimpleVisitor('LessOrEqual'),
    XorEqual: createSimpleVisitor('XorEqual'),
    Arr: {
      enter(node, parent) {
        if (parent && parent._context) {
          parent._context.push({
            type: 'Arr',
            value: node.params || []
          });
        }
      }
    },
    Pointer: createSimpleVisitor('Pointer'),
    Equal: createSimpleVisitor('Equal'),
    Delimiter: createSimpleVisitor('Delimiter'),
    Terminator: createSimpleVisitor('Terminator'),
    StringLiteral: createSimpleVisitor('StringLiteral'),

    CodeCave: {
      enter(node, parent) {
        let expression;
        
        if (node.name !== undefined) {
          expression = {
            type: 'CodeCave',
            callee: {
              type: 'Identifier',
              name: node.name
            },
            arguments: []
          };
        } else {
          expression = {
            type: 'CodeCave',
            arguments: []
          };
        }

        node._context = expression.arguments;

        if (parent && parent.type === 'Program') {
          expression = {
            type: 'Function',
            expression: expression
          };
        }

        if (parent && parent._context) {
          parent._context.push(expression);
        }
      }
    },

    CodeDomain: {
      enter(node, parent) {
        const expression = {
          type: 'CodeDomain',
          arguments: []
        };

        node._context = expression.arguments;

        if (parent && parent.type !== 'CodeDomain') {
          const wrappedExpression = {
            type: 'Function',
            expression: expression
          };
          if (parent && parent._context) {
            parent._context.push(wrappedExpression);
          }
        } else if (parent && parent._context) {
          parent._context.push(expression);
        }
      }
    }
  };

  traverser(ast, visitor);

  return newAst;
}
