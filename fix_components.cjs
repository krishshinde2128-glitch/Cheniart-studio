const fs = require('fs');

const filesToUpdate = [
  'src/components/LandingPage.tsx',
  'src/components/OrderCalculator.tsx',
  'src/components/OrderHistory.tsx',
  'src/components/StockExpenses.tsx',
  'src/components/StockInventory.tsx',
  'src/components/MonthlyAnalytics.tsx'
];

filesToUpdate.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove the badly injected navigate hook
  content = content.replace(/\{\s*const navigate = useNavigate\(\);\s*/g, '{ ');

  // Inject it properly after ") {" of the component definition
  const componentNameMatch = content.match(/export function ([A-Za-z0-9_]+)/);
  if (componentNameMatch) {
    const componentName = componentNameMatch[1];
    
    // We are looking for the exact closing parenthesis and brace of the component signature
    // something like: }) { or } : PropsType) {
    // A robust regex for this is to match the signature until the first ") {"
    const funcSigRegex = new RegExp(`(export function ${componentName}[\\s\\S]*?\\)\\s*\\{)`);
    content = content.replace(funcSigRegex, (match, p1) => {
      return p1 + "\n  const navigate = useNavigate();";
    });
  }

  fs.writeFileSync(file, content);
});
