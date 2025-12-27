const INT_SIZE = 4;
const VOLATILE_REGS = ['rcx', 'rdx', 'r8', 'r9'];
const INT_REG = 'eax';
const INT_REG_64 = 'rax';

const keywords = (typeof window !== 'undefined' && window.keywords) || [
  'auto', 'double', 'int', 'struct', 'break', 'else', 'long', 'switch',
  'case', 'enum', 'register', 'typedef', 'char', 'extern', 'return', 'union',
  'const', 'float', 'short', 'unsigned', 'continue', 'for', 'signed',
  'void', 'default', 'goto', 'sizeof', 'volatile', 'do', 'if', 'static', 'while'
];

let stack = [];
let allFuncs = [];
let currentFunc = '';

function initGenerate(TheBigAST) {
  const globalItems = TheBigAST[0];
  const functionBox = TheBigAST[1];
  
  stack = [];
  allFuncs = [];
  
  allFuncs = findAllFuncs(functionBox[0].body);
  const funcsAsm = findFunctionNames(functionBox[0].body);
  const dataSection = generateDataSection(globalItems);
  const textHeader = generateTextHeader();
  const compiled = textHeader + funcsAsm + dataSection;
  
  console.log(compiled);
  return compiled;
}

function findAllFuncs(funcDefs) {
  return funcDefs.map(func => func.name);
}

function generateFunctionAssembly(functionBody, functionArgs) {
  
  stack = [];
  
  let functionAssembly = '';
  const needsStackFrame = functionBody.length !== 1 || functionArgs.length !== 0;
  
  if (needsStackFrame) {
    functionAssembly += initStack();
  }
  
  
  if (functionArgs.length !== 0) {
    let regIndex = 0;
    for (const arg of functionArgs) {
      if (arg.type === 'int') {
        
        functionAssembly += `\tpush %${VOLATILE_REGS[regIndex]}\n`;
        stack.push({
          type: 'LocalVariable',
          name: arg.name,
          value: VOLATILE_REGS[regIndex],
          variableType: 'int'
        });
        regIndex++;
      }
    }
  }
  
  
  let hasReturn = false;
  
  for (let i = 0; i < functionBody.length; i++) {
    const part = functionBody[i];
    
    if (part.type === 'Statement') {
      const statementAsm = checkForStatements(part.value);
      functionAssembly += statementAsm;
      if (part.value && part.value[0] && part.value[0].value === 'return') {
        hasReturn = true;
      }
    } else if (part.type === 'if') {
      functionAssembly += checkForIfs(part);
    } else if (part.type === 'Call') {
      functionAssembly += generateCall(part);
    }
  }
  
  if (!hasReturn) {
    if (needsStackFrame) {
      functionAssembly += addClearStackAsm();
      functionAssembly += addRestoreRBPAsm();
    }
    functionAssembly += '\tret\n\n';
  }
  
  return functionAssembly;
}

function initStack() {
  const prologue = '\tpush %rbp\n';
  const prologue2 = '\tmov %rsp,%rbp\n';
  saveRBP();
  return prologue + prologue2;
}

function saveRBP() {
  stack.push({
    type: 'SavedRBP',
    name: '',
    value: 'rbp',
    variableType: ''
  });
}


function addRestoreRBPAsm() {
  return '\tpop %rbp\n';
}

function findFunctionNames(functionPack) {
  let funcsAsm = '';
  
  for (const func of functionPack) {
    currentFunc = func.name;
    
    if (func.name === 'main') {
      funcsAsm += '\t.globl\tmain\n\n';
      funcsAsm += 'main:\n';
    } else {
      funcsAsm += `\t.globl\t_${func.name}\n\n`;
      funcsAsm += `_${func.name}:\n`;
    }
    
    funcsAsm += generateFunctionAssembly(func.body, func.args);
  }
  
  return funcsAsm;
}

function generateTextHeader() {
  return '\t.text\n';
}

function generateDataSection(globalItems) {
  const globalVariables = findGlobalVariables(globalItems);
  const dataHeader = generateDataHeader();
  const dataBody = generateDataBody(globalVariables);
  return dataHeader + dataBody;
}

function generateDataHeader() {
  return '\t.data\n';
}

function generateDataBody(globalVariables) {
  let dataSection = '';
  
  for (const gVar of globalVariables) {
    dataSection += `\t.globl\t_${gVar.name}\n`;
    dataSection += `_${gVar.name}:\n`;
    
    if (gVar.type === 'int') {
      dataSection += `\t.long\t${gVar.value}\n\n`;
    }
  }
  
  return dataSection;
}

