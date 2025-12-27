function tokenizer(input) {
  let current = 0;
  const tokens = [];

  const LETTERS = /[a-zA-Z]/;
  const NEWLINE = /\n/;
  const BACKSLASH = /\\/;
  const WHITESPACE = /\s/;
  const NUMBERS = /[0-9]/;

  function throwError(char, position) {
    throw new TypeError(
      `Tokenizer Error: Unrecognized character '${char}' at position ${position}`
    );
  }

  function skipSingleLineComment() {
    while (current < input.length && !NEWLINE.test(input[current])) {
      current++;
    }
  }

  function skipMultiLineComment() {
    current++;
    while (current < input.length) {
      if (input[current] === '*' && input[current + 1] === '/') {
        current += 2;
        return;
      }
      current++;
    }
    throw new TypeError('Tokenizer Error: Unterminated multi-line comment');
  }

  function tokenizeNumber() {
    let value = '';
    while (current < input.length && NUMBERS.test(input[current])) {
      value += input[current];
      current++;
    }
    tokens.push({
      type: 'number',
      value: value
    });
  }

  function tokenizeIdentifier() {
    let value = input[current];
    current++;
    
    while (current < input.length) {
      const char = input[current];
      if (LETTERS.test(char) || NUMBERS.test(char) || char === '_') {
        value += char;
        current++;
      } else {
        break;
      }
    }
    
    tokens.push({
      type: 'name',
      value: value
    });
  }

  function tokenizeString(quoteChar) {
    let value = '';
    current++;
    
    while (current < input.length) {
      const char = input[current];
      
      if (char === '\\' && current + 1 < input.length) {
        value += char + input[current + 1];
        current += 2;
        continue;
      }
      
      if (char === quoteChar) {
        current++;
        tokens.push({
          type: 'string',
          value: value
        });
        return;
      }
      
      value += char;
      current++;
    }
    
    throw new TypeError(
      `Tokenizer Error: Unterminated string literal starting with '${quoteChar}'`
    );
  }

  while (current < input.length) {
    const char = input[current];
    const position = current;

    const singleCharTokens = {
      '=': 'equal',
      '*': 'star',
      '#': 'hash',
      '!': 'not',
      '-': 'minus',
      '+': 'plus',
      '/': 'forwardslash',
      '?': 'question',
      '<': 'less',
      '>': 'greater',
      '|': 'pipe',
      '&': 'and',
      '%': 'percent',
      '$': 'dollar',
      '@': 'at',
      '^': 'caret',
      '~': 'tilde',
      '`': 'grave',
      ':': 'colon',
      '.': 'dot',
      ',': 'comma',
      ';': 'semi'
    };

    if (singleCharTokens[char]) {
      tokens.push({
        type: singleCharTokens[char],
        value: char
      });
      current++;
      continue;
    }

    if (char === '[' || char === ']') {
      tokens.push({
        type: 'bracket',
        value: char
      });
      current++;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({
        type: 'paren',
        value: char
      });
      current++;
      continue;
    }

    if (char === '{' || char === '}') {
      tokens.push({
        type: 'curly',
        value: char
      });
      current++;
      continue;
    }

    if (char === '/') {
      if (current + 1 < input.length) {
        if (input[current + 1] === '/') {
          current += 2;
          skipSingleLineComment();
          continue;
        } else if (input[current + 1] === '*') {
          current += 2;
          skipMultiLineComment();
          continue;
        }
      }
      tokens.push({
        type: 'forwardslash',
        value: '/'
      });
      current++;
      continue;
    }

    if (BACKSLASH.test(char)) {
      tokens.push({
        type: 'backslash',
        value: '\\'
      });
      current++;
      continue;
    }

    if (WHITESPACE.test(char) || NEWLINE.test(char)) {
      current++;
      continue;
    }

    if (NUMBERS.test(char)) {
      tokenizeNumber();
      continue;
    }

    if (LETTERS.test(char) || char === '_') {
      tokenizeIdentifier();
      continue;
    }

    if (char === '\'' || char === '"') {
      tokenizeString(char);
      continue;
    }

    throwError(char, position);
  }

  return tokens;
}
