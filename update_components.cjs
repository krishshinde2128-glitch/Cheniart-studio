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

  // 1. Add useNavigate import
  if (!content.includes("import { useNavigate }")) {
    content = content.replace(
      "import {",
      "import { useNavigate } from 'react-router-dom';\nimport {"
    );
  }

  // 2. Remove onNavigate from Props Interface
  content = content.replace(/onNavigate:\s*\([^)]*\)\s*=>\s*void;/g, '');
  content = content.replace(/onNavigate\?:?\s*\([^)]*\)\s*=>\s*void;/g, '');

  // 3. Remove onNavigate from component signature
  // We look for export function ComponentName({ onNavigate, ... }
  content = content.replace(/\{\s*onNavigate,?\s*/g, '{ ');

  // 4. Inject useNavigate() hook right after the component declaration
  // Need to find the exact component function start.
  const componentNameMatch = content.match(/export function ([A-Za-z0-9_]+)\s*\(/);
  if (componentNameMatch) {
    const componentName = componentNameMatch[1];
    const funcStartRegex = new RegExp(`export function ${componentName}[^{]+\\{`);
    content = content.replace(funcStartRegex, (match) => {
      return match + "\n  const navigate = useNavigate();\n";
    });
  }

  // 5. Replace onNavigate calls with navigate
  // Handle specific routes
  content = content.replace(/onNavigate\('database'\)/g, "navigate('/inventory')");
  content = content.replace(/onNavigate\('calculator'\)/g, "navigate('/calculator')");
  content = content.replace(/onNavigate\('history'\)/g, "navigate('/history')");
  content = content.replace(/onNavigate\('expenses'\)/g, "navigate('/expenses')");
  content = content.replace(/onNavigate\('stockInventory'\)/g, "navigate('/stock')");
  content = content.replace(/onNavigate\('analytics'\)/g, "navigate('/analytics')");
  content = content.replace(/onNavigate\('landing'\)/g, "navigate('/')");

  fs.writeFileSync(file, content);
});

// Specifically handle LandingPage.tsx to remove the old <nav> entirely
let landingPage = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');
const navStart = landingPage.indexOf('{/* Glassmorphic Navbar */}');
const navEnd = landingPage.indexOf('</nav>') + '</nav>'.length;
if (navStart !== -1 && navEnd !== -1) {
  landingPage = landingPage.substring(0, navStart) + landingPage.substring(navEnd);
  fs.writeFileSync('src/components/LandingPage.tsx', landingPage);
}
