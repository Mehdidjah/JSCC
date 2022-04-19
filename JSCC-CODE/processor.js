function processor(ast) {
  const astBody = ast.body;
  const globalItems = [];
  
  let globalStatements = findGlobalStatements(astBody);
  globalStatements = preprocessor(globalStatements);
  
  globalItems.push({
    type: 'GlobalStatements',
    body: globalStatements
  });

  const functionPack = [];
  const foundFuncs = findFuncs(astBody);

  for (const func of foundFuncs) {
    func.body = processBody(func.body);
    func.args = updateFunctionArguments(func.args);
  }

  functionPack.push({
    type: 'Functions',
    body: foundFuncs
  });

  const TheBigAST = [globalItems, functionPack];
  return TheBigAST;
}

function findGlobalStatements(astBody) {
  const astBodyClone = [...astBody];
  const globalStatements = [];
  let current = 0;

  while (current < astBodyClone.length) {
    if (astBodyClone[0] && astBodyClone[0].type === 'Macro') {
      if (astBodyClone[1] && astBodyClone[1].value === 'include') {
        const macro = [];
        let macroCounter = 0;
        
        if (astBodyClone[2] && astBodyClone[2].type === 'StringLiteral') {
          macro.push(...astBodyClone.slice(0, 3));
          astBodyClone.splice(0, 3);
        } else {
          while (macroCounter < astBodyClone.length && 
                 astBodyClone[macroCounter].type !== 'Greater') {
            macroCounter++;
          }
          macro.push(...astBodyClone.slice(0, macroCounter + 1));
          astBodyClone.splice(0, macroCounter + 1);
        }
        
        globalStatements.push({
          type: 'Macro',
          value: macro
        });
        current = 0;
        continue;
      }
    }

    if (astBodyClone[current] && astBodyClone[current].type === 'Terminator') {
      const statement = [];

      if (astBodyClone[0] && astBodyClone[0].value === 'struct') {
        const instruct = processBody(astBodyClone[2].expression.arguments);
        globalStatements.push({
          type: 'struct',
          name: astBodyClone[1].value,
          body: instruct
        });
        astBodyClone.splice(0, current + 1);
        current = 0;
        continue;
      }

      for (let i = 0; i <= current; i++) {
        statement.push(astBodyClone[i]);
      }

      astBodyClone.splice(0, current + 1);

      if (statement.length > 0) {
        globalStatements.push({
          type: 'Statement',
          value: statement
        });
      }
      current = 0;
    } else {
      current++;
    }
  }

  return globalStatements;
}