function findGlobalVariables(globalItems) {
  const globalVariables = [];
  let current = 0;
  
  
  while (current < globalItems.length) {
    if (globalItems[current].type === 'GlobalStatements') {
      break;
    }
    current++;
  }
  
  if (current >= globalItems.length) {
    return globalVariables;
  }
  
  const globalStatementsBody = globalItems[current].body;
  
  for (const statement of globalStatementsBody) {
    if (statement.type === 'Statement') {
      const parts = statement.value;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (parts[i].type === 'Word' && 
            keywords.indexOf(parts[i].value) === -1 && 
            parts[i + 1].type === 'Equal') {
          globalVariables.push({
            type: parts[i - 1].value,
            name: parts[i].value,
            value: parts[i + 2].value
          });
        }
      }
    }
  }
  
  return globalVariables;
}

function reverseOffset(offset) {
  return Math.abs((stack.length - 1) - offset);
}

function findOnTheStack(value) {
  for (let i = 0; i < stack.length; i++) {
    if (stack[i].name === value) {
      return i;
    }
  }
  return -1;
}

function generateReturn(returnValue) {
  let retAsm = '';
  const hasStackFrame = stack.some(item => item.type === 'SavedRBP');
  
  if (returnValue.type === 'NumberLiteral') {
    if (returnValue.value === '0') {
      retAsm += `\txor %${INT_REG_64},%${INT_REG_64}\n`;
    } else {
      retAsm += `\tmov $${returnValue.value},%${INT_REG}\n`;
    }
  } else if (returnValue.type === 'Word') {
    if (!isAKeyword(returnValue.value)) {
      const stackEntry = findOnTheStack(returnValue.value);
      if (stackEntry !== -1) {
        const stackOffset = reverseOffset(stackEntry);
        if (stack[stackEntry].variableType === 'int') {
          if (stackOffset !== 0) {
            retAsm += `\tmov ${stackOffset * INT_SIZE}(%rsp), %${INT_REG}\n`;
          } else {
            retAsm += `\tmov (%rsp), %${INT_REG}\n`;
          }
        }
      }
    }
  }
  
  retAsm += addClearStackAsm();
  if (hasStackFrame) {
    retAsm += addRestoreRBPAsm();
  }
  retAsm += '\tret\n\n';
  return retAsm;
}

function addClearStackAsm() {
  let counter = 0;
  for (const item of stack) {
    if (item.type === 'LocalVariable') {
      counter++;
    }
  }
  return `\tadd $${counter * INT_SIZE},%rsp\n`;
}


function generateIncByOne(offset) {
  if (offset === 0) {
    return '\tincl (%rsp)\n';
  } else {
    return `\tincl ${offset * INT_SIZE}(%rsp)\n`;
  }
}

function generateIfClause(offset, cmpValue, name) {
  let ifClause = '';
  if (offset === 0) {
    ifClause += `\tcmp $${cmpValue},(%rsp)\n`;
  } else {
    ifClause += `\tcmp $${cmpValue},${offset * INT_SIZE}(%rsp)\n`;
  }
  ifClause += `\tjne _if${name}${cmpValue}_after\n`;
  return ifClause;
}

function generateIfInside(ifInside, ifName, ifCmpValue) {
  let assembledifInside = '';
  const stacklen = stack.length;
  
  for (const part of ifInside) {
    if (part.type === 'Statement') {
      assembledifInside += checkForStatements(part.value);
    }
  }
  
  
  if (stacklen < stack.length) {
    const counter = stack.length - stacklen;
    for (let i = 0; i < counter; i++) {
      stack.pop();
    }
    assembledifInside += `\tadd $${counter * INT_SIZE},%rsp\n`;
  }
  
  assembledifInside += '\n';
  return assembledifInside;
}

function isAKeyword(word) {
  return keywords.indexOf(word) !== -1;
}

function checkForStatements(part) {
  let functionAssembly = '';
  
  if (part[0].type === 'Word' && isAKeyword(part[0].value)) {
    
    if (part[0].value === 'return') {
      functionAssembly += generateReturn(part[1]);
    }
    
    
    if (part[0].value === 'int') {
      if (part.length === 5) {
        
        functionAssembly += generateVariableAssignment(part[0].value, part[1].value, part[3]);
      } else if (part.length > 5) {
        
        functionAssembly += generateVariableAssignmentWithAddition(part);
      }
    }
    
    
    if (part[0].value === 'char') {
      if (part.length === 6) {
        generateStringVariable(part);
      }
    }
  } else if (part[0].type === 'Word' && !isAKeyword(part[0].value)) {
    
    const stackIndex = findOnTheStack(part[0].value);
    if (stackIndex !== -1) {
      if (part[1] && part[1].type === 'IncByOne') {
        functionAssembly += generateIncByOne(reverseOffset(stackIndex));
      } else if (part[1] && part[1].type === 'Equal') {
        
        functionAssembly += generateVariableReassignment(part);
      }
    }
  }
  
  return functionAssembly;
}

