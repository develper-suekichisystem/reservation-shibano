import type { Step } from '../types';

const STEPS: { key: Step; label: string }[] = [
  { key: 'tournament', label: '大会選択' },
  { key: 'form',       label: '入力' },
  { key: 'confirm',    label: '確認' },
  { key: 'complete',   label: '完了' },
];

const STEP_INDEX: Record<Step, number> = {
  tournament: 0, form: 1, confirm: 2, complete: 3,
};

interface Props {
  currentStep: Step;
}

export function StepIndicator({ currentStep }: Props) {
  const currentIndex = STEP_INDEX[currentStep];

  return (
    <div className="step-indicator">
      {STEPS.map((step, index) => (
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