function findFuncs(astBody) {
  const found = [];

  for (let i = 0; i < astBody.length; i++) {
    if (astBody[i].type === 'Function') {
      if (astBody[i].expression && astBody[i].expression.callee) {
        if (astBody[i].expression.callee.type === 'Identifier') {
          if (astBody[i - 1] && astBody[i - 1].type === 'Word' && 
              astBody[i - 2] && astBody[i - 2].type === 'Word') {
            if (astBody[i + 1] && astBody[i + 1].type === 'Function') {
              if (astBody[i + 1].expression.type === 'CodeDomain') {
                const funcName = astBody[i].expression.callee.name;
                const returnType = astBody[i - 2].value;
                const args = astBody[i].expression.arguments;
                const body = astBody[i + 1].expression.arguments;

                if (funcName === 'main') {
                  found.push({
                    type: 'EntryPoint',
                    name: funcName,
                    returnType: returnType,
                    args: args,
                    body: body
                  });
                } else {
                  found.push({
                    type: 'FunctionDefinition',
                    name: funcName,
                    returnType: returnType,
                    args: args,
                    body: body
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return found;
}

function processBody(inside) {
  const statements = [];
  let current = 0;
  let start = 0;

  while (current < inside.length) {
    const part = inside[current];

    if (part.type === 'CodeCave' && 
        inside[current + 1] && 
        inside[current + 1].type === 'Terminator' && 
        inside[current - 1] && 
        inside[current - 1].type === 'Word') {
      statements.push({
        type: 'Call',
        params: part.arguments || [],
        callee: part.callee ? part.callee.name : null
      });
      current++;
      continue;
    }

    if (part.type === 'CodeDomain' && 
        inside[current - 1] && 
        inside[current - 1].type === 'CodeCave') {
      if (inside[current - 2] && inside[current - 2].type === 'Word') {
        const keyword = inside[current - 2].value;

        if (keyword === 'if' && 
            inside[current - 3] && 
            inside[current - 3].type === 'Word' && 
            inside[current - 3].value === 'else') {
          const inif = processBody(part.arguments);
          statements.push({
            type: 'elseif',
            condition: inside[current - 1].arguments,
            body: inif
          });
          current++;
          continue;
        }

        if (keyword === 'if') {
          const inif = processBody(part.arguments);
          statements.push({
            type: 'if',
            condition: inside[current - 1].arguments,
            body: inif
          });
          current++;
          continue;
        }

        if (keyword === 'while') {
          const inwhile = processBody(part.arguments);
          statements.push({
            type: 'while',
            condition: inside[current - 1].arguments,
            body: inwhile
          });
          current++;
          continue;
        }

        if (keyword === 'for') {
          const infor = processBody(part.arguments);
          statements.push({
            type: 'for',
            condition: inside[current - 1].arguments,
            body: infor
          });
          current++;
          continue;
        }

        if (keyword === 'switch') {
          const cases = [];
          const args = [...part.arguments].reverse();
          const reverseCaseParts = [];
          let count = 0;

          while (count < args.length) {
            if (args[count].type !== 'Colon') {
              reverseCaseParts.push(args[count]);
            } else {
              const currentCaseType = args[count + 1] ? args[count + 1].type : null;
              const currentCaseValue = args[count + 1] ? args[count + 1].value : null;
              const currentStatementsGroup = [...reverseCaseParts].reverse();
              
              if (currentCaseValue === 'default') {
                count++;
              } else if (args[count + 2] && args[count + 2].value === 'case') {
                count += 2;
              }
              
              reverseCaseParts.length = 0;
              const caseStatements = processBody(currentStatementsGroup);
              cases.push({
                caseType: currentCaseType,
                caseValue: currentCaseValue,
                caseStatements: caseStatements
              });
            }
            count++;
          }

          statements.push({
            type: 'switch',
            condition: inside[current - 1].arguments,
            body: cases
          });
          current++;
          continue;
        }
      } else {
        throw new TypeError('Invalid Syntax!');
      }
    }

    if (part.type === 'CodeDomain' && 
        inside[current - 1] && 
        inside[current - 1].value === 'else') {
      const inelse = processBody(part.arguments);
      statements.push({
        type: 'else',
        body: inelse
      });
      current++;
      continue;
    }

    if (part.type === 'CodeDomain' && 
        inside[current - 1] && 
        inside[current - 1].value === 'do') {
      if (inside[current + 1] && 
          inside[current + 1].type === 'Word' && 
          inside[current + 1].value === 'while' && 
          inside[current + 2] && 
          inside[current + 2].type === 'CodeCave') {
        const indo = processBody(part.arguments);
        statements.push({
          type: 'do',
          condition: inside[current + 2].arguments,
          body: indo
        });
        current++;
        continue;
      } else {
        throw new TypeError('Invalid Syntax!');
      }
    }

    if (part.type === 'CodeDomain' && 
        inside[current - 1] && 
        inside[current - 1].type === 'Word' && 
        inside[current - 2] && 
        inside[current - 2].value === 'struct') {
      if (inside[current + 1] && inside[current + 1].type === 'Terminator') {
        const instruct = processBody(part.arguments);
        statements.push({
          type: 'struct',
          name: inside[current - 1].value,
          body: instruct
        });
        current++;
        continue;
      }
    }

    if (part.type === 'Terminator') {
      if (inside[current - 1] && 
          inside[current - 1].type === 'CodeCave' && 
          inside[current - 2] && 
          inside[current - 2].value === 'while') {
        current++;
        continue;
      }

      if (inside[current - 1] && 
          inside[current - 1].type === 'CodeDomain' && 
          inside[current - 3] && 
          inside[current - 3].value === 'struct') {
        current++;
        continue;
      }

      const phrase = [];
      let phraseStart = start;

      while (phraseStart <= current) {
        const item = inside[phraseStart];
        
        if (item && item.type === 'Word') {
          const wordValue = item.value;
          
          if (['if', 'for', 'switch', 'while'].includes(wordValue)) {
            phraseStart += 3;
            continue;
          }
          
          if (wordValue === 'do') {
            phraseStart += 5;
            continue;
          }
          
          if (wordValue === 'else' && 
              inside[phraseStart + 1] && 
              inside[phraseStart + 1].type === 'CodeDomain') {
            phraseStart += 2;
            continue;
          }
          
          if (wordValue === 'struct') {
            while (phraseStart < inside.length && 
                   inside[phraseStart].type !== 'Terminator') {
              phraseStart++;
            }
            if (phraseStart < inside.length && 
                inside[phraseStart].type === 'Terminator') {
              phraseStart++;
            }
            break;
          }
        }

        if (phraseStart < inside.length) {
          phrase.push({
            type: inside[phraseStart].type,
            value: inside[phraseStart].value
          });
        }
        phraseStart++;
      }

      if (phrase.length > 0) {
        statements.push({
          type: 'Statement',
          value: phrase
        });
      }

      start = current + 1;
    }

    if (current === inside.length - 1) {
      if (part.type !== 'Terminator' && part.type !== 'CodeDomain') {
        if (process && process.env && process.env.NODE_ENV === 'development') {
          console.warn('Function may not return or end properly');
        }
      }
    }

    current++;
  }

  return statements;
}

function updateFunctionArguments(cave) {
  const params = [];
  let current = 0;
  let last = 0;

  while (current < cave.length) {
    if (cave[current].type === 'Delimiter') {
      if ((current - last) === 2) {
        if (cave[current - 2] && cave[current - 2].type === 'Word' && 
            cave[current - 1] && cave[current - 1].type === 'Word') {
          params.push({
            type: cave[current - 2].value,
            name: cave[current - 1].value
          });
          last = current + 1;
        } else {
          throw new TypeError('Error in function definition: Invalid arguments!');
        }
      }
      current++;
      continue;
    }

    if (current === (cave.length - 1)) {
      if ((current - last) === 1) {
        if (cave[current - 1] && cave[current - 1].type === 'Word' && 
            cave[current] && cave[current].type === 'Word') {
          params.push({
            type: cave[current - 1].value,
            name: cave[current].value
          });
        } else {
          throw new TypeError('Error in function definition: Invalid arguments!');
        }
      } else if ((current - last) === 2) {
        if (cave[current - 1] && cave[current - 1].type === 'Word' && 
            cave[current] && cave[current].type === 'Word') {
          params.push({
            type: cave[current - 1].value,
            name: cave[current].value
          });
        } else {
          throw new TypeError('Error in function definition: Invalid arguments!');
        }
      }
      current++;
      continue;
    }

    current++;
  }

  return params;
}

function preprocessor(GlobalStatements) {
  for (let i = 0; i < GlobalStatements.length; i++) {
    if (GlobalStatements[i].type === 'Macro') {
      const macro = GlobalStatements[i].value;
      
      if (macro[1] && macro[1].type === 'Word') {
        const macroType = macro[1].value;

        if (macroType === 'include') {
          let includedFile = '';
          let counter = 0;

          while (counter < macro.length) {
            if (macro[counter].type === 'Less') {
              counter++;
              while (counter < macro.length && macro[counter].type !== 'Greater') {
                includedFile += macro[counter].value;
                counter++;
              }
            } else if (macro[counter].type === 'StringLiteral') {
              includedFile += macro[counter].value;
            }
            counter++;
          }

          GlobalStatements[i] = {
            type: 'Macro',
            subtype: 'include',
            file: includedFile
          };
        }

        const unsupportedMacros = ['define', 'ifndef', 'ifdef', 'pragma'];
        if (unsupportedMacros.includes(macroType)) {
          console.log(`${macroType} macro not yet supported :(`);
        }
      }
    }
  }

  return GlobalStatements;
}
