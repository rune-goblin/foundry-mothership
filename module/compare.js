// Backs the `compare` Handlebars helper. Previously this built an expression string and
// ran it through eval(), which meant any value containing a quote produced a syntax error
// rather than a comparison.
const COMPARATORS = {
  '===': (a, b) => a === b,
  '!==': (a, b) => a !== b,
  '==': (a, b) => a == b,
  '!=': (a, b) => a != b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
};

export function compare(varType, varOne, comparator, varTwo) {
  const op = COMPARATORS[comparator];
  if (!op) {
    console.warn(`mothership | unknown comparator '${comparator}' in compare helper`);
    return false;
  }
  // The old eval quoted both operands for 'str' and left them bare for 'int', so the
  // coercion below is what kept '10' > '9' false for strings and true for numbers.
  if (varType === 'str') return op(String(varOne), String(varTwo));
  if (varType === 'int') return op(Number(varOne), Number(varTwo));
  return false;
}