function generateVariableReassignment(statement) {
  let reassembly = '';
  const varName = statement[0].value;
  const varIndex = findOnTheStack(varName);
  
  if (varIndex === -1) {
    throw new TypeError(`Variable '${varName}' not found`);
  }
  
  const varOffset = reverseOffset(varIndex);
  
  
  if (statement.length === 3 && statement[2].type === 'Word') {
    const sourceVar = statement[2].value;
    const sourceIndex = findOnTheStack(sourceVar);
    
    if (sourceIndex === -1) {
      throw new TypeError(`Variable '${sourceVar}' not found`);
    }
    
    const sourceOffset = reverseOffset(sourceIndex);
    
    
    if (sourceOffset === 0) {
      reassembly += `\tmov (%rsp), %${INT_REG}\n`;
    } else {
      reassembly += `\tmov ${sourceOffset * INT_SIZE}(%rsp), %${INT_REG}\n`;
    }
    
    
    if (varOffset === 0) {
      reassembly += `\tmov %${INT_REG}, (%rsp)\n`;
    } else {
      reassembly += `\tmov %${INT_REG}, ${varOffset * INT_SIZE}(%rsp)\n`;
    }
    
    return reassembly;
  }
  
  
  if (statement.length === 5 && 
      statement[2].type === 'Word' && 
      (statement[3].type === 'Plus' || statement[3].type === 'Minus') &&
      statement[4].type === 'Word') {
    
    const leftVar = statement[2].value;
    const operator = statement[3].type;
    const rightVar = statement[4].value;
    
    const leftIndex = findOnTheStack(leftVar);
    const rightIndex = findOnTheStack(rightVar);
    
    if (leftIndex === -1 || rightIndex === -1) {
      throw new TypeError(`Variable not found in addition operation`);
    }
    
    const leftOffset = reverseOffset(leftIndex);
    const rightOffset = reverseOffset(rightIndex);
    
    
    if (leftOffset === 0) {
      reassembly += `\tmov (%rsp), %${INT_REG}\n`;
    } else {
      reassembly += `\tmov ${leftOffset * INT_SIZE}(%rsp), %${INT_REG}\n`;
    }
    
    
    if (operator === 'Plus') {
      if (rightOffset === 0) {
        reassembly += `\tadd (%rsp), %${INT_REG}\n`;
      } else {
        reassembly += `\tadd ${rightOffset * INT_SIZE}(%rsp), %${INT_REG}\n`;
      }
    } else if (operator === 'Minus') {
      if (rightOffset === 0) {
        reassembly += `\tsub (%rsp), %${INT_REG}\n`;
      } else {
        reassembly += `\tsub ${rightOffset * INT_SIZE}(%rsp), %${INT_REG}\n`;
      }
    }
    
    
    if (varOffset === 0) {
      reassembly += `\tmov %${INT_REG}, (%rsp)\n`;
    } else {
      reassembly += `\tmov %${INT_REG}, ${varOffset * INT_SIZE}(%rsp)\n`;
    }
    
    return reassembly;
  }
  
  
  if (statement.length === 3 && statement[2].type === 'NumberLiteral') {
    if (varOffset === 0) {
      reassembly += `\tmov $${statement[2].value}, (%rsp)\n`;
    } else {
      reassembly += `\tmov $${statement[2].value}, ${varOffset * INT_SIZE}(%rsp)\n`;
    }
    return reassembly;
  }
  
  return '';
}

function checkForIfs(part) {
  let functionAssembly = '';
  
  if (part.condition.length === 3) {
    const cond = part.condition;
    if (cond[1].type === 'ComparisonE') {
      if (cond[0].type === 'Word' && cond[2].type === 'NumberLiteral') {
        const stackIndex = findOnTheStack(cond[0].value);
        if (stackIndex !== -1) {
          functionAssembly += generateIfClause(reverseOffset(stackIndex), cond[2].value, cond[0].value);
          functionAssembly += generateIfInside(part.body, cond[0].value, cond[2].value);
          functionAssembly += `_if${cond[0].value}${cond[2].value}_after:\n`;
        }
      }
    }
  }
  
  return functionAssembly;
}

function generateCall(part) {
  let callAsm = '';
  
  if (allFuncs.indexOf(part.callee) !== -1) {
    const params = part.params;
    let regIndex = 0;
    
    for (const param of params) {
      if (param.type === 'Delimiter') {
        continue;
      } else if (param.type === 'NumberLiteral') {
        callAsm += `\tmov $${param.value},%${VOLATILE_REGS[regIndex]}\n`;
        regIndex++;
      } else if (param.type === 'Word') {
        
        const stackIndex = findOnTheStack(param.value);
        if (stackIndex !== -1) {
          const offset = reverseOffset(stackIndex);
          if (offset === 0) {
            callAsm += `\tmov (%rsp), %${VOLATILE_REGS[regIndex]}\n`;
          } else {
            callAsm += `\tmov ${offset * INT_SIZE}(%rsp), %${VOLATILE_REGS[regIndex]}\n`;
          }
          regIndex++;
        }
      }
    }
    
    callAsm += `\tcall _${part.callee}\n`;
  }
  
  return callAsm;
}

