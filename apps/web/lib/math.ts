export function formatMathText(text: string | null | undefined): string {
  if (!text) return "";
  const superscripts: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  };
  
  return text.replace(/\^([0-9]+)/g, (match, group) => {
    return group.split('').map((char: string) => superscripts[char] || char).join('');
  });
}
