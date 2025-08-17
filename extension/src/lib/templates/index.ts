export const builtins = [
  {
    id: 'tmpl_support',
    name: '客服回覆框架',
    variables: ['product', 'tone'],
    body:
      '以{{tone}}語氣回覆：\n問題摘要：{{sentence}}\n步驟：1) 確認 2) 說明 3) 解法 4) 後續',
  },
  {
    id: 'tmpl_bug',
    name: '技術 Bug 回報',
    variables: ['component'],
    body:
      '標題：[{{component}}] 問題回報\n重現：{{sentence}}\n期望/實際/環境/日誌',
  },
  {
    id: 'tmpl_post',
    name: '短社群貼文',
    variables: ['audience'],
    body:
      '面向{{audience}}，將「{{sentence}}」濃縮為 2 句口語文案 + 3 組 #hashtag',
  },
] as const;

export type BuiltinTemplate = typeof builtins[number];

export function renderRuleTemplate(
  templateBody: string,
  sentence: string,
  vars: Record<string, string> = {}
): string {
  const safe: Record<string, string> = Object.fromEntries(
    Object.entries(vars || {}).map(([k, v]) => [k, String(v ?? '').trim()])
  );
  const withSentence = { ...safe, sentence: String(sentence ?? '').trim() };
  // 極簡替換 {{var}}
  const out = templateBody.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_: string, k: string) => {
    return (withSentence as Record<string, string>)[k] ?? '';
  });
  return out.replace(/[ \t]+\n/g, '\n').trim();
}


