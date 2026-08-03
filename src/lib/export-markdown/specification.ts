import type { AnalysisResult } from '@/store/analysis-store';

/**
 * Generates the Specification (requirements) markdown section.
 */
export function renderSpecificationSection(spec: NonNullable<AnalysisResult['spec']>): string {
  const lines: string[] = [];
  lines.push('## 3. Спецификация требований\n');

  if (spec.functionalRequirements?.length) {
    lines.push('### Функциональные требования');
    lines.push('| ID | Требование |');
    lines.push('|----|------------|');
    spec.functionalRequirements.forEach((fr) => {
      lines.push(`| ${fr.id} | ${fr.statement} |`);
    });
    lines.push('');
  }

  if (spec.nonFunctionalRequirements?.length) {
    lines.push('### нефункциональные требования');
    lines.push('| ID | Категория | Требование |');
    lines.push('|----|-----------|------------|');
    spec.nonFunctionalRequirements.forEach((nfr) => {
      lines.push(`| ${nfr.id} | ${nfr.category} | ${nfr.statement} |`);
    });
    lines.push('');
  }

  if (spec.userStories?.length) {
    lines.push('### Пользовательские истории');
    spec.userStories.forEach((us) => {
      lines.push(`**${us.id}** — Как *${us.asRole}*, я хочу *${us.iWant}*, чтобы *${us.soThat}*.`);
      if (us.acceptanceCriteria?.length) {
        lines.push(`  **Критерии приёмки:**`);
        us.acceptanceCriteria.forEach((ac) => lines.push(`  - [ ] ${ac}`));
      }
      lines.push('');
    });
  }

  lines.push('---\n');
  return lines.join('\n');
}