function generateStringVariable(part) {
  if (part[1].type === 'Word' && part[2].type === 'Arr') {
    for (const item of stack) {
      if (item.type === 'LocalVariable' && item.name === part[1].value) {
        throw new TypeError(`Variable already defined: ${part[1].value}`);
      }
    }
  }
}


function generateVariableAssignment(varType, varName, varValue) {
  let assignmentAsm = '';
  
  if (varValue.type === 'NumberLiteral') {
    if (varType === 'int') {
      assignmentAsm += `\tpush $${varValue.value}\n`;
      stack.push({
        type: 'LocalVariable',
        name: varName,
        value: varValue.value,
        variableType: varType
      });
    }
  } else if (varValue.type === 'Word') {
    if (varType === 'int') {
      const sourceIndex = findOnTheStack(varValue.value);
      if (sourceIndex !== -1) {
        const offset = reverseOffset(sourceIndex);
        if (offset === 0) {
          assignmentAsm += `\tmov (%rsp), %${INT_REG}\n`;
        } else {
          assignmentAsm += `\tmov ${offset * INT_SIZE}(%rsp), %${INT_REG}\n`;
        }
        assignmentAsm += `\tpush %${INT_REG}\n`;
        stack.push({
          type: 'LocalVariable',
          name: varName,
          value: stack[sourceIndex].value,
          variableType: varType
        });
      }
    }
  }
  
  return assignmentAsm;
}

function generateVariableAssignmentWithAddition(statement) {
  let statementAssembly = '';
  let sum = 0;
  let varName = '';
  let hasAssignment = false;
  
  
  for (let i = 0; i < statement.length; i++) {
    if (statement[i].type === 'Equal') {
      varName = statement[i - 1].value;
      hasAssignment = true;
      
      
      statementAssembly = `\txor %${INT_REG},%${INT_REG}\n`;
      
      
      let j = i + 1;
      let isFirst = true;
      
      while (j < statement.length - 1) {
        const token = statement[j];
        
        if (token.type === 'NumberLiteral') {
          if (isFirst) {
            sum += parseInt(token.value);
            statementAssembly += `\tadd $${token.value},%${INT_REG}\n`;
            isFirst = false;
          }
        } else if (token.type === 'Word' && !isAKeyword(token.value)) {
          
          const varIndex = findOnTheStack(token.value);
          if (varIndex !== -1) {
            const offset = reverseOffset(varIndex);
            if (isFirst) {
              if (offset === 0) {
                statementAssembly += `\tmov (%rsp), %${INT_REG}\n`;
              } else {
                statementAssembly += `\tmov ${offset * INT_SIZE}(%rsp), %${INT_REG}\n`;
              }
              isFirst = false;
            } else {
              
              if (j > 0 && statement[j - 1].type === 'Plus') {
                if (offset === 0) {
                  statementAssembly += `\tadd (%rsp), %${INT_REG}\n`;
                } else {
                  statementAssembly += `\tadd ${offset * INT_SIZE}(%rsp), %${INT_REG}\n`;
                }
              } else if (j > 0 && statement[j - 1].type === 'Minus') {
                if (offset === 0) {
                  statementAssembly += `\tsub (%rsp), %${INT_REG}\n`;
                } else {
                  statementAssembly += `\tsub ${offset * INT_SIZE}(%rsp), %${INT_REG}\n`;
                }
              }
            }
          }
        } else if (token.type === 'Plus') {
          
        } else if (token.type === 'Minus') {
          
        } else if (token.type === 'NumberLiteral' && j > 0) {
          
          if (statement[j - 1].type === 'Plus') {
            sum += parseInt(token.value);
            statementAssembly += `\tadd $${token.value},%${INT_REG}\n`;
          } else if (statement[j - 1].type === 'Minus') {
            sum -= parseInt(token.value);
            statementAssembly += `\tsub $${token.value},%${INT_REG}\n`;
          }
        }
        
        j++;
      }
      
      break;
    }
  }
  
  if (hasAssignment) {
    statementAssembly += `\tpush %${INT_REG}\n`;
    stack.push({
      type: 'LocalVariable',
      name: varName,
      value: sum,
      variableType: 'int'
    });
    return statementAssembly;
  }
  
  return '';
}

