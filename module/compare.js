// Backs the `compare` Handlebars helper. Not eval() of a built expression string — a quote
// in the value used to produce a syntax error instead of a comparison.
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
  // Coerces explicitly to keep '10' > '9' false for strings, true for numbers.
  if (varType === 'str') return op(String(varOne), String(varTwo));
  if (varType === 'int') return op(Number(varOne), Number(varTwo));
  return false;
}
