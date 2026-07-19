import type { Step } from '../types';
import { ORGANIZER_LINE_URL } from '../lib/organizer';

const ALL_STEPS: { key: Step; label: string }[] = [
  { key: 'tournament', label: '大会選択' },
  { key: 'line',       label: 'LINE登録' },
  { key: 'form',       label: '入力' },
  { key: 'confirm',    label: '確認' },
  { key: 'complete',   label: '完了' },
];

interface Props {
  currentStep: Step;
}

export function StepIndicator({ currentStep }: Props) {
  // 運営者LINE未設定なら LINE 登録ステップは表示しない
  const steps = ORGANIZER_LINE_URL
    ? ALL_STEPS
    : ALL_STEPS.filter(s => s.key !== 'line');
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <div
          key={step.key}
          className={`step-item ${index < currentIndex ? 'completed' : ''} ${index === currentIndex ? 'active' : ''}`}
        >
          <div className="step-circle">
            {index < currentIndex ? '✓' : index + 1}
          </div>
          <span className="step-label">{step.label}</span>
        </div>
      ))}
    </div>
  );
}
