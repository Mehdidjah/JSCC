function parser(tokens) {
  let current = 0;

  function peek() {
    return tokens[current];
  }

  function consume() {
    return tokens[current++];
  }

  function isAtEnd() {
    return current >= tokens.length;
  }

  function walk() {
    if (isAtEnd()) {
      throw new TypeError('Parser Error: Unexpected end of input');
    }

    const token = peek();

    if (token.type === 'equal') {
      consume();
      if (!isAtEnd() && peek().type === 'equal') {
        consume();
        return {
          type: 'ComparisonE',
          value: '=='
        };
      }
      return {
        type: 'Equal',
        value: '='
      };
    }

    if (token.type === 'not') {
      consume();
      if (!isAtEnd() && peek().type === 'equal') {
        consume();
        return {
          type: 'ComparisonN',
          value: '!='
        };
      }
      return {
        type: 'Not',
        value: '!'
      };
    }

    if (token.type === 'plus') {
      consume();
      if (!isAtEnd()) {
        const next = peek();
        if (next.type === 'equal') {
          consume();
          return {
            type: 'IncByNum',
            value: '+='
          };
        } else if (next.type === 'plus') {
          consume();
          return {
            type: 'IncByOne',
            value: '++'
          };
        }
      }
      return {
        type: 'Plus',
        value: '+'
      };
    }

    if (token.type === 'minus') {
      consume();
      if (!isAtEnd()) {
        const next = peek();
        if (next.type === 'minus') {
          consume();
          return {
            type: 'DecByOne',
            value: '--'
          };
        } else if (next.type === 'equal') {
          consume();
          return {
            type: 'DecByNum',
            value: '-='
          };
        } else if (next.type === 'greater') {
          consume();
          return {
            type: 'Arrow',
            value: '->'
          };
        }
      }
      return {
        type: 'Minus',
        value: '-'
      };
    }

    if (token.type === 'less') {
      consume();
      if (!isAtEnd() && peek().type === 'equal') {
        consume();
        return {
          type: 'LessOrEqual',
          value: '<='
        };
      }
      return {
        type: 'Less',
        value: '<'
      };
    }

    if (token.type === 'greater') {
      consume();
      if (!isAtEnd() && peek().type === 'equal') {
        consume();
        return {
          type: 'GreaterOrEqual',
          value: '>='
        };
      }
      return {
        type: 'Greater',
        value: '>'
      };
    }

    if (token.type === 'and') {
      consume();
      if (!isAtEnd() && peek().type === 'and') {
        consume();
        return {
          type: 'AndAnd',
          value: '&&'
        };
      }
      return {
        type: 'And',
        value: '&'
      };
    }

    if (token.type === 'pipe') {
      consume();
      if (!isAtEnd() && peek().type === 'pipe') {
        consume();
        return {
          type: 'OrOr',
          value: '||'
        };
      }
      return {
        type: 'Pipe',
        value: '|'
      };
    }

    if (token.type === 'caret') {
      consume();
      if (!isAtEnd() && peek().type === 'equal') {
        consume();
        return {
          type: 'XorEqual',
          value: '^='
        };
      }
      return {
        type: 'Xor',
        value: '^'
      };
    }

    if (token.type === 'star') {
      consume();
      return {
        type: 'Pointer',
        value: '*'
      };
    }

    if (token.type === 'hash') {
      consume();
      return {
        type: 'Macro',
        value: '#'
      };
    }

    if (token.type === 'name') {
      const value = token.value;
      consume();
      return {
        type: 'Word',
        value: value
      };
    }

    if (token.type === 'number') {
      const value = token.value;
      consume();
      return {
        type: 'NumberLiteral',
        value: value
      };
    }

    if (token.type === 'string') {
      const value = token.value;
      consume();
      return {
        type: 'StringLiteral',
        value: value
      };
    }

    if (token.type === 'backslash') {
      consume();
      if (!isAtEnd()) {
        const next = peek();
        const escapeMap = {
          't': { type: 'Tab', value: /\t/ },
          'n': { type: 'Newline', value: /\n/ },
          'r': { type: 'CRet', value: /\r/ },
          'b': { type: 'Backspace', value: /\b/ },
          'a': { type: 'Alert', value: /\a/ },
          'v': { type: 'VTab', value: /\v/ },
          'x': { type: 'Hex', value: /\x/ },
          'o': { type: 'Oct', value: /\o/ }
        };
        
        if (next.type === 'name' && escapeMap[next.value]) {
          consume();
          return escapeMap[next.value];
        }
        
        if (next.type === 'question') {
          consume();
          return {
            type: 'QueMark',
            value: /\?/
          };
        }
      }
    }

    if (token.type === 'bracket' && token.value === '[') {
      consume();
      const node = {
        type: 'Arr',
        params: []
      };

      while (!isAtEnd() && peek().type !== 'bracket') {
        node.params.push(walk());
      }

      if (isAtEnd() || peek().value !== ']') {
        throw new TypeError('Parser Error: Expected closing bracket ]');
      }
      consume();
      return node;
    }

    if (token.type === 'curly' && token.value === '{') {
      consume();
      const node = {
        type: 'CodeDomain',
        params: []
      };

      while (!isAtEnd() && peek().type !== 'curly') {
        node.params.push(walk());
      }

      if (isAtEnd() || peek().value !== '}') {
        throw new TypeError('Parser Error: Expected closing brace }');
      }
      consume();
      return node;
    }

    if (token.type === 'paren' && token.value === '(') {
      consume();
      const prevToken = current > 1 ? tokens[current - 2] : null;
      
      const node = {
        type: 'CodeCave',
        params: []
      };

      if (prevToken && prevToken.type === 'name') {
        node.name = prevToken.value;
      }

      while (!isAtEnd() && peek().type !== 'paren') {
        node.params.push(walk());
      }

      if (isAtEnd() || peek().value !== ')') {
        throw new TypeError('Parser Error: Expected closing parenthesis )');
      }
      consume();
      return node;
    }

    const simpleTokens = {
      'question': 'Question',
      'comma': 'Delimiter',
      'colon': 'Colon',
      'semi': 'Terminator',
      'dot': 'Dot',
      'forwardslash': 'ForwardSlash'
    };

    if (simpleTokens[token.type]) {
      const value = token.value;
      consume();
      return {
        type: simpleTokens[token.type],
        value: value
      };
    }

    throw new TypeError(`Parser Error: Unexpected token type '${token.type}'`);
  }

  const ast = {
    type: 'Program',
    body: []
  };

  while (current < tokens.length) {
    try {
      ast.body.push(walk());
    } catch (error) {
      throw new TypeError(
        `Parser Error at token ${current}: ${error.message}`
      );
    }
  }

  return ast;
}
