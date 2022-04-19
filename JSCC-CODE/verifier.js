const keywords = [
  'auto', 'double', 'int', 'struct', 'break', 'else', 'long', 'switch',
  'case', 'enum', 'register', 'typedef', 'char', 'extern', 'return', 'union',
  'const', 'float', 'short', 'unsigned', 'continue', 'for', 'signed',
  'void', 'default', 'goto', 'sizeof', 'volatile', 'do', 'if', 'static', 'while'
];

const dataTypes = ['int', 'char', 'float', 'double', 'void'];


if (typeof window !== 'undefined') {
  window.keywords = keywords;
}

function verifier(foundFuncs) {
  if (!foundFuncs || !Array.isArray(foundFuncs)) {
    throw new TypeError('Verifier Error: Invalid function list');
  }

  const names = foundFuncs.map(func => func.name);

  if (!verifyFunctionNames(names)) {
    throw new TypeError('Error in function definition: duplicate or illegal name!');
  }

  for (const func of foundFuncs) {
    if (!verifyReturnType(func.returnType)) {
      throw new TypeError(
        `ReturnType error in function definition for the function: ${func.name}`
      );
    }

    if (!verifyFunctionArguments(func.args)) {
      throw new TypeError('Error in function definition: Invalid Arguments!');
    }

    if (!verifyFunctionBody(func.body)) {
      throw new TypeError('Error! Function Body (Statements) are invalid!');
    }
  }

  return true;
}

function verifyFunctionBody(funcBody) {
  if (!funcBody || !Array.isArray(funcBody)) {
    return false;
  }

  for (const part of funcBody) {
    if (part.type === 'Statement') {
      const smallPart = part.value;
      
      if (!smallPart || !Array.isArray(smallPart) || smallPart.length === 0) {
        return false;
      }

      
      if (smallPart[smallPart.length - 1].type !== 'Terminator') {
        return false;
      }

      
      for (let i = 0; i < smallPart.length; i++) {
        if (smallPart[i].value === 'return') {
          if (i !== 0) {
            return false;
          }
        }
      }
    }

    if (part.type === 'if') {
      const cond = part.condition;
      
      if (!cond || !Array.isArray(cond)) {
        return false;
      }

      if (cond.length === 1) {
        if (cond[0].type === 'Word') {
          if (keywords.includes(cond[0].value)) {
            return false;
          }
        } else if (cond[0].type !== 'NumberLiteral') {
          return false;
        }
      } else if (cond.length === 3) {
        const comparisonOps = [
          'ComparisonE', 'ComparisonN', 'Greater', 'GreaterOrEqual',
          'Less', 'LessOrEqual'
        ];
        
        if (!comparisonOps.includes(cond[1].type)) {
          return false;
        }

        if (keywords.includes(cond[0].value) || 
            (cond[1].value && keywords.includes(cond[1].value))) {
          return false;
        }
      } else {
        return false;
      }

      
      if (!verifyFunctionBody(part.body)) {
        return false;
      }
    }
  }

  return true;
}

function verifyFunctionNames(funcNames) {
  if (!funcNames || !Array.isArray(funcNames)) {
    return false;
  }

  
  for (const name of funcNames) {
    if (keywords.includes(name)) {
      return false;
    }
  }

  
  const sortedNames = [...funcNames].sort();
  for (let i = 0; i < sortedNames.length - 1; i++) {
    if (sortedNames[i + 1] === sortedNames[i]) {
      return false;
    }
  }

  return true;
}

function verifyReturnType(returnType) {
  if (!returnType || typeof returnType !== 'string') {
    return false;
  }
  return dataTypes.includes(returnType);
}

function verifyFunctionArguments(funcArgs) {
  if (!funcArgs || !Array.isArray(funcArgs)) {
    return false;
  }

  for (const arg of funcArgs) {
    if (!arg || typeof arg !== 'object') {
      return false;
    }

    if (!dataTypes.includes(arg.type) || keywords.includes(arg.name)) {
      return false;
    }
  }

  return true;
}
