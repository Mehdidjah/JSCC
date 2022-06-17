# JSCC

**JavaScript C Compiler**

Created by **Mehdi**

---

## Overview

JSCC is a proof-of-concept C compiler that translates C source code into x86-64 assembly language. Written entirely in JavaScript, this compiler demonstrates the fundamental concepts of compiler design including tokenization, parsing, AST transformation, and code generation.

## Features

### Currently Supported

- ✅ Function definitions (with return types: `int`, `void`, `char`, etc.)
- ✅ Integer variable declarations and assignments
- ✅ Character array declarations (`char name[] = "string"`)
- ✅ Variable increment/decrement (`var++`, `var--`)
- ✅ Arithmetic operations (addition, subtraction)
- ✅ Variable-to-variable assignment (`a = b`)
- ✅ Variable arithmetic (`a = b + c`, `a = b - c`)
- ✅ Global variables
- ✅ Return statements
- ✅ If statements with equality comparisons
- ✅ Function calls with integer arguments
- ✅ Proper 4-byte integer handling (32-bit registers)

### Architecture

The compiler follows a traditional multi-stage pipeline:

1. **Tokenizer** (`tokenizer.js`) - Converts C source into tokens
2. **Parser** (`parser.js`) - Builds Abstract Syntax Tree (AST)
3. **Traverser** (`traverser.js`) - Transforms AST structure
4. **Processor** (`processor.js`) - Organizes AST into functions and global statements
5. **Verifier** (`verifier.js`) - Validates AST semantics
6. **Code Generator** (`codeGenerator.js`) - Generates x86-64 assembly output

## Quick Start

### Using the Web Interface

1. Open `test.html` in your web browser
2. Enter your C code in the text area
3. Click "Compile" or press `Ctrl+Enter`
4. View the generated assembly code

### Using JavaScript Console

```javascript
const code = `
int glob = 10;
int main() {
    int a = 5;
    int b = 10;
    int c = a + b;
    return c;
}
`;

const tokens = tokenizer(code);
const ast = parser(tokens);
const transformed = transformer(ast);
const processed = processor(transformed);
const verified = verifier(processed[1][0].body);
const assembly = initGenerate(processed);
```

## Example

### Input (C Code)

```c
int glob = 10;

int add(int a, int b) {
    return a + b;
}

int main() {
    int x = 5;
    int y = 10;
    int result = x + y;
    
    if (result == 15) {
        return 1;
    }
    
    return 0;
}
```

### Output (Assembly)

```assembly
.text
.globl	_add

_add:
	push %rbp
	mov %rsp,%rbp
	push %rcx
	push %rdx
	mov 8(%rsp), %eax
	add 4(%rsp), %eax
	add $8,%rsp
	pop %rbp
	ret

.globl	main

main:
	push %rbp
	mov %rsp,%rbp
	push $5
	push $10
	mov 4(%rsp), %eax
	add (%rsp), %eax
	push %eax
	cmp $15,4(%rsp)
	jne _ifresult15_after
	mov $1,%eax
	add $12,%rsp
	pop %rbp
	ret

_ifresult15_after:
	mov $0,%eax
	add $12,%rsp
	pop %rbp
	ret

.data
.globl	_glob
_glob:
	.long	10
```

## Compiling the Assembly

To compile the generated assembly code:

```bash
gcc output.s -o output
./output
```

## Technical Details

- **Target Architecture**: x86-64
- **Calling Convention**: Win64 FastCall (first 4 args in `rcx`, `rdx`, `r8`, `r9`)
- **Integer Size**: 4 bytes (32-bit)
- **Registers**: Uses `eax` for 32-bit integer operations
- **Stack Alignment**: 4-byte aligned for integers

## Limitations

- Nested if statements not yet supported
- Limited comparison operators (only `==` currently)
- No support for loops (`for`, `while`) in code generation
- No support for `else` clauses
- Limited macro support (only `#include` parsing)
- No pointer arithmetic
- No struct member access

## Project Structure

```
JSCC/
├── tokenizer.js      # Tokenizes C source code
├── parser.js         # Parses tokens into AST
├── traverser.js      # Transforms AST
├── processor.js      # Processes AST into organized structure
├── verifier.js       # Validates AST semantics
├── codeGenerator.js   # Generates assembly code
├── test.html         # Web interface for testing
└── README.md         # This file
```

## Inspiration

This project was inspired by compiler design concepts and demonstrates how a compiler can be built using JavaScript. The architecture follows traditional compiler design principles adapted for a JavaScript environment.

## License

This project is open source. Contributions and improvements are welcome!

## Author

**Mehdi** - Creator and maintainer of JSCC

---

*Built with passion for understanding how compilers work*
