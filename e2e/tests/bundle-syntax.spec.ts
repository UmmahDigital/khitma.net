import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';

// The oldest browsers we support (.browserslistrc) parse ES2019 plus dynamic import(): Samsung Internet 12 runs
// Chromium 79. Syntax newer than that in any bundle is a blank page for them, so the built files are checked here
// (the real old Chromium in real-old-browser.spec.ts is opt-in). It has slipped in once: Angular's chunk optimizer
// re-introduced `?.` and `??` once pages were lazy-loaded (see .browserslistrc).

const dist = join(__dirname, '../../dist/khitma-e2e');

function newerSyntax(code: string): string[] {
  const file = ts.createSourceFile('bundle.js', code, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  const found = new Set<string>();
  const visit = (node: ts.Node): void => {
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isCallExpression(node)) && node.questionDotToken) {
      found.add('optional chaining (?.)');
    } else if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      if (operator === ts.SyntaxKind.QuestionQuestionToken) found.add('nullish coalescing (??)');
      if (
        operator === ts.SyntaxKind.QuestionQuestionEqualsToken ||
        operator === ts.SyntaxKind.BarBarEqualsToken ||
        operator === ts.SyntaxKind.AmpersandAmpersandEqualsToken
      ) {
        found.add('logical assignment (??=, ||=, &&=)');
      }
      if (operator === ts.SyntaxKind.InKeyword && ts.isPrivateIdentifier(node.left)) found.add('#field in object');
    } else if (ts.isClassStaticBlockDeclaration(node)) {
      found.add('static {} blocks');
    } else if (ts.isNumericLiteral(node) && node.getText(file).includes('_')) {
      found.add('numeric separators (1_000)');
    } else if (ts.isRegularExpressionLiteral(node) && /\/[a-z]*[dv][a-z]*$/.test(node.text)) {
      found.add('regular expression d/v flags');
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...found];
}

test('the bundles contain no syntax newer than the oldest supported browsers parse', () => {
  const bundles = readdirSync(dist).filter((name) => name.endsWith('.js') && !name.startsWith('ngsw') && !name.includes('worker'));
  expect(bundles.length).toBeGreaterThan(3);
  const problems = Object.fromEntries(
    bundles.map((name) => [name, newerSyntax(readFileSync(join(dist, name), 'utf8'))]).filter(([, found]) => found.length > 0)
  );
  expect(problems).toEqual({});
});
